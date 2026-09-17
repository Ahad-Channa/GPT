const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const ClickLog = require('../models/ClickLog');
const Conversion = require('../models/Conversion');
const ProviderConfig = require('../models/ProviderConfig');
const PostbackLog = require('../models/PostbackLog');
const Transaction = require('../models/Transaction');
const {
  REDACTED,
  sanitizePostbackPayload,
  maskValue,
} = require('../services/tracking/postbackSanitizer');

const hasIndex = (model, fields, optionsMatcher = () => true) =>
  model.schema.indexes().some(([indexFields, indexOptions]) =>
    JSON.stringify(indexFields) === JSON.stringify(fields) && optionsMatcher(indexOptions || {})
  );

test('ClickLog keeps legacy direct-offer fields valid while adding tracking fields', () => {
  const click = new ClickLog({
    clickId: 'legacy-click-id',
    offerId: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(),
    rewardAmount: 100,
  });

  const error = click.validateSync();
  assert.equal(error, undefined);
  assert.equal(click.providerId, 'direct');
  assert.equal(click.providerType, 'direct_offer');
  assert.equal(click.campaignType, 'direct_offer');
  assert.deepEqual(click.trackingParams, {});
});

test('ClickLog supports generic provider clicks without a DirectOffer offerId', () => {
  const click = new ClickLog({
    clickId: 'generic-click-id',
    userId: new mongoose.Types.ObjectId(),
    providerId: 'cpx',
    providerType: 'offerwall',
    campaignType: 'offerwall',
    campaignId: new mongoose.Types.ObjectId(),
    rewardAmount: 250,
  });

  const error = click.validateSync();
  assert.equal(error, undefined);
  assert.equal(click.offerId, null);
  assert.equal(click.providerId, 'cpx');
});

test('ClickLog rejects records without a legacy offer or generic campaign reference', () => {
  const directClick = new ClickLog({
    clickId: 'missing-direct-offer',
    userId: new mongoose.Types.ObjectId(),
    rewardAmount: 100,
  });

  const genericClick = new ClickLog({
    clickId: 'missing-generic-campaign',
    userId: new mongoose.Types.ObjectId(),
    providerId: 'network',
    providerType: 'offerwall',
    campaignType: 'unknown',
    rewardAmount: 100,
  });

  const directError = directClick.validateSync();
  const genericError = genericClick.validateSync();

  assert.match(directError.errors.offerId.message, /Direct-offer clicks require offerId/);
  assert.match(genericError.errors.campaignId.message, /Generic provider clicks require campaignId/);
});

test('Conversion defines provider transaction and fallback idempotency indexes', () => {
  assert.ok(hasIndex(
    Conversion,
    { providerId: 1, providerTransactionId: 1 },
    (options) => options.unique === true && Boolean(options.partialFilterExpression)
  ));
  assert.ok(hasIndex(
    Conversion,
    { idempotencyKey: 1 },
    (options) => options.unique === true && Boolean(options.partialFilterExpression)
  ));
});

test('ProviderConfig excludes credentials from normal object/json output', () => {
  const config = new ProviderConfig({
    providerId: 'ExampleWall',
    name: 'Example Wall',
    security: {
      method: 'hmac',
      signatureParam: 'sig',
      secretEnvVar: 'EXAMPLE_SECRET',
      credentials: {
        apiKey: 'plain-secret',
      },
    },
  });

  const asObject = config.toObject();
  const asJson = config.toJSON();

  assert.equal(config.providerId, 'examplewall');
  assert.equal(asObject.security.credentials, undefined);
  assert.equal(asJson.security.credentials, undefined);
  assert.equal(asObject.security.secretEnvVar, 'EXAMPLE_SECRET');
});

test('Postback sanitizer redacts secrets recursively and masks signatures', () => {
  const sanitized = sanitizePostbackPayload({
    api_key: 'abc123',
    Authorization: 'Bearer abc.def.ghi',
    signature: '1234567890abcdef',
    nested: {
      refreshToken: 'refresh-secret',
      hash: 'abcdef1234567890',
      normal: 'keep-me',
    },
    list: [
      { password: 'pw', click_id: 'click-1' },
    ],
  });

  assert.equal(sanitized.api_key, REDACTED);
  assert.equal(sanitized.Authorization, REDACTED);
  assert.equal(sanitized.signature, maskValue('1234567890abcdef'));
  assert.equal(sanitized.nested.refreshToken, REDACTED);
  assert.equal(sanitized.nested.hash, maskValue('abcdef1234567890'));
  assert.equal(sanitized.nested.normal, 'keep-me');
  assert.equal(sanitized.list[0].password, REDACTED);
  assert.equal(sanitized.list[0].click_id, 'click-1');
});

test('PostbackLog exposes sanitizer without requiring route wiring', () => {
  const sanitized = PostbackLog.sanitizePayload({ secret: 'hidden', txid: 'tx-1' });
  assert.equal(sanitized.secret, REDACTED);
  assert.equal(sanitized.txid, 'tx-1');
});

test('Transaction remains compatible and only adds optional conversion linkage', () => {
  const tx = new Transaction({
    userId: new mongoose.Types.ObjectId(),
    transactionType: 'offer_reward',
    amount: 50,
    balanceAfter: 150,
    description: 'Existing reward shape',
    status: 'completed',
  });

  const error = tx.validateSync();
  assert.equal(error, undefined);
  assert.equal(tx.conversionId, null);
  assert.equal(tx.reversalOfConversionId, null);
  assert.ok(hasIndex(Transaction, { conversionId: 1 }, (options) => options.sparse === true));
  assert.ok(hasIndex(Transaction, { reversalOfConversionId: 1 }, (options) => options.sparse === true));
});
