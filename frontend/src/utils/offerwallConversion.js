// How the Admin -> Offerwalls "ratio" applies to each provider. Derived from the
// backend: routes/offerwalls.js (generic path: floor(providerUnits x ratio)),
// services/offerwalls/lootablyWebhook.js (credits currencyReward directly as
// coins) and services/offerwalls/adapters.js (which integrations can credit).

// Integration state of generic-multiplier providers. No provider unit (dollars,
// cents or points) is assumed for any of them.
const INTEGRATION_STATUS = {
  primeearn: 'Callback adapter exists but is disabled until its reward field and signature are verified.',
  ayet: 'Callback adapter exists but is disabled until its security hash and reversals are verified.',
  cpx: 'No verified callback adapter yet; this provider cannot credit coins through this setting.',
  adgem: 'No verified callback adapter yet; this provider cannot credit coins through this setting.',
  torox: 'No verified callback adapter yet; this provider cannot credit coins through this setting.',
  adtowall: 'No verified callback adapter yet; this provider cannot credit coins through this setting.',
  revu: 'No verified callback adapter yet; this provider cannot credit coins through this setting.',
  adscend: 'No callback route exists yet; this provider cannot credit coins through this setting.',
};

export const getConversionControl = (providerId) => {
  if (providerId === 'lootably') {
    return {
      mode: 'direct_coins',
      showRatioInput: false,
      showFormula: false,
      title: 'Lootably reward currency',
      note: 'Lootably credits its currencyReward directly as TaskMint coins. The ratio on this page is not used. Set the placement’s Pre-Split Currency Conversion Rate and Currency Split to User (%) in Lootably so currencyReward is a whole number of TaskMint coins.',
    };
  }
  if (providerId === 'goodpicks') {
    return {
      mode: 'not_used',
      showRatioInput: false,
      showFormula: false,
      title: 'Goodpicks rewards are set per offer',
      note: 'Goodpicks direct offers are rewarded in coins exactly as configured on each offer (or goal). No conversion ratio applies, so there is nothing to set here.',
    };
  }
  return {
    mode: 'multiplier',
    showRatioInput: true,
    showFormula: true,
    title: 'Provider-specific multiplier',
    note: 'Coins credited = amount reported by the provider × this multiplier, rounded down. The provider’s unit (dollars, cents or points) is not assumed: confirm it in the provider’s documentation before changing this.',
    integrationStatus: INTEGRATION_STATUS[providerId] || 'Integration status unverified.',
  };
};

export const describeMultiplierExample = (ratio) => {
  const value = Number(ratio);
  if (!Number.isFinite(value) || value <= 0) return '';
  return `Example: if the provider reports 1 of its own units, the user gets ${Math.floor(value).toLocaleString('en-US')} coins (rounded down).`;
};
