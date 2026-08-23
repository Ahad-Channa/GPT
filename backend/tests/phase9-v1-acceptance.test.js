const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');

const ClickLog = require('../models/ClickLog');
const Conversion = require('../models/Conversion');
const PostbackLog = require('../models/PostbackLog');
const { processPostback } = require('../services/tracking/conversionService');
const { validateProviderSecurity } = require('../services/tracking/providerSecurity');

const makeReq = ({ query = {}, body = {}, method = 'GET', headers = {}, ip = '203.0.113.9', trustProxy = true } = {}) => ({
  method,
  query,
  body,
  headers: {
    'user-agent': 'phase9-acceptance',
    ...headers,
  },
  ip,
  socket: { remoteAddress: ip },
  app: {
    get(name) {
      return name === 'trust proxy' ? trustProxy : undefined;
    },
  },
});

const providerConfig = (overrides = {}) => ({
  providerId: 'qa-provider',
  name: 'QA Provider',
  type: 'offerwall',
  enabled: true,
  parameterMappings: {
    clickId: 'cid',
    transactionId: 'tx',
    status: 'state',
    payout: 'amount',
    eventType: 'event',
    providerUserId: 'subid',
    extra: { placement: 'placement' },
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
    secretValue: 'phase9-secret',
  },
  responseConfig: {
    successStatus: 202,
    successBody: 'OK',
    duplicateStatus: 200,
    duplicateBody: 'DUP',
    errorStatus: 400,
    errorBody: 'ERR',
  },
  providerSettings: {
    payoutCurrency: 'USD',
    requiredFields: ['clickId', 'transactionId', 'status'],
  },
  ipAllowlist: [],
  ...overrides,
});

const makeClick = (overrides = {}) => {
  const campaignId = overrides.campaignId || new mongoose.Types.ObjectId();
  const click = new ClickLog({
    clickId: overrides.clickId || 'phase9-click',
    userId: overrides.userId || new mongoose.Types.ObjectId(),
    providerId: overrides.providerId || 'qa-provider',
    providerType: overrides.providerType || 'offerwall',
    campaignType: overrides.campaignType || 'offerwall',
    campaignId,
    offerId: overrides.offerId,
    rewardAmount: overrides.rewardAmount || 321,
    advertiserPayout: overrides.advertiserPayout || 1.23,
    country: overrides.country || 'US',
    device: overrides.device || 'desktop',
    trackingParams: overrides.trackingParams || { sub1: 'slot-a' },
    rewardSnapshot: overrides.rewardSnapshot || { amount: 321, currency: 'coins', source: 'phase9' },
    status: overrides.status || 'clicked',
  });
  const error = click.validateSync();
  if (error) throw error;
  return click;
};

const makeAdapters = ({ clickLog = makeClick(), existingConversions = [] } = {}) => {
  const conversions = [...existingConversions];
  const logs = [];
  const uniqueTransactions = new Set(conversions
    .filter((conversion) => conversion.providerTransactionId)
    .map((conversion) => `${conversion.providerId}:${conversion.providerTransactionId}`));

  const conversionModel = {
    async create(payload) {
      const uniqueKey = payload.providerTransactionId ? `${payload.providerId}:${payload.providerTransactionId}` : '';
      if (uniqueKey && uniqueTransactions.has(uniqueKey)) {
        const error = new Error('duplicate conversion transaction');
        error.code = 11000;
        throw error;
      }
      if (uniqueKey) uniqueTransactions.add(uniqueKey);
      const validationDoc = new Conversion(payload);
      const validationError = validationDoc.validateSync();
      if (validationError) {
        if (uniqueKey) uniqueTransactions.delete(uniqueKey);
        throw validationError;
      }
      const conversion = { _id: validationDoc._id, ...payload };
      conversions.push(conversion);
      return conversion;
    },
    async findOne(query) {
      return conversions.find((conversion) =>
        conversion.providerId === query.providerId &&
        conversion.providerTransactionId === query.providerTransactionId
      ) || null;
    },
    async findOneAndUpdate(query, update) {
      const conversion = conversions.find((item) =>
        item.providerId === query.providerId &&
        item.providerTransactionId === query.providerTransactionId &&
        item.internalStatus === query.internalStatus
      );
      if (!conversion) return null;
      if (update.$set) {
        for (const [key, value] of Object.entries(update.$set)) {
          const parts = key.split('.');
          let target = conversion;
          while (parts.length > 1) {
            const part = parts.shift();
            target[part] = target[part] || {};
            target = target[part];
          }
          target[parts[0]] = value;
        }
      }
      return conversion;
    },
  };

  return {
    conversions,
    logs,
    clickLog,
    clickLogModel: {
      async findOne(query) {
        return clickLog && clickLog.clickId === query.clickId ? clickLog : null;
      },
    },
    conversionModel,
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

const approvedQuery = (overrides = {}) => ({
  cid: 'phase9-click',
  tx: 'phase9-tx',
  state: 'approved',
  amount: '4.20',
  event: 'install',
  subid: 'provider-user-1',
  placement: 'featured',
  secret: 'phase9-secret',
  ...overrides,
});

test('Phase 9 generic postback acceptance covers query/body mapping, responses, ProviderConfig, and logs', async () => {
  const adapters = makeAdapters();
  const result = await processPostback({
    providerConfig: providerConfig(),
    req: makeReq({ query: approvedQuery() }),
    route: '/api/postbacks/qa-provider',
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  });

  assert.equal(result.ok, true);
  assert.equal(result.shouldProcessFinancial, true);
  assert.equal(result.response.status, 202);
  assert.equal(result.response.body, 'OK');
  assert.equal(adapters.conversions.length, 1);
  assert.equal(adapters.conversions[0].providerId, 'qa-provider');
  assert.equal(adapters.conversions[0].providerTransactionId, 'phase9-tx');
  assert.equal(adapters.conversions[0].rewardAmount, 321);
  assert.equal(adapters.conversions[0].eventType, 'install');
  assert.equal(adapters.conversions[0].metadata.providerUserId, 'provider-user-1');
  assert.deepEqual(adapters.conversions[0].metadata.mappedExtra, { placement: 'featured' });
  assert.equal(adapters.logs.length, 1);
  assert.equal(adapters.logs[0].processingResult, 'accepted');
  assert.equal(JSON.stringify(adapters.logs[0]).includes('phase9-secret'), false);

  const bodyAdapters = makeAdapters({ clickLog: makeClick({ clickId: 'body-click' }) });
  const bodyResult = await processPostback({
    providerConfig: providerConfig(),
    req: makeReq({ method: 'POST', body: approvedQuery({ cid: 'body-click', tx: 'body-tx' }) }),
    route: '/api/postbacks/qa-provider',
    clickLogModel: bodyAdapters.clickLogModel,
    conversionModel: bodyAdapters.conversionModel,
    postbackLogModel: bodyAdapters.postbackLogModel,
  });
  assert.equal(bodyResult.ok, true);
  assert.equal(bodyAdapters.conversions[0].providerTransactionId, 'body-tx');
});

test('Phase 9 manipulation acceptance rejects forged or malformed postbacks without financial eligibility', async () => {
  const cases = [
    ['edited click ID', approvedQuery({ cid: 'missing-click' }), /ClickLog not found/],
    ['edited user ID ignored', approvedQuery({ userId: 'attacker' }), null],
    ['edited campaign expected mismatch', approvedQuery(), /Campaign does not match/],
    ['edited reward ignored', approvedQuery({ reward: '999999' }), null],
    ['edited payout malformed', approvedQuery({ amount: '-1' }), /Invalid payout/],
    ['edited status unknown', approvedQuery({ state: 'paid' }), /Unknown provider status/],
    ['wrong secret', approvedQuery({ secret: 'wrong' }), /mismatch/i],
    ['missing transaction ID', approvedQuery({ tx: '' }), /Missing required/],
    ['malformed transaction ID object', approvedQuery({ tx: { $ne: null } }), /Invalid mapped field/],
    ['malformed click ID array', approvedQuery({ cid: ['phase9-click'] }), /Invalid mapped field/],
    ['oversized value', approvedQuery({ tx: 'x'.repeat(200) }), /exceeds maximum length/],
  ];

  for (const [name, query, reasonPattern] of cases) {
    const adapters = makeAdapters();
    const result = await processPostback({
      providerConfig: providerConfig(),
      req: makeReq({ query }),
      route: `/api/postbacks/${name}`,
      expectedCampaignId: name === 'edited campaign expected mismatch' ? new mongoose.Types.ObjectId() : null,
      clickLogModel: adapters.clickLogModel,
      conversionModel: adapters.conversionModel,
      postbackLogModel: adapters.postbackLogModel,
    });

    if (reasonPattern) {
      assert.equal(result.ok, false, name);
      assert.match(result.rejectionReason, reasonPattern, name);
      assert.equal(result.shouldProcessFinancial, undefined, name);
      assert.equal(adapters.conversions.length, 0, name);
    } else {
      assert.equal(result.ok, true, name);
      assert.equal(adapters.conversions[0].rewardAmount, 321, name);
      assert.equal(String(adapters.conversions[0].userId), String(adapters.clickLog.userId), name);
    }
  }

  const disabledAdapters = makeAdapters();
  const disabled = await processPostback({
    providerConfig: providerConfig({ enabled: false }),
    req: makeReq({ query: approvedQuery() }),
    clickLogModel: disabledAdapters.clickLogModel,
    conversionModel: disabledAdapters.conversionModel,
    postbackLogModel: disabledAdapters.postbackLogModel,
  });
  assert.equal(disabled.ok, false);
  assert.match(disabled.rejectionReason, /disabled/);
});

test('Phase 9 signature primitive QA covers shared secret, HMAC, MD5, SHA-family, and IP allowlist', () => {
  const mapped = { clickId: 'phase9-click', transactionId: 'phase9-tx' };
  const reqWithSecret = makeReq({ query: { secret: 'phase9-secret' } });
  assert.equal(validateProviderSecurity({ providerConfig: providerConfig(), req: reqWithSecret, mapped }).passed, true);

  const hmacSig = crypto.createHmac('sha256', 'phase9-secret').update('phase9-click:phase9-tx').digest('hex');
  assert.equal(validateProviderSecurity({
    providerConfig: providerConfig({
      security: {
        method: 'hmac',
        hashAlgorithm: 'sha256',
        hashTemplate: '{clickId}:{transactionId}',
        signatureParam: 'sig',
        secretValue: 'phase9-secret',
      },
    }),
    req: makeReq({ query: { sig: hmacSig } }),
    mapped,
  }).passed, true);

  for (const method of ['md5', 'sha1', 'sha256', 'sha512']) {
    const sig = crypto.createHash(method).update(`phase9-click:phase9-secret`).digest('hex');
    assert.equal(validateProviderSecurity({
      providerConfig: providerConfig({
        security: {
          method,
          hashTemplate: '{clickId}:{secret}',
          signatureParam: 'sig',
          secretValue: 'phase9-secret',
        },
      }),
      req: makeReq({ query: { sig } }),
      mapped,
    }).passed, true, method);
  }

  assert.equal(validateProviderSecurity({
    providerConfig: providerConfig({ ipAllowlist: ['198.51.100.10'] }),
    req: makeReq({ ip: '203.0.113.9', query: { secret: 'phase9-secret' } }),
    mapped,
  }).passed, false);
});

test('Phase 9 duplicate, replay, and concurrent duplicate acceptance creates one auditable conversion', async () => {
  const adapters = makeAdapters();
  const requests = Array.from({ length: 20 }, () => processPostback({
    providerConfig: providerConfig(),
    req: makeReq({ query: approvedQuery() }),
    route: '/api/postbacks/qa-provider',
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  }));

  const results = await Promise.all(requests);
  assert.equal(adapters.conversions.length, 1, JSON.stringify(adapters.conversions.map((conversion) => ({
    providerId: conversion.providerId,
    providerTransactionId: conversion.providerTransactionId,
  }))));
  assert.equal(results.every((result) => result.ok), true);
  assert.equal(new Set(results.map((result) => String(result.conversion._id))).size, 1);
  assert.equal(adapters.logs.length, 20);

  adapters.conversions[0].processingState = 'processed';
  adapters.conversions[0].rewardTransactionId = new mongoose.Types.ObjectId();
  const replayResults = await Promise.all(Array.from({ length: 20 }, () => processPostback({
    providerConfig: providerConfig(),
    req: makeReq({ query: approvedQuery() }),
    route: '/api/postbacks/qa-provider',
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  })));

  assert.equal(adapters.conversions.length, 1);
  assert.equal(replayResults.filter((result) => result.isDuplicate).length, 20);
  assert.equal(adapters.logs.filter((log) => log.isDuplicate).length, 20);
});

test('Phase 9 conversion lifecycle acceptance verifies pending transitions and duplicate reversal', async () => {
  const adapters = makeAdapters();
  const pending = await processPostback({
    providerConfig: providerConfig(),
    req: makeReq({ query: approvedQuery({ state: 'pending' }) }),
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  });
  assert.equal(pending.internalStatus, 'pending');

  const approved = await processPostback({
    providerConfig: providerConfig(),
    req: makeReq({ query: approvedQuery({ state: 'approved' }) }),
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  });
  assert.equal(approved.internalStatus, 'approved');
  assert.equal(adapters.conversions.length, 1);

  const reversed = await processPostback({
    providerConfig: providerConfig(),
    req: makeReq({ query: approvedQuery({ state: 'chargeback' }) }),
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  });
  assert.equal(reversed.internalStatus, 'reversed');

  const duplicateReversal = await processPostback({
    providerConfig: providerConfig(),
    req: makeReq({ query: approvedQuery({ state: 'reversed' }) }),
    clickLogModel: adapters.clickLogModel,
    conversionModel: adapters.conversionModel,
    postbackLogModel: adapters.postbackLogModel,
  });
  assert.equal(duplicateReversal.isDuplicate, true);
});
