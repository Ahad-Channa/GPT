// Platform rules shared by Featured, Earn and Goodpicks offer modals.
//
// The smartphone QR section is shown for offers that run on a phone
// (Android and/or iOS, with or without PC). PC-only offers never show it.
// An offer without a `platforms` object is legacy data meaning "all platforms",
// matching how the offer cards treat it.
export const shouldShowQr = (platforms) => {
  if (!platforms || typeof platforms !== 'object') return true;
  return Boolean(platforms.android || platforms.ios);
};
