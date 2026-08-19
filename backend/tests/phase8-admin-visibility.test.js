const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'your-project-id';

const adminRouter = require('../routes/admin');
const ProviderConfig = require('../models/ProviderConfig');
const PostbackLog = require('../models/PostbackLog');

const {
  getPagination,
  normalizeResponseConfig,
  sanitizeDirectOfferAdmin,
  serializePostbackLog,
  serializeProviderConfig,
  validateParameterMappings,
  validateSecurityConfig,
  validateStatusMappings,
} = adminRouter._phase8AdminHelpers;

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const routePaths = () => adminRouter.stack
  .filter((layer) => layer.route)
  .map((layer) => ({ path: layer.route.path, methods: Object.keys(layer.route.methods) }));

test('provider config admin serialization hides credentials and preserves configured signal', () => {
  const provider = new ProviderConfig({
    providerId: 'cpx',
    name: 'CPX Research',
    type: 'offerwall',
    enabled: true,
    security: {
      method: 'shared_secret',
      tokenParam: 'secret',
      credentials: { secret: 'super-secret-value' },
    },
  });

  const serialized = serializeProviderConfig(provider);
  assert.equal(serialized.security.credentials, undefined);
  assert.equal(serialized.security.credentialsConfigured, true);
  assert.equal(JSON.stringify(serialized).includes('super-secret-value'), false);
});

test('provider secret is write-only and blank updates do not require erasing existing credential', () => {
  const existing = { method: 'shared_secret', tokenParam: 'secret', credentials: { secret: 'keep-me' } };
  const security = validateSecurityConfig({ method: 'shared_secret', tokenParam: 'secret' }, existing);
  assert.equal(security.credentials, undefined);
  const serialized = serializeProviderConfig({ providerId: 'direct', security: existing });
  assert.equal(serialized.security.credentialsConfigured, true);
  assert.equal(JSON.stringify(serialized).includes('keep-me'), false);
});

test('parameter mapping validation rejects malformed names and duplicate required mappings', () => {
  assert.deepEqual(validateParameterMappings({
    clickId: 'click_id',
    transactionId: 'txn_id',
    status: 'status',
    payout: 'payout',
  }).clickId, 'click_id');

  assert.throws(() => validateParameterMappings({
    clickId: 'same',
    transactionId: 'same',
    status: 'status',
  }), /duplicate/);
  assert.throws(() => validateParameterMappings({ clickId: 'bad name', transactionId: 'txn', status: 'status' }), /invalid/);
});

test('status mapping validation rejects ambiguous aliases and empty aliases', () => {
  assert.deepEqual(validateStatusMappings({
    pending: ['pending'],
    approved: ['approved'],
    rejected: ['rejected'],
    reversal: ['chargeback'],
  }).reversal, ['chargeback']);

  assert.throws(() => validateStatusMappings({
    pending: ['ok'],
    approved: ['ok'],
    rejected: ['rejected'],
    reversal: ['chargeback'],
  }), /maps to both/);
  assert.throws(() => validateStatusMappings({ pending: [], approved: ['a'], rejected: ['r'], reversal: ['c'] }), /requires at least one/);
});

test('security validation rejects incomplete methods fail-closed', () => {
  assert.equal(validateSecurityConfig({ method: 'none' }).method, 'none');
  assert.throws(() => validateSecurityConfig({ method: 'shared_secret' }), /requires tokenParam or headerName/);
  assert.throws(() => validateSecurityConfig({ method: 'hmac', signatureParam: 'sig' }), /requires hashTemplate or adapterKey/);
  assert.throws(() => validateSecurityConfig({ method: 'unsupported' }), /Unsupported/);
});

test('pagination and response config are bounded', () => {
  assert.deepEqual(getPagination({ page: '-1', limit: '5000' }), { page: 1, limit: 100, skip: 0 });
  assert.equal(normalizeResponseConfig({ successStatus: 999 }).successStatus, 599);
  assert.equal(normalizeResponseConfig({ errorStatus: 1 }).errorStatus, 100);
});

test('postback log admin serialization uses sanitized stored payloads only', () => {
  const log = new PostbackLog({
    providerId: 'direct',
    route: '/api/direct-offers/postback',
    method: 'GET',
    sanitizedQuery: { secret: '[REDACTED]', click_id: 'click-1' },
    sanitizedHeaders: { authorization: '[REDACTED]' },
    mappedFields: { clickId: 'click-1', transactionId: 'txn-1', status: 'approved' },
    security: { checked: true, passed: true, method: 'shared_secret' },
    processingResult: 'accepted',
  });
  const serialized = serializePostbackLog(log, true);
  assert.equal(serialized.sanitizedQuery.secret, '[REDACTED]');
  assert.equal(serialized.sanitizedHeaders.authorization, '[REDACTED]');
  assert.equal(JSON.stringify(serialized).includes('super-secret'), false);
});

test('direct-offer admin serialization does not expose postback secret', () => {
  const serialized = sanitizeDirectOfferAdmin({
    title: 'Direct',
    postbackSecretKey: 'plaintext-secret',
    postbackMapping: { clickIdParam: 'click_id' },
  });
  assert.equal(serialized.postbackSecretConfigured, true);
  assert.equal(serialized.postbackSecretKey, undefined);
  assert.equal(JSON.stringify(serialized).includes('plaintext-secret'), false);
});

test('phase 8 admin routes exist and are mounted under admin permission middleware', () => {
  const paths = routePaths();
  for (const pathName of ['/provider-configs', '/conversions', '/postback-logs', '/postback-logs/:id', '/offerwall-providers']) {
    assert.equal(paths.some((route) => route.path === pathName), true);
  }

  const source = read('backend/routes/admin.js');
  for (const route of [
    "router.get('/provider-configs', requirePermission('manage_offerwalls')",
    "router.post('/provider-configs', requirePermission('manage_offerwalls')",
    "router.put('/provider-configs/:providerId', requirePermission('manage_offerwalls')",
    "router.get('/conversions', requirePermission('manage_offerwalls')",
    "router.get('/postback-logs', requirePermission('manage_offerwalls')",
    "router.get('/postback-logs/:id', requirePermission('manage_offerwalls')",
  ]) {
    assert.equal(source.includes(route), true);
  }
});

test('frontend admin pages do not render plaintext provider or direct-offer secrets', () => {
  const providers = read('frontend/src/pages/admin/AdminProviders.jsx');
  const directOffers = read('frontend/src/pages/admin/AdminDirectOffers.jsx');
  const postbackLogs = read('frontend/src/pages/admin/AdminPostbackLogs.jsx');
  assert.match(providers, /type="password"/);
  assert.match(providers, /Blank secret fields preserve/);
  assert.doesNotMatch(directOffers, /postbackSecretKey/);
  assert.match(directOffers, /secret=\{SECRET\}/);
  assert.doesNotMatch(postbackLogs, /secretValue|postbackSecretKey|authorization:\s*`Bearer/);
});
