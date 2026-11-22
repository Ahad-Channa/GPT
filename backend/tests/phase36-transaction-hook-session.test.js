const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Transaction = require('../models/Transaction');

// A hang was caused by this post-save hook writing to the user OUTSIDE the reward
// database transaction. It must always reuse the saved document's session.
const SESSION = { id: 'reward-session' };
const makeDoc = (extra = {}) => ({
  status: 'completed', transactionType: 'direct_offer_reward', amount: 5000, userId: 'u1', createdAt: new Date(),
  $session: () => SESSION, ...extra,
});
const makeUserModel = (user) => {
  const calls = { findById: [], updateOne: [] };
  return {
    calls,
    findById: async (id, projection, options) => { calls.findById.push({ id, options }); return user; },
    updateOne: async (filter, update, options) => { calls.updateOne.push({ filter, update, options }); return {}; },
  };
};

test('daily-bonus hook reads and writes the user inside the saving transaction (no outside write)', async () => {
  const model = makeUserModel({ _id: 'u1', dailyBonusStreak: 0, dailyBonusTimerStart: null, lastDailyBonusClaim: null });
  await Transaction.initDailyBonusTimer(makeDoc(), model);

  assert.equal(model.calls.findById.length, 1);
  assert.equal(model.calls.findById[0].options.session, SESSION);
  assert.equal(model.calls.updateOne.length, 1, 'timer is initialised');
  assert.equal(model.calls.updateOne[0].options.session, SESSION, 'the update uses the same session');
  assert.ok(model.calls.updateOne[0].update.$set.dailyBonusTimerStart);
});

test('expired timer is refreshed inside the same session too', async () => {
  const old = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const model = makeUserModel({ _id: 'u1', dailyBonusStreak: 0, dailyBonusTimerStart: old, lastDailyBonusClaim: null });
  await Transaction.initDailyBonusTimer(makeDoc(), model);
  assert.equal(model.calls.updateOne[0].options.session, SESSION);
});

test('outside a database transaction the hook behaves as before (no session option)', async () => {
  const model = makeUserModel({ _id: 'u1', dailyBonusStreak: 0, dailyBonusTimerStart: null });
  await Transaction.initDailyBonusTimer(makeDoc({ $session: () => null }), model);
  assert.deepEqual(model.calls.updateOne[0].options, {});
  await Transaction.initDailyBonusTimer(makeDoc({ $session: undefined }), makeUserModel({ _id: 'u1', dailyBonusStreak: 0 }));
});

test('hook does nothing for held, zero or non-earning transactions, and for a fresh timer', async () => {
  for (const extra of [{ status: 'hold' }, { amount: 0 }, { transactionType: 'withdrawal' }]) {
    const model = makeUserModel({ _id: 'u1', dailyBonusStreak: 0 });
    await Transaction.initDailyBonusTimer(makeDoc(extra), model);
    assert.equal(model.calls.findById.length, 0, JSON.stringify(extra));
  }
  const fresh = makeUserModel({ _id: 'u1', dailyBonusStreak: 0, dailyBonusTimerStart: new Date() });
  await Transaction.initDailyBonusTimer(makeDoc(), fresh);
  assert.equal(fresh.calls.updateOne.length, 0);
});

test('a failure in the hook is logged and never throws into the reward flow', async () => {
  const model = { findById: async () => { throw new Error('db down'); }, updateOne: async () => {} };
  const original = console.error;
  console.error = () => {};
  try {
    await assert.doesNotReject(Transaction.initDailyBonusTimer(makeDoc(), model));
  } finally {
    console.error = original;
  }
});

test('the schema registers the post-save hook through the session-aware function', () => {
  const source = fs.readFileSync(path.join(__dirname, '../models/Transaction.js'), 'utf8');
  assert.match(source, /transactionSchema\.post\('save', async function \(doc\) \{\s*await initDailyBonusTimer\(doc\);/);
  assert.match(source, /doc\.\$session\(\)/);
  assert.match(source, /User\.updateOne\(\{ _id: user\._id \}, \{ \$set: updateObj \}, sessionOptions\)/);
});
