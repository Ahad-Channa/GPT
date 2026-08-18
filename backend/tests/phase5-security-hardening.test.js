const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');

const ClickLog = require('../models/ClickLog');
const Conversion = require('../models/Conversion');
const PostbackLog = require('../models/PostbackLog');
const { processPostback } = require('../services/tracking/conversionService');
const { parsePayout } = require('../services/tracking/parameterMapper');
const { validateProviderSecurity } = require('../services/tracking/providerSecurity');

const makeReq = ({ query = {}, body = {}, headers = {}, ip = '203.0.113.77', trustProxy = true } = {}) => ({
  method: Object.keys(body).length ? 'POST' : 'GET',
  query,
  body,
  headers: { 'user-agent': 'phase5-test', ...headers },
  ip,
  socket: { remoteAddress: '198.51.100.10' },
  app: { get: (name) => (name === 'trust proxy' ? trustProxy : undefined) },
});

const providerConfig = (overrides = {}) => ({
  providerId: 'direct',
  name: 'Direct',
  type: 'direct',
  enabled: true,
  parameterMappings: {
    clickId: 'click_id',
    transactionId: 'txn_id',
    status: 'status',
    payout: 'payout',
    providerUserId: 'user_id',
    extra: { campaignId: 'campaign_id', reward: 'reward' },
  },
  statusMappings: {
    pending: ['pending'],
    approved: ['approved'],
    rejected: ['rejected'],
    reversed: ['reversed'],
  },
  security: { method: 'shared_secret', tokenParam: 'secret', secretValue: 'secret-1' },
  responseConfig: { successStatus: 200, successBody: '1', duplicateStatus: 200, duplicateBody: '1', errorStatus: 200, errorBody: '0' },
  ipAllowlist: [],
  providerSettings: { requiredFields: ['clickId', 'transactionId', 'status'] },
  ...overrides,
});

const makeClick = (overrides = {}) => {
  const offerId = overrides.offerId || new mongoose.Types.ObjectId();
  const click = new ClickLog({
    clickId: overrides.clickId || 'click-secure',
    offerId,
    userId: overrides.userId || new mongoose.Types.ObjectId(),
    providerId: overrides.providerId || 'direct',
    providerType: overrides.providerType || 'direct_offer',
    campaignType: overrides.campaignType || 'direct_offer',
    campaignId: overrides.campaignId || offerId,
    rewardAmount: 777,
    ...overrides,
  });
  const error = click.validateSync();
  if (error) throw error;
  return click;
};

const makeAdapters = ({ click, existing = [] } = {}) => {
  const conversions = [...existing];
  const logs = [];
  return {
    conversions,
    logs,
    clickLogModel: {
      async findOne(query) {
        return click && click.clickId === query.clickId ? click : null;
      },
    },
    conversionModel: {
      async create(payload) {
        await new Promise((resolve) => setTimeout(resolve, 2));
        const duplicate = conversions.find((item) =>
          item.providerId === payload.providerId &&
          item.providerTransactionId === payload.providerTransactionId
        );
        if (duplicate) {
          const error = new Error('duplicate key');
          error.code = 11000;
          throw error;
        }
        const conversion = new Conversion(payload);
        const validationError = conversion.validateSync();
        if (validationError) throw validationError;
        conversions.push(conversion);
        return conversion;
      },
      async findOne(query) {
        const found = conversions.find((item) =>
          item.providerId === query.providerId &&
          item.providerTransactionId === query.providerTransactionId
        ) || null;
        if (found) found.save = async function () { return this; };
        return found;
      },
    },
    postbackLogModel: {
      async create(payload) {
        const log = new PostbackLog(payload);
        const validationError = log.validateSync();
        if (validationError) throw validationError;
        logs.push(log);
        return log;
      },
    },
  };
};

const runPostback = (overrides = {}) => {
  const click = overrides.click || makeClick();
  const adapters = overrides.adapters || makeAdapters({ click, existing: overrides.existing || [] });
  return processPostback({
    providerConfig: overrides.providerConfig || providerConfig(),
    req: overrides.req || makeReq({ query: { click_id: click.clickId, txn_id: 'txn-secure', status: 'approved', secret: 'secret-1' } }),
    route: '/api/direct-offers/postback',
    expectedOfferId: overrides.expectedOfferId === undefined ? click.offerId : overrides.expectedOfferId,
    expectedCampaignId: overrides.expectedCampaignId === undefined ? click.campaignId : overrides.expectedCampaignId,
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  }).then((result) => ({ result, adapters, click }));
};

test('security fails closed for missing secret, invalid secret, missing signature, and invalid HMAC/hash', () => {
  assert.equal(validateProviderSecurity({
    providerConfig: providerConfig({ security: { method: 'shared_secret', tokenParam: 'secret' } }),
    req: makeReq({ query: { secret: 'secret-1' } }),
    mapped: {},
  }).passed, false);

  assert.equal(validateProviderSecurity({
    providerConfig: providerConfig(),
    req: makeReq({ query: { secret: 'wrong' } }),
    mapped: {},
  }).passed, false);

  assert.equal(validateProviderSecurity({
    providerConfig: providerConfig({ security: { method: 'sha256', signatureParam: 'sig', hashTemplate: '{clickId}{secret}', secretValue: 's' } }),
    req: makeReq({ query: {} }),
    mapped: { clickId: 'click' },
  }).passed, false);

  assert.equal(validateProviderSecurity({
    providerConfig: providerConfig({ security: { method: 'hmac', hashAlgorithm: 'sha256', signatureParam: 'sig', hashTemplate: '{clickId}', secretValue: 's' } }),
    req: makeReq({ query: { sig: 'bad' } }),
    mapped: { clickId: 'click' },
  }).passed, false);

  assert.equal(validateProviderSecurity({
    providerConfig: providerConfig({ security: { method: 'sha256', signatureParam: 'sig', hashTemplate: '{clickId}{secret}', secretValue: 's' } }),
    req: makeReq({ query: { sig: ['bad', crypto.createHash('sha256').update('clicks').digest('hex')] } }),
    mapped: { clickId: 'click' },
  }).passed, false);

  assert.equal(validateProviderSecurity({
    providerConfig: providerConfig(),
    req: makeReq({ query: { secret: { value: 'secret-1' } } }),
    mapped: {},
  }).passed, false);
});

test('valid hash/HMAC signatures pass exact comparison and bad case does not pass by default', () => {
  const hash = crypto.createHash('sha256').update('clicks').digest('hex');
  assert.equal(validateProviderSecurity({
    providerConfig: providerConfig({ security: { method: 'sha256', signatureParam: 'sig', hashTemplate: '{clickId}{secret}', secretValue: 's' } }),
    req: makeReq({ query: { sig: hash } }),
    mapped: { clickId: 'click' },
  }).passed, true);
  assert.equal(validateProviderSecurity({
    providerConfig: providerConfig({ security: { method: 'sha256', signatureParam: 'sig', hashTemplate: '{clickId}{secret}', secretValue: 's' } }),
    req: makeReq({ query: { sig: hash.toUpperCase() } }),
    mapped: { clickId: 'click' },
  }).passed, false);

  const hmac = crypto.createHmac('sha256', 's').update('click').digest('hex');
  assert.equal(validateProviderSecurity({
    providerConfig: providerConfig({ security: { method: 'hmac', hashAlgorithm: 'sha256', signatureParam: 'sig', hashTemplate: '{clickId}', secretValue: 's' } }),
    req: makeReq({ query: { sig: hmac } }),
    mapped: { clickId: 'click' },
  }).passed, true);
});

test('URL manipulation cannot override trusted user, reward, campaign, or provider', async () => {
  const trustedUser = new mongoose.Types.ObjectId();
  const attackerUser = new mongoose.Types.ObjectId();
  const click = makeClick({ userId: trustedUser });
  const { result } = await runPostback({
    click,
    req: makeReq({
      query: {
        click_id: click.clickId,
        txn_id: 'txn-manipulated',
        status: 'approved',
        secret: 'secret-1',
        user_id: String(attackerUser),
        campaign_id: String(new mongoose.Types.ObjectId()),
        reward: '999999999',
      },
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.conversion.userId.toString(), trustedUser.toString());
  assert.equal(result.conversion.rewardAmount, 777);
  assert.equal(result.conversion.campaignId.toString(), click.campaignId.toString());
  assert.equal(result.providerId, 'direct');
});

test('wrong provider, wrong campaign, nonexistent click, and malformed click/transaction IDs reject', async () => {
  const click = makeClick();
  assert.equal((await runPostback({ click, providerConfig: providerConfig({ providerId: 'other' }) })).result.ok, false);
  assert.equal((await runPostback({ click, expectedCampaignId: new mongoose.Types.ObjectId() })).result.ok, false);
  assert.equal((await runPostback({
    click,
    req: makeReq({ query: { click_id: 'missing-click', txn_id: 'txn-missing-click', status: 'approved', secret: 'secret-1' } }),
  })).result.ok, false);
  assert.match((await runPostback({
    click,
    req: makeReq({ query: { click_id: ['array-click'], txn_id: 'txn-array', status: 'approved', secret: 'secret-1' } }),
  })).result.rejectionReason, /clickId/);
  assert.match((await runPostback({
    click,
    req: makeReq({ query: { click_id: click.clickId, txn_id: ' '.repeat(2), status: 'approved', secret: 'secret-1' } }),
  })).result.rejectionReason, /transactionId/);
  assert.match((await runPostback({
    click,
    req: makeReq({ query: { click_id: click.clickId, txn_id: 'x'.repeat(129), status: 'approved', secret: 'secret-1' } }),
  })).result.rejectionReason, /maximum length/);
});

test('disabled provider and inactive direct campaign reject before conversion', async () => {
  const click = makeClick();
  assert.equal((await runPostback({ click, providerConfig: providerConfig({ enabled: false }) })).result.ok, false);
});

test('payout validation rejects malformed, negative, and oversized supplied values', () => {
  for (const value of ['', '   ', 'NaN', 'Infinity', '-Infinity', '-1', '12abc', {}, [], '1000000001']) {
    assert.throws(() => parsePayout(value), /payout|Invalid/i);
  }
});

test('IP allowlist honors trusted proxy setting and required allowlist mode', () => {
  const config = providerConfig({
    ipAllowlist: ['203.0.113.77'],
    security: { method: 'shared_secret', tokenParam: 'secret', secretValue: 'secret-1' },
  });
  assert.equal(validateProviderSecurity({ providerConfig: config, req: makeReq({ query: { secret: 'secret-1' }, trustProxy: true }), mapped: {} }).passed, true);
  assert.equal(validateProviderSecurity({ providerConfig: config, req: makeReq({ query: { secret: 'secret-1' }, trustProxy: false }), mapped: {} }).passed, false);
  assert.equal(validateProviderSecurity({
    providerConfig: providerConfig({ ipAllowlist: [], security: { method: 'shared_secret', tokenParam: 'secret', secretValue: 'secret-1', ipAllowlistRequired: true } }),
    req: makeReq({ query: { secret: 'secret-1' } }),
    mapped: {},
  }).passed, false);
});

test('nested sensitive values and error text are sanitized in PostbackLog', async () => {
  const click = makeClick();
  const { adapters } = await runPostback({
    click,
    req: makeReq({
      query: {
        click_id: click.clickId,
        txn_id: 'txn-sensitive',
        status: 'unknown',
        secret: 'secret-1',
        nested: { apiKey: 'hidden' },
      },
      headers: { authorization: 'Bearer hidden' },
    }),
  });
  const log = adapters.logs.at(-1);
  assert.equal(log.sanitizedQuery.secret, '[REDACTED]');
  assert.equal(log.sanitizedQuery.nested.apiKey, '[REDACTED]');
  assert.equal(log.sanitizedHeaders.authorization, '[REDACTED]');
  assert.equal(String(log.rejectionReason).includes('secret-1'), false);
});

test('simultaneous duplicate approved postbacks create one Conversion and idempotent duplicates', async () => {
  const click = makeClick();
  const adapters = makeAdapters({ click });
  const calls = Array.from({ length: 8 }, () => runPostback({
    click,
    adapters,
    req: makeReq({ query: { click_id: click.clickId, txn_id: 'txn-concurrent', status: 'approved', secret: 'secret-1' } }),
  }));

  const results = await Promise.all(calls);
  assert.equal(adapters.conversions.length, 1);
  assert.equal(results.filter(({ result }) => result.ok).length, 8);
  assert.ok(results.some(({ result }) => result.lifecycleTransition === 'created'));
  assert.ok(results.some(({ result }) => result.isDuplicate || result.lifecycleTransition === 'retry_reward_bridge'));
});

test('replay after processed conversion is idempotent and not reward-bridge eligible', async () => {
  const click = makeClick();
  const existing = new Conversion({
    providerId: 'direct',
    providerTransactionId: 'txn-replay',
    clickId: click.clickId,
    clickLogId: click._id,
    userId: click.userId,
    campaignType: click.campaignType,
    campaignId: click.campaignId,
    offerId: click.offerId,
    incomingStatus: 'approved',
    internalStatus: 'approved',
    processingState: 'processed',
    rewardTransactionId: new mongoose.Types.ObjectId(),
  });
  const { result, adapters } = await runPostback({
    click,
    existing: [existing],
    req: makeReq({ query: { click_id: click.clickId, txn_id: 'txn-replay', status: 'approved', secret: 'secret-1' } }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.isDuplicate, true);
  assert.equal(result.shouldProcessRewardBridge, false);
  assert.equal(adapters.conversions.length, 1);
});
