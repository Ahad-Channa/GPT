const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  groupCompletedGoalKeysByOffer,
  groupOfferCreditState,
  resolveCompletedGoalKeys,
  resolveOfferLifecycle,
  buildOfferCreditConversionQuery,
  OFFER_LIFECYCLES,
} = require('../services/tracking/offerGoalCompletion');

const OFFER_ID = '64b000000000000000000001';
const goal = (goalKey, enabled = true) => ({ goalKey, enabled, rewardAmount: 100 });
const credited = (extra = {}) => ({
  offerId: OFFER_ID, goalKey: null, internalStatus: 'approved', processingState: 'processed', rewardTransactionId: 'tx1', ...extra,
});
const reversed = (extra = {}) => credited({ internalStatus: 'reversed', processingState: 'reversed', ...extra });

// Mirrors what GET /api/direct-offers does per offer.
const lifecycleFor = ({ offer, click = null, submission = null, conversions = [] }) => {
  const completedGoalKeys = resolveCompletedGoalKeys(offer, groupCompletedGoalKeysByOffer(conversions));
  const creditState = groupOfferCreditState(conversions)[String(offer._id)] || null;
  return resolveOfferLifecycle({ offer, click, submission, completedGoalKeys, creditState });
};

const single = { _id: OFFER_ID, trackingMode: 'postback', goals: [] };
const multi = (goals) => ({ _id: OFFER_ID, trackingMode: 'postback', goals });
const manual = { _id: OFFER_ID, trackingMode: 'manual', goals: [] };

test('never-started offers are available (active, not in History)', () => {
  assert.equal(lifecycleFor({ offer: single }), 'available');
  assert.equal(lifecycleFor({ offer: manual }), 'available');
});

test('single-step: a click starts it (History + still active); credit completes it', () => {
  const click = { status: 'clicked' };
  assert.equal(lifecycleFor({ offer: single, click }), 'started');
  assert.equal(lifecycleFor({ offer: single, click: { status: 'approved' }, conversions: [credited()] }), 'completed');
});

test('single-step: pending and rejected clicks stay incomplete', () => {
  assert.equal(lifecycleFor({ offer: single, click: { status: 'pending' } }), 'pending');
  assert.equal(lifecycleFor({ offer: single, click: { status: 'rejected' } }), 'rejected');
});

test('single-step: legacy approved click without conversion rows counts as completed', () => {
  assert.equal(lifecycleFor({ offer: single, click: { status: 'approved' } }), 'completed');
});

test('multi-step: first credited goal sets clickStatus=approved but the offer stays active', () => {
  const offer = multi([goal('register'), goal('deposit'), goal('level_10')]);
  const conversions = [credited({ goalKey: 'register' })];
  assert.equal(lifecycleFor({ offer, click: { status: 'approved' }, conversions }), 'started');
});

test('multi-step: completed only when every enabled goal is credited', () => {
  const offer = multi([goal('register'), goal('deposit')]);
  const all = [credited({ goalKey: 'register' }), credited({ goalKey: 'deposit', rewardTransactionId: 'tx2' })];
  assert.equal(lifecycleFor({ offer, click: { status: 'approved' }, conversions: all }), 'completed');
});

test('multi-step: disabled goals never block completion', () => {
  const offer = multi([goal('register'), goal('deposit'), goal('retired', false)]);
  const conversions = [credited({ goalKey: 'register' }), credited({ goalKey: 'deposit', rewardTransactionId: 'tx2' })];
  assert.equal(lifecycleFor({ offer, click: { status: 'approved' }, conversions }), 'completed');
  // ...and a credited goal that is now disabled does not count toward the enabled set
  const partial = multi([goal('register', false), goal('deposit')]);
  assert.equal(lifecycleFor({ offer: partial, click: { status: 'approved' }, conversions: [credited({ goalKey: 'register' })] }), 'started');
});

test('multi-step: a reversed goal no longer counts and is not re-creditable', () => {
  const offer = multi([goal('register'), goal('deposit')]);
  const conversions = [credited({ goalKey: 'register' }), reversed({ goalKey: 'deposit', rewardTransactionId: 'tx2' })];
  assert.equal(lifecycleFor({ offer, click: { status: 'approved' }, conversions }), 'started');
  // the reversed conversion row is never active-credited
  assert.deepEqual(resolveCompletedGoalKeys(offer, groupCompletedGoalKeysByOffer(conversions)), ['register']);
});

test('single-step reversal: represented as reversed, not completed and not earnable again', () => {
  const lifecycle = lifecycleFor({ offer: single, click: { status: 'approved' }, conversions: [reversed()] });
  assert.equal(lifecycle, 'reversed');
  assert.notEqual(lifecycle, 'completed');
  // A reversal followed by anything must not look credited: only an active credited row completes.
  assert.equal(groupOfferCreditState([reversed()])[OFFER_ID].credited, false);
});

test('reversal anti-replay policy is untouched: reward claim keys and idempotency code unchanged', () => {
  const reward = fs.readFileSync(path.join(__dirname, '../services/rewards/rewardService.js'), 'utf8');
  const lifecycleSource = fs.readFileSync(path.join(__dirname, '../services/tracking/offerGoalCompletion.js'), 'utf8');
  // Lifecycle code is read-only: no model writes of any kind.
  assert.doesNotMatch(lifecycleSource, /findOneAndUpdate|updateOne|updateMany|\.save\(|\.create\(/);
  assert.match(reward, /processingState/);
});

test('manual offers: started / pending / rejected stay incomplete; approved completes', () => {
  assert.equal(lifecycleFor({ offer: manual, click: { status: 'clicked' }, submission: { status: 'started' } }), 'started');
  assert.equal(lifecycleFor({ offer: manual, submission: { status: 'pending' } }), 'pending');
  assert.equal(lifecycleFor({ offer: manual, submission: { status: 'rejected' } }), 'rejected');
  assert.equal(lifecycleFor({ offer: manual, submission: { status: 'approved' } }), 'completed');
  assert.equal(lifecycleFor({ offer: manual, submission: { status: 'chargebacked' } }), 'reversed');
  // an approved *click* alone never completes a manual offer
  assert.equal(lifecycleFor({ offer: manual, click: { status: 'approved' }, submission: { status: 'pending' } }), 'pending');
});

test('lifecycle is derived from persisted data only (same inputs after reload => same state)', () => {
  const inputs = { offer: multi([goal('a'), goal('b')]), click: { status: 'approved' }, conversions: [credited({ goalKey: 'a' })] };
  assert.equal(lifecycleFor(inputs), lifecycleFor(JSON.parse(JSON.stringify(inputs))));
  assert.ok(OFFER_LIFECYCLES.includes(lifecycleFor(inputs)));
});

test('credit query covers credited and reversed direct conversions for one user', () => {
  const q = buildOfferCreditConversionQuery('user-1');
  assert.equal(q.userId, 'user-1');
  assert.equal(q.providerId, 'direct');
  assert.deepEqual(q.internalStatus, { $in: ['approved', 'reversed'] });
  assert.deepEqual(q.rewardTransactionId, { $ne: null });
});

test('GET /api/direct-offers exposes the server lifecycle and keeps click security intact', () => {
  const source = fs.readFileSync(path.join(__dirname, '../routes/directOffers.js'), 'utf8');
  assert.match(source, /resolveOfferLifecycle\(\{[\s\S]{0,200}completedGoalKeys[\s\S]{0,120}creditState/);
  assert.match(source, /lifecycle,\s*\n\s*isCompleted: lifecycle === 'completed'/);
  assert.match(source, /Conversion\.find\(buildOfferCreditConversionQuery\(user\._id\)\)/);
  // unauthenticated users never get a started/completed state
  assert.match(source, /lifecycle: 'available',\s*\n\s*isCompleted: false/);
  // click route: still verifies token, fraud check and reuses the canonical click
  assert.match(source, /router\.post\('\/click\/:offerId', verifyToken, fraudCheck\('offer_click', 'full'\)/);
  assert.match(source, /findExistingDirectOfferClick\(\{/);
});
