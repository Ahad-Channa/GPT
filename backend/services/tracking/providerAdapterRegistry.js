const ADAPTER_KEY_RE = /^[A-Za-z][A-Za-z0-9_-]{0,79}$/;

const adapters = Object.freeze({});

const normalizeAdapterKey = (adapterKey = '') => String(adapterKey || '').trim();

const getProviderAdapter = (adapterKey = '') => {
  const key = normalizeAdapterKey(adapterKey);
  if (!ADAPTER_KEY_RE.test(key)) return null;
  return adapters[key] || null;
};

const validateProviderAdapterKey = (adapterKey = '') => {
  const key = normalizeAdapterKey(adapterKey);
  if (!ADAPTER_KEY_RE.test(key)) {
    const error = new Error('Provider adapterKey contains invalid characters.');
    error.code = 'INVALID_PROVIDER_ADAPTER_KEY';
    throw error;
  }
  if (!getProviderAdapter(key)) {
    const error = new Error('Unknown provider adapterKey.');
    error.code = 'UNKNOWN_PROVIDER_ADAPTER_KEY';
    throw error;
  }
  return key;
};

module.exports = {
  getProviderAdapter,
  validateProviderAdapterKey,
};
