const { sanitizePostbackPayload } = require('./postbackSanitizer');

const CANONICAL_FIELDS = new Set([
  'clickId',
  'transactionId',
  'status',
  'payout',
  'eventType',
  'providerUserId',
]);

const pickSourceValue = ({ query = {}, body = {} }, key) => {
  if (!key) return undefined;
  if (Object.prototype.hasOwnProperty.call(query, key)) return query[key];
  if (Object.prototype.hasOwnProperty.call(body, key)) return body[key];
  return undefined;
};

const hasSourceValue = ({ query = {}, body = {} }, key) => {
  if (!key) return false;
  return Object.prototype.hasOwnProperty.call(query, key) || Object.prototype.hasOwnProperty.call(body, key);
};

const normalizeValue = (value) => {
  if (Array.isArray(value)) return normalizeValue(value[0]);
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') return '';
  return String(value).trim();
};

const mapPostbackParameters = ({ query = {}, body = {}, mappings = {}, requiredFields = [] }) => {
  const mapped = {};
  const extra = {};
  const suppliedFields = {};

  for (const canonicalName of CANONICAL_FIELDS) {
    const sourceKey = mappings[canonicalName];
    suppliedFields[canonicalName] = hasSourceValue({ query, body }, sourceKey);
    mapped[canonicalName] = normalizeValue(pickSourceValue({ query, body }, sourceKey));
  }

  const extraMappings = mappings.extra && typeof mappings.extra === 'object' ? mappings.extra : {};
  for (const [canonicalName, sourceKey] of Object.entries(extraMappings)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(canonicalName)) continue;
    extra[canonicalName] = normalizeValue(pickSourceValue({ query, body }, sourceKey));
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
    sanitizedMapped: {
      ...sanitizedMapped,
      payout: sanitizedMapped.payout === '' ? null : sanitizedMapped.payout,
      eventType: sanitizedMapped.eventType || 'conversion',
      extra: sanitizedMapped.extra || {},
    },
    missingFields,
    isValid: missingFields.length === 0,
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
  if (!Number.isFinite(amount) || amount < 0) {
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
