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

module.exports = {
  DIRECT_OFFER_PROVIDER_ID,
  buildActiveGoalConversionQuery,
  isActiveCreditedGoalConversion,
  groupCompletedGoalKeysByOffer,
  resolveCompletedGoalKeys,
};
