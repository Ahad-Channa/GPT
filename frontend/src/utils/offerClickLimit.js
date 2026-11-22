// UX-only helper: reports whether a Direct Offer has reached its optional
// overall total-click cap. The backend enforces the cap atomically; this is
// only used to grey out the Start button / label. null/undefined max = unlimited.
//
// A user who already started the offer (lifecycle past 'available') holds their
// one canonical click and can still resume it, so the cap never blocks them.
export const isOfferClickLimitReached = (offer) => {
  if (offer?.lifecycle && offer.lifecycle !== 'available') return false;
  const max = offer?.maxTotalClicks;
  if (max === null || max === undefined) return false;
  const limit = Number(max);
  if (!Number.isFinite(limit) || limit < 1) return false;
  const total = Number(offer?.totalClicks) || 0;
  return total >= limit;
};
