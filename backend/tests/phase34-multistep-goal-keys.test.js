// A multi-step offer must never silently lose a step on save: empty, invalid or
// duplicate Goal Keys are rejected with a message naming the step.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { assertValidGoalKeys, normalizeGoals } = require('../utils/offerGoals');

const repoRoot = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(repoRoot, p), 'utf8').replace(/\r\n/g, '\n');
const goal = (goalKey, extra = {}) => ({ goalKey, rewardAmount: 100, enabled: true, ...extra });

test('the old behavior: normalizeGoals silently drops a step with an unusable key (why the check is needed)', () => {
  const kept = normalizeGoals([goal('register'), goal('2nd step')]);
  assert.deepEqual(kept.map((g) => g.goalKey), ['register']);
});

test('two valid, distinct steps pass', () => {
  assert.doesNotThrow(() => assertValidGoalKeys([goal('register'), goal('level_10')]));
  assert.doesNotThrow(() => assertValidGoalKeys([]));
  assert.doesNotThrow(() => assertValidGoalKeys(undefined));
});

test('empty Goal Key is rejected and names the step', () => {
  assert.throws(() => assertValidGoalKeys([goal('register'), goal('')]), (e) => e.statusCode === 400 && /Step 2 has no Goal Key/.test(e.message));
  assert.throws(() => assertValidGoalKeys([goal('   ')]), (e) => e.statusCode === 400 && /Step 1/.test(e.message));
});

test('invalid Goal Keys (space, leading digit, symbol, too long) are rejected', () => {
  for (const bad of ['level 10', '2nd', 'a.b', 'x'.repeat(65)]) {
    assert.throws(() => assertValidGoalKeys([goal('register'), goal(bad)]), (e) => e.statusCode === 400 && /Step 2/.test(e.message) && /not valid/.test(e.message), bad);
  }
});

test('duplicate Goal Key (case-insensitive) is rejected and names both steps', () => {
  assert.throws(
    () => assertValidGoalKeys([goal('register'), goal('deposit'), goal('Register')]),
    (e) => e.statusCode === 400 && /Step 3/.test(e.message) && /step 1/.test(e.message)
  );
});

test('disabled steps are still checked (they would otherwise vanish too)', () => {
  assert.throws(() => assertValidGoalKeys([goal('register'), goal('bad key', { enabled: false })]), (e) => e.statusCode === 400);
});

test('create and update routes validate Goal Keys before normalizing', () => {
  const admin = read('backend/routes/admin.js');
  assert.match(admin, /assertValidGoalKeys\(goals\); assertEnabledGoalRewards\(goals\);/);
  assert.equal((admin.match(/assertValidGoalKeys\(goals\)/g) || []).length, 2);
});

test('admin form validates the same rules before saving, with the key rule shared from goalKey.js', () => {
  const form = read('frontend/src/pages/admin/AdminDirectOffers.jsx');
  const keyUtil = read('frontend/src/utils/goalKey.js');
  assert.match(keyUtil, /\^\[A-Za-z\]\[A-Za-z0-9_-\]\{0,63\}\$/);
  assert.match(form, /GOAL_KEY_PATTERN\.test\(key\)/);
  assert.match(form, /has no Goal Key/);
  assert.match(form, /is already used by step/);
});
