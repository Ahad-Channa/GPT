const crypto = require('crypto');
const ClickLog = require('../../models/ClickLog');
const {
  isCountryAllowed,
  normalizeCountryCode,
  resolveRequestGeo,
} = require('../../utils/geo');

const SENSITIVE_KEY_PATTERN = /(api[_-]?key|secret|token|password|authorization|bearer|credential|private)/i;
const ALLOWED_TRACKING_KEYS = new Set([
  'sub',
  'sub1',
  'sub2',
  'sub3',
  'sub4',
  'sub5',
  'source',
  'placement',
  'campaign',
  'campaignId',
  'provider',
  'providerId',
  'platform',
]);
const MAX_CLICK_ID_ATTEMPTS = 5;

const generateClickId = () => crypto.randomBytes(24).toString('base64url');

const isDuplicateClickIdError = (error) =>
  error?.code === 11000 && (
    error?.keyPattern?.clickId ||
    error?.keyValue?.clickId ||
    /clickId/.test(String(error?.message || ''))
  );

const detectDevice = (userAgent = '') => {
  const value = String(userAgent).toLowerCase();
  if (/tablet|ipad|playbook|silk/.test(value)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/.test(value)) return 'mobile';
  return 'desktop';
};

const detectPlatform = (userAgent = '') => {
  const value = String(userAgent).toLowerCase();
  if (/iphone|ipad|ipod/.test(value)) return 'ios';
  if (/android/.test(value)) return 'android';
  return 'desktop';
};

const sanitizeTrackingParams = (params = {}) => {
  const sanitized = {};

  for (const [key, rawValue] of Object.entries(params || {})) {
    if (!ALLOWED_TRACKING_KEYS.has(key) || SENSITIVE_KEY_PATTERN.test(key)) continue;
    if (rawValue === undefined || rawValue === null) continue;

    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (typeof value === 'object') continue;

    sanitized[key] = String(value).slice(0, 250);
  }

  return sanitized;
};

const buildRedirectUrl = ({ destinationUrl, clickId, clickIdParam = 'click_id' }) => {
  if (!destinationUrl || typeof destinationUrl !== 'string') {
    const error = new Error('Destination URL is required.');
    error.statusCode = 400;
    throw error;
  }

  let parsed;
  try {
    parsed = new URL(destinationUrl);
  } catch {
    const error = new Error('Destination URL is malformed.');
    error.statusCode = 400;
    throw error;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    const error = new Error('Destination URL must use http or https.');
    error.statusCode = 400;
    throw error;
  }

  parsed.searchParams.set(clickIdParam || 'click_id', clickId);
  return parsed.toString();
};

const assertDirectOfferAvailable = ({ offer, country, platform, now = new Date() }) => {
  if (!offer || !offer.isActive) {
    const error = new Error('Offer not found or inactive');
    error.statusCode = 404;
    throw error;
  }

  if (offer.expirationDate && new Date(offer.expirationDate) < now) {
    const error = new Error('Offer has expired');
    error.statusCode = 400;
    throw error;
  }

  if (!isCountryAllowed(offer.allowedCountries, country)) {
    const error = new Error('Offer is not available in your country');
    error.statusCode = 403;
    throw error;
  }

  const platformRules = offer.platforms || {};
  if (platformRules[platform] === false) {
    const error = new Error('Offer is not available on this device');
    error.statusCode = 403;
    throw error;
  }
};

const createClick = async ({
  user,
  providerId,
  providerType,
  campaignId,
  campaignType,
  offerId = null,
  requestMetadata = {},
  trackingParams = {},
  rewardAmount,
  rewardSnapshot = {},
  destinationUrl,
  clickIdParam = 'click_id',
  clickLogModel = ClickLog,
}) => {
  if (!user?._id) throw new Error('User association is required.');

  const sanitizedTrackingParams = sanitizeTrackingParams(trackingParams);

  for (let attempt = 1; attempt <= MAX_CLICK_ID_ATTEMPTS; attempt += 1) {
    const clickId = generateClickId();
    const redirectUrl = buildRedirectUrl({ destinationUrl, clickId, clickIdParam });

    try {
      const clickLog = await clickLogModel.create({
        clickId,
        offerId,
        userId: user._id,
        providerId,
        providerType,
        campaignId,
        campaignType,
        ip: requestMetadata.ip || '',
        userAgent: requestMetadata.userAgent || '',
        device: requestMetadata.device || detectDevice(requestMetadata.userAgent),
        country: normalizeCountryCode(requestMetadata.country),
        trackingParams: sanitizedTrackingParams,
        destinationUrl,
        redirectUrl,
        status: 'clicked',
        rewardAmount,
        rewardSnapshot,
      });

      return { clickLog, clickId, redirectUrl };
    } catch (error) {
      if (!isDuplicateClickIdError(error) || attempt === MAX_CLICK_ID_ATTEMPTS) {
        throw error;
      }
    }
  }

  throw new Error('Failed to generate a unique click ID.');
};

const createDirectOfferClick = async ({
  user,
  offer,
  req,
  trackingParams = {},
  clickLogModel = ClickLog,
  now = new Date(),
}) => {
  const userAgent = req?.headers?.['user-agent'] || '';
  const geo = resolveRequestGeo(req);
  const device = detectDevice(userAgent);
  const platform = detectPlatform(userAgent);

  assertDirectOfferAvailable({ offer, country: geo.country, platform, now });

  return createClick({
    user,
    offerId: offer._id,
    providerId: 'direct',
    providerType: 'direct_offer',
    campaignId: offer._id,
    campaignType: 'direct_offer',
    requestMetadata: {
      ip: geo.ip,
      userAgent,
      device,
      country: geo.country,
    },
    trackingParams: {
      ...trackingParams,
      source: trackingParams.source || 'direct_offer',
      campaignId: String(offer._id),
      providerId: 'direct',
      platform,
    },
    rewardAmount: offer.rewardAmount,
    rewardSnapshot: {
      amount: offer.rewardAmount,
      currency: 'coins',
      source: 'direct_offer.rewardAmount',
    },
    destinationUrl: offer.advertiserUrl,
    clickIdParam: offer.postbackMapping?.clickIdParam || 'click_id',
    clickLogModel,
  });
};

module.exports = {
  assertDirectOfferAvailable,
  buildRedirectUrl,
  createClick,
  createDirectOfferClick,
  detectDevice,
  detectPlatform,
  generateClickId,
  isDuplicateClickIdError,
  sanitizeTrackingParams,
};
