const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildNewEarningPayload, broadcastNewEarning, scrubTransaction } = require('../utils/earningFeed');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const user = (extra = {}) => ({ _id: 'u1', displayName: 'Ahad', avatarUrl: '/a.png', isPrivate: false, ...extra });
const tx = (extra = {}) => ({
  _id: 't1', transactionType: 'direct_offer_reward', status: 'completed', amount: 10000,
  description: 'Manual Offer', createdAt: '2026-01-01T00:00:00Z',
  metadata: { providerId: 'direct', providerName: 'Goodpicks', offerTitle: 'Manual Offer', enabledGoalCount: 0 },
  ...extra,
});
const fakeIo = () => { const sent = []; return { sent, emit: (event, payload) => sent.push({ event, payload }) }; };

test('payload has the same shape as a /recent-earnings row (public user populated, metadata kept)', () => {
  const payload = buildNewEarningPayload({ transaction: tx(), user: user() });
  assert.equal(payload._id, 't1');
  assert.equal(payload.amount, 10000);
  assert.equal(payload.transactionType, 'direct_offer_reward');
  assert.deepEqual(payload.userId, { _id: 'u1', displayName: 'Ahad', avatarUrl: '/a.png', isPrivate: false });
  assert.equal(payload.metadata.offerTitle, 'Manual Offer');
});

test('private users are scrubbed exactly like the REST feed (no offer title or tracking metadata)', () => {
  const payload = buildNewEarningPayload({ transaction: tx(), user: user({ isPrivate: true }) });
  assert.equal(payload.description, 'Completed an Offer');
  assert.equal(payload.metadata.offerTitle, undefined);
  assert.equal(payload.userId.isPrivate, true);
  assert.deepEqual(payload.metadata, scrubTransaction(tx()).metadata);
});

test('held rewards appear in the feed; zero amounts, reversals and non-feed types never do', () => {
  assert.ok(buildNewEarningPayload({ transaction: tx({ status: 'hold' }), user: user() }));
  assert.equal(buildNewEarningPayload({ transaction: tx({ amount: 0 }), user: user() }), null);
  assert.equal(buildNewEarningPayload({ transaction: tx({ status: 'reversed' }), user: user() }), null);
  // Withdrawals are broadcast now (sanitized, see phase45); chargebacks never are.
  assert.equal(buildNewEarningPayload({ transaction: tx({ transactionType: 'chargeback' }), user: user() }), null);
  assert.equal(buildNewEarningPayload({ transaction: null, user: user() }), null);
});

test('broadcast emits one global newEarning event; no socket or a throwing socket is harmless', () => {
  const io = fakeIo();
  assert.equal(broadcastNewEarning({ transaction: tx(), user: user(), io }), true);
  assert.equal(io.sent.length, 1);
  assert.equal(io.sent[0].event, 'newEarning');
  assert.equal(broadcastNewEarning({ transaction: tx(), user: user(), io: null }), false);
  const broken = { emit() { throw new Error('boom'); } };
  assert.equal(broadcastNewEarning({ transaction: tx(), user: user(), io: broken }), false);
  assert.equal(io.sent.length, 1);
});

test('mongoose-style documents (toObject) are supported', () => {
  const doc = { toObject: () => tx() };
  assert.equal(buildNewEarningPayload({ transaction: doc, user: user() }).amount, 10000);
});

test('every offer-credit path broadcasts: direct/manual rewards, offerwalls and custom-offer approvals', () => {
  assert.match(read('services/rewards/rewardService.js'), /\(hooks\.broadcastNewEarning \|\| broadcastNewEarning\)\(\{ transaction: effect\.rewardTx, user: effect\.user \}\)/);
  assert.match(read('routes/offerwalls.js'), /broadcastNewEarning\(\{ transaction: offerTx, user: updatedUser \}\)/);
  const admin = read('routes/admin.js');
  assert.match(admin, /broadcastNewEarning\(\{ transaction: offerTx, user: freshUser \}\)/);
  assert.match(admin, /broadcastNewEarning\(\{ transaction: offerTx, user \}\)/);
});

test('REST feed and live broadcast share one privacy scrubber', () => {
  assert.match(read('routes/public.js'), /require\('\.\.\/utils\/earningFeed'\)/);
  assert.doesNotMatch(read('routes/public.js'), /function scrubTransaction/);
});
