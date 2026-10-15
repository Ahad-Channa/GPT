// Offerwall display ordering.
//
// The backend is the authoritative source of order: /api/wallet/settings
// returns enabled providers already sorted by their configured `order`. This
// helper NEVER re-sorts or reinterprets providers received from the server; it
// preserves the incoming array order exactly. DEFAULT_PROVIDER_ORDER is only
// used to place *fallback* providers that are absent from server config.
export const DEFAULT_PROVIDER_ORDER = {
  goodpicks: 0,
  lootably: 1,
  primeearn: 2,
  torox: 3,
  revu: 4,
  adtowall: 5,
  cpx: 6,
  adgem: 7,
  ayet: 8,
};

// Providers that were historically hardcoded in the frontend but are NOT part
// of the backend registry. They are kept for layout parity and appended last.
// Registry providers are never re-added here, so a disabled provider stays
// excluded.
export const FALLBACK_PROVIDER_DEFS = [
  { id: 'adscend', label: 'AdscendMedia', category: 'surveys', enabled: true },
];

const fallbackRank = (id) =>
  Object.prototype.hasOwnProperty.call(DEFAULT_PROVIDER_ORDER, id)
    ? DEFAULT_PROVIDER_ORDER[id]
    : Number.MAX_SAFE_INTEGER;

export const orderFallbackProviders = (providers = []) =>
  [...providers].sort((a, b) => {
    const aRank = fallbackRank(a && a.id);
    const bRank = fallbackRank(b && b.id);
    if (aRank !== bRank) return aRank - bRank;
    return String((a && a.id) || '').localeCompare(String((b && b.id) || ''));
  });

// Server order is authoritative. Only fallback providers absent from server
// config are appended, ordered deterministically via DEFAULT_PROVIDER_ORDER.
export const buildOrderedProviders = (enabledProviders = [], fallbackDefs = FALLBACK_PROVIDER_DEFS) => {
  const server = Array.isArray(enabledProviders) ? enabledProviders : [];
  const presentIds = new Set(server.map((provider) => provider && provider.id));
  const missing = orderFallbackProviders(
    (Array.isArray(fallbackDefs) ? fallbackDefs : []).filter((provider) => provider && !presentIds.has(provider.id))
  );
  return [...server, ...missing];
};

// Reproduces the existing Surveys / Gaming sections but honours the configured
// order (server order preserved). Goodpicks appears in both sections positioned
// by its configured order. Gaming keeps at most 8 non-Goodpicks providers.
export const buildOfferwallSections = ({ enabledProviders = [] } = {}) => {
  const ordered = buildOrderedProviders(enabledProviders);

  const surveys = ordered.filter(
    (provider) => provider && (provider.id === 'goodpicks' || provider.category === 'surveys')
  );

  const gaming = [];
  let others = 0;
  for (const provider of ordered) {
    if (!provider) continue;
    if (provider.id === 'goodpicks') {
      gaming.push(provider);
      continue;
    }
    // Gaming reflects server-configured providers only (fallbacks stay in the
    // surveys section), preserving the previous layout.
    if (!enabledProviders.includes(provider)) continue;
    if (others >= 8) continue;
    gaming.push(provider);
    others += 1;
  }

  return { ordered, surveys, gaming };
};
