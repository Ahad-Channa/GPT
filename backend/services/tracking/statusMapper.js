const STATUS_NAMES = ['pending', 'approved', 'rejected', 'reversed'];

const normalizeStatusToken = (value) => String(value || '').trim().toLowerCase();

const getAliases = (statusMappings = {}, statusName) => {
  if (statusName === 'reversed') {
    return statusMappings.reversed || statusMappings.reversal || [];
  }
  return statusMappings[statusName] || [];
};

const buildStatusLookup = (statusMappings = {}) => {
  const lookup = new Map();
  const conflicts = [];

  for (const statusName of STATUS_NAMES) {
    const aliases = getAliases(statusMappings, statusName);
    for (const alias of aliases) {
      const normalized = normalizeStatusToken(alias);
      if (!normalized) continue;

      const existing = lookup.get(normalized);
      if (existing && existing !== statusName) {
        conflicts.push({ value: normalized, statuses: [existing, statusName] });
      } else {
        lookup.set(normalized, statusName);
      }
    }
  }

  if (conflicts.length > 0) {
    const error = new Error(`Ambiguous status mapping: ${conflicts.map((c) => c.value).join(', ')}`);
    error.code = 'AMBIGUOUS_STATUS_MAPPING';
    error.conflicts = conflicts;
    throw error;
  }

  return lookup;
};

const normalizeProviderStatus = (incomingStatus, statusMappings = {}) => {
  const normalizedInput = normalizeStatusToken(incomingStatus);
  if (!normalizedInput) {
    const error = new Error('Missing provider status.');
    error.code = 'MISSING_STATUS';
    throw error;
  }

  const lookup = buildStatusLookup(statusMappings);
  const internalStatus = lookup.get(normalizedInput);
  if (!internalStatus) {
    const error = new Error(`Unknown provider status: ${incomingStatus}`);
    error.code = 'UNKNOWN_STATUS';
    throw error;
  }

  return internalStatus;
};

module.exports = {
  buildStatusLookup,
  normalizeProviderStatus,
  normalizeStatusToken,
};
