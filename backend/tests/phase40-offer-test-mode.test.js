// Direct offers in test mode: visible only to selected users until made live.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'your-project-id';

const directOffersRouter = require('../routes/directOffers');
const DirectOffer = require('../models/DirectOffer');
const { buildNewEarningPayload } = require('../utils/earningFeed');

const { canUserSeeOffer, buildVisibilityClause } = directOffersRouter.__testInternals;
const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

test('model defaults to everyone and stores the tester list', () => {
  const offer = new DirectOffer({ title: 't', description: 'd', advertiserUrl: 'https://x.example', rewardAmount: 1 });
  assert.equal(offer.visibility, 'everyone');
  assert.deepEqual([...offer.allowedUserIds], []);
  const bad = new DirectOffer({ title: 't', description: 'd', advertiserUrl: 'https://x.example', rewardAmount: 1, visibility: 'secret' });
  assert.ok(bad.validateSync()?.errors?.visibility);
});

test('only listed users can see a test-mode offer', () => {
  const tester = new mongoose.Types.ObjectId();
  const other = new mongoose.Types.ObjectId();
  const offer = { visibility: 'selected', allowedUserIds: [tester] };
  assert.equal(canUserSeeOffer(offer, tester), true);
  assert.equal(canUserSeeOffer(offer, String(tester)), true);
  assert.equal(canUserSeeOffer(offer, other), false);
  assert.equal(canUserSeeOffer(offer, null), false);
  assert.equal(canUserSeeOffer({ visibility: 'everyone' }, other), true);
  assert.equal(canUserSeeOffer({}, other), true, 'old offers without the field stay public');
});

test('user list query filters test-mode offers', () => {
  const userId = new mongoose.Types.ObjectId();
  assert.deepEqual(buildVisibilityClause(userId), {
    $or: [{ visibility: { $ne: 'selected' } }, { allowedUserIds: userId }],
  });
  assert.deepEqual(buildVisibilityClause(null), { visibility: { $ne: 'selected' } });
  const source = read('routes/directOffers.js');
  assert.match(source, /buildVisibilityClause\(user\?\._id\)/);
  assert.match(source, /-allowedUserIds/);
  // click and manual proof submit both refuse non-testers
  assert.equal((source.match(/!canUserSeeOffer\(offer, user\._id\)/g) || []).length, 2);
});

test('admin create/update accept visibility and testers by email or id', () => {
  const source = read('routes/admin.js');
  assert.match(source, /const resolveDirectOfferVisibility = async/);
  assert.equal((source.match(/translations, visibility, allowedUsers,/g) || []).length, 2);
  assert.match(source, /Unknown test user\(s\)/);
  assert.match(source, /Add at least one test user/);
  assert.match(source, /offer\.populate\(ALLOWED_OFFER_USER_POPULATE\)/);
  assert.match(source, /withAllowedOfferUsers\(created\)/);
  assert.match(source, /withAllowedOfferUsers\(updated\)/);
  assert.match(source, /\.map\(withAllowedOfferUsers\)/);
});

test('test-mode rewards stay out of the public Live Feed', () => {
  const user = { _id: new mongoose.Types.ObjectId(), displayName: 'T' };
  const tx = { transactionType: 'direct_offer_reward', status: 'completed', amount: 5, metadata: { testOffer: true } };
  assert.equal(buildNewEarningPayload({ transaction: tx, user }), null);
  assert.ok(buildNewEarningPayload({ transaction: { ...tx, metadata: {} }, user }));
  assert.match(read('routes/public.js'), /'metadata\.testOffer': \{ \$ne: true \}/);
  assert.match(read('services/rewards/rewardService.js'), /directOffer\?\.visibility === 'selected' && \{ testOffer: true \}/);
});

test('admin UI has the visibility choice, tester list, badge and go-live button', () => {
  const ui = fs.readFileSync(path.join(__dirname, '../../frontend/src/pages/admin/AdminDirectOffers.jsx'), 'utf8');
  assert.match(ui, /Only selected test users/);
  assert.match(ui, /allowedUsersText/);
  assert.match(ui, /Go live for everyone/);
  assert.match(ui, /body: JSON\.stringify\(\{ visibility: 'everyone' \}\)/);
});
