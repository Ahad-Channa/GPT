// Regression tests: Goodpicks History / completion lifecycle end to end
// (backend lifecycle -> GET /api/direct-offers shape -> frontend list helpers).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const {
  groupCompletedGoalKeysByOffer,
  groupOfferCreditState,
  resolveCompletedGoalKeys,
  resolveOfferLifecycle,
} = require('../services/tracking/offerGoalCompletion');

const repoRoot = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(repoRoot, p), 'utf8').replace(/\r\n/g, '\n');
const loadLifecycle = () => import(pathToFileURL(path.join(repoRoot, 'frontend/src/utils/offerLifecycle.js')).href);

const goal = (goalKey, enabled = true) => ({ goalKey, enabled });
const mk = (id, extra = {}) => ({ _id: id, trackingMode: 'postback', goals: [], ...extra });
const credited = (offerId, extra = {}) => ({
  offerId, goalKey: null, internalStatus: 'approved', processingState: 'processed', rewardTransactionId: 'tx', ...extra,
});
const reversed = (offerId, extra = {}) => credited(offerId, { internalStatus: 'reversed', processingState: 'reversed', ...extra });

// Same composition GET /api/direct-offers performs, returning the API fields.
const apiOffer = ({ offer, click = null, submission = null, conversions = [] }) => {
  const completedGoalKeys = resolveCompletedGoalKeys(offer, groupCompletedGoalKeysByOffer(conversions));
  const creditState = groupOfferCreditState(conversions)[String(offer._id)] || null;
  const lifecycle = resolveOfferLifecycle({ offer, click, submission, completedGoalKeys, creditState });
  return {
    ...offer,
    clickStatus: click ? click.status : null,
    startedAt: click ? '2026-01-01T00:00:00Z' : null,
    completedGoalKeys,
    lifecycle,
    isCompleted: lifecycle === 'completed',
  };
};

const historyActionSource = () => read('frontend/src/components/offers/GoodpicksHistoryAction.jsx');
// Source of the `if (lifecycle === 'completed') { ... }` branch only.
const completedBranch = () => {
  const src = historyActionSource();
  const start = src.indexOf("lifecycle === 'completed'");
  const end = src.indexOf('\n  }\n', start);
  assert.ok(start > -1 && end > start, 'completed branch must exist');
  return src.slice(start, end);
};

test('1. single-step credited offer leaves every active list and shows plain completion text in History', async () => {
  const { filterActiveOffers, buildGoodpicksHistory, isOfferCompleted } = await loadLifecycle();
  const done = apiOffer({ offer: mk('a'), click: { status: 'approved' }, conversions: [credited('a')] });
  const open = apiOffer({ offer: mk('b') });
  assert.equal(done.isCompleted, true);
  assert.deepEqual(filterActiveOffers([done, open]).map((o) => o._id), ['b']);
  assert.deepEqual(buildGoodpicksHistory([done, open]).map((o) => o._id), ['a']);
  assert.equal(isOfferCompleted(done), true);

  // Featured (Home), Earn and Goodpicks browse all apply the shared completed filter.
  assert.match(read('frontend/src/pages/Home.jsx'), /filter\(o => !isOfferCompleted\(o\)\)/);
  assert.match(read('frontend/src/pages/Earn.jsx'), /filter\(o => !isOfferCompleted\(o\)\)/);
  assert.match(read('frontend/src/components/offers/GoodpicksModal.jsx'), /setOffers\(filterActiveOffers\(data\.offers\)/);

  // Completed row = plain localized text.
  const branch = completedBranch();
  assert.match(branch, /goodpicks\.completed/);
  assert.match(branch, /<span/);
  assert.equal(JSON.parse(read('frontend/src/i18n/de.json')).goodpicks.completed, 'Abgeschlossen');
  assert.equal(JSON.parse(read('frontend/src/i18n/en.json')).goodpicks.completed, 'Completed');
});

test('2. multi-step offer with some goals credited stays active and keeps See Details', async () => {
  const { filterActiveOffers, buildGoodpicksHistory, getOfferBadgeStatus } = await loadLifecycle();
  const offer = mk('m', { goals: [goal('register'), goal('deposit')] });
  const partial = apiOffer({ offer, click: { status: 'approved' }, conversions: [credited('m', { goalKey: 'register' })] });
  assert.equal(partial.lifecycle, 'started');
  assert.equal(partial.isCompleted, false);
  assert.equal(filterActiveOffers([partial]).length, 1);
  assert.equal(buildGoodpicksHistory([partial]).length, 1);
  // The "Approved" badge must NOT show for a partial offer (clickStatus is already 'approved').
  assert.equal(partial.clickStatus, 'approved');
  assert.equal(getOfferBadgeStatus(partial), 'clicked');
  // Non-completed rows render the details button.
  assert.match(historyActionSource(), /goodpicks\.seeDetails/);
  assert.match(historyActionSource(), /onClick=\{\(\) => onOpen\(offer\)\}/);
});

test('3. multi-step offer with every enabled goal credited is removed from active lists, non-clickable text in History', async () => {
  const { filterActiveOffers, buildGoodpicksHistory, getOfferBadgeStatus } = await loadLifecycle();
  const offer = mk('m', { goals: [goal('register'), goal('deposit'), goal('old', false)] });
  const done = apiOffer({
    offer,
    click: { status: 'approved' },
    conversions: [credited('m', { goalKey: 'register' }), credited('m', { goalKey: 'deposit', rewardTransactionId: 'tx2' })],
  });
  assert.equal(done.lifecycle, 'completed');
  assert.equal(filterActiveOffers([done]).length, 0);
  assert.equal(buildGoodpicksHistory([done]).length, 1);
  assert.equal(getOfferBadgeStatus(done), 'approved');
  const branch = completedBranch();
  for (const forbidden of [/onClick/, /onOpen/, /<button/, /<a[\s>]/, /role=/, /tabIndex/]) {
    assert.doesNotMatch(branch, forbidden);
  }
});

test('4. a reversed goal is not counted as currently completed', async () => {
  const { filterActiveOffers, getOfferBadgeStatus } = await loadLifecycle();
  const offer = mk('m', { goals: [goal('register'), goal('deposit')] });
  const conv = [credited('m', { goalKey: 'register' }), reversed('m', { goalKey: 'deposit', rewardTransactionId: 'tx2' })];
  const o = apiOffer({ offer, click: { status: 'approved' }, conversions: conv });
  assert.deepEqual(o.completedGoalKeys, ['register']);
  assert.notEqual(o.lifecycle, 'completed');
  assert.equal(filterActiveOffers([o]).length, 1);

  // Every goal reversed -> nothing counted, never completed, no Approved badge.
  const allReversed = apiOffer({
    offer,
    click: { status: 'approved' },
    conversions: [reversed('m', { goalKey: 'register' }), reversed('m', { goalKey: 'deposit' })],
  });
  assert.deepEqual(allReversed.completedGoalKeys, []);
  assert.notEqual(allReversed.lifecycle, 'completed');
  assert.notEqual(getOfferBadgeStatus(allReversed), 'approved');

  // Single-step reversal: reversed, not completed, no Approved badge.
  const single = apiOffer({ offer: mk('s'), click: { status: 'approved' }, conversions: [reversed('s')] });
  assert.equal(single.lifecycle, 'reversed');
  assert.equal(getOfferBadgeStatus(single), null);
  assert.equal(filterActiveOffers([single]).length, 1);
});

test('5. manual offer: approved submission completes; pending/rejected do not', async () => {
  const { filterActiveOffers } = await loadLifecycle();
  const manual = (id) => mk(id, { trackingMode: 'manual' });
  const approved = apiOffer({ offer: manual('x1'), submission: { status: 'approved' } });
  const pending = apiOffer({ offer: manual('x2'), submission: { status: 'pending' } });
  const rejected = apiOffer({ offer: manual('x3'), submission: { status: 'rejected' } });
  assert.deepEqual([approved, pending, rejected].map((o) => o.isCompleted), [true, false, false]);
  assert.deepEqual(filterActiveOffers([approved, pending, rejected]).map((o) => o._id), ['x2', 'x3']);
});

test('6. History lists started offers once, survives refresh/reopen, completed action has no handler', async () => {
  const { buildGoodpicksHistory, markOfferStarted, filterActiveOffers } = await loadLifecycle();
  const fresh = [mk('a', { lifecycle: 'available' }), mk('b', { lifecycle: 'available' })];

  // Start 'a' locally: it appears in History immediately and stays an active offer.
  const afterStart = markOfferStarted(fresh, 'a', { clickStatus: 'clicked' });
  assert.deepEqual(buildGoodpicksHistory(afterStart).map((o) => o._id), ['a']);
  assert.equal(filterActiveOffers(afterStart).length, 2);

  // Duplicate rows (local optimistic + server) collapse to one; a started offer is never downgraded.
  const dup = buildGoodpicksHistory([...afterStart, { ...afterStart[0], lifecycle: 'completed' }]);
  assert.equal(dup.length, 1);
  assert.equal(markOfferStarted([{ ...fresh[0], lifecycle: 'completed' }], 'a')[0].lifecycle, 'completed');

  // "Reload": the server derives the same state from persisted click/conversion data alone.
  const reloaded = JSON.parse(JSON.stringify(apiOffer({ offer: mk('a'), click: { status: 'clicked' } })));
  assert.equal(reloaded.lifecycle, 'started');
  assert.deepEqual(buildGoodpicksHistory([reloaded]).map((o) => o._id), ['a']);

  // Modal reads History from the server (placement=all), and the completed row has no handler.
  const modal = read('frontend/src/components/offers/GoodpicksModal.jsx');
  assert.match(modal, /direct-offers\?placement=all/);
  assert.match(modal, /<GoodpicksHistoryAction offer=\{item\} onOpen=\{setSelectedOffer\} \/>/);
  assert.doesNotMatch(completedBranch(), /onClick|onOpen/);
});

test('Approved badge is driven by lifecycle, not raw clickStatus', () => {
  const card = read('frontend/src/components/offers/DirectOfferCard.jsx');
  assert.match(card, /getOfferBadgeStatus\(offer\)/);
  assert.doesNotMatch(card, /getStatusConfig\(t\)\[offer\.clickStatus\]/);
});
