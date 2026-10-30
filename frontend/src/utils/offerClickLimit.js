// UX-only helper: reports whether a Direct Offer has reached its optional
// overall total-click cap. The backend enforces the cap atomically; this is
// only used to grey out the Start button / label. null/undefined max = unlimited.
export const isOfferClickLimitReached = (offer) => {
  const max = offer?.maxTotalClicks;
  if (max === null || max === undefined) return false;
  const limit = Number(max);
  if (!Number.isFinite(limit) || limit < 1) return false;
  const total = Number(offer?.totalClicks) || 0;
  return total >= limit;
};
