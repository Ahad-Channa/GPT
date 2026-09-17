const REDACTED = '[REDACTED]';
const MASKED = '[MASKED]';
const MAX_STRING_LENGTH = 1000;
const MAX_ARRAY_ITEMS = 25;
const MAX_OBJECT_KEYS = 100;

const SECRET_KEY_PATTERN = /(authorization|bearer|api[_-]?key|secret|password|private[_-]?key|access[_-]?token|refresh[_-]?token|credential|client[_-]?secret)/i;
const SIGNATURE_KEY_PATTERN = /(signature|sig|hash|hmac|checksum|verifier)/i;

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);

const maskValue = (value) => {
  if (value === null || value === undefined) return value;
  const text = truncateString(String(value));
  if (text.length <= 10) return MASKED;
  return `${text.slice(0, 6)}...${text.slice(-4)}`;
};

const truncateString = (value) => {
  const text = String(value);
  return text.length > MAX_STRING_LENGTH ? `${text.slice(0, MAX_STRING_LENGTH)}...[TRUNCATED]` : text;
};

const sanitizeValue = (key, value) => {
  if (SECRET_KEY_PATTERN.test(key)) return REDACTED;
  if (SIGNATURE_KEY_PATTERN.test(key)) return maskValue(value);
  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizePostbackPayload(item));
  if (isObject(value)) return sanitizePostbackPayload(value);
  if (typeof value === 'string') return truncateString(value);
  return value;
};

function sanitizePostbackPayload(payload = {}) {
  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizePostbackPayload(item));
  }

  if (!isObject(payload)) {
    return payload;
  }

  return Object.entries(payload).slice(0, MAX_OBJECT_KEYS).reduce((safe, [key, value]) => {
    safe[key] = sanitizeValue(key, value);
    return safe;
  }, {});
}

module.exports = {
  REDACTED,
  MASKED,
  MAX_STRING_LENGTH,
  sanitizePostbackPayload,
  maskValue,
};
