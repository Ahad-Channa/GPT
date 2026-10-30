const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'your-project-id';

const {
  buildActiveGoalConversionQuery,
  isActiveCreditedGoalConversion,
  groupCompletedGoalKeysByOffer,
  resolveCompletedGoalKeys,
} = require('../services/tracking/offerGoalCompletion');

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const OFFER_ID = '64f0f0f0f0f0f0f0f0f0f0001';
const OTHER_OFFER_ID = '64f0f0f0f0f0f0f0f0f0f0002';

const multiStepOffer = (goals = ['register', 'deposit', 'level_5']) => ({
  _id: OFFER_ID,
  goals: goals.map((goalKey) => ({ goalKey, enabled: true })),
});

const creditedGoal = (goalKey, overrides = {}) => ({
  providerId: 'direct',
  offerId: OFFER_ID,
  goalKey,
  internalStatus: 'approved',
  processingState: 'processed',
  rewardTransactionId: 'tx-' + goalKey,
  ...overrides,
});

const completedKeys = (conversions, offer = multiStepOffer()) =>
  resolveCompletedGoalKeys(offer, groupCompletedGoalKeysByOffer(conversions));

test('no credited goals yields an empty completedGoalKeys list', () => {
  assert.deepEqual(completedKeys([]), []);
  assert.deepEqual(completedKeys([creditedGoal('register', { processingState: 'claimed', rewardTransactionId: null })]), []);
});

test('a single credited goal completes only that goal', () => {
  assert.deepEqual(completedKeys([creditedGoal('deposit')]), ['deposit']);
});

test('two credited goals are both completed', () => {
  assert.deepEqual(completedKeys([creditedGoal('register'), creditedGoal('deposit')]).sort(), ['deposit', 'register']);
});

test('rejected goals are not completed', () => {
  assert.deepEqual(completedKeys([creditedGoal('deposit', { internalStatus: 'rejected' })]), []);
});

test('pending and claimed-but-not-credited goals are not completed', () => {
  assert.deepEqual(completedKeys([
    creditedGoal('deposit', { processingState: 'claimed', rewardTransactionId: null }),
    creditedGoal('register', { internalStatus: 'pending', processingState: 'pending', rewardTransactionId: null }),
    creditedGoal('level_5', { processingState: 'failed', rewardTransactionId: null }),
  ]), []);
});

test('a credited then reversed goal is no longer completed', () => {
  const reversed = creditedGoal('deposit', { internalStatus: 'reversed', processingState: 'reversed', reversalTransactionId: 'rev-1' });
  assert.deepEqual(completedKeys([reversed]), []);
  assert.deepEqual(completedKeys([reversed, creditedGoal('register')]), ['register']);
});

test('duplicate approved postbacks produce a single completion', () => {
  const duplicated = [creditedGoal('deposit'), creditedGoal('deposit')];
  const grouped = groupCompletedGoalKeysByOffer(duplicated);
  assert.equal(grouped[OFFER_ID].size, 1);
  assert.deepEqual(completedKeys(duplicated), ['deposit']);
});

test('one completed goal does not complete other goals', () => {
  const offer = multiStepOffer(['register', 'deposit']);
  assert.deepEqual(completedKeys([creditedGoal('register')], offer), ['register']);
  assert.deepEqual(completedKeys([creditedGoal('deposit')], offer), ['deposit']);
});

test('single-step offers always return an empty completedGoalKeys list', () => {
  assert.deepEqual(resolveCompletedGoalKeys({ _id: OFFER_ID, goals: [] }, groupCompletedGoalKeysByOffer([creditedGoal('deposit')])), []);
  assert.deepEqual(resolveCompletedGoalKeys({ _id: OFFER_ID }, {}), []);
});

test('disabled goals are excluded from completedGoalKeys', () => {
  const offer = { _id: OFFER_ID, goals: [{ goalKey: 'deposit', enabled: false }, { goalKey: 'register', enabled: true }] };
  assert.deepEqual(completedKeys([creditedGoal('deposit'), creditedGoal('register')], offer), ['register']);
});

test('credited goals are grouped per offer and do not leak across offers', () => {
  const conversions = [
    creditedGoal('deposit'),
    creditedGoal('register', { offerId: OTHER_OFFER_ID }),
  ];
  const grouped = groupCompletedGoalKeysByOffer(conversions);
  assert.deepEqual([...grouped[OFFER_ID]], ['deposit']);
  assert.deepEqual([...grouped[OTHER_OFFER_ID]], ['register']);
});

test('the active goal query targets only approved, processed, rewarded goal conversions', () => {
  const query = buildActiveGoalConversionQuery('user-1');
  assert.equal(query.userId, 'user-1');
  assert.equal(query.providerId, 'direct');
  assert.equal(query.internalStatus, 'approved');
  assert.equal(query.processingState, 'processed');
  assert.deepEqual(query.rewardTransactionId, { $ne: null });
  assert.deepEqual(query.goalKey, { $ne: null });

  assert.equal(isActiveCreditedGoalConversion(creditedGoal('deposit')), true);
  assert.equal(isActiveCreditedGoalConversion(creditedGoal('deposit', { internalStatus: 'reversed' })), false);
  assert.equal(isActiveCreditedGoalConversion({ internalStatus: 'approved', processingState: 'processed' }), false);
});

test('direct-offers response attaches completedGoalKeys with a single bulk conversion query (no N+1)', () => {
  const source = read('backend/routes/directOffers.js');
  assert.match(source, /completedGoalKeys: resolveCompletedGoalKeys\(offer, completedByOffer\)/);
  assert.match(source, /buildActiveGoalConversionQuery\(user\._id\)/);
  assert.match(source, /groupCompletedGoalKeysByOffer\(creditedGoalConversions\)/);

  const conversionFindCount = (source.match(/Conversion\.find\(/g) || []).length;
  assert.equal(conversionFindCount, 1, 'expected exactly one bulk Conversion.find');
  assert.doesNotMatch(source, /for\s*\([\s\S]*?Conversion\.find\(/);
});

test('Goodpicks branded direct offers use the same completedGoalKeys field', () => {
  const goodpicks = read('frontend/src/components/offers/GoodpicksModal.jsx');
  assert.match(goodpicks, /offer\.completedGoalKeys\.includes\(key\)/);
  assert.match(goodpicks, /completed: directGoalIsCompleted\(offer, goal\)/);

  const directOfferCard = read('frontend/src/components/offers/DirectOfferCard.jsx');
  assert.match(directOfferCard, /offer\.completedGoalKeys\.includes\(key\)/);
});
