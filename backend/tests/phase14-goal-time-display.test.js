const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'your-project-id';

const DirectOffer = require('../models/DirectOffer');
const { normalizeGoals, parseTimeLimitDays, buildGoalsSnapshot, resolveGoal } = require('../utils/offerGoals');

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const goal = (overrides = {}) => ({ goalKey: 'deposit', label: 'Deposit', rewardAmount: 500, ...overrides });

// ─── Backend: parsing / validation ────────────────────────────────────────────

test('goal with no timeLimitDays remains valid and stores null', () => {
  const [normalized] = normalizeGoals([goal()]);
  assert.equal(normalized.timeLimitDays, null);
  assert.equal(parseTimeLimitDays(undefined), null);
  assert.equal(parseTimeLimitDays(null), null);
  assert.equal(parseTimeLimitDays(''), null);
});

test('a positive integer timeLimitDays persists, including 1', () => {
  assert.equal(normalizeGoals([goal({ timeLimitDays: 3 })])[0].timeLimitDays, 3);
  assert.equal(normalizeGoals([goal({ timeLimitDays: 1 })])[0].timeLimitDays, 1);
  assert.equal(normalizeGoals([goal({ timeLimitDays: '8' })])[0].timeLimitDays, 8);
  assert.equal(parseTimeLimitDays(5), 5);
});

test('decimal, zero, negative, and invalid-string timeLimitDays are rejected with 400', () => {
  for (const invalid of [1.5, 0, -1, 'abc', '3.5']) {
    assert.throws(
      () => normalizeGoals([goal({ timeLimitDays: invalid })]),
      (error) => error.statusCode === 400 && /positive integer/.test(error.message),
      `timeLimitDays ${invalid} must be rejected`
    );
    assert.throws(() => parseTimeLimitDays(invalid), /positive integer/);
  }
});

test('DirectOffer model stores timeLimitDays per goal and defaults to null when absent', () => {
  const base = { title: 't', description: 'd', rewardAmount: 10, advertiserUrl: 'https://example.com' };
  const withTime = new DirectOffer({ ...base, goals: [{ goalKey: 'a', rewardAmount: 5, timeLimitDays: 3 }] });
  assert.equal(withTime.goals[0].timeLimitDays, 3);

  const withoutTime = new DirectOffer({ ...base, goals: [{ goalKey: 'a', rewardAmount: 5 }] });
  assert.equal(withoutTime.goals[0].timeLimitDays, null);
});

test('editing from 3 to 5 persists via normalizeGoals; clearing produces null', () => {
  assert.equal(normalizeGoals([goal({ timeLimitDays: 3 })])[0].timeLimitDays, 3);
  assert.equal(normalizeGoals([goal({ timeLimitDays: 5 })])[0].timeLimitDays, 5);
  assert.equal(normalizeGoals([goal({ timeLimitDays: null })])[0].timeLimitDays, null);
  assert.equal(normalizeGoals([goal({ timeLimitDays: '' })])[0].timeLimitDays, null);
});

// ─── Backend: display-only guarantee (no expiry/enforcement) ──────────────────

test('timeLimitDays is not part of the click-time goals snapshot or goal resolution', () => {
  const snapshot = buildGoalsSnapshot([{ goalKey: 'deposit', rewardAmount: 500, timeLimitDays: 5, enabled: true }]);
  assert.ok(snapshot && snapshot.deposit);
  assert.equal(Object.prototype.hasOwnProperty.call(snapshot.deposit, 'timeLimitDays'), false);

  const resolved = resolveGoal({ goalsSnapshot: snapshot, eventType: 'deposit' });
  assert.equal(resolved.matched, true);
  assert.equal(Object.prototype.hasOwnProperty.call(resolved, 'timeLimitDays'), false);
});

test('no enforcement path references timeLimitDays', () => {
  for (const file of [
    'backend/services/tracking/conversionService.js',
    'backend/services/tracking/offerGoalCompletion.js',
    'backend/services/rewards/rewardService.js',
    'backend/routes/directOffers.js',
  ]) {
    assert.doesNotMatch(read(file), /timeLimitDays/, `${file} must not use timeLimitDays for logic`);
  }
});

// ─── Frontend: display formatting behavior ────────────────────────────────────

const goalTimeLimitUrl = pathToFileURL(path.join(repoRoot, 'frontend/src/utils/goalTimeLimit.js')).href;

test('formatGoalTimeLimit renders "ND" only for positive integers', async () => {
  const { formatGoalTimeLimit } = await import(goalTimeLimitUrl);
  assert.equal(formatGoalTimeLimit(3), '3D');
  assert.equal(formatGoalTimeLimit(1), '1D');
  assert.equal(formatGoalTimeLimit(8), '8D');
  assert.equal(formatGoalTimeLimit('5'), '5D');
  assert.equal(formatGoalTimeLimit(0), null);
  assert.equal(formatGoalTimeLimit(-1), null);
  assert.equal(formatGoalTimeLimit(1.5), null);
  assert.equal(formatGoalTimeLimit(null), null);
  assert.equal(formatGoalTimeLimit(undefined), null);
  assert.equal(formatGoalTimeLimit(''), null);
  assert.equal(formatGoalTimeLimit('x'), null);
});

test('Direct Offer and Goodpicks goal rows render the time badge from timeLimitDays', () => {
  const card = read('frontend/src/components/offers/DirectOfferCard.jsx');
  assert.match(card, /formatGoalTimeLimit\(req\.timeLimitDays\)/);
  assert.match(card, /timeLimitDays: goal\.timeLimitDays/);
  // Phase 2 completion behavior unchanged
  assert.match(card, /isGoalCompleted\(offer, goal\)/);

  const goodpicks = read('frontend/src/components/offers/GoodpicksModal.jsx');
  assert.match(goodpicks, /formatGoalTimeLimit\(req\.timeLimitDays\)/);
  assert.match(goodpicks, /timeLimitDays: goal\.timeLimitDays/);
  assert.match(goodpicks, /directGoalIsCompleted\(offer, goal\)/);
});

test('admin direct-offer goal form round-trips timeLimitDays and offers a Time (days) input', () => {
  const admin = read('frontend/src/pages/admin/AdminDirectOffers.jsx');
  assert.match(admin, /timeLimitDays: g\.timeLimitDays \?\? ''/);
  assert.match(admin, /timeLimitDays: \(g\.timeLimitDays === '' \|\| g\.timeLimitDays == null\) \? null : Number\(g\.timeLimitDays\)/);
  assert.match(admin, /Time \(days\)/);
});
