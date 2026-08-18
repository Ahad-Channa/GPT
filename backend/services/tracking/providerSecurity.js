const crypto = require('crypto');
const net = require('net');

const { getClientIp } = require('../../utils/geo');

const safeCompare = (a, b) => {
  const left = Buffer.from(String(a ?? ''), 'utf8');
  const right = Buffer.from(String(b ?? ''), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const getRequestValue = (req, key) => {
  if (!key) return '';
  const queryValue = req?.query?.[key];
  if (queryValue !== undefined) {
    if (Array.isArray(queryValue) || (queryValue && typeof queryValue === 'object')) return '';
    return String(queryValue || '');
  }
  const bodyValue = req?.body?.[key];
  if (bodyValue !== undefined) {
    if (Array.isArray(bodyValue) || (bodyValue && typeof bodyValue === 'object')) return '';
    return String(bodyValue || '');
  }
  return '';
};

const getHeaderValue = (req, name) => {
  if (!name) return '';
  const value = req?.headers?.[String(name).toLowerCase()];
  if (Array.isArray(value) || (value && typeof value === 'object')) return '';
  return String(value || '');
};

const renderTemplate = (template, { mapped = {}, secret = '' }) =>
  String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key) => {
    if (key === 'secret') return secret;
    return mapped[key] === undefined || mapped[key] === null ? '' : String(mapped[key]);
  });

const normalizeIp = (ip) => {
  const value = String(ip || '').trim();
  return value.startsWith('::ffff:') ? value.slice(7) : value;
};

const isIpAllowed = (ip, allowlist = []) => {
  if (!Array.isArray(allowlist) || allowlist.length === 0) return true;
  const normalizedIp = normalizeIp(ip);
  if (!normalizedIp || !net.isIP(normalizedIp)) return false;
  return allowlist.map(normalizeIp).includes(normalizedIp);
};

const compareSignatures = (supplied, expected, security = {}) => {
  if (!supplied) return false;
  if (security.caseInsensitiveSignature === true) {
    return safeCompare(String(supplied).toLowerCase(), String(expected).toLowerCase());
  }
  return safeCompare(supplied, expected);
};

const normalizeSecretValue = (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value).trim();
};

const resolveSecret = (security = {}) => {
  const directSecret = normalizeSecretValue(security.secretValue);
  if (directSecret) return directSecret;
  const sharedSecret = normalizeSecretValue(security.credentials?.sharedSecret);
  if (sharedSecret) return sharedSecret;
  const token = normalizeSecretValue(security.credentials?.token);
  if (token) return token;
  const apiKey = normalizeSecretValue(security.credentials?.apiKey);
  if (apiKey) return apiKey;
  if (security.secretEnvVar) return normalizeSecretValue(process.env[security.secretEnvVar] || '');
  return '';
};

const validateProviderSecurity = ({ providerConfig = {}, req, mapped = {} }) => {
  const security = providerConfig.security || {};
  const method = security.method || 'none';
  const sourceIp = getClientIp(req);

  if (security.ipAllowlistRequired === true && (!Array.isArray(providerConfig.ipAllowlist) || providerConfig.ipAllowlist.length === 0)) {
    return { checked: true, passed: false, method, reason: 'IP allowlist is required but not configured.', sourceIp };
  }

  if (!isIpAllowed(sourceIp, providerConfig.ipAllowlist || [])) {
    return { checked: true, passed: false, method, reason: 'IP address is not allowed.', sourceIp };
  }

  if (method === 'none') {
    return { checked: false, passed: true, method, reason: '', sourceIp };
  }

  const secret = resolveSecret(security);
  if (!secret) {
    return { checked: true, passed: false, method, reason: 'Provider secret is not configured.', sourceIp };
  }

  if (method === 'shared_secret' || method === 'token') {
    const supplied = security.headerName
      ? getHeaderValue(req, security.headerName)
      : getRequestValue(req, security.tokenParam || security.signatureParam || 'secret');
    const passed = safeCompare(supplied, secret);
    return {
      checked: true,
      passed,
      method,
      reason: passed ? '' : 'Shared secret mismatch.',
      sourceIp,
    };
  }

  if (['md5', 'sha1', 'sha256', 'sha512'].includes(method)) {
    if (!security.hashTemplate || !security.signatureParam) {
      return { checked: true, passed: false, method, reason: 'Signature template is not configured.', sourceIp };
    }
    const supplied = getRequestValue(req, security.signatureParam);
    if (!supplied) {
      return { checked: true, passed: false, method, reason: 'Signature is missing.', sourceIp };
    }
    const expected = crypto
      .createHash(method)
      .update(renderTemplate(security.hashTemplate, { mapped, secret }))
      .digest('hex');
    const passed = compareSignatures(supplied, expected, security);
    return {
      checked: true,
      passed,
      method,
      reason: passed ? '' : 'Signature mismatch.',
      sourceIp,
    };
  }

  if (method === 'hmac') {
    if (!security.hashAlgorithm || !security.hashTemplate || !security.signatureParam) {
      return { checked: true, passed: false, method, reason: 'HMAC configuration is incomplete.', sourceIp };
    }
    const supplied = getRequestValue(req, security.signatureParam);
    if (!supplied) {
      return { checked: true, passed: false, method, reason: 'Signature is missing.', sourceIp };
    }
    const expected = crypto
      .createHmac(security.hashAlgorithm, secret)
      .update(renderTemplate(security.hashTemplate, { mapped, secret: '' }))
      .digest('hex');
    const passed = compareSignatures(supplied, expected, security);
    return {
      checked: true,
      passed,
      method,
      reason: passed ? '' : 'HMAC signature mismatch.',
      sourceIp,
    };
  }

  return { checked: true, passed: false, method, reason: `Unsupported security method: ${method}`, sourceIp };
};

module.exports = {
  isIpAllowed,
  normalizeIp,
  compareSignatures,
  renderTemplate,
  safeCompare,
  validateProviderSecurity,
};
