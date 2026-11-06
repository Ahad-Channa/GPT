const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const displayUrl = pathToFileURL(path.join(repoRoot, 'frontend/src/utils/earningDisplay.js')).href;
const loadDisplay = () => import(displayUrl);

// ─── Live Feed primary/secondary rules ───────────────────────────────────────

test('single-step Direct Offer shows only the offer title', async () => {
  const { getEarningDisplay } = await loadDisplay();
  const display = getEarningDisplay({ transactionType: 'direct_offer_reward', metadata: { offerTitle: 'QA Offer' } });
  assert.deepEqual(display, { primary: 'QA Offer', secondary: '' });
});

test('multi-step Direct Offer shows only the paid goal and humanizes a raw goal key', async () => {
  const { getEarningDisplay } = await loadDisplay();
  const display = getEarningDisplay({
    transactionType: 'direct_offer_reward',
    metadata: { offerTitle: 'QA Multi Step Offer', goalKey: 'fight__20_battles', stepLabel: 'fight__20_battles' },
  });
  assert.deepEqual(display, { primary: 'Fight 20 Battles', secondary: '' });
});

test('offerwall: campaign title primary with provider secondary only when different', async () => {
  const { getEarningDisplay } = await loadDisplay();
  assert.deepEqual(
    getEarningDisplay({ transactionType: 'offer_reward', metadata: { campaignTitle: 'Survey X', providerName: 'CPX Research' } }),
    { primary: 'Survey X', secondary: 'CPX Research' }
  );
  // Provider-only: no duplicate secondary.
  assert.deepEqual(
    getEarningDisplay({ transactionType: 'offer_reward', metadata: { providerName: 'Lootably' } }),
    { primary: 'Lootably', secondary: '' }
  );
  // Same label on both lines collapses to one.
  assert.deepEqual(
    getEarningDisplay({ transactionType: 'offer_reward', metadata: { campaignTitle: 'CPX Research', providerName: 'CPX Research' } }),
    { primary: 'CPX Research', secondary: '' }
  );
});

test('manual/custom offer: primary is the offer title, secondary is "Custom Offer"', async () => {
  const { getEarningDisplay } = await loadDisplay();
  assert.deepEqual(
    getEarningDisplay({ transactionType: 'custom_offer_reward', metadata: { offerTitle: 'Manual Offer' } }),
    { primary: 'Manual Offer', secondary: 'Custom Offer' }
  );
  // Legacy description-only row.
  assert.deepEqual(
    getEarningDisplay({ transactionType: 'custom_offer_reward', description: 'Custom Offer Reward: Legacy Manual Offer' }),
    { primary: 'Legacy Manual Offer', secondary: 'Custom Offer' }
  );
});

test('legacy rows strip the old generic suffix and never fall back to "Task: Completed offer"', async () => {
  const { getEarningDisplay } = await loadDisplay();
  assert.deepEqual(
    getEarningDisplay({ transactionType: 'direct_offer_reward', description: 'QA Offer - Offer Reward' }),
    { primary: 'QA Offer', secondary: '' }
  );
  assert.deepEqual(
    getEarningDisplay({ transactionType: 'offer_reward', description: 'Offer Reward' }),
    { primary: 'Offer', secondary: '' }
  );
});

// ─── Backend notification / metadata wiring ──────────────────────────────────

test('direct-offer notification names the source and uses actual hold duration', () => {
  const source = read('backend/services/rewards/rewardService.js');
  assert.match(source, /You earned \+.*coins from \$\{displayName\}/);
  assert.match(source, /You completed an offer from \$\{displayName\} for \+/);
  assert.match(source, /The reward is placed on hold for \$\{holdDays\} days\./);
  assert.match(source, /rewardTx\?\.holdUntil/);
});

test('offerwall transaction carries providerName and uses actual hold duration', () => {
  const source = read('backend/routes/offerwalls.js');
  assert.match(source, /providerName: provider\.label \|\| providerId/);
  assert.match(source, /holdDaysRemaining/);
  assert.match(source, /You completed an offer from \$\{providerName\} for \+/);
});

test('custom offer transaction carries offerTitle and uses actual hold duration', () => {
  const source = read('backend/routes/admin.js');
  assert.match(source, /offerTitle: submission\.offerId\.title/);
  assert.match(source, /sourceLabel: 'Custom Offer'/);
  assert.match(source, /customHoldDays/);
  assert.match(source, /placed on hold for \$\{customHoldDays\} days/);
});

test('Live Feed uses the shared resolver and drops the generic fallbacks', () => {
  const bar = read('frontend/src/components/LiveEarningsBar.jsx');
  assert.match(bar, /getEarningDisplay\(tx\)/);
  assert.doesNotMatch(bar, /'Task: Completed offer'/);

  const ticker = read('frontend/src/components/LiveEarningsTicker.jsx');
  assert.match(ticker, /getEarningDisplay\(earning\)\.primary/);
  assert.doesNotMatch(ticker, /'from an offer'/);
});
