const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'your-project-id';

const adminRouter = require('../routes/admin');
const Settings = require('../models/Settings');
const User = require('../models/User');
const AdminLog = require('../models/AdminLog');
const { sortOfferwallProviders, ensureOfferwallOrder } = require('../utils/offerwallOrder');

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const providerOrderModuleUrl = pathToFileURL(path.join(repoRoot, 'frontend/src/utils/providerOrder.js')).href;
const loadProviderOrder = () => import(providerOrderModuleUrl);

// ─── Backend: shared sort util ────────────────────────────────────────────────

test('sortOfferwallProviders orders by configured order ascending', () => {
  const sorted = sortOfferwallProviders([
    { id: 'cpx', order: 6 },
    { id: 'goodpicks', order: 0 },
    { id: 'lootably', order: 1 },
  ]);
  assert.deepEqual(sorted.map((p) => p.id), ['goodpicks', 'lootably', 'cpx']);
});

test('sortOfferwallProviders is deterministic for equal or missing order', () => {
  assert.deepEqual(sortOfferwallProviders([{ id: 'b', order: 1 }, { id: 'a', order: 1 }]).map((p) => p.id), ['b', 'a']);
  // providers without an order sort after those that have one, stable by index
  assert.deepEqual(sortOfferwallProviders([{ id: 'a' }, { id: 'b', order: 1 }]).map((p) => p.id), ['b', 'a']);
  assert.deepEqual(sortOfferwallProviders([{ id: 'b' }, { id: 'a' }]).map((p) => p.id), ['b', 'a']);
});

test('sortOfferwallProviders preserves provider config data (Lootably/CPX)', () => {
  const sorted = sortOfferwallProviders([
    { id: 'cpx', conversionRatio: 100, category: 'surveys', order: 6 },
    { id: 'lootably', order: 1, placementId: 'placement-x', iframeUrl: 'https://desktop-wall.lootably.com/x' },
  ]);
  const lootably = sorted.find((p) => p.id === 'lootably');
  const cpx = sorted.find((p) => p.id === 'cpx');
  assert.equal(lootably.placementId, 'placement-x');
  assert.equal(lootably.iframeUrl, 'https://desktop-wall.lootably.com/x');
  assert.equal(cpx.conversionRatio, 100);
  assert.deepEqual(sorted.map((p) => p.id), ['lootably', 'cpx']);
});

test('ensureOfferwallOrder backfills missing order by current index and preserves existing order', () => {
  const providers = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.equal(ensureOfferwallOrder(providers), true);
  assert.deepEqual(providers.map((p) => p.order), [0, 1, 2]);

  const mixed = [{ id: 'a', order: 5 }, { id: 'b' }];
  ensureOfferwallOrder(mixed);
  assert.equal(mixed[0].order, 5);
  assert.equal(mixed[1].order, 1);

  const complete = [{ id: 'a', order: 0 }];
  assert.equal(ensureOfferwallOrder(complete), false);
});

test('Settings defaults give Goodpicks order 0 (first) for old config', () => {
  const settings = new Settings();
  assert.equal(settings.offerwallProviders[0].id, 'goodpicks');
  assert.equal(settings.offerwallProviders[0].order, 0);
  const orders = settings.offerwallProviders.map((p) => p.order);
  assert.deepEqual(orders, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

// ─── Backend: routes consume the shared order ─────────────────────────────────

test('wallet settings and admin providers serialize using the shared order helper', () => {
  assert.match(read('backend/routes/wallet.js'), /sortOfferwallProviders\(offerwalls\)/);
  assert.match(read('backend/routes/admin.js'), /sortOfferwallProviders\(providers\)/);
  assert.match(read('backend/models/Settings.js'), /ensureOfferwallOrder\(settings\.offerwallProviders\)/);
});

// ─── Backend: admin PUT validates order ───────────────────────────────────────

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
        resolve({ statusCode: res.statusCode, body: data ? JSON.parse(data) : {} });
      });
    });
    req.on('error', (error) => { server.close(); reject(error); });
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

test('admin offerwall PUT accepts only non-negative integer order and persists it', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);

  const originalUserFindOne = User.findOne;
  const originalGetSingleton = Settings.getSingleton;
  const originalAdminLogCreate = AdminLog.create;

  const makeFakeSettings = () => ({
    offerwallProviders: [{ id: 'lootably', enabled: true, conversionRatio: 100, order: 1 }],
    save: async function save() { return this; },
  });

  User.findOne = () => Promise.resolve(makeDbUser());
  AdminLog.create = async () => ({});
  let fakeSettings = makeFakeSettings();
  Settings.getSingleton = async () => fakeSettings;

  try {
    for (const badOrder of [-1, 1.5, 'abc']) {
      fakeSettings = makeFakeSettings();
      const bad = await request(app, {
        method: 'PUT',
        path: '/api/admin/offerwalls/lootably',
        headers: { authorization: 'Bearer dev' },
        body: { order: badOrder },
      });
      assert.equal(bad.statusCode, 400, `order ${badOrder} must be rejected`);
      assert.equal(fakeSettings.offerwallProviders[0].order, 1);
    }

    fakeSettings = makeFakeSettings();
    const ok = await request(app, {
      method: 'PUT',
      path: '/api/admin/offerwalls/lootably',
      headers: { authorization: 'Bearer dev' },
      body: { enabled: true, conversionRatio: 100, order: 5 },
    });
    assert.equal(ok.statusCode, 200);
    assert.equal(ok.body.provider.order, 5);
    assert.equal(fakeSettings.offerwallProviders[0].order, 5);
  } finally {
    User.findOne = originalUserFindOne;
    Settings.getSingleton = originalGetSingleton;
    AdminLog.create = originalAdminLogCreate;
  }
});

// ─── Frontend: shared ordering helper behavior ────────────────────────────────

test('frontend helper changes sequence when configured (server) order changes', async () => {
  const { buildOfferwallSections } = await loadProviderOrder();
  const first = buildOfferwallSections({
    enabledProviders: [
      { id: 'goodpicks', category: 'gaming', order: 0 },
      { id: 'cpx', category: 'surveys', order: 6 },
    ],
  });
  assert.equal(first.surveys[0].id, 'goodpicks');

  const second = buildOfferwallSections({
    enabledProviders: [
      { id: 'cpx', category: 'surveys', order: 0 },
      { id: 'goodpicks', category: 'gaming', order: 6 },
    ],
  });
  assert.equal(second.surveys[0].id, 'cpx');
  assert.deepEqual(second.surveys.map((p) => p.id).slice(0, 2), ['cpx', 'goodpicks']);
});

test('frontend helper does not force Goodpicks first when its order is higher', async () => {
  const { buildOfferwallSections } = await loadProviderOrder();
  const { surveys, gaming } = buildOfferwallSections({
    enabledProviders: [
      { id: 'torox', category: 'gaming', order: 1 },
      { id: 'goodpicks', category: 'gaming', order: 50 },
    ],
  });
  assert.equal(surveys[0].id, 'goodpicks'); // only provider in its category set stays
  assert.equal(gaming[0].id, 'torox');
  assert.equal(gaming[1].id, 'goodpicks');
});

test('frontend helper never reinterprets server order (array order preserved verbatim)', async () => {
  const { buildOrderedProviders } = await loadProviderOrder();
  const ordered = buildOrderedProviders([
    { id: 'a', order: 9 },
    { id: 'b', order: 1 },
    { id: 'c', order: 5 },
  ], []);
  assert.deepEqual(ordered.map((p) => p.id), ['a', 'b', 'c']);
});

test('frontend helper keeps disabled providers excluded (no re-adding of registry providers)', async () => {
  const { buildOfferwallSections } = await loadProviderOrder();
  const { surveys, gaming } = buildOfferwallSections({
    enabledProviders: [
      { id: 'goodpicks', category: 'gaming', order: 0 },
      { id: 'cpx', category: 'surveys', order: 1 },
    ],
  });
  const allIds = [...surveys, ...gaming].map((p) => p.id);
  assert.equal(allIds.includes('torox'), false);
  assert.equal(allIds.includes('lootably'), false);
});

test('frontend helper appends injected fallback providers deterministically last', async () => {
  const { buildOrderedProviders } = await loadProviderOrder();
  // Adscend is now a backend-registry provider, so the fallback mechanism is
  // exercised with an explicitly injected fallback definition.
  const ordered = buildOrderedProviders(
    [
      { id: 'goodpicks', category: 'gaming', order: 0 },
      { id: 'cpx', category: 'surveys', order: 6 },
    ],
    [{ id: 'fallback-network', category: 'surveys', enabled: true }]
  );
  assert.deepEqual(ordered.map((p) => p.id), ['goodpicks', 'cpx', 'fallback-network']);
});

test('frontend pages consume the shared ordering helper', () => {
  assert.match(read('frontend/src/pages/Earn.jsx'), /buildOfferwallSections\(\{ enabledProviders \}\)/);
  assert.match(read('frontend/src/pages/Home.jsx'), /buildOfferwallSections\(\{ enabledProviders \}\)/);
  assert.doesNotMatch(read('frontend/src/pages/Earn.jsx'), /\[goodpicksItem, \.\.\.defaultSurveyList\]/);
  assert.doesNotMatch(read('frontend/src/pages/Home.jsx'), /\[goodpicksItem, \.\.\.defaultSurveyList\]/);
});
