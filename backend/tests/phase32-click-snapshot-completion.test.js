// Policy: the click-time goalsSnapshot is authoritative for a user's goal
// matching and completion. Later admin edits to the offer's goals never add,
// remove or disable obligations for an existing click.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  groupCompletedGoalKeysByOffer,
  groupOfferCreditState,
  resolveCompletedGoalKeys,
  resolveOfferLifecycle,
  getExpectedGoalKeys,
} = require('../services/tracking/offerGoalCompletion');
const { buildGoalsSnapshot, resolveGoal } = require('../utils/offerGoals');

const OFFER_ID = '64b000000000000000000002';
const goal = (goalKey, enabled = true) => ({ goalKey, enabled, rewardAmount: 100, label: goalKey });
const offerWith = (goals) => ({ _id: OFFER_ID, trackingMode: 'postback', goals });
const credited = (extra = {}) => ({
  offerId: OFFER_ID, goalKey: null, internalStatus: 'approved', processingState: 'processed', rewardTransactionId: 'tx', ...extra,
});

// A click as stored when the offer had these goals at click time.
const clickWith = (goals, status = 'approved') => ({ status, goalsSnapshot: buildGoalsSnapshot(goals) });

// Mirrors GET /api/direct-offers per offer (current offer + stored click + conversions).
const lifecycleFor = ({ offer, click = null, conversions = [] }) => {
  const completedGoalKeys = resolveCompletedGoalKeys(offer, groupCompletedGoalKeysByOffer(conversions), click);
  const creditState = groupOfferCreditState(conversions)[String(offer._id)] || null;
  return {
    lifecycle: resolveOfferLifecycle({ offer, click, completedGoalKeys, creditState }),
    completedGoalKeys,
  };
};

test('snapshot [a,b], only a credited, admin then removes/disables every current goal: stays incomplete', () => {
  const click = clickWith([goal('a'), goal('b')]);
  const conversions = [credited({ goalKey: 'a' })];

  const removed = lifecycleFor({ offer: offerWith([]), click, conversions });
  assert.equal(removed.lifecycle, 'started');
  assert.deepEqual(removed.completedGoalKeys, ['a']);

  const disabled = lifecycleFor({ offer: offerWith([goal('a', false), goal('b', false)]), click, conversions });
  assert.equal(disabled.lifecycle, 'started');
  assert.notEqual(disabled.lifecycle, 'completed');
});

test('snapshot [a,b], both credited, admin then adds c: stays completed (c is not a new requirement)', () => {
  const click = clickWith([goal('a'), goal('b')]);
  const conversions = [credited({ goalKey: 'a' }), credited({ goalKey: 'b', rewardTransactionId: 'tx2' })];
  const offer = offerWith([goal('a'), goal('b'), goal('c')]);

  assert.equal(lifecycleFor({ offer, click, conversions }).lifecycle, 'completed');
  assert.deepEqual([...getExpectedGoalKeys(offer, click)].sort(), ['a', 'b']);

  // Postback matching uses the same snapshot, so c can never be matched for this click.
  const match = resolveGoal({ goalsSnapshot: click.goalsSnapshot, eventType: 'c' });
  assert.equal(match.matched, false);
  // Even a stray credited c conversion does not enter this click's completed set.
  const withStrayC = lifecycleFor({ offer, click, conversions: [...conversions, credited({ goalKey: 'c', rewardTransactionId: 'tx3' })] });
  assert.deepEqual(withStrayC.completedGoalKeys.sort(), ['a', 'b']);
});

test('a new click after c was added snapshots c, and c applies to that click', () => {
  const offer = offerWith([goal('a'), goal('b'), goal('c')]);
  const newClick = clickWith(offer.goals);
  assert.deepEqual([...getExpectedGoalKeys(offer, newClick)].sort(), ['a', 'b', 'c']);

  const ab = [credited({ goalKey: 'a' }), credited({ goalKey: 'b', rewardTransactionId: 'tx2' })];
  assert.equal(lifecycleFor({ offer, click: newClick, conversions: ab }).lifecycle, 'started');
  const abc = [...ab, credited({ goalKey: 'c', rewardTransactionId: 'tx3' })];
  assert.equal(lifecycleFor({ offer, click: newClick, conversions: abc }).lifecycle, 'completed');
});

test('a goal disabled after the click still counts as required for that click', () => {
  const click = clickWith([goal('a'), goal('b')]);
  const offer = offerWith([goal('a'), goal('b', false)]);
  assert.equal(lifecycleFor({ offer, click, conversions: [credited({ goalKey: 'a' })] }).lifecycle, 'started');
  assert.equal(
    lifecycleFor({ offer, click, conversions: [credited({ goalKey: 'a' }), credited({ goalKey: 'b', rewardTransactionId: 'tx2' })] }).lifecycle,
    'completed'
  );
});

test('goals disabled at click time are not in the snapshot and do not block completion', () => {
  const click = clickWith([goal('a'), goal('retired', false)]);
  assert.deepEqual(Object.keys(click.goalsSnapshot), ['a']);
  const offer = offerWith([goal('a'), goal('retired')]); // admin later re-enabled it
  assert.equal(lifecycleFor({ offer, click, conversions: [credited({ goalKey: 'a' })] }).lifecycle, 'completed');
});

test('snapshot null (explicit single-step click): single-step completion works, even if goals are added later', () => {
  const click = { status: 'approved', goalsSnapshot: null };
  const later = offerWith([goal('a'), goal('b')]);
  assert.equal(getExpectedGoalKeys(later, click).size, 0);
  assert.equal(lifecycleFor({ offer: later, click, conversions: [credited()] }).lifecycle, 'completed');
  assert.equal(lifecycleFor({ offer: later, click: { status: 'clicked', goalsSnapshot: null } }).lifecycle, 'started');
  assert.equal(lifecycleFor({ offer: offerWith([]), click, conversions: [credited()] }).lifecycle, 'completed');
});

test('legacy click with a missing snapshot: documented fallback to the offer\'s current enabled goals', () => {
  const legacyClick = { status: 'approved' }; // goalsSnapshot field absent => undefined, not null
  assert.equal('goalsSnapshot' in legacyClick, false);

  // Not treated as proof of single-step: current enabled goals still apply.
  const offer = offerWith([goal('a'), goal('b'), goal('off', false)]);
  assert.deepEqual([...getExpectedGoalKeys(offer, legacyClick)].sort(), ['a', 'b']);
  assert.equal(lifecycleFor({ offer, click: legacyClick, conversions: [credited({ goalKey: 'a' })] }).lifecycle, 'started');
  assert.equal(
    lifecycleFor({ offer, click: legacyClick, conversions: [credited({ goalKey: 'a' }), credited({ goalKey: 'b', rewardTransactionId: 'tx2' })] }).lifecycle,
    'completed'
  );
  // Legacy click on an offer with no goals keeps the original single-step behavior.
  assert.equal(lifecycleFor({ offer: offerWith([]), click: legacyClick, conversions: [credited()] }).lifecycle, 'completed');
  // No click object at all (callers without click data) uses the same fallback.
  assert.deepEqual([...getExpectedGoalKeys(offer)].sort(), ['a', 'b']);
});

test('reversed / pending / rejected / failed rewards are still not completed; held (processed) still counts', () => {
  const click = clickWith([goal('a'), goal('b')]);
  const offer = offerWith([goal('a'), goal('b')]);
  const a = credited({ goalKey: 'a' });
  const notCounted = {
    reversed: { internalStatus: 'reversed', processingState: 'reversed' },
    reversalProcessing: { internalStatus: 'reversed', processingState: 'reversal_processing' },
    pending: { internalStatus: 'pending', processingState: 'pending', rewardTransactionId: null },
    rejected: { internalStatus: 'rejected', processingState: 'pending', rewardTransactionId: null },
    failed: { internalStatus: 'approved', processingState: 'failed', rewardTransactionId: null },
    claimedNoReward: { internalStatus: 'approved', processingState: 'claimed', rewardTransactionId: null },
  };
  for (const [name, override] of Object.entries(notCounted)) {
    const result = lifecycleFor({ offer, click, conversions: [a, credited({ goalKey: 'b', rewardTransactionId: 'tx2', ...override })] });
    assert.equal(result.lifecycle, 'started', name);
    assert.deepEqual(result.completedGoalKeys, ['a'], name);
  }
  // Held rewards finish as processed with a reward transaction: current behavior counts them (unchanged).
  assert.equal(
    lifecycleFor({ offer, click, conversions: [a, credited({ goalKey: 'b', rewardTransactionId: 'held-tx' })] }).lifecycle,
    'completed'
  );
  // Single-step reversal stays reversed.
  assert.equal(
    lifecycleFor({ offer: offerWith([]), click: { status: 'approved', goalsSnapshot: null }, conversions: [credited({ internalStatus: 'reversed', processingState: 'reversed' })] }).lifecycle,
    'reversed'
  );
});

test('manual offers ignore the click snapshot entirely', () => {
  const manual = { _id: OFFER_ID, trackingMode: 'manual', goals: [] };
  const click = clickWith([goal('a')]);
  assert.equal(resolveOfferLifecycle({ offer: manual, click, submission: { status: 'approved' } }), 'completed');
  assert.equal(resolveOfferLifecycle({ offer: manual, click, submission: { status: 'pending' } }), 'pending');
});

test('GET /api/direct-offers selects the click snapshot, passes the click in, and never returns the snapshot', () => {
  const source = fs.readFileSync(path.join(__dirname, '../routes/directOffers.js'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(source, /\.select\('offerId status clickId createdAt goalsSnapshot'\)/);
  assert.match(source, /resolveCompletedGoalKeys\(offer, completedByOffer, click\)/);
  const response = source.slice(source.indexOf('return {\n        ...offer,'), source.indexOf('res.status(200).json({ success: true, offers: offersWithStatus })'));
  assert.ok(response.length > 0);
  assert.doesNotMatch(response, /goalsSnapshot/); // snapshot carries admin-only payout figures
});
