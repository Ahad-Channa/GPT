const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const displayUrl = pathToFileURL(path.join(repoRoot, 'frontend/src/utils/earningDisplay.js')).href;
const loadDisplay = () => import(displayUrl);
const localizerUrl = pathToFileURL(path.join(repoRoot, 'frontend/src/utils/notificationLocalizer.js')).href;
const loadLocalizer = () => import(localizerUrl);

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
  assert.deepEqual(
    getEarningDisplay({ transactionType: 'offer_reward', metadata: { campaignTitle: 'Game Install', stepLabel: 'Reach Level 5', providerName: 'Lootably' } }),
    { primary: 'Reach Level 5', secondary: '' }
  );
  // Same label on both lines collapses to one.
  assert.deepEqual(
    getEarningDisplay({ transactionType: 'offer_reward', metadata: { campaignTitle: 'CPX Research', providerName: 'CPX Research' } }),
    { primary: 'CPX Research', secondary: '' }
  );
});

test('manual/custom offer: display only the actual offer title', async () => {
  const { getEarningDisplay } = await loadDisplay();
  assert.deepEqual(
    getEarningDisplay({ transactionType: 'custom_offer_reward', metadata: { offerTitle: 'Manual Offer' } }),
    { primary: 'Manual Offer', secondary: '' }
  );
  // Legacy description-only row.
  assert.deepEqual(
    getEarningDisplay({ transactionType: 'custom_offer_reward', description: 'Custom Offer Reward: Legacy Manual Offer' }),
    { primary: 'Legacy Manual Offer', secondary: '' }
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

// ─── Live Feed source/detail rules ───────────────────────────────────────────

test('live feed: direct single-step shows Goodpicks then the offer title', async () => {
  const { getLiveFeedDisplay } = await loadDisplay();
  assert.deepEqual(
    getLiveFeedDisplay({
      transactionType: 'direct_offer_reward',
      metadata: { providerId: 'direct', offerTitle: 'QA Offer' },
    }),
    { sourceLine: 'Goodpicks', detailLine: 'QA Offer' }
  );
});

test('live feed: direct multi-step shows Goodpicks then the credited step', async () => {
  const { getLiveFeedDisplay } = await loadDisplay();
  assert.deepEqual(
    getLiveFeedDisplay({
      transactionType: 'direct_offer_reward',
      metadata: {
        providerId: 'direct',
        providerName: 'Goodpicks',
        offerTitle: 'Plarium Vikings',
        goalKey: 'fight_20_battles',
        stepLabel: 'Fight 20 Battles',
      },
    }),
    { sourceLine: 'Goodpicks', detailLine: 'Fight 20 Battles' }
  );
});

test('live feed: Lootably single-step shows Offerwall provider then the offer title', async () => {
  const { getLiveFeedDisplay } = await loadDisplay();
  assert.deepEqual(
    getLiveFeedDisplay({
      transactionType: 'offer_reward',
      metadata: { providerId: 'lootably', providerName: 'Lootably', offerTitle: 'Survey X' },
    }),
    { sourceLine: 'Offerwall: Lootably', detailLine: 'Survey X' }
  );
});

test('live feed: Lootably multi-step shows the credited step, not the total offer name', async () => {
  const { getLiveFeedDisplay } = await loadDisplay();
  assert.deepEqual(
    getLiveFeedDisplay({
      transactionType: 'offer_reward',
      metadata: {
        providerId: 'lootably',
        providerName: 'Lootably',
        offerTitle: 'Game Install',
        campaignTitle: 'Game Install',
        stepLabel: 'Reach Level 5',
      },
    }),
    { sourceLine: 'Offerwall: Lootably', detailLine: 'Reach Level 5' }
  );
});

test('live feed: raw step IDs are humanized for display only', async () => {
  const { getLiveFeedDisplay } = await loadDisplay();
  assert.deepEqual(
    getLiveFeedDisplay({
      transactionType: 'offer_reward',
      metadata: { providerName: 'Lootably', offerTitle: 'Plarium', stepLabel: 'fight_20_battles' },
    }),
    { sourceLine: 'Offerwall: Lootably', detailLine: 'Fight 20 Battles' }
  );
});

test('live feed: provider-only rows get a safe Offer detail instead of provider twice', async () => {
  const { getLiveFeedDisplay } = await loadDisplay();
  assert.deepEqual(
    getLiveFeedDisplay({ transactionType: 'offer_reward', metadata: { providerName: 'Lootably' } }),
    { sourceLine: 'Offerwall: Lootably', detailLine: 'Offer' }
  );
  assert.deepEqual(
    getLiveFeedDisplay({
      transactionType: 'offer_reward',
      metadata: { providerName: 'Lootably', offerTitle: 'Lootably' },
    }),
    { sourceLine: 'Offerwall: Lootably', detailLine: 'Offer' }
  );
});

test('live feed: other provider names stay dynamic', async () => {
  const { getLiveFeedDisplay } = await loadDisplay();
  assert.deepEqual(
    getLiveFeedDisplay({
      transactionType: 'offer_reward',
      metadata: { providerName: 'CPX Research', offerTitle: 'Survey 42' },
    }),
    { sourceLine: 'Offerwall: CPX Research', detailLine: 'Survey 42' }
  );
});

test('live feed: legacy direct rows map providerId direct to Goodpicks', async () => {
  const { getLiveFeedDisplay } = await loadDisplay();
  assert.deepEqual(
    getLiveFeedDisplay({
      transactionType: 'direct_offer_reward',
      description: 'QA Offer - Offer Reward',
      metadata: { providerId: 'direct' },
    }),
    { sourceLine: 'Goodpicks', detailLine: 'QA Offer' }
  );
});

// ─── Backend notification / metadata wiring ──────────────────────────────────

test('direct-offer notification names the source and uses actual hold duration', () => {
  const source = read('backend/services/rewards/rewardService.js');
  assert.match(source, /rewardLabel: stepLabel \|\| offerTitle \|\| description/);
  assert.match(source, /You earned \+.*coins for completing "\$\{rewardLabel\}"/);
  assert.match(source, /It is on hold for \$\{holdDays\} days\./);
  assert.match(source, /rewardTx\?\.holdUntil/);
});

test('offerwall transaction carries providerName and uses actual hold duration', () => {
  const source = read('backend/routes/offerwalls.js');
  assert.match(source, /providerName: provider\.label \|\| providerId/);
  assert.match(source, /offerTitle: offerTitle \|\| null/);
  assert.match(source, /stepLabel: stepLabel \|\| null/);
  assert.match(source, /holdDays: holdDaysRemaining/);
  assert.match(source, /const rewardLabel = stepLabel \|\| offerTitle/);
  assert.match(source, /You earned \+\$\{platformCoins\} coins for "\$\{rewardLabel\}" via \$\{providerName\}/);
  assert.match(source, /router\.post\(`\/postback\/\$\{providerId\}`/);
});

test('offerwall postbacks accept safe offer and step names from query or form body', () => {
  const { readOfferTitle, readStepLabel } = require('../routes/offerwalls').__testInternals;
  assert.equal(readOfferTitle({ offer_name: 'Query Campaign' }), 'Query Campaign');
  assert.equal(readOfferTitle({}, { campaignTitle: 'Body Campaign' }), 'Body Campaign');
  assert.equal(readOfferTitle({ offerName: 'Lootably Campaign' }), 'Lootably Campaign');
  assert.equal(readStepLabel({ event_name: 'Reach Level 5' }), 'Reach Level 5');
  assert.equal(readStepLabel({ goalDescription: 'Lootably Step' }), 'Lootably Step');
  assert.equal(readOfferTitle({ offer_name: '<script>alert(1)</script>' }), '<script>alert(1)</script>');
  assert.equal(readOfferTitle({ offer_name: 'bad\nvalue' }), '');
});

test('older generic reward notifications are enriched from their own linked transaction', () => {
  const source = read('backend/routes/notifications.js');
  assert.match(source, /Transaction\.find\(\{ _id: \{ \$in: linkedIds \}, userId: user\._id \}\)/);
  assert.match(source, /buildOfferRewardMessage\(transaction\)/);
  assert.match(source, /notification\.message = message/);
  assert.match(source, /Legacy offerwall notifications did not store txId/);
});

test('linked offer rewards produce specific notifications with the actual hold period', () => {
  const { buildOfferRewardMessage } = require('../services/notifications/offerRewardMessage');
  assert.equal(
    buildOfferRewardMessage({
      transactionType: 'direct_offer_reward', amount: 5000, status: 'hold',
      description: 'Offer - generic', holdUntil: new Date('2026-12-01T00:00:00Z'), createdAt: new Date('2026-11-01T00:00:00Z'),
      metadata: { offerTitle: 'Dragon City', stepLabel: 'Reach Level 10', holdDays: 30 },
    }),
    'You earned +5,000 coins for completing "Reach Level 10". It is on hold for 30 days.'
  );
  assert.equal(
    buildOfferRewardMessage({
      transactionType: 'offer_reward', amount: 250, status: 'completed',
      metadata: { offerTitle: 'Survey 42', providerName: 'CPX Research' },
    }),
    'You earned +250 coins for "Survey 42" via CPX Research. The reward is available now.'
  );
});

test('reward notifications localize offer name, step, and hold duration', async () => {
  const { localizeNotification } = await loadLocalizer();
  const notification = {
    title: 'Offer Reward on Hold',
    message: 'You earned +5,000 coins for completing "Reach Level 10". It is on hold for 30 days.',
  };
  assert.match(localizeNotification(notification, 'de').message, /Reach Level 10.*30 Tage/);
  assert.match(localizeNotification(notification, 'fr').message, /Reach Level 10.*30 jours/);
  assert.match(localizeNotification(notification, 'ur').message, /Reach Level 10.*30 دن/);
});

test('transaction history uses resolved offer names instead of generic earning categories', () => {
  const source = read('frontend/src/components/wallet/TransactionHistory.jsx');
  assert.match(source, /const isOfferReward = \['offer_reward', 'custom_offer_reward', 'direct_offer_reward'\]/);
  assert.match(source, /earningDisplay\.primary/);
  assert.match(source, /const secondaryDescription = isOfferReward\s*\? null/);
});

test('custom offer transaction carries offerTitle and uses actual hold duration', () => {
  const source = read('backend/routes/admin.js');
  assert.match(source, /offerTitle: submission\.offerId\.title/);
  assert.match(source, /sourceLabel: 'Custom Offer'/);
  assert.match(source, /customHoldDays/);
  assert.match(source, /placed on hold for \$\{customHoldDays\} days/);
});

test('Live Feed renders source before detail visibly inline, not only in the hover tooltip', () => {
  const bar = read('frontend/src/components/LiveEarningsBar.jsx');
  assert.match(bar, /getLiveFeedDisplay\(tx\)/);
  assert.match(bar, /task = liveDisplay\.sourceLine/);
  assert.match(bar, /taskCategory = liveDisplay\.detailLine/);
  assert.match(bar, /details\.hasOfferDetails/);
  assert.match(bar, /details\.sourceLine/);
  assert.match(bar, /details\.detailLine/);
  assert.doesNotMatch(bar, /'Task: Completed offer'/);

  const inlineIndex = bar.indexOf('Visible provider/source');
  const tooltipIndex = bar.indexOf('Floating Hover Tooltip');
  assert.ok(inlineIndex > -1, 'visible inline detail block must exist');
  assert.ok(tooltipIndex > -1, 'expanded tooltip must still exist');
  assert.ok(inlineIndex < tooltipIndex, 'inline source/detail must render before the hover tooltip');
  assert.doesNotMatch(bar.slice(inlineIndex, tooltipIndex), /hidden md:block/);

  const ticker = read('frontend/src/components/LiveEarningsTicker.jsx');
  assert.match(ticker, /getEarningDisplay\(earning\)\.primary/);
  assert.doesNotMatch(ticker, /'from an offer'/);
});
