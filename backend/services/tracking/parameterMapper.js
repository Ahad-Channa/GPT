const { sanitizePostbackPayload } = require('./postbackSanitizer');

const CANONICAL_FIELDS = new Set([
  'clickId',
  'transactionId',
  'status',
  'payout',
  'eventType',
  'providerUserId',
]);

const FIELD_LIMITS = {
  clickId: 128,
  transactionId: 128,
  status: 64,
  payout: 64,
  eventType: 64,
  providerUserId: 128,
};
const EXTRA_FIELD_LIMIT = 512;

const pickSourceValue = ({ query = {}, body = {} }, key) => {
  if (!key) return undefined;
  if (Object.prototype.hasOwnProperty.call(query, key)) return query[key];
  if (Object.prototype.hasOwnProperty.call(body, key)) return body[key];
  return undefined;
};

const getValueType = (value) => {
  if (Array.isArray(value)) return 'array';
  if (value !== null && typeof value === 'object') return 'object';
  return typeof value;
};

const hasSourceValue = ({ query = {}, body = {} }, key) => {
  if (!key) return false;
  return Object.prototype.hasOwnProperty.call(query, key) || Object.prototype.hasOwnProperty.call(body, key);
};

const normalizeValue = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return '';
  return String(value).trim();
};

const mapPostbackParameters = ({ query = {}, body = {}, mappings = {}, requiredFields = [] }) => {
  const mapped = {};
  const extra = {};
  const suppliedFields = {};
  const invalidFields = [];

  for (const canonicalName of CANONICAL_FIELDS) {
    const sourceKey = mappings[canonicalName];
    const rawValue = pickSourceValue({ query, body }, sourceKey);
    suppliedFields[canonicalName] = hasSourceValue({ query, body }, sourceKey);
    if (Array.isArray(rawValue) || (rawValue !== null && typeof rawValue === 'object') || typeof rawValue === 'boolean') {
      invalidFields.push(`${canonicalName} has invalid ${getValueType(rawValue)} value`);
      mapped[canonicalName] = '';
      continue;
    }

    mapped[canonicalName] = normalizeValue(rawValue);
    if (mapped[canonicalName] && mapped[canonicalName].length > FIELD_LIMITS[canonicalName]) {
      invalidFields.push(`${canonicalName} exceeds maximum length`);
    }
  }

  const extraMappings = mappings.extra && typeof mappings.extra === 'object' ? mappings.extra : {};
  for (const [canonicalName, sourceKey] of Object.entries(extraMappings)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(canonicalName)) continue;
    const rawValue = pickSourceValue({ query, body }, sourceKey);
    if (Array.isArray(rawValue) || (rawValue !== null && typeof rawValue === 'object') || typeof rawValue === 'boolean') {
      continue;
    }
    const normalized = normalizeValue(rawValue);
    extra[canonicalName] = normalized.length > EXTRA_FIELD_LIMIT ? normalized.slice(0, EXTRA_FIELD_LIMIT) : normalized;
  }

  const missingFields = requiredFields.filter((field) => !normalizeValue(mapped[field]));
  const sanitizedMapped = sanitizePostbackPayload({ ...mapped, extra });

  return {
    mapped: {
      ...mapped,
      payout: mapped.payout === '' ? null : mapped.payout,
      eventType: mapped.eventType || 'conversion',
      extra,
    },
    suppliedFields,
    invalidFields,
    sanitizedMapped: {
      ...sanitizedMapped,
      payout: sanitizedMapped.payout === '' ? null : sanitizedMapped.payout,
      eventType: sanitizedMapped.eventType || 'conversion',
      extra: sanitizedMapped.extra || {},
    },
    missingFields,
    isValid: missingFields.length === 0 && invalidFields.length === 0,
  };
};

const parsePayout = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    const error = new Error('Payout amount is required when mapped.');
    error.code = 'INVALID_PAYOUT';
    throw error;
  }

  const normalized = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    const error = new Error('Invalid payout amount.');
    error.code = 'INVALID_PAYOUT';
    throw error;
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1000000000) {
    const error = new Error('Invalid payout amount.');
    error.code = 'INVALID_PAYOUT';
    throw error;
  }
  return amount;
};

module.exports = {
  mapPostbackParameters,
  parsePayout,
};
