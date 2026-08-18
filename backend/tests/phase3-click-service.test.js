const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const ClickLog = require('../models/ClickLog');
const DirectOffer = require('../models/DirectOffer');
const {
  assertDirectOfferAvailable,
  buildRedirectUrl,
  createClick,
  createDirectOfferClick,
  generateClickId,
  sanitizeTrackingParams,
} = require('../services/tracking/clickService');
const {
  isCountryAllowed,
  normalizeCountryCode,
  normalizeCountryList,
  resolveRequestGeo,
} = require('../utils/geo');
const {
  normalizeDisplayPlacements,
  parseAllowedCountriesInput,
} = require('../utils/directOfferInput');

const makeReq = ({
  userAgent = 'Mozilla/5.0',
  country = 'US',
  ip = '203.0.113.20',
  trustProxy = true,
} = {}) => ({
  headers: {
    'user-agent': userAgent,
    'cf-ipcountry': country,
  },
  ip,
  socket: { remoteAddress: ip },
  app: {
    get(name) {
      return name === 'trust proxy' ? trustProxy : undefined;
    },
  },
});

const validatingClickLogModel = {
  async create(payload) {
    const click = new ClickLog(payload);
    const error = click.validateSync();
    if (error) throw error;
    return click;
  },
};

test('click IDs are cryptographically strong and unique-looking', () => {
  const ids = new Set(Array.from({ length: 200 }, generateClickId));
  assert.equal(ids.size, 200);
  for (const id of ids) {
    assert.match(id, /^[A-Za-z0-9_-]+$/);
    assert.ok(id.length >= 32);
  }
});

test('createDirectOfferClick creates a legacy-compatible direct-offer ClickLog', async () => {
  const offerId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const offer = new DirectOffer({
    _id: offerId,
    title: 'Survey',
    description: 'Complete survey',
    rewardAmount: 500,
    advertiserUrl: 'https://advertiser.example/path?existing=1',
    allowedCountries: ['us'],
    postbackMapping: { clickIdParam: 'subid' },
  });

  const { clickLog, redirectUrl, clickId } = await createDirectOfferClick({
    user: { _id: userId },
    offer,
    req: makeReq({ country: 'US', userAgent: 'Mozilla/5.0 (iPhone)' }),
    trackingParams: {
      placement: 'featured',
      api_key: 'do-not-store',
      token: 'drop-me',
    },
    clickLogModel: validatingClickLogModel,
  });

  const url = new URL(redirectUrl);
  assert.equal(clickLog.offerId.toString(), offerId.toString());
  assert.equal(clickLog.userId.toString(), userId.toString());
  assert.equal(clickLog.providerId, 'direct');
  assert.equal(clickLog.providerType, 'direct_offer');
  assert.equal(clickLog.campaignType, 'direct_offer');
  assert.equal(clickLog.campaignId.toString(), offerId.toString());
  assert.equal(clickLog.country, 'US');
  assert.equal(clickLog.rewardSnapshot.amount, 500);
  assert.equal(clickLog.trackingParams.placement, 'featured');
  assert.equal(clickLog.trackingParams.api_key, undefined);
  assert.equal(clickLog.trackingParams.token, undefined);
  assert.equal(url.searchParams.get('existing'), '1');
  assert.equal(url.searchParams.get('subid'), clickId);
});

test('createClick supports generic provider clicks without fake DirectOffer references', async () => {
  const userId = new mongoose.Types.ObjectId();
  const campaignId = new mongoose.Types.ObjectId();
  const { clickLog } = await createClick({
    user: { _id: userId },
    providerId: 'cpx',
    providerType: 'offerwall',
    campaignId,
    campaignType: 'offerwall',
    requestMetadata: { ip: '203.0.113.10', country: 'GB', userAgent: 'Mozilla/5.0' },
    trackingParams: { sub1: 'abc', authorization: 'Bearer secret' },
    rewardAmount: 25,
    destinationUrl: 'https://wall.example/offers',
    clickLogModel: validatingClickLogModel,
  });

  assert.equal(clickLog.offerId, null);
  assert.equal(clickLog.providerId, 'cpx');
  assert.equal(clickLog.providerType, 'offerwall');
  assert.equal(clickLog.campaignId.toString(), campaignId.toString());
  assert.equal(clickLog.trackingParams.sub1, 'abc');
  assert.equal(clickLog.trackingParams.authorization, undefined);
});

test('createClick retries safely on duplicate click ID collisions', async () => {
  let attempts = 0;
  const { clickLog, clickId, redirectUrl } = await createClick({
    user: { _id: new mongoose.Types.ObjectId() },
    providerId: 'cpx',
    providerType: 'offerwall',
    campaignId: new mongoose.Types.ObjectId(),
    campaignType: 'offerwall',
    rewardAmount: 25,
    destinationUrl: 'https://wall.example/offers',
    clickLogModel: {
      async create(payload) {
        attempts += 1;
        if (attempts === 1) {
          const error = new Error('E11000 duplicate key error collection: clicklogs index: clickId_1 dup key');
          error.code = 11000;
          error.keyPattern = { clickId: 1 };
          throw error;
        }
        const click = new ClickLog(payload);
        const validationError = click.validateSync();
        if (validationError) throw validationError;
        return click;
      },
    },
  });

  assert.equal(attempts, 2);
  assert.equal(clickLog.clickId, clickId);
  assert.equal(new URL(redirectUrl).searchParams.get('click_id'), clickId);
});

test('direct offer availability rejects inactive and expired offers before click creation', () => {
  const activeOffer = {
    isActive: true,
    expirationDate: null,
    allowedCountries: [],
    platforms: { desktop: true },
  };
  assert.doesNotThrow(() => assertDirectOfferAvailable({ offer: activeOffer, country: '', platform: 'desktop' }));

  assert.throws(
    () => assertDirectOfferAvailable({ offer: { ...activeOffer, isActive: false }, country: '', platform: 'desktop' }),
    /Offer not found or inactive/
  );
  assert.throws(
    () => assertDirectOfferAvailable({
      offer: { ...activeOffer, expirationDate: new Date('2020-01-01') },
      country: '',
      platform: 'desktop',
      now: new Date('2026-01-01'),
    }),
    /Offer has expired/
  );
});

test('country targeting supports allowed, disallowed, and global offers', () => {
  assert.deepEqual(normalizeCountryList(['us', 'GB', 'bad', 'US']), ['US', 'GB']);
  assert.equal(normalizeCountryCode('pk'), 'PK');
  assert.equal(isCountryAllowed([], ''), true);
  assert.equal(isCountryAllowed(['US'], 'US'), true);
  assert.equal(isCountryAllowed(['US'], 'GB'), false);
  assert.equal(isCountryAllowed(['US'], ''), false);
});

test('disallowed country does not create a ClickLog', async () => {
  let createCalled = false;
  const offer = new DirectOffer({
    title: 'US Only',
    description: 'Targeted offer',
    rewardAmount: 100,
    advertiserUrl: 'https://advertiser.example',
    allowedCountries: ['US'],
  });

  await assert.rejects(
    () => createDirectOfferClick({
      user: { _id: new mongoose.Types.ObjectId() },
      offer,
      req: makeReq({ country: 'GB' }),
      clickLogModel: {
        async create() {
          createCalled = true;
        },
      },
    }),
    /not available in your country/
  );

  assert.equal(createCalled, false);
});

test('global offer works when geo is unavailable, targeted offer fails safely', async () => {
  const baseOffer = {
    _id: new mongoose.Types.ObjectId(),
    title: 'Geo test',
    description: 'Geo behavior',
    rewardAmount: 100,
    advertiserUrl: 'https://advertiser.example',
    isActive: true,
    expirationDate: null,
    platforms: { desktop: true, android: true, ios: true },
  };

  const globalResult = await createDirectOfferClick({
    user: { _id: new mongoose.Types.ObjectId() },
    offer: { ...baseOffer, allowedCountries: [] },
    req: makeReq({ country: 'US', trustProxy: false }),
    clickLogModel: validatingClickLogModel,
  });

  assert.equal(globalResult.clickLog.country, '');

  let createCalled = false;
  await assert.rejects(
    () => createDirectOfferClick({
      user: { _id: new mongoose.Types.ObjectId() },
      offer: { ...baseOffer, allowedCountries: ['US'] },
      req: makeReq({ country: 'US', trustProxy: false }),
      clickLogModel: {
        async create() {
          createCalled = true;
        },
      },
    }),
    /not available in your country/
  );
  assert.equal(createCalled, false);
});

test('geo helper only trusts country headers when Express trust proxy is enabled', () => {
  assert.deepEqual(resolveRequestGeo(makeReq({ country: 'DE', trustProxy: true })), {
    ip: '203.0.113.20',
    country: 'DE',
  });
  assert.equal(resolveRequestGeo(makeReq({ country: 'DE', trustProxy: false })).country, '');
});

test('tracking params keep intended values and drop sensitive or arbitrary values', () => {
  assert.deepEqual(sanitizeTrackingParams({
    sub1: 'ok',
    placement: 'featured',
    redirect: 'https://evil.example',
    apiKey: 'secret',
    password: 'secret',
  }), {
    sub1: 'ok',
    placement: 'featured',
  });
});

test('redirect URL injection preserves configured query params and blocks unsafe URLs', () => {
  const redirectUrl = buildRedirectUrl({
    destinationUrl: 'https://advertiser.example/landing?campaign=abc',
    clickId: 'click-1',
    clickIdParam: 'click_id',
  });
  const parsed = new URL(redirectUrl);
  assert.equal(parsed.origin, 'https://advertiser.example');
  assert.equal(parsed.searchParams.get('campaign'), 'abc');
  assert.equal(parsed.searchParams.get('click_id'), 'click-1');

  assert.throws(() => buildRedirectUrl({
    destinationUrl: 'not a url',
    clickId: 'click-1',
  }), /malformed/);
  assert.throws(() => buildRedirectUrl({
    destinationUrl: 'javascript:alert(1)',
    clickId: 'click-1',
  }), /http or https/);
});

test('arbitrary redirect override is not persisted or used', async () => {
  const { clickLog, redirectUrl } = await createClick({
    user: { _id: new mongoose.Types.ObjectId() },
    providerId: 'cpx',
    providerType: 'offerwall',
    campaignId: new mongoose.Types.ObjectId(),
    campaignType: 'offerwall',
    trackingParams: { redirect: 'https://evil.example', sub1: 'safe' },
    rewardAmount: 10,
    destinationUrl: 'https://configured.example/path',
    clickLogModel: validatingClickLogModel,
  });

  assert.equal(new URL(redirectUrl).origin, 'https://configured.example');
  assert.equal(clickLog.trackingParams.redirect, undefined);
});

test('DirectOffer placement config accepts Featured, branded Offerwall, or both on one offer', () => {
  const featured = new DirectOffer({
    title: 'Featured',
    description: 'Only featured',
    rewardAmount: 1,
    advertiserUrl: 'https://example.com',
    displayPlacements: { featured: true, brandedOfferwall: false },
  });
  const branded = new DirectOffer({
    title: 'Branded',
    description: 'Only branded',
    rewardAmount: 1,
    advertiserUrl: 'https://example.com',
    displayPlacements: { featured: false, brandedOfferwall: true },
  });
  const both = new DirectOffer({
    title: 'Both',
    description: 'Both placements',
    rewardAmount: 1,
    advertiserUrl: 'https://example.com',
    displayPlacements: { featured: true, brandedOfferwall: true },
  });

  assert.equal(featured.validateSync(), undefined);
  assert.equal(branded.validateSync(), undefined);
  assert.equal(both.validateSync(), undefined);
});

test('DirectOffer defaults preserve existing Featured Offers behavior', () => {
  const offer = new DirectOffer({
    title: 'Legacy Featured',
    description: 'Existing direct offer shape',
    rewardAmount: 1,
    advertiserUrl: 'https://example.com',
  });

  assert.equal(offer.displayPlacements.featured, true);
  assert.equal(offer.displayPlacements.brandedOfferwall, false);
  assert.equal(offer.validateSync(), undefined);
});

test('admin direct-offer input rejects invalid countries and malformed placements', async () => {
  assert.deepEqual(parseAllowedCountriesInput(['us', 'GB', 'US']), ['US', 'GB']);
  assert.throws(() => parseAllowedCountriesInput(['US', 'bad']), /Invalid country code/);
  assert.throws(() => parseAllowedCountriesInput('US'), /must be an array/);

  assert.deepEqual(normalizeDisplayPlacements(undefined), {
    featured: true,
    brandedOfferwall: false,
  });
  assert.deepEqual(normalizeDisplayPlacements({ featured: false, brandedOfferwall: true }), {
    featured: false,
    brandedOfferwall: true,
  });
  assert.throws(
    () => normalizeDisplayPlacements({ featured: false, brandedOfferwall: false }),
    /At least one direct-offer placement/
  );

  const hiddenOffer = new DirectOffer({
    title: 'Hidden',
    description: 'Invalid hidden offer',
    rewardAmount: 1,
    advertiserUrl: 'https://example.com',
    displayPlacements: { featured: false, brandedOfferwall: false },
  });
  await assert.rejects(() => hiddenOffer.validate(), /At least one/);
});
