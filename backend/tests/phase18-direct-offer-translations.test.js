const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'your-project-id';

const adminRouter = require('../routes/admin');
const DirectOffer = require('../models/DirectOffer');
const User = require('../models/User');
const AdminLog = require('../models/AdminLog');
const { normalizeGoals } = require('../utils/offerGoals');

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
// Collapse whitespace so assertions are semantic and tolerate formatting changes.
const compact = (source) => source.replace(/\s+/g, '');

// ─── Model + normalizer round-trip ────────────────────────────────────────────

test('DirectOffer stores EN + DE offer and goal translation fields', () => {
  const offer = new DirectOffer({
    title: 'Register',
    titleDe: 'Registrieren',
    description: 'Sign up and deposit',
    descriptionDe: 'Registrieren und einzahlen',
    requirements: ['Do X'],
    requirementsDe: ['Mach X'],
    rewardAmount: 100,
    advertiserUrl: 'https://example.com',
    goals: [{
      goalKey: 'deposit',
      label: 'Deposit',
      labelDe: 'Einzahlung',
      description: 'Make a deposit',
      descriptionDe: 'Führe eine Einzahlung durch',
      rewardAmount: 50,
    }],
  });

  assert.equal(offer.titleDe, 'Registrieren');
  assert.equal(offer.descriptionDe, 'Registrieren und einzahlen');
  assert.deepEqual(offer.requirementsDe, ['Mach X']);
  assert.equal(offer.goals[0].labelDe, 'Einzahlung');
  assert.equal(offer.goals[0].descriptionDe, 'Führe eine Einzahlung durch');
});

test('normalizeGoals preserves goal DE fields and defaults them to empty when absent', () => {
  const [full] = normalizeGoals([{ goalKey: 'deposit', rewardAmount: 50, label: 'Deposit', labelDe: 'Einzahlung', description: 'D', descriptionDe: 'GD' }]);
  assert.equal(full.label, 'Deposit');
  assert.equal(full.labelDe, 'Einzahlung');
  assert.equal(full.description, 'D');
  assert.equal(full.descriptionDe, 'GD');

  const [minimal] = normalizeGoals([{ goalKey: 'simple', rewardAmount: 10 }]);
  assert.equal(minimal.labelDe, '');
  assert.equal(minimal.descriptionDe, '');
});

// ─── Admin create/edit persistence ────────────────────────────────────────────

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

const baseOfferPayload = () => ({
  title: 'Register',
  titleDe: 'Registrieren',
  description: 'Sign up and deposit',
  descriptionDe: 'Registrieren und einzahlen',
  requirements: ['Do X'],
  requirementsDe: ['Mach X'],
  rewardAmount: 100,
  advertiserUrl: 'https://example.com',
  displayPlacements: { featured: true, brandedOfferwall: false },
  goals: [{ goalKey: 'deposit', label: 'Deposit', labelDe: 'Einzahlung', description: 'D', descriptionDe: 'GD', rewardAmount: 50, enabled: true }],
});

const withMocks = async (run) => {
  const originalUserFindOne = User.findOne;
  const originalAdminLogCreate = AdminLog.create;
  const originalCreate = DirectOffer.create;
  const originalFindByIdAndUpdate = DirectOffer.findByIdAndUpdate;
  User.findOne = () => Promise.resolve(makeDbUser());
  AdminLog.create = async () => ({});
  try {
    return await run();
  } finally {
    User.findOne = originalUserFindOne;
    AdminLog.create = originalAdminLogCreate;
    DirectOffer.create = originalCreate;
    DirectOffer.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
};

test('admin create persists EN + DE offer fields and goal DE fields', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);

  let captured = null;
  DirectOffer.create = async (payload) => { captured = payload; return { _id: 'new-offer', ...payload }; };

  await withMocks(async () => {
    const res = await request(app, {
      method: 'POST',
      path: '/api/admin/direct-offers',
      headers: { authorization: 'Bearer dev' },
      body: baseOfferPayload(),
    });
    assert.equal(res.statusCode, 201);
  });

  assert.equal(captured.titleDe, 'Registrieren');
  assert.equal(captured.descriptionDe, 'Registrieren und einzahlen');
  assert.deepEqual(captured.requirementsDe, ['Mach X']);
  assert.equal(captured.goals[0].labelDe, 'Einzahlung');
  assert.equal(captured.goals[0].descriptionDe, 'GD');
});

test('admin edit preserves translations and unrelated live edits do not drop them', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);

  let captured = null;
  DirectOffer.findByIdAndUpdate = async (id, update) => { captured = { id, update }; return { _id: id, ...update }; };

  await withMocks(async () => {
    // Full EN/DE edit
    await request(app, {
      method: 'PUT',
      path: '/api/admin/direct-offers/offer-123',
      headers: { authorization: 'Bearer dev' },
      body: baseOfferPayload(),
    });
    assert.equal(captured.id, 'offer-123');
    assert.equal(captured.update.titleDe, 'Registrieren');
    assert.equal(captured.update.descriptionDe, 'Registrieren und einzahlen');
    assert.deepEqual(captured.update.requirementsDe, ['Mach X']);
    assert.equal(captured.update.goals[0].labelDe, 'Einzahlung');
    assert.equal(captured.update.goals[0].descriptionDe, 'GD');

    // Live German title edit on the same document
    await request(app, {
      method: 'PUT',
      path: '/api/admin/direct-offers/offer-123',
      headers: { authorization: 'Bearer dev' },
      body: { titleDe: 'Jetzt registrieren' },
    });
    assert.equal(captured.id, 'offer-123');
    assert.equal(captured.update.titleDe, 'Jetzt registrieren');
    assert.equal(Object.prototype.hasOwnProperty.call(captured.update, 'title'), false);

    // Placement-only edit must not include translation keys (they stay untouched)
    await request(app, {
      method: 'PUT',
      path: '/api/admin/direct-offers/offer-123',
      headers: { authorization: 'Bearer dev' },
      body: { displayPlacements: { featured: false, brandedOfferwall: true } },
    });
    for (const key of ['title', 'titleDe', 'description', 'descriptionDe', 'requirements', 'requirementsDe', 'goals']) {
      assert.equal(Object.prototype.hasOwnProperty.call(captured.update, key), false, `placement-only edit must not touch ${key}`);
    }

    // Click-limit-only edit must not include translation keys either
    await request(app, {
      method: 'PUT',
      path: '/api/admin/direct-offers/offer-123',
      headers: { authorization: 'Bearer dev' },
      body: { maxTotalClicks: 200 },
    });
    assert.equal(captured.update.maxTotalClicks, 200);
    for (const key of ['title', 'titleDe', 'description', 'descriptionDe', 'requirements', 'requirementsDe', 'goals']) {
      assert.equal(Object.prototype.hasOwnProperty.call(captured.update, key), false, `click-limit edit must not touch ${key}`);
    }
  });
});

// ─── Frontend fallback selection (semantic source-scan) ───────────────────────

// Fallback "shape" regexes tolerate optional parentheses around the isDe condition.
const DE_TITLE = /isDe&&offer\.titleDe\)?\?offer\.titleDe:offer\.title/;
const DE_DESC = /isDe&&offer\.descriptionDe\)?\?offer\.descriptionDe/;

test('Featured Direct Offer component selects DE with English fallback', () => {
  const card = compact(read('frontend/src/components/offers/DirectOfferCard.jsx'));

  assert.match(card, /i18n\.language\?\.startsWith\('de'\)/);
  assert.match(card, DE_TITLE);
  assert.match(card, DE_DESC);
  assert.match(card, /isDe&&Array\.isArray\(offer\.requirementsDe\)&&offer\.requirementsDe\.length>0\)?\?offer\.requirementsDe:\(?offer\.requirements/);
  // Goal label prefers labelDe, else base label
  assert.match(card, /isDe&&goal\.labelDe\)?\?goal\.labelDe:\(goal\.label\|\|goal\.goalKey/);
});

test('Goodpicks component selects DE with English fallback', () => {
  const goodpicks = compact(read('frontend/src/components/offers/GoodpicksModal.jsx'));

  assert.match(goodpicks, /i18n\.language\?\.startsWith\('de'\)/);
  assert.match(goodpicks, DE_TITLE);
  assert.match(goodpicks, DE_DESC);
  assert.match(goodpicks, /isDe&&Array\.isArray\(offer\?\.requirementsDe\)&&offer\.requirementsDe\.length>0\)?\?offer\.requirementsDe:\(?offer\.requirements/);
  assert.match(goodpicks, /isDe&&goal\.labelDe\)?\?goal\.labelDe:\(goal\.label\|\|goal\.goalKey/);
});

test('English mode never prefers German and admin exposes manual EN/DE fields', () => {
  // Every German-preference occurrence must be gated by `isDe &&`.
  for (const file of [
    'frontend/src/components/offers/DirectOfferCard.jsx',
    'frontend/src/components/offers/GoodpicksModal.jsx',
  ]) {
    const source = compact(read(file));
    const gatedTitle = (source.match(/isDe&&offer\.titleDe\)?\?offer\.titleDe:offer\.title/g) || []).length;
    const anyTitle = (source.match(/offer\.titleDe\)?\?offer\.titleDe:offer\.title/g) || []).length;
    assert.ok(anyTitle > 0, `${file} must select DE title`);
    assert.equal(gatedTitle, anyTitle, `${file}: all DE title selections must be isDe-gated`);
    assert.match(source, /isDe&&/);
  }

  const admin = read('frontend/src/pages/admin/AdminDirectOffers.jsx');
  for (const field of ['titleDe', 'descriptionDe', 'requirementsDe', 'labelDe']) {
    assert.equal(admin.includes(field), true, `admin form must expose ${field}`);
  }
});

test('no automatic translation code or API is present in the offer/admin components', () => {
  const sources = [
    read('frontend/src/components/offers/DirectOfferCard.jsx'),
    read('frontend/src/components/offers/GoodpicksModal.jsx'),
    read('frontend/src/pages/admin/AdminDirectOffers.jsx'),
  ].join('\n');
  assert.doesNotMatch(sources, /translate\.googleapis|api\.deepl|libretranslate|mymemory|autoTranslate|translateText|translationApi/i);
});

test('Phase 2/4/5 behavior markers remain present in the offer components', () => {
  const card = read('frontend/src/components/offers/DirectOfferCard.jsx');
  assert.match(card, /completedGoalKeys/);
  assert.match(card, /formatGoalTimeLimit/);
  assert.match(card, /isOfferClickLimitReached/);

  const goodpicks = read('frontend/src/components/offers/GoodpicksModal.jsx');
  assert.match(goodpicks, /completedGoalKeys/);
  assert.match(goodpicks, /formatGoalTimeLimit/);
  assert.match(goodpicks, /isOfferClickLimitReached/);
});
