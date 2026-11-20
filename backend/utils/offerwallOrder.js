// Deterministic display ordering for Settings.offerwallProviders.
//
// Rules:
//   * primary: configured `order` ascending (lower first)
//   * providers without an order sort after those that have one
//   * secondary: original array index (stable for equal/missing order)
//   * tertiary: provider id (fully deterministic)
const hasOrder = (value) => typeof value === 'number' && Number.isFinite(value);

const sortOfferwallProviders = (providers = []) => {
  const list = Array.isArray(providers) ? providers : [];
  return list
    .map((provider, index) => ({ provider, index }))
    .sort((a, b) => {
      const aOrder = hasOrder(a.provider && a.provider.order) ? a.provider.order : null;
      const bOrder = hasOrder(b.provider && b.provider.order) ? b.provider.order : null;

      if (aOrder !== null && bOrder !== null) {
        if (aOrder !== bOrder) return aOrder - bOrder;
      } else if (aOrder !== null) {
        return -1;
      } else if (bOrder !== null) {
        return 1;
      }

      if (a.index !== b.index) return a.index - b.index;
      return String((a.provider && a.provider.id) || '').localeCompare(String((b.provider && b.provider.id) || ''));
    })
    .map((entry) => entry.provider);
};

// Non-destructive backfill: any provider with a missing/null order inherits its
// current array index so existing installs keep their current visible order.
// Returns true when at least one provider was modified.
const ensureOfferwallOrder = (providers = []) => {
  let modified = false;
  const list = Array.isArray(providers) ? providers : [];
  list.forEach((provider, index) => {
    if (provider && provider.order == null) {
      provider.order = index;
      modified = true;
    }
  });
  return modified;
};

module.exports = {
  hasOrder,
  sortOfferwallProviders,
  ensureOfferwallOrder,
};
