const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'your-project-id';

const adminRouter = require('../routes/admin');
const User = require('../models/User');
const ClickLog = require('../models/ClickLog');
const Conversion = require('../models/Conversion');
const ProviderConfig = require('../models/ProviderConfig');
const PostbackLog = require('../models/PostbackLog');

const {
  applyWriteOnlyProviderSecret,
  boundAdminPayload,
  cleanString,
  getPagination,
  normalizeResponseConfig,
  parseWriteOnlySecret,
  sanitizeDirectOfferAdmin,
  serializeClickLogAdmin,
  serializePostbackLog,
  serializeProviderConfig,
  validateProviderSettings,
  validateParameterMappings,
  validateSecurityConfig,
  validateStatusMappings,
} = adminRouter._phase8AdminHelpers;

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);
  return app;
};

const request = (app, { method = 'GET', path: requestPath, headers = {}, body } = {}) => new Promise((resolve, reject) => {
  const server = http.createServer(app);
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      method,
      path: requestPath,
      headers: {
        ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
        ...headers,
      },
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        server.close();
        resolve({
          statusCode: res.statusCode,
          body: data ? JSON.parse(data) : {},
        });
      });
    });
    req.on('error', (error) => {
      server.close();
      reject(error);
    });
    if (payload) req.write(payload);
    req.end();
  });
});

const makeDbUser = (overrides = {}) => ({
  _id: 'admin-user-id',
  firebaseUid: 'dev-mock-uid',
  email: 'admin@example.com',
  role: 'admin',
  adminPermissions: ['manage_offerwalls'],
  ...overrides,
});

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

test('provider detail serialization hides credentials and redacts provider settings', () => {
  const serialized = serializeProviderConfig({
    providerId: 'network',
    security: {
      method: 'token',
      tokenParam: 'api_key',
      credentials: { secret: 'hidden' },
    },
    providerSettings: {
      publicSetting: 'ok',
      apiKey: 'must-not-show',
      nested: { clientSecret: 'also-hidden' },
    },
  });

  assert.equal(serialized.security.credentials, undefined);
  assert.equal(serialized.security.credentialsConfigured, true);
  assert.equal(serialized.providerSettings.apiKey, '[REDACTED]');
  assert.equal(serialized.providerSettings.nested.clientSecret, '[REDACTED]');
  assert.equal(JSON.stringify(serialized).includes('must-not-show'), false);
});

test('provider secret is write-only and blank updates preserve existing credential', () => {
  const existing = { method: 'shared_secret', tokenParam: 'secret', credentials: { secret: 'keep-me' } };
  const security = validateSecurityConfig({ method: 'shared_secret', tokenParam: 'secret' }, existing);
  assert.equal(security.credentials, undefined);
  const next = applyWriteOnlyProviderSecret({
    nextSecurity: security,
    existingCredentials: existing.credentials,
    secretInput: parseWriteOnlySecret(''),
    removeSecret: false,
  });

  assert.deepEqual(next.credentials, existing.credentials);
  const serialized = serializeProviderConfig({ providerId: 'direct', security: existing });
  assert.equal(serialized.security.credentialsConfigured, true);
  assert.equal(JSON.stringify(serialized).includes('keep-me'), false);
});

test('provider secret replacement, malformed secret, and invalid removal are enforced', () => {
  const existing = { method: 'shared_secret', tokenParam: 'secret', credentials: { secret: 'old-secret' } };
  const replaced = applyWriteOnlyProviderSecret({
    nextSecurity: validateSecurityConfig({ method: 'shared_secret', tokenParam: 'secret' }, existing),
    existingCredentials: existing.credentials,
    secretInput: parseWriteOnlySecret('new-secret'),
    removeSecret: false,
  });

  assert.deepEqual(replaced.credentials, { secret: 'new-secret' });
  assert.throws(() => parseWriteOnlySecret({ secret: 'object' }), /Secret must be a string/);
  assert.throws(() => validateSecurityConfig({ credentials: { secret: 'bad' } }), /write-only secret field/);
  assert.throws(() => applyWriteOnlyProviderSecret({
    nextSecurity: validateSecurityConfig({ method: 'shared_secret', tokenParam: 'secret' }, existing),
    existingCredentials: existing.credentials,
    secretInput: parseWriteOnlySecret(''),
    removeSecret: true,
  }), /Cannot remove credential/);
  assert.throws(() => applyWriteOnlyProviderSecret({
    nextSecurity: validateSecurityConfig({ method: 'shared_secret', tokenParam: 'secret' }, { method: 'none' }),
    existingCredentials: undefined,
    secretInput: parseWriteOnlySecret(''),
    removeSecret: false,
  }), /requires a credential/);
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
  assert.throws(() => validateParameterMappings({ clickId: { $ne: null }, transactionId: 'txn', status: 'status' }), /scalar/);
  assert.throws(() => validateParameterMappings({ clickId: 'click', transactionId: 'txn', status: 'status', extra: { subid: { $ne: null } } }), /scalar/);
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
  assert.throws(() => validateSecurityConfig({ method: 'custom_adapter' }), /requires adapterKey/);
  assert.throws(() => validateSecurityConfig({ method: 'custom_adapter', adapterKey: '../unsafe' }), /invalid characters/);
  assert.throws(() => validateSecurityConfig({ method: 'custom_adapter', adapterKey: 'unknown_adapter' }), /Unknown provider adapterKey/);
  assert.throws(() => validateSecurityConfig({ method: 'unsupported' }), /Unsupported/);
  assert.throws(() => validateProviderSettings({ apiKey: 'should-not-persist' }), /Sensitive provider settings/);
});

test('pagination and response config are bounded', () => {
  assert.deepEqual(getPagination({ page: '-1', limit: '5000' }), { page: 1, limit: 100, skip: 0 });
  assert.equal(normalizeResponseConfig({ successStatus: 999 }).successStatus, 599);
  assert.equal(normalizeResponseConfig({ errorStatus: 1 }).errorStatus, 100);
});

test('postback log admin serialization uses sanitized stored payloads only', () => {
  const largeValue = 'x'.repeat(1500);
  const log = new PostbackLog({
    providerId: 'direct',
    route: '/api/direct-offers/postback',
    method: 'GET',
    sanitizedQuery: { secret: '[REDACTED]', click_id: 'click-1', large: largeValue },
    sanitizedHeaders: { authorization: '[REDACTED]' },
    mappedFields: { clickId: 'click-1', transactionId: 'txn-1', status: 'approved' },
    security: { checked: true, passed: true, method: 'shared_secret' },
    processingResult: 'accepted',
  });
  const serialized = serializePostbackLog(log, true);
  assert.equal(serialized.sanitizedQuery.secret, '[REDACTED]');
  assert.equal(serialized.sanitizedHeaders.authorization, '[REDACTED]');
  assert.equal(serialized.sanitizedQuery.large.length < largeValue.length, true);
  assert.equal(JSON.stringify(serialized).includes('super-secret'), false);
});

test('click log admin serialization omits sensitive tracking, redirect, IP, and auth-heavy fields', () => {
  const serialized = serializeClickLogAdmin({
    _id: 'click-log-id',
    clickId: 'click-1',
    providerId: 'cpx',
    providerType: 'offerwall',
    campaignType: 'offerwall',
    campaignId: 'survey-1',
    offerId: { _id: 'offer-id', title: 'Offer' },
    userId: { _id: 'user-id', displayName: 'User', email: 'u@example.com', firebaseUid: 'firebase-secret' },
    trackingParams: { token: 'hidden' },
    destinationUrl: 'https://provider.test/?apiKey=hidden',
    ip: '127.0.0.1',
    userAgent: 'test-agent',
    country: 'US',
    device: 'desktop',
    status: 'clicked',
  });

  const json = JSON.stringify(serialized);
  assert.equal(json.includes('trackingParams'), false);
  assert.equal(json.includes('destinationUrl'), false);
  assert.equal(json.includes('firebase-secret'), false);
  assert.equal(json.includes('127.0.0.1'), false);
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
    "router.get('/provider-configs/:providerId', requirePermission('manage_offerwalls')",
    "router.post('/provider-configs', requirePermission('manage_offerwalls')",
    "router.put('/provider-configs/:providerId', requirePermission('manage_offerwalls')",
    "router.get('/conversions', requirePermission('manage_offerwalls')",
    "router.get('/postback-logs', requirePermission('manage_offerwalls')",
    "router.get('/postback-logs/:id', requirePermission('manage_offerwalls')",
  ]) {
    assert.equal(source.includes(route), true);
  }
});

test('new admin endpoints enforce unauthenticated, non-admin, wrong-permission, and allowed access', async () => {
  const originalUserFindOne = User.findOne;
  const originalProviderFind = ProviderConfig.find;
  const originalProviderCount = ProviderConfig.countDocuments;
  const app = makeApp();
  let dbUser = makeDbUser();

  ProviderConfig.find = () => ({
    sort() { return this; },
    skip() { return this; },
    limit() { return Promise.resolve([{ providerId: 'cpx', security: { method: 'none', credentials: { secret: 'hidden' } } }]); },
  });
  ProviderConfig.countDocuments = () => Promise.resolve(1);
  User.findOne = () => Promise.resolve(dbUser);

  try {
    const unauthenticated = await request(app, { path: '/api/admin/provider-configs' });
    assert.equal(unauthenticated.statusCode, 401);

    dbUser = makeDbUser({ role: 'user', adminPermissions: [] });
    const nonAdmin = await request(app, { path: '/api/admin/provider-configs', headers: { authorization: 'Bearer dev' } });
    assert.equal(nonAdmin.statusCode, 403);

    dbUser = makeDbUser({ adminPermissions: ['manage_users'] });
    const wrongPermission = await request(app, { path: '/api/admin/provider-configs', headers: { authorization: 'Bearer dev' } });
    assert.equal(wrongPermission.statusCode, 403);

    dbUser = makeDbUser({ adminPermissions: ['manage_offerwalls'] });
    const allowed = await request(app, { path: '/api/admin/provider-configs', headers: { authorization: 'Bearer dev' } });
    assert.equal(allowed.statusCode, 200);
    assert.equal(allowed.body.providers[0].security.credentials, undefined);
  } finally {
    User.findOne = originalUserFindOne;
    ProviderConfig.find = originalProviderFind;
    ProviderConfig.countDocuments = originalProviderCount;
  }
});

test('admin filters reject operator-shaped and invalid values before Mongo queries', async () => {
  const originalUserFindOne = User.findOne;
  const originalConversionFind = Conversion.find;
  const originalClickFind = ClickLog.find;
  const app = makeApp();

  User.findOne = () => Promise.resolve(makeDbUser());
  Conversion.find = () => { throw new Error('Conversion.find should not be called'); };
  ClickLog.find = () => { throw new Error('ClickLog.find should not be called'); };

  try {
    const invalidDate = await request(app, {
      path: '/api/admin/conversions?from=not-a-date',
      headers: { authorization: 'Bearer dev' },
    });
    assert.equal(invalidDate.statusCode, 400);

    const badStatus = await request(app, {
      path: '/api/admin/postback-logs?processingResult=approved',
      headers: { authorization: 'Bearer dev' },
    });
    assert.equal(badStatus.statusCode, 400);

    const badClickFilter = await request(app, {
      path: '/api/admin/click-logs?providerType=admin',
      headers: { authorization: 'Bearer dev' },
    });
    assert.equal(badClickFilter.statusCode, 400);

    assert.throws(() => cleanString({ $ne: null }), /scalar/);
  } finally {
    User.findOne = originalUserFindOne;
    Conversion.find = originalConversionFind;
    ClickLog.find = originalClickFind;
  }
});

test('frontend admin pages do not render plaintext provider or direct-offer secrets', () => {
  const providers = read('frontend/src/pages/admin/AdminProviders.jsx');
  const directOffers = read('frontend/src/pages/admin/AdminDirectOffers.jsx');
  const postbackLogs = read('frontend/src/pages/admin/AdminPostbackLogs.jsx');
  assert.match(providers, /type="password"/);
  assert.match(providers, /Blank secret fields preserve/);
  assert.match(providers, /hashAlgorithm/);
  assert.match(providers, /adapterKey/);
  assert.doesNotMatch(directOffers, /postbackSecretKey/);
  assert.match(directOffers, /secret=\{SECRET\}/);
  assert.doesNotMatch(postbackLogs, /secretValue|postbackSecretKey|authorization:\s*`Bearer/);
});

test('offerwall readiness wording remains conservative and Phase 8 pages add no financial actions', () => {
  const offerwalls = read('frontend/src/pages/admin/AdminOfferwalls.jsx');
  const providers = read('frontend/src/pages/admin/AdminProviders.jsx');
  const conversions = read('frontend/src/pages/admin/AdminConversions.jsx');
  const logs = read('frontend/src/pages/admin/AdminPostbackLogs.jsx');
  const source = `${providers}\n${conversions}\n${logs}`;

  assert.match(offerwalls, /Generic tracking ready/);
  assert.doesNotMatch(offerwalls, /Fully integrated|Provider tested|Production tested/);
  assert.doesNotMatch(source, /force approve|force reward|retry reward|reverse transaction|credit user/i);
});
