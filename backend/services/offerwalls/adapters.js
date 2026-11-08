const crypto = require('crypto');

const { getClientIp } = require('../../utils/geo');

// ─────────────────────────────────────────────────────────────────────────────
// Legacy offerwall provider adapters (fail-closed registry).
//
// A provider route may credit or reverse a wallet ONLY when it has an adapter that
//   * authenticates the callback in a way the provider documents, and
//   * yields a provider-issued completion-instance ID bound to that authentication.
// Every adapter ships DISABLED. It becomes active only when ALL of its
// `confirmations` are true in code AND the operator sets
// OFFERWALL_ADAPTER_<ID>_ENABLED=true. Everything else answers with its configured
// disabled response and never touches a wallet or ledger.
//
// Limit that no adapter can remove: a completion-instance ID identifies ONE
// provider transaction. A genuinely new, provider-signed callback with a new base
// ID for the same task is a new completion and is NOT linkable to the earlier one
// unless the provider supplies a stable shared task ID (none documented).
// ─────────────────────────────────────────────────────────────────────────────

// Responses for routes that are disabled (no adapter / adapter not enabled). They
// are chosen from the provider's documented retry behaviour so a permanently
// disabled route does not trigger endless retries:
//  - lootably: any body other than "1" is a failure; retries are 0-5 and off by default.
//  - ayet: non-200 is resent 12 times over one hour, then dropped.
//  - everything else: retry policy unknown or undocumented -> 410 (permanent).
const DISABLED_ROUTE_RESPONSES = {
  lootably: { status: 200, body: '0' },
  ayet: { status: 503, body: '0' },
};
const DEFAULT_DISABLED_RESPONSE = { status: 410, body: '0' };

const getDisabledResponse = (providerId) =>
  DISABLED_ROUTE_RESPONSES[providerId] || DEFAULT_DISABLED_RESPONSE;

// Rejection for an ENABLED adapter whose callback failed authentication or parsing.
const REJECTED_RESPONSE = { status: 400, body: '0' };

const timingSafeEqualStrings = (a, b) => {
  const left = Buffer.from(String(a ?? ''), 'utf8');
  const right = Buffer.from(String(b ?? ''), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const isPlainString = (value) => typeof value === 'string' && value.length > 0;

const readParam = (req, key) => {
  const queryValue = req?.query?.[key];
  if (queryValue !== undefined) return queryValue;
  return req?.body?.[key];
};

// A callback must not repeat a parameter (ambiguous signing input).
const hasRepeatedOrNonScalarParams = (req) =>
  Object.values(req?.query || {}).some((value) => Array.isArray(value) || (value && typeof value === 'object'));

const stripReversalPrefix = (value) => String(value || '').replace(/^[a-z]-/i, '');
const getPrefix = (value) => {
  const match = /^([a-z])-/i.exec(String(value || ''));
  return match ? match[1].toLowerCase() : '';
};

// ── PrimeEarn ────────────────────────────────────────────────────────────────
// Doc: https://docs.primeearn.com/integration/postbacks
//   hash = SHA1(fullUrlWithoutHashParams + appSecurityHashSalt); every query
//   parameter (incl. tx_id, user, reward) is covered. tx_id prefixes p-/c-/r- share
//   one base ID with the completed state (no prefix).
// UNCONFIRMED (adapter stays disabled until each is true): whether the signed bytes
// are the raw or the re-encoded query string, which field is the user reward, and
// the sign/field of reversal amounts. The raw query string is used here.
const PRIMEEARN_IPS = ['168.119.57.82', '49.12.33.196', '49.13.14.251'];

const primeEarnSignedString = (req, baseUrl) => {
  const original = String(req?.originalUrl || req?.url || '');
  const questionIndex = original.indexOf('?');
  const path = questionIndex === -1 ? original : original.slice(0, questionIndex);
  const rawQuery = questionIndex === -1 ? '' : original.slice(questionIndex + 1);
  const kept = rawQuery
    .split('&')
    .filter((pair) => pair.length > 0)
    .filter((pair) => {
      const name = pair.split('=')[0];
      return name !== 'hash' && name !== 'shash';
    });
  return `${String(baseUrl).replace(/\/+$/, '')}${path}${kept.length ? `?${kept.join('&')}` : ''}`;
};

const primeEarnVerify = (req, { env = process.env } = {}) => {
  const salt = String(env.PRIMEEARN_SECRET || '').trim();
  const baseUrl = String(env.PRIMEEARN_POSTBACK_BASE_URL || '').trim();
  if (!salt) return { passed: false, reason: 'PRIMEEARN_SECRET is not configured.' };
  if (!baseUrl) return { passed: false, reason: 'PRIMEEARN_POSTBACK_BASE_URL is not configured.' };
  if (hasRepeatedOrNonScalarParams(req)) return { passed: false, reason: 'Repeated or non-scalar parameters are not allowed.' };

  const supplied = req?.query?.hash;
  if (!isPlainString(supplied)) return { passed: false, reason: 'Signature is missing.' };

  const expected = crypto
    .createHash('sha1')
    .update(primeEarnSignedString(req, baseUrl) + salt)
    .digest('hex');
  if (!timingSafeEqualStrings(String(supplied).toLowerCase(), expected)) {
    return { passed: false, reason: 'Signature mismatch.' };
  }

  // Defence in depth only. An IP allowlist never proves that an ID identifies a completion.
  if (env.PRIMEEARN_ENFORCE_IP === 'true' && !PRIMEEARN_IPS.includes(getClientIp(req))) {
    return { passed: false, reason: 'Source IP is not allowed.' };
  }
  return { passed: true, reason: '' };
};

// The user-reward field is UNCONFIRMED (reward vs payout); keep it one named constant.
const PRIMEEARN_UNITS_FIELD = 'reward';

const primeEarnParse = (req) => {
  const user = readParam(req, 'user');
  const txId = readParam(req, 'tx_id');
  const status = String(readParam(req, 'status') || '').toUpperCase();
  if (!isPlainString(user) || !isPlainString(txId) || !status) {
    return { ok: false, reason: 'Missing user, tx_id or status.' };
  }
  const prefix = getPrefix(txId);
  const baseId = stripReversalPrefix(txId);
  if (!baseId) return { ok: false, reason: 'Empty base transaction ID.' };

  if (status === 'COMPLETED') {
    if (prefix) return { ok: false, reason: 'COMPLETED callback must not carry a status prefix.' };
    return { ok: true, kind: 'credit', userId: user.trim(), baseId, transactionId: baseId, providerUnits: readParam(req, PRIMEEARN_UNITS_FIELD) };
  }
  if (status === 'RECONCILED') {
    if (prefix !== 'r') return { ok: false, reason: 'RECONCILED callback must carry the r- prefix.' };
    return { ok: true, kind: 'reversal', userId: user.trim(), baseId, transactionId: txId, providerUnits: null };
  }
  if (['PENDING', 'IN_PROGRESS', 'PENDING_RECONCILED'].includes(status)) {
    // Acknowledged, never credited or reversed (nothing was credited for these states).
    return { ok: true, kind: 'ignore', userId: user.trim(), baseId, transactionId: txId, providerUnits: null };
  }
  return { ok: false, reason: `Unknown status: ${status.slice(0, 40)}` };
};
// ── ayeT-Studios ─────────────────────────────────────────────────────────────
// Docs: https://docs.ayetstudios.com/v/product-docs/callbacks-and-testing/callback-verification/hmac-security-hash-optional
//   header X-Ayetstudios-Security-Hash = lowercase-hex HMAC-SHA256 over the query
//   parameters sorted by key, URL-encoded (space = '+'), joined with '&' (no '?',
//   no domain/path), keyed with the publisher API key. Covers only parameters
//   present in the configured callback URL.
// UNCONFIRMED (adapter stays disabled): that the feature is active for the placement,
// that reversal callbacks are signed, and the exact encoding of special characters.
const ayetSignedString = (query) => {
  const entries = Object.entries(query || {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return new URLSearchParams(entries).toString();
};

const ayetVerify = (req, { env = process.env } = {}) => {
  const key = String(env.AYET_API_KEY || '').trim();
  if (!key) return { passed: false, reason: 'AYET_API_KEY is not configured.' };
  if (hasRepeatedOrNonScalarParams(req)) return { passed: false, reason: 'Repeated or non-scalar parameters are not allowed.' };

  const header = req?.headers?.['x-ayetstudios-security-hash'];
  if (!isPlainString(header)) return { passed: false, reason: 'Security hash header is missing.' };

  const expected = crypto.createHmac('sha256', key).update(ayetSignedString(req.query)).digest('hex');
  if (!timingSafeEqualStrings(header.toLowerCase(), expected)) {
    return { passed: false, reason: 'Security hash mismatch.' };
  }
  return { passed: true, reason: '' };
};

const ayetParse = (req) => {
  const user = readParam(req, 'external_identifier');
  const txId = readParam(req, 'transaction_id');
  if (!isPlainString(user) || !isPlainString(txId)) {
    return { ok: false, reason: 'Missing external_identifier or transaction_id.' };
  }
  const prefix = getPrefix(txId);
  const baseId = stripReversalPrefix(txId);
  if (!baseId) return { ok: false, reason: 'Empty base transaction ID.' };

  const chargebackFlag = String(readParam(req, 'is_chargeback') ?? '0');
  if (!['0', '1'].includes(chargebackFlag)) return { ok: false, reason: 'Invalid is_chargeback value.' };
  const isReversalById = prefix === 'r';
  if (prefix && !isReversalById) return { ok: false, reason: 'Unknown transaction ID prefix.' };
  // The reversal flag and the r- prefix must agree; any disagreement is rejected.
  if (isReversalById !== (chargebackFlag === '1')) {
    return { ok: false, reason: 'is_chargeback and the r- prefix disagree.' };
  }
  return {
    ok: true,
    kind: isReversalById ? 'reversal' : 'credit',
    userId: user.trim(),
    baseId,
    transactionId: isReversalById ? txId : baseId,
    providerUnits: isReversalById ? null : readParam(req, 'currency_amount'),
  };
};

// ── Registry ─────────────────────────────────────────────────────────────────
// `legacyIdMatchesNew` is false and may only be set after the configured callback
// template AND the FULL relevant historical dataset prove the old/new fields match
// (a sample is not enough). `legacyIdMatchesNewAllowed:false` means it can never be
// honoured (PrimeEarn's old handler stored offer_id, a different thing).
const buildAdapters = () => ({
  primeearn: {
    id: 'primeearn',
    verify: primeEarnVerify,
    parse: primeEarnParse,
    legacyIdMatchesNew: false,
    legacyIdMatchesNewAllowed: false,
    confirmations: {
      rewardFieldConfirmed: false,
      hashInputBytesConfirmed: false,
      reversalSignConfirmed: false,
      providerTestPostbackVerified: false,
    },
  },
  ayet: {
    id: 'ayet',
    verify: ayetVerify,
    parse: ayetParse,
    legacyIdMatchesNew: false,
    legacyIdMatchesNewAllowed: true,
    confirmations: {
      securityHashActivated: false,
      reversalCallbacksSigned: false,
      callbackTemplateIncludesTrustedFields: false,
      callbackTesterVerified: false,
    },
  },
});

const ADAPTERS = buildAdapters();

const isAdapterEnabled = (adapter, env = process.env) => {
  if (!adapter) return false;
  const confirmed = Object.values(adapter.confirmations || {}).every((value) => value === true);
  const flag = env[`OFFERWALL_ADAPTER_${String(adapter.id).toUpperCase()}_ENABLED`] === 'true';
  return confirmed && flag;
};

// Returns the adapter only if it exists AND is enabled. `registry` is injectable for tests.
const resolveEnabledAdapter = (providerId, { registry = ADAPTERS, env = process.env } = {}) => {
  const adapter = registry?.[providerId];
  return isAdapterEnabled(adapter, env) ? adapter : null;
};

const adapterLegacyIdMatchesNew = (adapter) =>
  Boolean(adapter && adapter.legacyIdMatchesNewAllowed !== false && adapter.legacyIdMatchesNew === true);

module.exports = {
  ADAPTERS,
  DEFAULT_DISABLED_RESPONSE,
  DISABLED_ROUTE_RESPONSES,
  PRIMEEARN_IPS,
  REJECTED_RESPONSE,
  adapterLegacyIdMatchesNew,
  ayetSignedString,
  ayetVerify,
  buildAdapters,
  getDisabledResponse,
  isAdapterEnabled,
  primeEarnSignedString,
  primeEarnVerify,
  resolveEnabledAdapter,
  stripReversalPrefix,
};
