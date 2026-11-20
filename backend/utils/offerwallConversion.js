// Provider units -> platform coins for the generic (non-Lootably) offerwall path.
//
// Policy is unchanged: coins = floor(providerUnits * ratio). The only addition is
// absorbing IEEE-754 representation error, so a product that is mathematically a
// whole number (0.29 * 100 evaluates to 28.999999999999996) is not under-rounded by
// one coin. The snap tolerance is relative 1e-12, far above double rounding error
// (~1e-16) and far below any real fractional remainder a payout would carry.
const SNAP_TOLERANCE = 1e-12;

const convertProviderUnitsToCoins = (providerUnits, ratio) => {
  const product = Number(providerUnits) * Number(ratio);
  if (!Number.isFinite(product)) return NaN;
  const nearest = Math.round(product);
  if (Math.abs(product - nearest) <= SNAP_TOLERANCE * Math.max(1, Math.abs(product))) {
    return nearest;
  }
  return Math.floor(product);
};

module.exports = { convertProviderUnitsToCoins };
