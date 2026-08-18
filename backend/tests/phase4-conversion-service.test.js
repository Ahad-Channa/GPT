const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const ClickLog = require('../models/ClickLog');
const Conversion = require('../models/Conversion');
const PostbackLog = require('../models/PostbackLog');
const ProviderConfig = require('../models/ProviderConfig');
const { mapPostbackParameters } = require('../services/tracking/parameterMapper');
const { processPostback, providerResponse } = require('../services/tracking/conversionService');
const { validateProviderSecurity } = require('../services/tracking/providerSecurity');
const { normalizeProviderStatus } = require('../services/tracking/statusMapper');

const makeReq = ({ query = {}, body = {}, method = 'GET', headers = {}, ip = '203.0.113.50' } = {}) => ({
  method,
  query,
  body,
  headers: {
    'user-agent': 'node-test',
    ...headers,
  },
  ip,
  socket: { remoteAddress: ip },
  app: {
    get(name) {
      return name === 'trust proxy' ? true : undefined;
    },
  },
});

const baseProviderConfig = (overrides = {}) => ({
  providerId: 'direct',
  name: 'Direct',
  type: 'direct',
  enabled: true,
  parameterMappings: {
    clickId: 'click_id',
    transactionId: 'txn_id',
    status: 'status',
    payout: 'payout',
    eventType: 'event',
    providerUserId: 'user_id',
  },
  statusMappings: {
    pending: ['pending'],
    approved: ['approved', 'complete'],
    rejected: ['rejected'],
    reversed: ['reversed', 'chargeback'],
  },
  security: {
    method: 'shared_secret',
    tokenParam: 'secret',
    secretValue: 'top-secret',
  },
  responseConfig: {
    successStatus: 200,
    successBody: '1',
    duplicateStatus: 200,
    duplicateBody: '1',
    errorStatus: 200,
    errorBody: '0',
  },
  ipAllowlist: [],
  providerSettings: {
    requiredFields: ['clickId', 'transactionId', 'status'],
  },
  ...overrides,
});

const makeClickLog = (overrides = {}) => {
  const offerId = overrides.offerId || new mongoose.Types.ObjectId();
  const click = new ClickLog({
    clickId: 'click-1',
    offerId,
    userId: overrides.userId || new mongoose.Types.ObjectId(),
    providerId: overrides.providerId || 'direct',
    providerType: overrides.providerType || 'direct_offer',
    campaignType: overrides.campaignType || 'direct_offer',
    campaignId: overrides.campaignId || offerId,
    rewardAmount: 100,
    ...overrides,
  });
  const error = click.validateSync();
  if (error) throw error;
  return click;
};

const makeAdapters = ({ clickLog, existingConversions = [] } = {}) => {
  const conversions = [...existingConversions];
  const logs = [];

  return {
    conversions,
    logs,
    clickLogModel: {
      async findOne(query) {
        if (!clickLog) return null;
        return clickLog.clickId === query.clickId ? clickLog : null;
      },
    },
    conversionModel: {
      async create(payload) {
        const duplicate = conversions.find((conversion) =>
          conversion.providerId === payload.providerId &&
          conversion.providerTransactionId === payload.providerTransactionId &&
          payload.providerTransactionId
        );
        if (duplicate) {
          const error = new Error('E11000 duplicate key error index: providerId_1_providerTransactionId_1');
          error.code = 11000;
          throw error;
        }
        const conversion = new Conversion(payload);
        const error = conversion.validateSync();
        if (error) throw error;
        conversions.push(conversion);
        return conversion;
      },
      async findOne(query) {
        const found = conversions.find((conversion) =>
          conversion.providerId === query.providerId &&
          conversion.providerTransactionId === query.providerTransactionId
        ) || null;
        if (found) {
          found.save = async function () { return this; };
        }
        return found;
      },
    },
    postbackLogModel: {
      async create(payload) {
        const log = new PostbackLog(payload);
        const error = log.validateSync();
        if (error) throw error;
        logs.push(log);
        return log;
      },
    },
  };
};

test('parameter mapper supports query and body without arbitrary payload merging', () => {
  const queryResult = mapPostbackParameters({
    query: { click_id: 'c1', txn_id: 't1', status: 'approved', ignored: 'x' },
    mappings: baseProviderConfig().parameterMappings,
    requiredFields: ['clickId', 'transactionId', 'status'],
  });
  assert.deepEqual(queryResult.missingFields, []);
  assert.equal(queryResult.mapped.clickId, 'c1');
  assert.equal(queryResult.mapped.transactionId, 't1');
  assert.equal(queryResult.mapped.ignored, undefined);

  const bodyResult = mapPostbackParameters({
    body: { click_id: 'c2', txn_id: 't2', status: 'pending' },
    mappings: baseProviderConfig().parameterMappings,
    requiredFields: ['clickId', 'transactionId', 'status'],
  });
  assert.equal(bodyResult.mapped.clickId, 'c2');
  assert.equal(bodyResult.mapped.status, 'pending');
});

test('status mapper handles lifecycle statuses and rejects unknown or ambiguous aliases', () => {
  const mappings = baseProviderConfig().statusMappings;
  assert.equal(normalizeProviderStatus('APPROVED', mappings), 'approved');
  assert.equal(normalizeProviderStatus('pending', mappings), 'pending');
  assert.equal(normalizeProviderStatus('rejected', mappings), 'rejected');
  assert.equal(normalizeProviderStatus('chargeback', mappings), 'reversed');
  assert.throws(() => normalizeProviderStatus('mystery', mappings), /Unknown provider status/);
  assert.throws(
    () => normalizeProviderStatus('ok', { approved: ['ok'], rejected: ['OK'] }),
    /Ambiguous status mapping/
  );
});

test('provider security validates shared secret and never uses a permissive bypass', () => {
  const config = baseProviderConfig();
  assert.equal(validateProviderSecurity({
    providerConfig: config,
    req: makeReq({ query: { secret: 'top-secret' } }),
    mapped: {},
  }).passed, true);
  assert.equal(validateProviderSecurity({
    providerConfig: config,
    req: makeReq({ query: { secret: 'wrong' } }),
    mapped: {},
  }).passed, false);
});

test('security validation uses original request data while logs persist sanitized values', async () => {
  const secret = 'hash-secret';
  const clickLog = makeClickLog();
  const signature = require('node:crypto')
    .createHash('sha256')
    .update(`${clickLog.clickId}:txn-signed:${secret}`)
    .digest('hex');
  const adapters = makeAdapters({ clickLog });

  const result = await processPostback({
    providerConfig: baseProviderConfig({
      security: {
        method: 'sha256',
        signatureParam: 'signature',
        hashTemplate: '{clickId}:{transactionId}:{secret}',
        secretValue: secret,
      },
    }),
    req: makeReq({
      query: {
        click_id: clickLog.clickId,
        txn_id: 'txn-signed',
        status: 'approved',
        signature,
      },
    }),
    route: '/api/direct-offers/postback',
    expectedOfferId: clickLog.offerId,
    expectedCampaignId: clickLog.campaignId,
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  });

  assert.equal(result.ok, true);
  assert.equal(adapters.logs[0].sanitizedQuery.signature.includes(signature), false);
});

test('ProviderConfig credentials stay hidden normally but can be supplied to security processing deliberately', () => {
  const config = new ProviderConfig({
    providerId: 'credwall',
    name: 'Credential Wall',
    security: {
      method: 'shared_secret',
      tokenParam: 'secret',
      credentials: { sharedSecret: 'credential-secret' },
    },
  });

  assert.equal(config.toObject().security.credentials, undefined);
  assert.equal(validateProviderSecurity({
    providerConfig: {
      providerId: 'credwall',
      security: {
        method: 'shared_secret',
        tokenParam: 'secret',
        credentials: { sharedSecret: 'credential-secret' },
      },
    },
    req: makeReq({ query: { secret: 'credential-secret' } }),
    mapped: {},
  }).passed, true);
  assert.equal(validateProviderSecurity({
    providerConfig: {
      providerId: 'credwall',
      security: {
        method: 'shared_secret',
        tokenParam: 'secret',
      },
    },
    req: makeReq({ query: { secret: 'credential-secret' } }),
    mapped: {},
  }).passed, false);
});

test('conversion service creates accepted conversion from trusted ClickLog and logs safely', async () => {
  const trustedUserId = new mongoose.Types.ObjectId();
  const maliciousUserId = new mongoose.Types.ObjectId();
  const clickLog = makeClickLog({ userId: trustedUserId });
  const adapters = makeAdapters({ clickLog });

  const result = await processPostback({
    providerConfig: baseProviderConfig(),
    req: makeReq({
      query: {
        click_id: clickLog.clickId,
        txn_id: 'txn-1',
        status: 'approved',
        payout: '1.25',
        user_id: String(maliciousUserId),
        secret: 'top-secret',
      },
      headers: { authorization: 'Bearer should-not-log' },
    }),
    route: '/api/direct-offers/postback',
    expectedOfferId: clickLog.offerId,
    expectedCampaignId: clickLog.campaignId,
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  });

  assert.equal(result.ok, true);
  assert.equal(result.internalStatus, 'approved');
  assert.equal(result.conversion.userId.toString(), trustedUserId.toString());
  assert.notEqual(result.conversion.userId.toString(), maliciousUserId.toString());
  assert.equal(result.conversion.providerTransactionId, 'txn-1');
  assert.equal(result.conversion.payout.amount, 1.25);
  assert.equal(adapters.logs.length, 1);
  assert.equal(adapters.logs[0].sanitizedQuery.secret, '[REDACTED]');
  assert.equal(adapters.logs[0].sanitizedHeaders.authorization, '[REDACTED]');
});

test('conversion service records pending, approved, and rejected statuses without wallet mutation', async () => {
  for (const status of ['pending', 'approved', 'rejected']) {
    const clickLog = makeClickLog({ clickId: `click-${status}` });
    const adapters = makeAdapters({ clickLog });
    const result = await processPostback({
      providerConfig: baseProviderConfig(),
      req: makeReq({ query: { click_id: clickLog.clickId, txn_id: `txn-${status}`, status, secret: 'top-secret' } }),
      route: '/api/direct-offers/postback',
      expectedOfferId: clickLog.offerId,
      expectedCampaignId: clickLog.campaignId,
      clickLogModel: adapters.clickLogModel,
      conversionModel: adapters.conversionModel,
      postbackLogModel: adapters.postbackLogModel,
    });

    assert.equal(result.ok, true);
    assert.equal(result.internalStatus, status);
    assert.equal(result.conversion.internalStatus, status);
    assert.equal(result.conversion.rewardTransactionId, null);
  }
});

test('conversion service rejects nonexistent clicks, provider mismatch, and missing required fields', async () => {
  const clickLog = makeClickLog({ providerId: 'direct' });
  const adapters = makeAdapters({ clickLog });

  const nonexistent = await processPostback({
    providerConfig: baseProviderConfig(),
    req: makeReq({ query: { click_id: 'missing', txn_id: 'txn-missing', status: 'approved', secret: 'top-secret' } }),
    route: '/api/direct-offers/postback',
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  });
  assert.equal(nonexistent.ok, false);
  assert.match(nonexistent.rejectionReason, /ClickLog not found/);

  const mismatch = await processPostback({
    providerConfig: baseProviderConfig({ providerId: 'other' }),
    req: makeReq({ query: { click_id: clickLog.clickId, txn_id: 'txn-provider', status: 'approved', secret: 'top-secret' } }),
    route: '/api/direct-offers/postback',
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  });
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.rejectionReason, /Provider does not match/);

  const missing = await processPostback({
    providerConfig: baseProviderConfig(),
    req: makeReq({ query: { click_id: clickLog.clickId, status: 'approved', secret: 'top-secret' } }),
    route: '/api/direct-offers/postback',
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  });
  assert.equal(missing.ok, false);
  assert.match(missing.rejectionReason, /transactionId/);
});

test('duplicate provider transaction is idempotent and returns provider-compatible response', async () => {
  const clickLog = makeClickLog();
  const existing = new Conversion({
    providerId: 'direct',
    providerTransactionId: 'txn-dup',
    clickId: clickLog.clickId,
    clickLogId: clickLog._id,
    userId: clickLog.userId,
    campaignType: clickLog.campaignType,
    campaignId: clickLog.campaignId,
    offerId: clickLog.offerId,
    incomingStatus: 'approved',
    internalStatus: 'approved',
  });
  const adapters = makeAdapters({ clickLog, existingConversions: [existing] });

  const result = await processPostback({
    providerConfig: baseProviderConfig(),
    req: makeReq({ query: { click_id: clickLog.clickId, txn_id: 'txn-dup', status: 'approved', secret: 'top-secret' } }),
    route: '/api/direct-offers/postback',
    expectedOfferId: clickLog.offerId,
    expectedCampaignId: clickLog.campaignId,
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  });

  assert.equal(result.ok, true);
  assert.equal(result.isDuplicate, true);
  assert.equal(result.response.status, 200);
  assert.equal(result.response.body, '1');
  assert.equal(adapters.conversions.length, 1);
});

test('conversion lifecycle supports pending to approved and duplicate status idempotency', async () => {
  const clickLog = makeClickLog();
  const adapters = makeAdapters({ clickLog });

  const pending = await processPostback({
    providerConfig: baseProviderConfig(),
    req: makeReq({ query: { click_id: clickLog.clickId, txn_id: 'txn-lifecycle', status: 'pending', secret: 'top-secret' } }),
    route: '/api/direct-offers/postback',
    expectedOfferId: clickLog.offerId,
    expectedCampaignId: clickLog.campaignId,
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  });
  assert.equal(pending.ok, true);
  assert.equal(pending.internalStatus, 'pending');
  assert.equal(pending.lifecycleTransition, 'created');

  const pendingDuplicate = await processPostback({
    providerConfig: baseProviderConfig(),
    req: makeReq({ query: { click_id: clickLog.clickId, txn_id: 'txn-lifecycle', status: 'pending', secret: 'top-secret' } }),
    route: '/api/direct-offers/postback',
    expectedOfferId: clickLog.offerId,
    expectedCampaignId: clickLog.campaignId,
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  });
  assert.equal(pendingDuplicate.isDuplicate, true);
  assert.equal(pendingDuplicate.shouldProcessRewardBridge, false);

  const approved = await processPostback({
    providerConfig: baseProviderConfig(),
    req: makeReq({ query: { click_id: clickLog.clickId, txn_id: 'txn-lifecycle', status: 'approved', secret: 'top-secret' } }),
    route: '/api/direct-offers/postback',
    expectedOfferId: clickLog.offerId,
    expectedCampaignId: clickLog.campaignId,
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  });
  assert.equal(approved.ok, true);
  assert.equal(approved.isDuplicate, false);
  assert.equal(approved.internalStatus, 'approved');
  assert.equal(approved.shouldProcessRewardBridge, true);

  approved.conversion.processingState = 'processed';
  approved.conversion.rewardTransactionId = new mongoose.Types.ObjectId();
  const approvedDuplicate = await processPostback({
    providerConfig: baseProviderConfig(),
    req: makeReq({ query: { click_id: clickLog.clickId, txn_id: 'txn-lifecycle', status: 'approved', secret: 'top-secret' } }),
    route: '/api/direct-offers/postback',
    expectedOfferId: clickLog.offerId,
    expectedCampaignId: clickLog.campaignId,
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  });
  assert.equal(approvedDuplicate.isDuplicate, true);
  assert.equal(approvedDuplicate.shouldProcessRewardBridge, false);
});

test('failed approved bridge state is retryable but processed approved is not', async () => {
  const clickLog = makeClickLog();
  const existing = new Conversion({
    providerId: 'direct',
    providerTransactionId: 'txn-retry',
    clickId: clickLog.clickId,
    clickLogId: clickLog._id,
    userId: clickLog.userId,
    campaignType: clickLog.campaignType,
    campaignId: clickLog.campaignId,
    offerId: clickLog.offerId,
    incomingStatus: 'approved',
    internalStatus: 'approved',
    processingState: 'failed',
  });
  const adapters = makeAdapters({ clickLog, existingConversions: [existing] });

  const retry = await processPostback({
    providerConfig: baseProviderConfig(),
    req: makeReq({ query: { click_id: clickLog.clickId, txn_id: 'txn-retry', status: 'approved', secret: 'top-secret' } }),
    route: '/api/direct-offers/postback',
    expectedOfferId: clickLog.offerId,
    expectedCampaignId: clickLog.campaignId,
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  });

  assert.equal(retry.ok, true);
  assert.equal(retry.isDuplicate, false);
  assert.equal(retry.shouldProcessRewardBridge, true);
  assert.equal(retry.lifecycleTransition, 'retry_reward_bridge');
});

test('rejected duplicate is idempotent and invalid status transitions reject safely', async () => {
  const clickLog = makeClickLog();
  const existing = new Conversion({
    providerId: 'direct',
    providerTransactionId: 'txn-rejected',
    clickId: clickLog.clickId,
    clickLogId: clickLog._id,
    userId: clickLog.userId,
    campaignType: clickLog.campaignType,
    campaignId: clickLog.campaignId,
    offerId: clickLog.offerId,
    incomingStatus: 'rejected',
    internalStatus: 'rejected',
  });
  const adapters = makeAdapters({ clickLog, existingConversions: [existing] });

  const duplicate = await processPostback({
    providerConfig: baseProviderConfig(),
    req: makeReq({ query: { click_id: clickLog.clickId, txn_id: 'txn-rejected', status: 'rejected', secret: 'top-secret' } }),
    route: '/api/direct-offers/postback',
    expectedOfferId: clickLog.offerId,
    expectedCampaignId: clickLog.campaignId,
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  });
  assert.equal(duplicate.isDuplicate, true);

  const invalid = await processPostback({
    providerConfig: baseProviderConfig(),
    req: makeReq({ query: { click_id: clickLog.clickId, txn_id: 'txn-rejected', status: 'approved', secret: 'top-secret' } }),
    route: '/api/direct-offers/postback',
    expectedOfferId: clickLog.offerId,
    expectedCampaignId: clickLog.campaignId,
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  });
  assert.equal(invalid.ok, false);
  assert.match(invalid.rejectionReason, /Invalid conversion status transition/);
});

test('same transaction ID under different providers does not conflict', async () => {
  const directClick = makeClickLog({ providerId: 'direct', clickId: 'direct-click' });
  const cpxClick = makeClickLog({
    providerId: 'cpx',
    providerType: 'offerwall',
    campaignType: 'offerwall',
    campaignId: new mongoose.Types.ObjectId(),
    offerId: null,
    clickId: 'cpx-click',
  });
  const clicks = [directClick, cpxClick];
  const adapters = makeAdapters({ clickLog: directClick });
  adapters.clickLogModel.findOne = async (query) => clicks.find((click) => click.clickId === query.clickId) || null;

  const direct = await processPostback({
    providerConfig: baseProviderConfig({ providerId: 'direct' }),
    req: makeReq({ query: { click_id: 'direct-click', txn_id: 'shared-txn', status: 'approved', secret: 'top-secret' } }),
    route: '/api/direct-offers/postback',
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  });
  const cpx = await processPostback({
    providerConfig: baseProviderConfig({ providerId: 'cpx' }),
    req: makeReq({ query: { click_id: 'cpx-click', txn_id: 'shared-txn', status: 'approved', secret: 'top-secret' } }),
    route: '/api/offerwalls/postback/cpx',
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  });

  assert.equal(direct.ok, true);
  assert.equal(cpx.ok, true);
  assert.equal(adapters.conversions.length, 2);
});

test('unknown status is rejected and cannot approve', async () => {
  const clickLog = makeClickLog();
  const adapters = makeAdapters({ clickLog });

  const result = await processPostback({
    providerConfig: baseProviderConfig(),
    req: makeReq({ query: { click_id: clickLog.clickId, txn_id: 'txn-unknown', status: 'mystery', secret: 'top-secret' } }),
    route: '/api/direct-offers/postback',
    expectedOfferId: clickLog.offerId,
    expectedCampaignId: clickLog.campaignId,
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  });

  assert.equal(result.ok, false);
  assert.equal(result.processingResult, 'rejected');
  assert.match(result.rejectionReason, /Unknown provider status/);
  assert.equal(adapters.conversions.length, 0);
});

test('malformed payout rejects before Conversion creation', async () => {
  const clickLog = makeClickLog();
  const adapters = makeAdapters({ clickLog });

  const result = await processPostback({
    providerConfig: baseProviderConfig(),
    req: makeReq({ query: { click_id: clickLog.clickId, txn_id: 'txn-bad-payout', status: 'approved', payout: 'abc', secret: 'top-secret' } }),
    route: '/api/direct-offers/postback',
    expectedOfferId: clickLog.offerId,
    expectedCampaignId: clickLog.campaignId,
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  });

  assert.equal(result.ok, false);
  assert.equal(result.processingResult, 'rejected');
  assert.match(result.rejectionReason, /Invalid payout/);
  assert.equal(adapters.conversions.length, 0);
});

test('bad payout shapes reject when payout is supplied', async () => {
  const clickLog = makeClickLog();
  for (const payout of ['12abc', 'NaN', 'Infinity', '-1', '']) {
    const adapters = makeAdapters({ clickLog });
    const result = await processPostback({
      providerConfig: baseProviderConfig(),
      req: makeReq({ query: { click_id: clickLog.clickId, txn_id: `txn-${payout || 'empty'}`, status: 'approved', payout, secret: 'top-secret' } }),
      route: '/api/direct-offers/postback',
      expectedOfferId: clickLog.offerId,
      expectedCampaignId: clickLog.campaignId,
      clickLogModel: adapters.clickLogModel,
      conversionModel: adapters.conversionModel,
      postbackLogModel: adapters.postbackLogModel,
    });

    assert.equal(result.ok, false);
    assert.equal(adapters.conversions.length, 0);
  }
});

test('provider response configuration supports success and failure bodies', () => {
  const config = baseProviderConfig({
    responseConfig: {
      successStatus: 202,
      successBody: 'OK',
      duplicateStatus: 200,
      duplicateBody: 'DUP',
      errorStatus: 400,
      errorBody: 'ERR',
    },
  });
  assert.deepEqual(providerResponse(config, { ok: true, isDuplicate: false }), { status: 202, body: 'OK' });
  assert.deepEqual(providerResponse(config, { ok: true, isDuplicate: true }), { status: 200, body: 'DUP' });
  assert.deepEqual(providerResponse(config, { ok: false, isDuplicate: false }), { status: 400, body: 'ERR' });
});
