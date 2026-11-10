const { getClientIp } = require('../../utils/geo');
const { safeCompare } = require('../tracking/providerSecurity');

const LOOTABLY_WEBHOOK_PATH = '/webhook/lootably';
const LOOTABLY_EVENTS = new Set(['approved', 'pending', 'rejected']);
const MAX_WEBHOOK_ID_LENGTH = 200;
const MAX_PROVIDER_ID_LENGTH = 160;

const readAllowedIps = (env = process.env) =>
  String(env.LOOTABLY_WEBHOOK_ALLOWED_IPS || '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);

const verifyLootablyWebhook = (req, { env = process.env } = {}) => {
  const secret = String(env.LOOTABLY_WEBHOOK_SECRET || '').trim();
  const placementId = String(env.LOOTABLY_PLACEMENT_ID || '').trim();
  const allowedIps = readAllowedIps(env);

  if (!secret || !placementId || allowedIps.length === 0) {
    return { passed: false, reason: 'Lootably webhook secret, placement ID or IP allowlist is not configured.' };
  }
  if (req?.method !== 'POST' || req?.path !== LOOTABLY_WEBHOOK_PATH) {
    return { passed: false, reason: 'Unexpected method or route.' };
  }
  const contentType = String(req?.headers?.['content-type'] || '').toLowerCase();
  if (!contentType.startsWith('application/json')) {
    return { passed: false, reason: 'Content-Type must be application/json.' };
  }

  const providedSecret = req?.headers?.['x-lootably-webhook-secret'];
  if (typeof providedSecret !== 'string' || !safeCompare(providedSecret, secret)) {
    return { passed: false, reason: 'Lootably webhook secret is missing or invalid.' };
  }

  const clientIp = getClientIp(req);
  if (!clientIp || !allowedIps.includes(clientIp)) {
    return { passed: false, reason: 'Source IP is not in the configured Lootably allowlist.' };
  }

  const webhookId = req?.headers?.['x-lootably-webhook-id'];
  if (typeof webhookId !== 'string' || !webhookId.trim() || webhookId.length > MAX_WEBHOOK_ID_LENGTH) {
    return { passed: false, reason: 'Lootably webhook ID is missing or invalid.' };
  }

  const timestamp = req?.headers?.['x-lootably-webhook-timestamp'];
  if (typeof timestamp !== 'string' || !timestamp.trim() || !Number.isFinite(Date.parse(timestamp))) {
    return { passed: false, reason: 'Lootably webhook timestamp is missing or invalid.' };
  }

  const headerEvent = req?.headers?.['x-lootably-webhook-type'];
  const bodyEvent = req?.body?.event;
  if (!LOOTABLY_EVENTS.has(bodyEvent) || headerEvent !== bodyEvent) {
    return { passed: false, reason: 'Lootably event type is missing, unsupported or inconsistent.' };
  }

  if (String(req?.body?.data?.placementID || '') !== placementId) {
    return { passed: false, reason: 'Lootably placement ID does not match.' };
  }

  return { passed: true, reason: '', webhookId: webhookId.trim(), event: bodyEvent };
};

const parseLootablyWebhook = (req) => {
  const event = req?.body?.event;
  const data = req?.body?.data;
  if (!LOOTABLY_EVENTS.has(event) || !data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, reason: 'Lootably webhook body is malformed.' };
  }

  const userId = data.userID;
  const providerTransactionId = data.transactionID;
  const offerType = data.offerType;
  const goalId = offerType === 'multistep' ? data.goalID : '';
  if (typeof userId !== 'string' || !userId.trim() || userId.length > MAX_PROVIDER_ID_LENGTH) {
    return { ok: false, reason: 'Lootably userID is missing or invalid.' };
  }
  if (typeof providerTransactionId !== 'string' || !providerTransactionId.trim() || providerTransactionId.length > MAX_PROVIDER_ID_LENGTH) {
    return { ok: false, reason: 'Lootably transactionID is missing or invalid.' };
  }
  if (!['singlestep', 'multistep'].includes(offerType)) {
    return { ok: false, reason: 'Lootably offerType is missing or invalid.' };
  }
  if (offerType === 'multistep' && (typeof goalId !== 'string' || !goalId.trim() || goalId.length > MAX_PROVIDER_ID_LENGTH)) {
    return { ok: false, reason: 'Lootably multistep goalID is missing or invalid.' };
  }

  const reward = data.currencyReward;
  if (event === 'approved' && (!Number.isSafeInteger(reward) || reward < 1)) {
    return { ok: false, reason: 'Lootably currencyReward must be a positive whole-number coin reward.' };
  }

  // Composite identity keeps goal steps independent if the provider reuses a
  // conversion ID across steps. A retry/status change for the same step keeps
  // this same identity and therefore cannot re-credit after reversal.
  const identityKey = `${providerTransactionId.trim()}:${offerType === 'multistep' ? goalId.trim() : 'single'}`;
  const transactionId = `webhook:${identityKey}`;
  const kind = event === 'approved' ? 'credit' : event === 'rejected' ? 'reversal' : 'ignore';

  return {
    ok: true,
    kind,
    userId: userId.trim(),
    transactionId,
    baseId: transactionId,
    providerTransactionId: providerTransactionId.trim(),
    providerUnits: event === 'approved' ? String(reward) : null,
    platformCoins: event === 'approved' ? reward : null,
    offerTitle: typeof data.offerName === 'string' ? data.offerName : '',
    stepLabel: typeof data.goalDescription === 'string' ? data.goalDescription : '',
    goalId: offerType === 'multistep' ? goalId.trim() : null,
    event,
  };
};

module.exports = {
  LOOTABLY_WEBHOOK_PATH,
  parseLootablyWebhook,
  readAllowedIps,
  verifyLootablyWebhook,
};
