const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Settings = require('../models/Settings');
const router = require('../routes/wallet');

const handlerFor = (method, routePath) => {
  const layer = router.stack.find((l) => l.route && l.route.path === routePath && l.route.methods[method]);
  return layer.route.stack[layer.route.stack.length - 1].handle;
};

const settings = {
  rewardEngine: {
    dailyBonusEarnGate: [1000, 1200, 1400],
    dailyBonusReward: [110, 120, 130],
  },
};

const status = async (t, user, earnedToday) => {
  t.mock.method(User, 'findOne', async () => user);
  t.mock.method(Settings, 'getSingleton', async () => settings);
  t.mock.method(Transaction, 'aggregate', async () => (earnedToday ? [{ _id: null, total: earnedToday }] : []));
  let body;
  const res = { status() { return this; }, json(data) { body = data; return this; } };
  await handlerFor('get', '/daily-bonus-status')({ user: { uid: 'f1' } }, res);
  return body;
};

test('after claiming, today stays at 100% with the claimed reward, even if earnings were charged back', async (t) => {
  // Day 1 claimed today; today's earnings were charged back afterwards (0 counted now).
  const user = { _id: 'u1', firebaseUid: 'f1', dailyBonusStreak: 1, lastDailyBonusClaim: new Date() };
  const body = await status(t, user, 0);
  assert.equal(body.alreadyClaimed, true);
  assert.equal(body.required, 1000, 'gate of the day just claimed');
  assert.equal(body.earned, body.required, 'progress stays full (100%)');
  assert.equal(body.gateUnlocked, true);
  assert.equal(body.rewardToday, 110, 'reward of the day just claimed');
  assert.equal(body.rewardTomorrow, 120, 'tomorrow is day 2');
  assert.equal(body.streak, 1, 'streak is not touched by chargebacks');
});

test('not claimed yet: progress and the upcoming claim are unchanged', async (t) => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const user = { _id: 'u1', firebaseUid: 'f1', dailyBonusStreak: 1, lastDailyBonusClaim: yesterday };
  const body = await status(t, user, 300);
  assert.equal(body.alreadyClaimed, false);
  assert.equal(body.earned, 300);
  assert.equal(body.required, 1200, 'gate of day 2');
  assert.equal(body.gateUnlocked, false);
  assert.equal(body.rewardToday, 120);
  assert.equal(body.rewardTomorrow, 130);
});

test('manual-offer modal shows the "proof submitted" message only once', () => {
  const modal = fs.readFileSync(
    path.join(__dirname, '..', '..', 'frontend/src/components/offers/GoodpicksModal.jsx'),
    'utf8'
  );
  assert.match(modal, /proofMessage\?\.message && !\(proofMessage\.type === 'success' && submissionStatus === 'pending'\)/);
});
