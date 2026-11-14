const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

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
const loadOfferTranslations = () => import(pathToFileURL(path.join(repoRoot, 'frontend/src/utils/offerTranslations.js')).href);
const loadDirectOfferPayload = () => import(pathToFileURL(path.join(repoRoot, 'frontend/src/utils/directOfferPayload.js')).href);
const loadOfferGoalDisplay = () => import(pathToFileURL(path.join(repoRoot, 'frontend/src/utils/offerGoalDisplay.js')).href);
const loadOfferNumberFormat = () => import(pathToFileURL(path.join(repoRoot, 'frontend/src/utils/offerNumberFormat.js')).href);

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

// ─── Admin save payload: localized requirements + deliberate legacy fields ───

test('saving localized requirements keeps every locale and derives legacy fields from them', async () => {
  const { buildDirectOfferTextPayload } = await loadDirectOfferPayload();

  const payload = buildDirectOfferTextPayload({
    form: {
      title: 'Legacy EN title',
      description: 'Legacy EN description',
      requirements: 'Legacy EN requirement',
      titleDe: 'Legacy DE title',
      descriptionDe: 'Legacy DE description',
      requirementsDe: 'Legacy DE requirement',
      requirementType: 'bullets',
    },
    translations: {
      en: { title: 'English title', description: 'English description', requirements: 'Do X\nDo Y' },
      de: { title: 'Deutscher Titel', description: 'Deutsche Beschreibung', requirements: ['Mach X', 'Mach Y'] },
      fr: { title: 'Titre FR', description: 'Description FR', requirements: 'Une\nDeux' },
    },
  });

  assert.equal(payload.title, 'English title');
  assert.equal(payload.titleDe, 'Deutscher Titel');
  assert.deepEqual(payload.translations.en.requirements, ['Do X', 'Do Y']);
  assert.deepEqual(payload.translations.de.requirements, ['Mach X', 'Mach Y']);
  assert.deepEqual(payload.translations.fr.requirements, ['Une', 'Deux']);
  assert.deepEqual(payload.requirements, ['Do X', 'Do Y']);
  assert.deepEqual(payload.requirementsDe, ['Mach X', 'Mach Y']);
});

test('saving legacy offers seeds requirements into translations without losing titleDe/descriptionDe/requirementsDe', async () => {
  const { buildDirectOfferTextPayload } = await loadDirectOfferPayload();

  const payload = buildDirectOfferTextPayload({
    form: {
      title: 'English legacy title',
      description: 'English legacy description',
      requirements: 'First EN\nSecond EN',
      titleDe: 'Deutscher Alt-Titel',
      descriptionDe: 'Deutsche Alt-Beschreibung',
      requirementsDe: 'Erste DE\nZweite DE',
      requirementType: 'bullets',
    },
    translations: {
      en: { title: 'English legacy title', description: 'English legacy description' },
      de: { title: 'Deutscher Alt-Titel', description: 'Deutsche Alt-Beschreibung' },
    },
  });

  assert.deepEqual(payload.translations.en.requirements, ['First EN', 'Second EN']);
  assert.deepEqual(payload.translations.de.requirements, ['Erste DE', 'Zweite DE']);
  assert.deepEqual(payload.requirements, payload.translations.en.requirements);
  assert.deepEqual(payload.requirementsDe, payload.translations.de.requirements);
  assert.equal(payload.descriptionDe, 'Deutsche Alt-Beschreibung');
});

test('saving an intentionally empty localized requirements list does not resurrect legacy text', async () => {
  const { buildDirectOfferTextPayload } = await loadDirectOfferPayload();

  const payload = buildDirectOfferTextPayload({
    form: { requirements: 'Old EN requirement', requirementsDe: 'Old DE requirement', requirementType: 'bullets' },
    translations: { en: { requirements: '' }, de: { requirements: [] } },
  });

  assert.deepEqual(payload.translations.en.requirements, []);
  assert.deepEqual(payload.translations.de.requirements, []);
  assert.deepEqual(payload.requirements, []);
  assert.deepEqual(payload.requirementsDe, []);
});

// ─── Field-level translation lookup (no cross-language English fallback) ──────

test('a partially translated offer never borrows English text in another selected language', async () => {
  const { getOfferTranslation } = await loadOfferTranslations();

  const display = getOfferTranslation({
    title: 'English title',
    description: 'English description',
    requirements: ['English requirement'],
    proofInstructions: 'English proof instructions',
    translations: { de: { title: 'Deutscher Titel' } },
  }, 'de');

  assert.deepEqual(display, {
    title: 'Deutscher Titel',
    description: '',
    requirements: [],
    proofInstructions: '',
  });
});

test('locale variants fall back only within the same language', async () => {
  const { getOfferTranslation } = await loadOfferTranslations();

  assert.deepEqual(
    getOfferTranslation({
      title: 'English title',
      description: 'English description',
      translations: { de: { title: 'Deutscher Titel', description: 'Deutsche Beschreibung' } },
    }, 'de-DE'),
    {
      title: 'Deutscher Titel',
      description: 'Deutsche Beschreibung',
      requirements: [],
      proofInstructions: '',
    }
  );
});

test('legacy titleDe, descriptionDe and requirementsDe still work for German', async () => {
  const { getOfferTranslation } = await loadOfferTranslations();
  const offer = {
    title: 'English title',
    description: 'English description',
    requirements: ['English requirement'],
    proofInstructions: 'English proof',
    titleDe: 'Deutscher Titel',
    descriptionDe: 'Deutsche Beschreibung',
    requirementsDe: ['Deutsche Voraussetzung'],
    proofInstructionsDe: 'Deutscher Nachweis',
  };

  assert.deepEqual(getOfferTranslation(offer, 'de'), {
    title: 'Deutscher Titel',
    description: 'Deutsche Beschreibung',
    requirements: ['Deutsche Voraussetzung'],
    proofInstructions: 'Deutscher Nachweis',
  });
  assert.deepEqual(getOfferTranslation(offer, 'en'), {
    title: 'English title',
    description: 'English description',
    requirements: ['English requirement'],
    proofInstructions: 'English proof',
  });
});

test('an untranslated non-English locale returns an empty state instead of English offer text', async () => {
  const { getOfferTranslation } = await loadOfferTranslations();

  assert.deepEqual(
    getOfferTranslation({ title: 'English title', description: 'English description' }, 'fr'),
    { title: '', description: '', requirements: [], proofInstructions: '' }
  );
});

test('goal lookup also uses field-level fallback without borrowing English fields', async () => {
  const { getGoalTranslation } = await loadOfferTranslations();

  assert.deepEqual(
    getGoalTranslation({
      label: 'Deposit',
      description: 'English goal description',
      translations: { de: { label: 'Einzahlung' } },
    }, 'de'),
    { label: 'Einzahlung', description: '' }
  );
});

test('missing goal labels use the selected locale missing-state text for German, French and Urdu', async () => {
  const { formatGoalLabel } = await loadOfferGoalDisplay();
  const messages = {
    de: require(path.join(repoRoot, 'frontend/src/i18n/de.json')),
    fr: require(path.join(repoRoot, 'frontend/src/i18n/fr.json')),
    ur: require(path.join(repoRoot, 'frontend/src/i18n/ur.json')),
  };

  for (const locale of ['de', 'fr', 'ur']) {
    assert.equal(
      formatGoalLabel(
        { goalKey: 'fight_20_battles', label: 'English only label' },
        locale,
        messages[locale].offers.missingGoalLabel
      ),
      messages[locale].offers.missingGoalLabel
    );
  }

  assert.equal(
    formatGoalLabel({ goalKey: 'fight_20_battles', label: 'English only label' }, 'en'),
    'English only label'
  );
});

test('translated goal labels still win over the localized missing state', async () => {
  const { formatGoalLabel } = await loadOfferGoalDisplay();
  const messages = {
    de: require(path.join(repoRoot, 'frontend/src/i18n/de.json')),
    fr: require(path.join(repoRoot, 'frontend/src/i18n/fr.json')),
    ur: require(path.join(repoRoot, 'frontend/src/i18n/ur.json')),
  };

  const labels = { de: '20 Kämpfe', fr: '20 combats', ur: '20 لڑائیاں' };
  for (const locale of ['de', 'fr', 'ur']) {
    assert.equal(
      formatGoalLabel(
        { goalKey: 'fight_20_battles', label: 'English only label', translations: { [locale]: { label: labels[locale] } } },
        locale,
        messages[locale].offers.missingGoalLabel
      ),
      labels[locale]
    );
  }
});

// ─── Component integration ───────────────────────────────────────────────────

test('DirectOfferCard uses localized offer text without unconditional English fallbacks', () => {
  const card = compact(read('frontend/src/components/offers/DirectOfferCard.jsx'));

  assert.match(card, /getOfferTranslation\(offer,language\)/);
  assert.match(card, /getOfferTranslation\(offer,selectedLanguage\)/);
  assert.doesNotMatch(card, /offerText\.title\|\|offer\.title/);
  assert.doesNotMatch(card, /offerText\.description\|\|offer\.description/);
  assert.doesNotMatch(card, /offerText\.requirements\|\|offer\.requirements/);
  assert.match(card, /offers\.translationUnavailable/);

  // All modal headings/instructions/status text come from i18n.
  assert.match(card, /formatGoalRequirement\(goal,selectedLanguage,t\)/);
  assert.match(card, /t\('offers\.goalRewardInstruction'/);
  assert.match(card, /t\('offers\.missingGoalLabel'\)/);
  assert.match(card, /t\('offers\.requirements'\)/);
  assert.match(card, /t\('offers\.generalRules'\)/);
  assert.match(card, /t\('offers\.proofInstructions'\)/);
  assert.match(card, /t\('offers\.statusInProgress'\)/);
  assert.doesNotMatch(card, /isDe/);
  assert.doesNotMatch(card, /'Proof Instructions'/);
  assert.doesNotMatch(card, /'General Offer Rules'/);
  assert.doesNotMatch(card, /'Offer Expired'/);
  assert.doesNotMatch(card, /'Click limit reached'/);
});

test('direct-offer modal translations exist and differ from English for German, French and Urdu', () => {
  const english = require(path.join(repoRoot, 'frontend/src/i18n/en.json'));
  const messages = {
    de: require(path.join(repoRoot, 'frontend/src/i18n/de.json')),
    fr: require(path.join(repoRoot, 'frontend/src/i18n/fr.json')),
    ur: require(path.join(repoRoot, 'frontend/src/i18n/ur.json')),
  };
  const requiredKeys = [
    'requirements',
    'generalRules',
    'goalRewardInstruction',
    'missingGoalLabel',
    'proofInstructions',
    'proofPending',
    'offerApproved',
    'statusRejected',
    'clickLimitReached',
    'clickIdLabel',
    'actionCouldNotStart',
    'rule1',
    'rule6',
  ];

  for (const locale of ['de', 'fr', 'ur']) {
    for (const key of requiredKeys) {
      assert.equal(typeof messages[locale].offers[key], 'string', `${locale} is missing offers.${key}`);
      assert.ok(messages[locale].offers[key].trim(), `${locale}.offers.${key} is empty`);
    }
    for (const key of ['requirements', 'generalRules', 'goalRewardInstruction', 'missingGoalLabel', 'proofInstructions', 'proofPending', 'offerApproved', 'statusRejected', 'clickLimitReached', 'clickIdLabel', 'actionCouldNotStart']) {
      assert.notEqual(messages[locale].offers[key], english.offers[key], `${locale}.offers.${key} must not reuse English`);
    }
    assert.match(messages[locale].offers.goalRewardInstruction, /\{\{label\}\}/);
    assert.match(messages[locale].offers.goalRewardInstruction, /\{\{coins\}\}/);
  }
});

test('coin amounts use the active locale for English, German, French and Urdu', async () => {
  const { formatOfferAmount, resolveNumberLocale } = await loadOfferNumberFormat();
  const value = 1250000;

  assert.equal(formatOfferAmount(value, 'en'), '1,250,000');
  assert.equal(formatOfferAmount(value, 'de'), '1.250.000');
  assert.equal(formatOfferAmount(value, 'fr').replace(/\s/g, ' '), '1 250 000');
  assert.equal(formatOfferAmount(value, 'ur'), value.toLocaleString('ur'));

  // Region variants use their base language; unsupported values fall back safely.
  assert.equal(resolveNumberLocale('de-DE'), 'de');
  assert.equal(resolveNumberLocale('ur-PK'), 'ur');
  assert.equal(resolveNumberLocale('es'), 'en');
  assert.equal(formatOfferAmount(value, 'de-DE'), value.toLocaleString('de'));
  assert.equal(formatOfferAmount('1250000', 'fr').replace(/\s/g, ' '), '1 250 000');
  assert.equal(formatOfferAmount(value, 'not-a-locale'), '1,250,000');
  assert.equal(formatOfferAmount(Number.NaN, 'en'), '0');
});

test('DirectOfferCard formats goal rewards and totals with the active locale', () => {
  const card = compact(read('frontend/src/components/offers/DirectOfferCard.jsx'));

  assert.match(card, /formatOfferAmount\(goal\.rewardAmount,language\)/);
  assert.match(card, /formatOfferAmount\(rewardVal,language\)/);
  assert.match(card, /formatOfferAmount\(rewardVal,selectedLanguage\)/);
  assert.doesNotMatch(card, /toLocaleString\('de-DE'\)/);
  assert.doesNotMatch(card, /de-DE/);
});

test('admin save uses one deliberate text payload and no duplicate requirements keys', () => {
  const admin = read('frontend/src/pages/admin/AdminDirectOffers.jsx');

  assert.match(admin, /buildDirectOfferTextPayload\(\{\s*form,\s*translations\s*\}\)/);
  const bodyStart = admin.indexOf('body: JSON.stringify({');
  const bodyEnd = admin.indexOf('const data = await res.json();', bodyStart);
  assert.ok(bodyStart > -1 && bodyEnd > bodyStart);
  const body = admin.slice(bodyStart, bodyEnd);
  assert.doesNotMatch(body, /\brequirements\s*:/);
  assert.doesNotMatch(body, /\brequirementsDe\s*:/);
});

test('Goodpicks component keeps its existing selected-language fallbacks', () => {
  const goodpicks = compact(read('frontend/src/components/offers/GoodpicksModal.jsx'));

  assert.match(goodpicks, /i18n\.language\?\.startsWith\('de'\)/);
  assert.match(goodpicks, /isDe&&offer\.titleDe\)?\?offer\.titleDe:offer\.title/);
  assert.match(goodpicks, /isDe&&offer\.descriptionDe\)?\?offer\.descriptionDe/);
  assert.match(goodpicks, /isDe&&Array\.isArray\(offer\?\.requirementsDe\)&&offer\.requirementsDe\.length>0\)?\?offer\.requirementsDe:\(?offer\.requirements/);
});

test('English mode never prefers German and admin exposes manual EN/DE fields', () => {
  const goodpicks = compact(read('frontend/src/components/offers/GoodpicksModal.jsx'));
  const gatedTitle = (goodpicks.match(/isDe&&offer\.titleDe\)?\?offer\.titleDe:offer\.title/g) || []).length;
  const anyTitle = (goodpicks.match(/offer\.titleDe\)?\?offer\.titleDe:offer\.title/g) || []).length;
  assert.ok(anyTitle > 0, 'Goodpicks must select DE title');
  assert.equal(gatedTitle, anyTitle, 'Goodpicks: all DE title selections must be isDe-gated');
  assert.match(goodpicks, /isDe&&/);

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
