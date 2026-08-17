const REDACTED = '[REDACTED]';
const MASKED = '[MASKED]';

const SECRET_KEY_PATTERN = /(authorization|bearer|api[_-]?key|secret|password|private[_-]?key|access[_-]?token|refresh[_-]?token|credential|client[_-]?secret)/i;
const SIGNATURE_KEY_PATTERN = /(signature|sig|hash|hmac|checksum|verifier)/i;

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);

const maskValue = (value) => {
  if (value === null || value === undefined) return value;
  const text = String(value);
  if (text.length <= 10) return MASKED;
  return `${text.slice(0, 6)}...${text.slice(-4)}`;
};

const sanitizeValue = (key, value) => {
  if (SECRET_KEY_PATTERN.test(key)) return REDACTED;
  if (SIGNATURE_KEY_PATTERN.test(key)) return maskValue(value);
  if (Array.isArray(value)) return value.map((item) => sanitizePostbackPayload(item));
  if (isObject(value)) return sanitizePostbackPayload(value);
  return value;
};

function sanitizePostbackPayload(payload = {}) {
  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizePostbackPayload(item));
  }

  if (!isObject(payload)) {
    return payload;
  }

  return Object.entries(payload).reduce((safe, [key, value]) => {
    safe[key] = sanitizeValue(key, value);
    return safe;
  }, {});
}

module.exports = {
  REDACTED,
  MASKED,
  sanitizePostbackPayload,
  maskValue,
};
