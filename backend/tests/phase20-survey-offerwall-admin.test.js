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

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const compact = (source) => source.replace(/\s+/g, '');

const providerOrderUrl = pathToFileURL(path.join(repoRoot, 'frontend/src/utils/providerOrder.js')).href;

// ─── Adscend becomes a first-class registry provider ──────────────────────────

test('Settings defaults include AdscendMedia as an enabled surveys provider, last in order', () => {
  const settings = new Settings();
  const adscend = settings.offerwallProviders.find((p) => p.id === 'adscend');
  assert.ok(adscend, 'adscend must exist in default settings');
  assert.equal(adscend.label, 'AdscendMedia');
  assert.equal(adscend.category, 'surveys');
  assert.equal(adscend.enabled, true);
  const ids = settings.offerwallProviders.map((p) => p.id);
  assert.equal(ids[ids.length - 1], 'adscend');
  assert.equal(new Set(ids).size, ids.length, 'no duplicate provider ids');
});

test('getSingleton seeds Adscend once via the existing duplicate guard', () => {
  const source = read('backend/models/Settings.js');
  assert.match(source, /id:\s*'adscend'/);
  assert.match(source, /!settings\.offerwallProviders\.some\(existing\s*=>\s*existing\.id === p\.id\)/);
  assert.match(source, /ensureOfferwallOrder\(settings\.offerwallProviders\)/);
});

test('frontend no longer re-adds Adscend via fallback (disable is respected)', async () => {
  const source = read('frontend/src/utils/providerOrder.js');
  assert.doesNotMatch(source, /id:\s*'adscend'/, 'adscend must not be in FALLBACK_PROVIDER_DEFS');
  const { buildOfferwallSections } = await import(providerOrderUrl);
  // When adscend is disabled it is absent from enabledProviders; it must not reappear.
  const { surveys } = buildOfferwallSections({
    enabledProviders: [
      { id: 'goodpicks', category: 'gaming', order: 0 },
      { id: 'cpx', category: 'surveys', order: 6 },
    ],
  });
  assert.equal(surveys.some((p) => p.id === 'adscend'), false);
});

// ─── Admin Surveys tab = user-side Surveys set ────────────────────────────────

test('Surveys set matches the user-facing section (goodpicks + surveys) and excludes disabled', async () => {
  const { buildOfferwallSections } = await import(providerOrderUrl);
  const enabled = [
    { id: 'goodpicks', category: 'gaming', order: 0 },
    { id: 'lootably', category: 'mixed', order: 1 },
    { id: 'primeearn', category: 'surveys', order: 2 },
    { id: 'cpx', category: 'surveys', order: 6 },
    { id: 'adscend', category: 'surveys', order: 9 },
  ];
  const { surveys } = buildOfferwallSections({ enabledProviders: enabled });
  assert.deepEqual(new Set(surveys.map((p) => p.id)), new Set(['goodpicks', 'primeearn', 'cpx', 'adscend']));

  const adminSource = compact(read('frontend/src/pages/admin/AdminOfferwalls.jsx'));
  assert.match(adminSource, /activeTab/);
  assert.match(adminSource, /Gaming&App/);
  assert.match(adminSource, /constisSurvey=p\.category==='surveys'/);
  assert.match(adminSource, /constisGoodpicks=p\.id==='goodpicks'/);
  assert.match(adminSource, /activeTab==='surveys'\)returnisSurvey\|\|isGoodpicks/);
});

test('Goodpicks appears in both admin tabs without a category change', () => {
  const source = read('frontend/src/pages/admin/AdminOfferwalls.jsx');
  // Surveys tab: category surveys OR goodpicks; Gaming tab: non-surveys OR goodpicks.
  assert.match(source, /activeTab === 'surveys'\) return isSurvey \|\| isGoodpicks/);
  assert.match(source, /return !isSurvey \|\| isGoodpicks/);
  // Underlying category untouched (Settings default remains gaming).
  assert.match(read('backend/models/Settings.js'), /id: 'goodpicks'[\s\S]{0,120}category: 'gaming'/);
});

test('survey providers never appear in Gaming & App even when reordered first', async () => {
  const { buildOfferwallSections } = await import(providerOrderUrl);
  const enabled = [
    { id: 'adscend', category: 'surveys', order: 1 },
    { id: 'cpx', category: 'surveys', order: 2 },
    { id: 'primeearn', category: 'surveys', order: 3 },
    { id: 'lootably', category: 'mixed', order: 4 },
    { id: 'goodpicks', category: 'gaming', order: 5 },
    { id: 'torox', category: 'gaming', order: 6 },
  ];
  const { gaming, surveys } = buildOfferwallSections({ enabledProviders: enabled });
  const gamingIds = gaming.map((p) => p.id);

  // Survey-only providers are excluded from Gaming even though reordered early.
  assert.equal(gamingIds.includes('adscend'), false);
  assert.equal(gamingIds.includes('cpx'), false);
  assert.equal(gamingIds.includes('primeearn'), false);
  // Goodpicks remains in both sections.
  assert.equal(gamingIds.includes('goodpicks'), true);
  assert.equal(surveys.some((p) => p.id === 'goodpicks'), true);
  // Gaming/mixed order stays server-authoritative (Goodpicks positioned by order).
  assert.deepEqual(gamingIds, ['lootably', 'goodpicks', 'torox']);
  // Surveys keeps all survey providers + Goodpicks.
  assert.deepEqual(new Set(surveys.map((p) => p.id)), new Set(['adscend', 'cpx', 'primeearn', 'goodpicks']));
});

test('gaming keeps the existing 8 non-Goodpicks cap', async () => {
  const { buildOfferwallSections } = await import(providerOrderUrl);
  const enabled = [
    { id: 'goodpicks', category: 'gaming', order: 0 },
    ...Array.from({ length: 10 }, (_, i) => ({ id: `g${i}`, category: 'mixed', order: i + 1 })),
  ];
  const { gaming } = buildOfferwallSections({ enabledProviders: enabled });
  assert.equal(gaming.filter((p) => p.id !== 'goodpicks').length, 8);
  assert.equal(gaming.some((p) => p.id === 'goodpicks'), true);
});

// ─── Capability-gated provider settings (PUT) ────────────────────────────────

const request = (app, { method = 'GET', path: requestPath, headers = {}, body } = {}) => new Promise((resolve, reject) => {
  const server = http.createServer(app);
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1', port, method, path: requestPath,
      headers: {
        ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
        ...headers,
      },
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { server.close(); resolve({ statusCode: res.statusCode, body: data ? JSON.parse(data) : {} }); });
    });
    req.on('error', (error) => { server.close(); reject(error); });
    if (payload) req.write(payload);
    req.end();
  });
});

const makeDbUser = () => ({
  _id: 'admin-user-id',
  firebaseUid: 'dev-mock-uid',
  email: 'admin@example.com',
  role: 'admin',
  adminPermissions: ['manage_offerwalls'],
});

const makeFakeSettings = () => ({
  offerwallProviders: [
    { id: 'primeearn', label: 'Prime Surveys', enabled: true, conversionRatio: 100, order: 2, category: 'surveys', iframeUrl: '', offerwallUrl: '', placementId: '' },
    { id: 'cpx', label: 'CPX Research', enabled: true, conversionRatio: 100, order: 6, category: 'surveys', iframeUrl: '', offerwallUrl: '', placementId: '' },
    { id: 'goodpicks', label: 'Goodpicks', enabled: true, conversionRatio: 100, order: 0, category: 'gaming', iframeUrl: '', offerwallUrl: '', placementId: '' },
    { id: 'lootably', label: 'Lootably', enabled: true, conversionRatio: 100, order: 1, category: 'mixed', iframeUrl: '', offerwallUrl: '', placementId: '' },
    { id: 'adscend', label: 'AdscendMedia', enabled: true, conversionRatio: 100, order: 9, category: 'surveys', iframeUrl: '', offerwallUrl: '', placementId: '' },
  ],
  save: async function save() { return this; },
});

const withAdmin = async (fn) => {
  const originalUserFindOne = User.findOne;
  const originalAdminLogCreate = AdminLog.create;
  const originalGetSingleton = Settings.getSingleton;
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);
  const fakeSettings = makeFakeSettings();
  User.findOne = () => Promise.resolve(makeDbUser());
  AdminLog.create = async () => ({});
  Settings.getSingleton = async () => fakeSettings;
  try {
    return await fn({ app, fakeSettings });
  } finally {
    User.findOne = originalUserFindOne;
    AdminLog.create = originalAdminLogCreate;
    Settings.getSingleton = originalGetSingleton;
  }
};

const getProvider = (fakeSettings, id) => fakeSettings.offerwallProviders.find((p) => p.id === id);

test('label is editable for all providers', async () => {
  await withAdmin(async ({ app, fakeSettings }) => {
    const res = await request(app, {
      method: 'PUT', path: '/api/admin/offerwalls/cpx', headers: { authorization: 'Bearer dev' },
      body: { label: 'CPX Research (Renamed)' },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(getProvider(fakeSettings, 'cpx').label, 'CPX Research (Renamed)');
  });
});

test('iframeUrl is applied for generic survey providers', async () => {
  await withAdmin(async ({ app, fakeSettings }) => {
    const res = await request(app, {
      method: 'PUT', path: '/api/admin/offerwalls/adscend', headers: { authorization: 'Bearer dev' },
      body: { iframeUrl: 'https://adscend.example/wall' },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(getProvider(fakeSettings, 'adscend').iframeUrl, 'https://adscend.example/wall');
  });
});

test('CPX and Goodpicks URL/placement fields are not applied (no ineffective save)', async () => {
  await withAdmin(async ({ app, fakeSettings }) => {
    for (const id of ['cpx', 'goodpicks']) {
      await request(app, {
        method: 'PUT', path: `/api/admin/offerwalls/${id}`, headers: { authorization: 'Bearer dev' },
        body: { iframeUrl: 'https://ignored.example', offerwallUrl: 'https://ignored.example/ow', placementId: 'ignored' },
      });
      const provider = getProvider(fakeSettings, id);
      assert.equal(provider.iframeUrl, '', `${id} iframeUrl must stay empty`);
      assert.equal(provider.offerwallUrl, '', `${id} offerwallUrl must stay empty`);
      assert.equal(provider.placementId, '', `${id} placementId must stay empty`);
    }
  });
});

test('offerwallUrl and placementId apply only to Lootably', async () => {
  await withAdmin(async ({ app, fakeSettings }) => {
    await request(app, {
      method: 'PUT', path: '/api/admin/offerwalls/primeearn', headers: { authorization: 'Bearer dev' },
      body: { offerwallUrl: 'https://ignored.example', placementId: 'ignored' },
    });
    assert.equal(getProvider(fakeSettings, 'primeearn').offerwallUrl, '');
    assert.equal(getProvider(fakeSettings, 'primeearn').placementId, '');

    await request(app, {
      method: 'PUT', path: '/api/admin/offerwalls/lootably', headers: { authorization: 'Bearer dev' },
      body: { iframeUrl: 'https://lootably.example/wall', offerwallUrl: 'https://lootably.example/ow', placementId: 'place-123' },
    });
    const lootably = getProvider(fakeSettings, 'lootably');
    assert.equal(lootably.iframeUrl, 'https://lootably.example/wall');
    assert.equal(lootably.offerwallUrl, 'https://lootably.example/ow');
    assert.equal(lootably.placementId, 'place-123');
  });
});
