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

// ─── Live Feed source/offer rules ────────────────────────────────────────────
// Line 1 = provider, line 2 = offer name (always). `stepLabel`/`isMultiStep`
// drive the hover popup ("Earn" + step) and are set for multi-step rewards only.

const single = (sourceLine, detailLine) => ({ sourceLine, detailLine, isMultiStep: false, stepLabel: '' });

test('live feed 1: direct single-step = Goodpicks + offer name, no popup step', async () => {
  const { getLiveFeedDisplay } = await loadDisplay();
  assert.deepEqual(
    getLiveFeedDisplay({
      transactionType: 'direct_offer_reward',
      description: 'QA Offer',
      metadata: { providerId: 'direct', providerName: 'Goodpicks', offerTitle: 'QA Offer', goalKey: null, stepLabel: '' },
    }),
    single('Goodpicks', 'QA Offer')
  );
});

test('live feed 2: direct multi-step = Goodpicks + offer name, completed step only for the popup', async () => {
  const { getLiveFeedDisplay } = await loadDisplay();
  const metadata = {
    providerId: 'direct',
    providerName: 'Goodpicks',
    offerTitle: 'Plarium Vikings',
    goalKey: 'fight_20_battles',
    stepLabel: 'fight_20_battles',
  };
  const tx = { transactionType: 'direct_offer_reward', description: 'Plarium Vikings - fight_20_battles', metadata };
  assert.deepEqual(getLiveFeedDisplay(tx), {
    sourceLine: 'Goodpicks',
    detailLine: 'Plarium Vikings',
    isMultiStep: true,
    stepLabel: 'Fight 20 Battles',
  });
  // Display only: stored goal key / step label are untouched.
  assert.equal(metadata.goalKey, 'fight_20_battles');
  assert.equal(metadata.stepLabel, 'fight_20_battles');
});

test('live feed 2b: direct multi-step without offerTitle metadata still shows the offer, not the step', async () => {
  const { getLiveFeedDisplay } = await loadDisplay();
  assert.deepEqual(
    getLiveFeedDisplay({
      transactionType: 'direct_offer_reward',
      description: 'Plarium Vikings - Reach Level 10',
      metadata: { providerId: 'direct', goalKey: 'level_10', stepLabel: 'Reach Level 10' },
    }),
    { sourceLine: 'Goodpicks', detailLine: 'Plarium Vikings', isMultiStep: true, stepLabel: 'Reach Level 10' }
  );
  // Legacy multi-step row whose whole description is the step: no offer name is known.
  assert.deepEqual(
    getLiveFeedDisplay({
      transactionType: 'direct_offer_reward',
      description: 'Reach Level 10',
      metadata: { goalKey: 'level_10', stepLabel: 'Reach Level 10' },
    }),
    { sourceLine: 'Goodpicks', detailLine: 'Offer details unavailable', isMultiStep: true, stepLabel: 'Reach Level 10' }
  );
});

test('live feed 3: offerwall single-step = provider + offer name, no popup step', async () => {
  const { getLiveFeedDisplay } = await loadDisplay();
  assert.deepEqual(
    getLiveFeedDisplay({
      transactionType: 'offer_reward',
      description: 'Survey X',
      metadata: { providerId: 'lootably', providerName: 'Lootably', offerTitle: 'Survey X', campaignTitle: 'Survey X', stepLabel: null },
    }),
    single('Offerwall: Lootably', 'Survey X')
  );
  // A "step" that merely repeats the offer name is not a second step.
  assert.deepEqual(
    getLiveFeedDisplay({
      transactionType: 'offer_reward',
      metadata: { providerName: 'CPX Research', offerTitle: 'Survey 42', stepLabel: 'Survey 42' },
    }),
    single('Offerwall: CPX Research', 'Survey 42')
  );
});

test('live feed 4: offerwall multi-step = provider + offer name, humanized step only for the popup', async () => {
  const { getLiveFeedDisplay } = await loadDisplay();
  assert.deepEqual(
    getLiveFeedDisplay({
      transactionType: 'offer_reward',
      description: 'fight_20_battles',
      metadata: { providerId: 'lootably', providerName: 'Lootably', offerTitle: 'Plarium', campaignTitle: 'Plarium', stepLabel: 'fight_20_battles' },
    }),
    { sourceLine: 'Offerwall: Lootably', detailLine: 'Plarium', isMultiStep: true, stepLabel: 'Fight 20 Battles' }
  );
  assert.deepEqual(
    getLiveFeedDisplay({
      _id: 'tx-1',
      transactionType: 'offer_reward',
      amount: 250,
      description: 'Reach Level 5',
      metadata: { providerId: 'lootably', providerName: 'Lootably', offerTitle: 'Game Install', stepLabel: 'Reach Level 5' },
      userId: { _id: 'user-1', displayName: 'Player' },
    }),
    { sourceLine: 'Offerwall: Lootably', detailLine: 'Game Install', isMultiStep: true, stepLabel: 'Reach Level 5' }
  );
});

test('live feed 5: legacy/missing metadata falls back safely and never shows the provider as the offer name', async () => {
  const { getLiveFeedDisplay } = await loadDisplay();
  const unavailable = single('Offerwall: Lootably', 'Offer details unavailable');
  assert.deepEqual(getLiveFeedDisplay({ transactionType: 'offer_reward', metadata: { providerName: 'Lootably' } }), unavailable);
  assert.deepEqual(
    getLiveFeedDisplay({ transactionType: 'offer_reward', metadata: { providerName: 'Lootably', offerTitle: 'Lootably' } }),
    unavailable
  );
  for (const description of ['Lootably Offer Reward', 'Lootably - Offer Reward', 'Offer Reward', 'Completed an Offer', 'Earned from Lootably']) {
    assert.deepEqual(
      getLiveFeedDisplay({ transactionType: 'offer_reward', description, metadata: { providerId: 'lootably', providerName: 'Lootably' } }),
      unavailable,
      description
    );
  }
  // Legacy offerwall row: description was the step, no offer title stored -> not shown as offer name.
  assert.deepEqual(
    getLiveFeedDisplay({
      transactionType: 'offer_reward',
      description: 'Reach Level 5',
      metadata: { providerName: 'Lootably', stepLabel: 'Reach Level 5' },
    }),
    { sourceLine: 'Offerwall: Lootably', detailLine: 'Offer details unavailable', isMultiStep: true, stepLabel: 'Reach Level 5' }
  );
  // Privacy-scrubbed / no provider at all.
  assert.deepEqual(
    getLiveFeedDisplay({ transactionType: 'offer_reward', description: 'Completed an Offer', metadata: {} }),
    single('Offerwall', 'Offer details unavailable')
  );
  // Legacy direct rows: providerId direct maps to Goodpicks; old generic suffix stripped; no goalKey => single-step.
  assert.deepEqual(
    getLiveFeedDisplay({ transactionType: 'direct_offer_reward', description: 'QA Offer - Offer Reward', metadata: { providerId: 'direct' } }),
    single('Goodpicks', 'QA Offer')
  );
  assert.deepEqual(
    getLiveFeedDisplay({ transactionType: 'direct_offer_reward', description: 'Direct offer reward', metadata: {} }),
    single('Goodpicks', 'Offer details unavailable')
  );
  // Non-offer transactions are not handled here.
  assert.equal(getLiveFeedDisplay({ transactionType: 'daily_bonus' }), null);
});

test('live feed: custom offers are Goodpicks offers and never carry a step', async () => {
  const { getLiveFeedDisplay } = await loadDisplay();
  assert.deepEqual(
    getLiveFeedDisplay({ transactionType: 'custom_offer_reward', description: 'Custom Offer Reward: Legacy Manual Offer', metadata: {} }),
    single('Goodpicks', 'Legacy Manual Offer')
  );
  assert.deepEqual(
    getLiveFeedDisplay({ transactionType: 'custom_offer_reward', description: 'Reward for custom offer: QA Offer', metadata: {} }),
    single('Goodpicks', 'QA Offer')
  );
  assert.deepEqual(
    getLiveFeedDisplay({ transactionType: 'custom_offer_reward', metadata: { offerTitle: 'Featured Goodpicks Offer', stepLabel: 'x' } }),
    single('Goodpicks', 'Featured Goodpicks Offer')
  );
});

test('live feed: other provider names stay dynamic', async () => {
  const { getLiveFeedDisplay } = await loadDisplay();
  assert.deepEqual(
    getLiveFeedDisplay({ transactionType: 'offer_reward', metadata: { providerName: 'CPX Research', offerTitle: 'Survey 42' } }),
    single('Offerwall: CPX Research', 'Survey 42')
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
  assert.match(source, /const rewardLabel = humanizeDisplayLabel\(stepLabel \|\| offerTitle\)/);
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
  assert.match(source, /humanizeMachineTokensInText\(notification\.message\)/);
  assert.match(source, /notification\.message = message/);
  assert.match(source, /Legacy offerwall notifications did not store txId/);
});

test('hold-release notification paths humanize stored labels', () => {
  const job = read('backend/utils/earningHoldJob.js');
  assert.match(job, /humanizeDisplayLabel\(offerTitle\)/);
  const admin = read('backend/routes/admin.js');
  assert.match(admin, /humanizeDisplayLabel\(offerTitle\)/);
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

test('reward notification labels humanize raw goal IDs while preserving readable names', () => {
  const { humanizeDisplayLabel, humanizeMachineTokensInText } = require('../utils/displayLabels');
  assert.equal(humanizeDisplayLabel('fight_20_battles'), 'Fight 20 Battles');
  assert.equal(humanizeDisplayLabel('fight__20_battles'), 'Fight 20 Battles');
  assert.equal(humanizeDisplayLabel('Reach Level 10'), 'Reach Level 10');
  assert.equal(humanizeDisplayLabel('Lootably Offer Reward'), 'Lootably Offer Reward');
  assert.equal(humanizeDisplayLabel('Coca-Cola'), 'Coca-Cola');
  assert.equal(
    humanizeMachineTokensInText('Your reward for "fight_20_battles" is ready.'),
    'Your reward for "Fight 20 Battles" is ready.'
  );
});

test('offer reward notification builder uses humanized labels for direct and offerwall rewards', () => {
  const { buildOfferRewardMessage } = require('../services/notifications/offerRewardMessage');

  assert.equal(
    buildOfferRewardMessage({
      transactionType: 'direct_offer_reward',
      amount: 5000,
      status: 'completed',
      metadata: { offerTitle: 'Plarium', stepLabel: 'fight_20_battles' },
    }),
    'You earned +5,000 coins for completing "Fight 20 Battles". The reward is available now.'
  );
  assert.equal(
    buildOfferRewardMessage({
      transactionType: 'offer_reward',
      amount: 250,
      status: 'completed',
      metadata: { providerName: 'Lootably', offerTitle: 'Plarium', stepLabel: 'fight_20_battles' },
    }),
    'You earned +250 coins for "Fight 20 Battles" via Lootably. The reward is available now.'
  );
  assert.equal(
    buildOfferRewardMessage({
      transactionType: 'offer_reward',
      amount: 250,
      status: 'completed',
      metadata: { providerName: 'Lootably', offerTitle: 'Reach Level 10' },
    }),
    'You earned +250 coins for "Reach Level 10" via Lootably. The reward is available now.'
  );
});

test('Linked notification labels are normalized in English and German renderings', async () => {
  const { localizeNotification } = await loadLocalizer();
  const notification = {
    title: 'Offer Reward on Hold',
    message: 'You earned +5,000 coins for completing "fight_20_battles". It is on hold for 30 days.',
  };

  const english = localizeNotification(notification, 'en').message;
  assert.match(english, /Fight 20 Battles/);
  assert.doesNotMatch(english, /fight_20_battles/);

  const german = localizeNotification(notification, 'de').message;
  assert.match(german, /Fight 20 Battles/);
  assert.match(german, /30 Tage/);
  assert.doesNotMatch(german, /fight_20_battles/);
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
  // Hover popup: "Earn" + step for multi-step only; none for single-step offers.
  assert.match(bar, /hasPopup = Boolean\(liveDisplay\.isMultiStep && liveDisplay\.stepLabel\)/);
  assert.match(bar, /popup = hasPopup \? \{ title: 'Earn', subtitle: liveDisplay\.stepLabel \} : null/);
  assert.match(bar, /if \(details\.hasPopup === false\) return;/);
  assert.match(bar, /hoveredData\.details\.popupTitle/);
  assert.match(bar, /hoveredData\.details\.popupSubtitle/);
  assert.doesNotMatch(bar, /title=\{`\$\{details\.sourceLine\}/);
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

  // REST earnings keep metadata intact, and socket events use the same tx shape.
  const publicRoute = read('backend/routes/public.js');
  assert.match(publicRoute, /Transaction\.find\(\{[\s\S]*?\.populate\('userId', 'displayName avatarUrl isPrivate'\)[\s\S]*?\.lean\(\)/);
  assert.doesNotMatch(publicRoute, /\.select\([^)]*metadata/);
  assert.match(bar, /socketRef\.current\.on\('newEarning', \(newTx\)/);
  assert.match(bar, /updateEarnings\(\(prev\)/);
});
