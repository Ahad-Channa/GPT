const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const loadRegistry = () => import(pathToFileURL(path.join(repoRoot, 'frontend/src/i18n/localeRegistry.js')).href);
const loadPolicy = () => import(pathToFileURL(path.join(repoRoot, 'frontend/src/utils/offerLocalePolicy.js')).href);
const loadTranslations = () => import(pathToFileURL(path.join(repoRoot, 'frontend/src/utils/offerTranslations.js')).href);
const loadDirectOfferPayload = () => import(pathToFileURL(path.join(repoRoot, 'frontend/src/utils/directOfferPayload.js')).href);

const localeModules = () => ({
  './en.json': { default: { nav: { home: 'Home' } } },
  './de.json': { default: { nav: { home: 'Startseite' } } },
  './fr.json': { default: { nav: { home: 'Accueil' } } },
  './ur.json': { default: { nav: { home: 'ہوم' } } },
});

test('release registry exposes only English and German in dropdowns', async () => {
  const { buildLocaleRegistry, ENABLED_LOCALE_CODES, LOCALE_CONFIG } = await loadRegistry();
  const { codes, allCodes, resources } = buildLocaleRegistry(localeModules());

  assert.deepEqual([...ENABLED_LOCALE_CODES], ['en', 'de']);
  assert.equal(LOCALE_CONFIG.en.enabled, true);
  assert.equal(LOCALE_CONFIG.de.enabled, true);
  assert.equal(LOCALE_CONFIG.fr.enabled, false);
  assert.equal(LOCALE_CONFIG.ur.enabled, false);
  assert.deepEqual(codes, ['en', 'de']);
  assert.ok(resources.en);
  assert.ok(resources.de);
  assert.equal(resources.fr, undefined);
  assert.equal(resources.ur, undefined);
  assert.ok(allCodes.includes('fr'));
  assert.ok(allCodes.includes('ur'));

  const en = require(path.join(repoRoot, 'frontend/src/i18n/en.json'));
  const de = require(path.join(repoRoot, 'frontend/src/i18n/de.json'));
  const actual = buildLocaleRegistry({
    './en.json': { default: en },
    './de.json': { default: de },
    './fr.json': { default: require(path.join(repoRoot, 'frontend/src/i18n/fr.json')) },
    './ur.json': { default: require(path.join(repoRoot, 'frontend/src/i18n/ur.json')) },
  });
  assert.equal(actual.resources.en.translation.nav.home, en.nav.home);
  assert.equal(actual.resources.de.translation.nav.home, de.nav.home);

  const i18nSource = read('frontend/src/i18n/i18n.js');
  assert.match(i18nSource, /buildLocaleRegistry/);
  assert.match(i18nSource, /supportedLngs: supportedLanguageCodes/);

  const toggle = read('frontend/src/components/LanguageToggle.jsx');
  assert.match(toggle, /supportedLanguages\.map/);
  assert.doesNotMatch(toggle, /Object\.keys\(i18n\.options/);

  const admin = read('frontend/src/pages/admin/AdminDirectOffers.jsx');
  assert.match(admin, /supportedLocales = \(\) => supportedLanguages/);
  assert.match(admin, /supportedLocales\(\)\.map/);
});

test('a future locale can be enabled centrally without changing translation logic', async () => {
  const { buildLocaleRegistry, resolveSupportedLocale } = await loadRegistry();
  const modules = localeModules();

  const release = buildLocaleRegistry(modules);
  assert.equal(resolveSupportedLocale('fr', release.codes, 'en'), 'en');
  assert.equal(resolveSupportedLocale('ur-PK', release.codes, 'en'), 'en');

  const future = buildLocaleRegistry(modules, { enabledLocales: ['en', 'de', 'fr'] });
  assert.deepEqual(future.codes, ['en', 'de', 'fr']);
  assert.ok(future.resources.fr);
  assert.equal(future.resources.ur, undefined);

  // French data still works through the generic offer translation lookup even
  // while the locale is disabled in the release registry.
  const { getOfferTranslation } = await loadTranslations();
  assert.deepEqual(
    getOfferTranslation({ translations: { fr: { title: 'Titre', description: 'Description' } } }, 'fr'),
    { title: 'Titre', description: 'Description', requirements: [], proofInstructions: '' }
  );
});

test('English and German offer fields stay separate when switching languages', async () => {
  const { getOfferLocaleText, updateOfferLocaleField } = await loadPolicy();
  let translations = {
    en: { title: 'English title', description: 'English description' },
    de: { title: 'Deutscher Titel', description: 'Deutsche Beschreibung' },
    fr: { title: 'Titre français' },
  };

  // Simulate editing German, then switching back to English and editing it.
  translations = updateOfferLocaleField(translations, 'de', 'title', 'Neuer deutscher Titel');
  translations = updateOfferLocaleField(translations, 'en', 'description', 'Updated English description');

  assert.deepEqual(getOfferLocaleText(translations, 'en'), {
    title: 'English title',
    description: 'Updated English description',
  });
  assert.deepEqual(getOfferLocaleText(translations, 'de'), {
    title: 'Neuer deutscher Titel',
    description: 'Deutsche Beschreibung',
  });
  assert.deepEqual(getOfferLocaleText(translations, 'fr'), { title: 'Titre français' });
});

test('missing German offer text does not fall back to English', async () => {
  const { getOfferTranslation } = await loadTranslations();
  const display = getOfferTranslation({
    title: 'English title',
    description: 'English description',
    proofInstructions: 'English proof',
    translations: { de: { title: 'Deutscher Titel' } },
  }, 'de');

  assert.equal(display.title, 'Deutscher Titel');
  assert.equal(display.description, '');
  assert.equal(display.proofInstructions, '');

  const card = read('frontend/src/components/offers/DirectOfferCard.jsx');
  assert.match(card, /offers\.translationUnavailable/);
  assert.match(card, /description \|\| t\('offers\.translationUnavailable'/);
});

test('inactive French and Urdu offer data survives editor seed and save payloads', async () => {
  const { seedOfferTextTranslations, buildDirectOfferTextPayload } = await loadDirectOfferPayload();
  const fr = {
    title: 'Titre',
    description: 'Description FR',
    requirements: ['Condition FR'],
    proofInstructions: 'Preuve FR',
  };
  const ur = {
    title: 'عنوان',
    description: 'تفصیل',
    requirements: ['شرط'],
    proofInstructions: 'ثبوت',
  };
  const offer = {
    title: 'English legacy title',
    description: 'English legacy description',
    requirements: ['English legacy requirement'],
    titleDe: 'Deutscher Alt-Titel',
    descriptionDe: 'Deutsche Alt-Beschreibung',
    requirementsDe: ['Deutsche Alt-Bedingung'],
    translations: {
      en: { title: 'English title', description: 'English description', requirements: ['English requirement'] },
      de: { title: 'Deutscher Titel', description: 'Deutsche Beschreibung', requirements: ['Deutsche Bedingung'] },
      fr,
      ur,
    },
  };

  const seeded = seedOfferTextTranslations(offer, ['en', 'de']);
  assert.deepEqual(seeded.fr, fr);
  assert.deepEqual(seeded.ur, ur);
  assert.equal(seeded.en.title, 'English title');
  assert.equal(seeded.de.title, 'Deutscher Titel');

  seeded.de.title = 'Neuer deutscher Titel';
  seeded.en.description = 'Updated English description';
  const payload = buildDirectOfferTextPayload({ form: {}, translations: seeded });

  assert.deepEqual(payload.translations.fr, fr);
  assert.deepEqual(payload.translations.ur, ur);
  assert.equal(payload.translations.en.title, 'English title');
  assert.equal(payload.translations.en.description, 'Updated English description');
  assert.equal(payload.translations.de.title, 'Neuer deutscher Titel');
  assert.equal(payload.translations.de.description, 'Deutsche Beschreibung');
});

test('inactive goal translations survive frontend payloads and backend normalization', async () => {
  const { buildGoalTextPayload } = await loadDirectOfferPayload();
  const { normalizeGoals } = require('../utils/offerGoals');

  const translations = {
    en: { label: 'Deposit' },
    de: { label: 'Einzahlung' },
    fr: { label: 'Dépôt' },
    ur: { label: 'جمع' },
  };
  const goal = { goalKey: 'deposit', label: 'Deposit', rewardAmount: 100, translations };

  const payload = buildGoalTextPayload(goal);
  assert.deepEqual(payload.translations.fr, translations.fr);
  assert.deepEqual(payload.translations.ur, translations.ur);

  const [normalized] = normalizeGoals([{
    goalKey: 'deposit',
    rewardAmount: 100,
    translations,
  }]);
  assert.deepEqual(normalized.translations.fr, { label: 'Dépôt', description: '' });
  assert.deepEqual(normalized.translations.ur, { label: 'جمع', description: '' });
});

test('base-language validation and French/Urdu files remain intact', async () => {
  const { validateOfferText } = await loadPolicy();

  assert.equal(validateOfferText({ en: { title: '', description: '' } }).valid, false);
  assert.equal(validateOfferText({ en: { title: 'Title', description: 'Description' } }).valid, true);
  assert.equal(validateOfferText({
    en: { title: 'Title', description: 'Description' },
    de: { title: '', description: '' },
  }).valid, true);

  assert.ok(fs.existsSync(path.join(repoRoot, 'frontend/src/i18n/fr.json')));
  assert.ok(fs.existsSync(path.join(repoRoot, 'frontend/src/i18n/ur.json')));
});
