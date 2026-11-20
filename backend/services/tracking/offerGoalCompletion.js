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

// Returns the credited goal keys for one offer, intersected with the goals that
// are currently enabled on the offer. Empty for single-step offers.
const resolveCompletedGoalKeys = (offer, creditedByOffer = {}) => {
  const enabledKeys = getEnabledGoalKeys(offer);
  if (enabledKeys.size === 0) return [];
  const offerId = offer?._id ? String(offer._id) : '';
  const credited = creditedByOffer[offerId];
  if (!credited) return [];
  const creditedKeys = credited instanceof Set ? credited : new Set(credited);
  return [...creditedKeys].filter((key) => enabledKeys.has(key));
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

  const enabledKeys = getEnabledGoalKeys(offer);
  if (enabledKeys.size > 0) {
    const credited = new Set(completedGoalKeys);
    const allCredited = [...enabledKeys].every((key) => credited.has(key));
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

module.exports = {
  DIRECT_OFFER_PROVIDER_ID,
  OFFER_LIFECYCLES,
  buildOfferCreditConversionQuery,
  groupOfferCreditState,
  resolveOfferLifecycle,
  buildActiveGoalConversionQuery,
  isActiveCreditedGoalConversion,
  groupCompletedGoalKeysByOffer,
  resolveCompletedGoalKeys,
};
