// Offer lifecycle helpers shared by Home, Earn and the Goodpicks modal.
//
// Completion is decided ONLY by the backend (`offer.lifecycle`, from
// GET /api/direct-offers). The client never re-derives it from clickStatus,
// because the first credited goal of a multi-step offer already sets
// clickStatus to 'approved'.
//
//  available -> never started          started  -> clicked / partly credited
//  pending / rejected                  reversed -> credited then reversed
//  completed -> fully credited (leaves active lists, stays in History)
const KNOWN = ['available', 'started', 'pending', 'rejected', 'reversed', 'completed'];

export const getOfferLifecycle = (offer) =>
  (offer && KNOWN.includes(offer.lifecycle) ? offer.lifecycle : 'available');

export const isOfferCompleted = (offer) => getOfferLifecycle(offer) === 'completed';

export const isOfferStarted = (offer) => getOfferLifecycle(offer) !== 'available';

// Active/Featured lists: everything except fully completed offers. Partly
// credited multi-step offers (lifecycle 'started') stay.
export const filterActiveOffers = (offers) =>
  (Array.isArray(offers) ? offers : []).filter((offer) => !isOfferCompleted(offer));

// History = the user's started offers, one row per offer ID, newest first.
export const buildGoodpicksHistory = (offers) => {
  const byId = new Map();
  for (const offer of Array.isArray(offers) ? offers : []) {
    if (!offer || !offer._id || !isOfferStarted(offer)) continue;
    const key = String(offer._id);
    if (!byId.has(key)) byId.set(key, offer);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0)
  );
};

// Local update after a successful Start so the UI reflects it immediately
// (the next fetch replaces it with the server's authoritative value). Never
// downgrades an offer that is already past 'available'.
export const markOfferStarted = (offers, offerId, patch = {}) =>
  (Array.isArray(offers) ? offers : []).map((offer) => {
    if (!offer || String(offer._id) !== String(offerId)) return offer;
    return {
      ...offer,
      ...patch,
      lifecycle: isOfferStarted(offer) ? offer.lifecycle : 'started',
      startedAt: offer.startedAt || new Date().toISOString(),
    };
  });
