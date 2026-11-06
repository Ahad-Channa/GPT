const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const { buildDirectOfferRewardDescription } = require('../services/rewards/rewardService');
const { buildChargebackDescription } = require('../services/rewards/reversalService');

// ─── Direct Offer descriptions ────────────────────────────────────────────────

test('single-step Direct Offer shows the actual offer title (no generic suffix)', () => {
  assert.equal(buildDirectOfferRewardDescription({ offerTitle: 'created new offer for test' }), 'created new offer for test');
  assert.equal(buildDirectOfferRewardDescription({ offerTitle: 'QA Goal Checkmark Test', stepLabel: '' }), 'QA Goal Checkmark Test');
});

test('multi-step Direct Offer preserves the specific goal/step name', () => {
  assert.equal(
    buildDirectOfferRewardDescription({ offerTitle: 'QA Goal Checkmark Test', stepLabel: 'Register' }),
    'QA Goal Checkmark Test - Register'
  );
  assert.equal(
    buildDirectOfferRewardDescription({ offerTitle: 'QA Goal Checkmark Test', stepLabel: 'Deposit' }),
    'QA Goal Checkmark Test - Deposit'
  );
});

test('generic Offer Reward is only used when no meaningful title exists', () => {
  assert.equal(buildDirectOfferRewardDescription({}), 'Offer Reward');
  assert.equal(buildDirectOfferRewardDescription({ offerTitle: '   ' }), 'Offer Reward');
  // Multi-step without a title still surfaces the meaningful step label.
  assert.equal(buildDirectOfferRewardDescription({ stepLabel: 'Deposit' }), 'Deposit');
});

test('reward service computes an empty step label for single-step offers', () => {
  const source = read('backend/services/rewards/rewardService.js');
  assert.match(source, /buildDirectOfferRewardDescription\(\{\s*offerTitle,\s*stepLabel\s*\}\)/);
  assert.match(
    source,
    /claimed\.goalKey\s*\?\s*String\(goalSnapshot\?\.label \|\| claimed\.goalKey\)\.trim\(\)\s*:\s*''/
  );
});

// ─── Chargeback / reversal descriptions ──────────────────────────────────────

test('chargeback preserves the offer title (and goal for multi-step)', () => {
  assert.equal(buildChargebackDescription({ metadata: { offerTitle: 'QA Offer' } }), 'Chargeback - QA Offer');
  assert.equal(
    buildChargebackDescription({ metadata: { offerTitle: 'QA Offer', stepLabel: 'Deposit' } }),
    'Chargeback - QA Offer - Deposit'
  );
});

test('chargeback ignores the legacy generic step label', () => {
  assert.equal(
    buildChargebackDescription({ metadata: { offerTitle: 'QA Offer', stepLabel: 'Offer Reward' } }),
    'Chargeback - QA Offer'
  );
});

test('chargeback falls back only when no offer metadata exists', () => {
  assert.equal(buildChargebackDescription({}), 'Offer reward reversed');
  assert.equal(buildChargebackDescription({ metadata: { stepLabel: 'Deposit' } }), 'Offer reward reversed');
});

// ─── Offerwall / manual / legacy fallbacks ───────────────────────────────────

test('offerwall reward shows the provider name instead of "Offer Reward" suffix', () => {
  const source = read('backend/routes/offerwalls.js');
  assert.match(source, /description:\s*provider\.label \|\| 'Offer Reward'/);
  assert.doesNotMatch(source, /description:\s*`\$\{provider\.label\} Offer Reward`/);
});

test('manual custom-offer rewards include the actual offer title', () => {
  const source = read('backend/routes/admin.js');
  assert.match(source, /description:\s*`Custom Offer Reward: \$\{submission\.offerId\.title\}`/);
  assert.match(source, /description:\s*`Reward for custom offer: \$\{submission\.offerId\.title\}`/);
});

test('frontend history keeps Offer Reward only as a legacy fallback', () => {
  const profile = read('frontend/src/pages/Profile.jsx');
  assert.match(profile, /getEarningDisplay\(tx\)/);
  assert.match(profile, /title=\{transactionDescription\}/);
});
