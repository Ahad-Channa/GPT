const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', '..', p), 'utf8');
const {
  getDirectOfferRewardIdentity,
  findDirectOfferClickGoalConversion,
} = require('../services/tracking/conversionService');

const approveRoute = () => {
  const admin = read('backend/routes/admin.js');
  const start = admin.indexOf("router.post('/click-logs/:clickId/approve'");
  const end = admin.indexOf("router.post('/click-logs/:clickId/chargeback'");
  return admin.slice(start, end);
};

test('click log approve credits one chosen step of a multi-step offer', () => {
  const route = approveRoute();
  // no longer sends the admin to the Conversions page for multi-step offers
  assert.doesNotMatch(route, /Approve the specific goal from the Conversions page/);
  assert.match(route, /const goalKey = cleanString\(req\.body\?\.goalKey, 120\)/);
  assert.match(route, /Choose the step to approve/);
  assert.match(route, /Unknown step for this click/);
  // amount comes from the click-time step snapshot, through the shared reward path
  assert.match(route, /rewardAmount: Number\(goal\.amount\)/);
  assert.match(route, /goalKey,\s*\n\s*rewardAmount/);
  assert.match(route, /transactionId: `manual:\$\{clickLog\.clickId\}:\$\{goalKey\}`/);
  assert.match(route, /const stepReward = await processReward\(/);
  // a step that already has a conversion (credited, charged back or pending) is refused
  assert.match(route, /findDirectOfferClickGoalConversion\(\{\s*\n\s*identity: getDirectOfferRewardIdentity\(\{ providerConfig, clickLog, goalKey \}\)/);
  assert.match(route, /was already credited/);
  assert.match(route, /was charged back and cannot be credited again/);
  // the "already approved" click check only applies to single-step offers
  const stepBranch = route.indexOf('if (enabledGoals.length > 0 || goalsSnapshot)');
  const approvedCheck = route.indexOf("if (clickLog.status === 'approved')");
  assert.ok(stepBranch > 0 && approvedCheck > stepBranch);
});

test('step identity is per user + offer + step, so each step is paid once', async () => {
  const providerConfig = { providerId: 'direct' };
  const clickLog = { _id: 'c1', userId: { _id: 'u1' }, offerId: { _id: 'o1' } };
  const a = getDirectOfferRewardIdentity({ providerConfig, clickLog, goalKey: 'register' });
  const b = getDirectOfferRewardIdentity({ providerConfig, clickLog, goalKey: 'level_10' });
  assert.equal(a.idempotencyKey, 'direct-offer-reward:u1:o1:register');
  assert.notEqual(a.idempotencyKey, b.idempotencyKey);
  // another click of the same user for the same offer has the same identity
  const other = getDirectOfferRewardIdentity({ providerConfig, clickLog: { ...clickLog, _id: 'c2' }, goalKey: 'register' });
  assert.equal(other.idempotencyKey, a.idempotencyKey);

  const stored = { idempotencyKey: a.idempotencyKey, internalStatus: 'approved' };
  const conversionModel = { findOne: async (q) => (q.idempotencyKey === stored.idempotencyKey ? stored : null) };
  assert.equal(await findDirectOfferClickGoalConversion({ identity: a, conversionModel }), stored);
  assert.equal(await findDirectOfferClickGoalConversion({ identity: b, conversionModel }), null);
});

test('click lists carry per-step state and the admin UI offers a step picker', () => {
  const admin = read('backend/routes/admin.js');
  assert.match(admin, /goalSteps: Array\.isArray\(click\.goalSteps\) \? click\.goalSteps : null/);
  assert.equal((admin.match(/await attachClickGoalSteps\(clicks\)/g) || []).length, 2);
  assert.match(admin, /const getGoalConversionState = /);

  const ui = read('frontend/src/pages/admin/AdminDirectOffers.jsx');
  assert.match(ui, /Step to approve/);
  assert.match(ui, /disabled=\{step\.state !== 'open'\}/);
  assert.match(ui, /JSON\.stringify\(goalKey \? \{ reason: trimmed, goalKey \} : \{ reason: trimmed \}\)/);
  assert.match(ui, /steps credited/);
});
