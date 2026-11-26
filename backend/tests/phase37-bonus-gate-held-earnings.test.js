const test = require('node:test');
const assert = require('node:assert/strict');

const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Settings = require('../models/Settings');
const router = require('../routes/wallet');

const handlerFor = (method, path) => {
  const layer = router.stack.find((l) => l.route && l.route.path === path && l.route.methods[method]);
  return layer.route.stack[layer.route.stack.length - 1].handle;
};

// Applies the parts of the route's $match that decide which earnings count.
const fakeLedger = (rows) => async (pipeline) => {
  const match = pipeline[0].$match;
  const allows = (filter, value) => (filter && filter.$in ? filter.$in.includes(value) : filter === value);
  const total = rows
    .filter((r) => allows(match.transactionType, r.transactionType) && allows(match.status, r.status))
    .reduce((sum, r) => sum + r.amount, 0);
  return total ? [{ _id: null, total }] : [];
};

const call = async (t, method, rows) => {
  const user = { _id: 'u1', firebaseUid: 'f1', walletBalance: 0, dailyBonusStreak: 0, lastDailyBonusClaim: null };
  t.mock.method(User, 'findOne', async () => user);
  t.mock.method(User, 'findOneAndUpdate', async () => ({ ...user, walletBalance: 100 }));
  t.mock.method(Settings, 'getSingleton', async () => ({ rewardEngine: { dailyBonusEarnGate: [5000], dailyBonusReward: [100] } }));
  t.mock.method(Transaction, 'aggregate', fakeLedger(rows));
  t.mock.method(Transaction, 'create', async (doc) => doc);
  let body;
  const res = { status() { return this; }, json(data) { body = data; return this; } };
  const path = method === 'get' ? '/daily-bonus-status' : '/daily-bonus';
  await handlerFor(method, path)({ user: { uid: 'f1' } }, res);
  return body;
};

const row = (status, transactionType = 'direct_offer_reward') => ({ status, transactionType, amount: 5000 });

test('a held offer reward unlocks the daily bonus and can be claimed', async (t) => {
  const status = await call(t, 'get', [row('hold')]);
  assert.equal(status.earned, 5000);
  assert.equal(status.gateUnlocked, true);
  const claim = await call(t, 'post', [row('hold')]);
  assert.equal(claim.success, true);
  assert.equal(claim.rewardAmount, 100);
});

test('rejected rewards and bonus coins still do not unlock the daily bonus', async (t) => {
  const rows = [row('rejected'), row('completed', 'daily_bonus'), row('completed', 'leaderboard_reward')];
  const status = await call(t, 'get', rows);
  assert.equal(status.earned, 0);
  assert.equal(status.gateUnlocked, false);
  const claim = await call(t, 'post', rows);
  assert.equal(claim.gateRequired, true);
});
