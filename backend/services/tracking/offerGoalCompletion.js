const DIRECT_OFFER_PROVIDER_ID = 'direct';

// A Direct Offer goal is "currently completed" only when its Conversion was
// approved and its reward was processed. Reversed/chargeback conversions flip to
// internalStatus 'reversed' / processingState 'reversed' and drop out, and
// rejected or pending/claimed conversions never qualify. Held rewards are still
// processed (processingState 'processed'), so they count as completed.
const isActiveCreditedGoalConversion = (conversion) =>
  Boolean(conversion) &&
  Boolean(conversion.goalKey) &&
  conversion.internalStatus === 'approved' &&
  conversion.processingState === 'processed' &&
  conversion.rewardTransactionId != null;

// Bulk query used to fetch the current user's credited direct-offer goals in one
// round trip (avoids a per-offer N+1 lookup).
const buildActiveGoalConversionQuery = (userId, providerId = DIRECT_OFFER_PROVIDER_ID) => ({
  userId,
  providerId,
  internalStatus: 'approved',
  processingState: 'processed',
  rewardTransactionId: { $ne: null },
  goalKey: { $ne: null },
});

const goalConversionOfferId = (conversion) => {
  const ref = conversion && (conversion.offerId || conversion.campaignId);
  return ref ? String(ref) : '';
};

// Groups credited goal keys by offer id. Duplicate postbacks resolve to one
// Conversion per (provider, transaction, goal), and the Set de-dupes defensively
// so a goal can never be reported twice.
const groupCompletedGoalKeysByOffer = (conversions = []) => {
  const byOffer = {};
  for (const conversion of Array.isArray(conversions) ? conversions : []) {
    if (!isActiveCreditedGoalConversion(conversion)) continue;
    const offerId = goalConversionOfferId(conversion);
    if (!offerId) continue;
    if (!byOffer[offerId]) byOffer[offerId] = new Set();
    byOffer[offerId].add(conversion.goalKey);
  }
  return byOffer;
};

const getEnabledGoalKeys = (offer) =>
  new Set(
    (Array.isArray(offer?.goals) ? offer.goals : [])
      .filter((goal) => goal && goal.enabled !== false && goal.goalKey)
      .map((goal) => goal.goalKey)
  );

// Goal keys that a given user's click is obligated to complete.
//
// Policy: the click-time `goalsSnapshot` is authoritative. Admin edits to the
// offer's goals after the click neither add, remove nor disable obligations for
// that existing click (this matches postback matching, which also resolves goals
// from the click's snapshot). New clicks snapshot the then-current enabled goals.
//
//   snapshot is a non-empty object  -> its keys (multi-step at click time)
//   snapshot is null / {}           -> [] : proven single-step (new clicks store an
//                                      explicit null when the offer had no goals)
//   snapshot is undefined / invalid -> LEGACY fallback: the field is absent, so it
//                                      is unknown how the click started. Use the
//                                      offer's currently enabled goals (the
//                                      pre-snapshot behavior). An unknown snapshot
//                                      is never treated as proof of single-step.
//   no click supplied               -> same legacy fallback (callers without click data)
const getExpectedGoalKeys = (offer, click = null) => {
  const snapshot = click ? click.goalsSnapshot : undefined;
  if (snapshot === null) return new Set();
  if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
    return new Set(Object.keys(snapshot));
  }
  return getEnabledGoalKeys(offer);
};

// Returns the credited goal keys for one offer, intersected with the goals the
// user's click is obligated to complete (see getExpectedGoalKeys). Empty for
// single-step clicks.
const resolveCompletedGoalKeys = (offer, creditedByOffer = {}, click = null) => {
  const expectedKeys = getExpectedGoalKeys(offer, click);
  if (expectedKeys.size === 0) return [];
  const offerId = offer?._id ? String(offer._id) : '';
  const credited = creditedByOffer[offerId];
  if (!credited) return [];
  const creditedKeys = credited instanceof Set ? credited : new Set(credited);
  return [...creditedKeys].filter((key) => expectedKeys.has(key));
};

// ── Offer lifecycle (single source of truth for Featured / Goodpicks lists) ──
// Values: 'available' (never started), 'started' (clicked or partly credited),
// 'pending', 'rejected', 'reversed' (credited then reversed; never re-creditable,
// anti-replay policy unchanged) and 'completed' (fully credited / approved).
// Only 'completed' leaves the active lists; every non-'available' value is shown
// in the user's Goodpicks History. clickStatus === 'approved' alone is NOT
// completion: the first credited goal of a multi-step offer sets it.
const OFFER_LIFECYCLES = ['available', 'started', 'pending', 'rejected', 'reversed', 'completed'];

// One bulk query: every direct-offer conversion that ever carried a reward.
const buildOfferCreditConversionQuery = (userId, providerId = DIRECT_OFFER_PROVIDER_ID) => ({
  userId,
  providerId,
  rewardTransactionId: { $ne: null },
  internalStatus: { $in: ['approved', 'reversed'] },
});

const groupOfferCreditState = (conversions = []) => {
  const byOffer = {};
  for (const conversion of Array.isArray(conversions) ? conversions : []) {
    const offerId = goalConversionOfferId(conversion);
    if (!offerId || conversion.rewardTransactionId == null) continue;
    const entry = byOffer[offerId] || (byOffer[offerId] = { credited: false, reversed: false });
    if (conversion.internalStatus === 'reversed' || conversion.processingState === 'reversed') entry.reversed = true;
    else if (conversion.internalStatus === 'approved' && conversion.processingState === 'processed') entry.credited = true;
  }
  return byOffer;
};

const clickIncompleteState = (click) => {
  if (click?.status === 'rejected') return 'rejected';
  if (click?.status === 'pending') return 'pending';
  return 'started';
};

const resolveOfferLifecycle = ({ offer, click = null, submission = null, completedGoalKeys = [], creditState = null } = {}) => {
  if (offer?.trackingMode === 'manual') {
    const status = submission?.status;
    if (status === 'approved') return 'completed';
    if (status === 'pending') return 'pending';
    if (status === 'rejected') return 'rejected';
    if (status === 'chargebacked') return 'reversed';
    if (status === 'started' || click) return 'started';
    return 'available';
  }

  if (!click) return 'available';

  const expectedKeys = getExpectedGoalKeys(offer, click);
  if (expectedKeys.size > 0) {
    const credited = new Set(completedGoalKeys);
    const allCredited = [...expectedKeys].every((key) => credited.has(key));
    if (allCredited) return 'completed';
    // Partly credited multi-step offers stay active and resumable.
    if (credited.size > 0) return 'started';
    return clickIncompleteState(click);
  }

  // Single-step: prefer the authoritative conversion state; fall back to the
  // click status only for legacy rows without conversion data.
  if (creditState?.credited) return 'completed';
  if (creditState?.reversed) return 'reversed';
  if (!creditState && click.status === 'approved') return 'completed';
  return clickIncompleteState(click);
};

// Lifecycle of ONE offer for ONE user, using the same rule as the offers list.
// Used by the click endpoint to decide whether re-opening the tracking link has
// any purpose. Read-only; never changes clicks, conversions or rewards.
const resolveUserOfferLifecycle = async ({ offer, click, userId, conversionModel, submission = null }) => {
  if (!offer || !conversionModel) return resolveOfferLifecycle({ offer, click, submission });
  const rows = await conversionModel
    .find({
      ...buildOfferCreditConversionQuery(userId),
      $or: [{ offerId: offer._id }, { campaignId: offer._id }],
    })
    .select('offerId campaignId goalKey internalStatus processingState rewardTransactionId')
    .lean();
  const completedGoalKeys = resolveCompletedGoalKeys(offer, groupCompletedGoalKeysByOffer(rows));
  const creditState = groupOfferCreditState(rows)[String(offer._id)] || null;
  return resolveOfferLifecycle({ offer, click, submission, completedGoalKeys, creditState });
};

module.exports = {
  resolveUserOfferLifecycle,
  DIRECT_OFFER_PROVIDER_ID,
  OFFER_LIFECYCLES,
  buildOfferCreditConversionQuery,
  groupOfferCreditState,
  resolveOfferLifecycle,
  buildActiveGoalConversionQuery,
  isActiveCreditedGoalConversion,
  groupCompletedGoalKeysByOffer,
  resolveCompletedGoalKeys,
  getExpectedGoalKeys,
};
