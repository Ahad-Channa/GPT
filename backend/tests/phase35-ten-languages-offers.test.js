// 10 languages for offers and multi-step goals, English fallback everywhere,
// and a goal time label that never mixes languages with the shown offer text.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const repoRoot = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(repoRoot, p), 'utf8').replace(/\r\n/g, '\n');
const load = (p) => import(pathToFileURL(path.join(repoRoot, p)).href);
const LOCALES = ['en', 'de', 'fr', 'es', 'it', 'pl', 'pt', 'ru', 'tr', 'ur'];

const flat = (obj, prefix = '', out = {}) => {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) flat(value, full, out);
    else out[full] = value;
  }
  return out;
};

test('all 10 languages are enabled, have a flag, and a locale file with every English key', async () => {
  const { ENABLED_LOCALE_CODES, LOCALE_FLAGS } = await load('frontend/src/i18n/localeRegistry.js');
  assert.deepEqual([...ENABLED_LOCALE_CODES].sort(), [...LOCALES].sort());
  const en = flat(JSON.parse(read('frontend/src/i18n/en.json')));
  for (const locale of LOCALES) {
    assert.ok(LOCALE_FLAGS[locale], `${locale} has a flag`);
    assert.ok(fs.existsSync(path.join(repoRoot, 'frontend/public', LOCALE_FLAGS[locale])), `${locale} flag file exists`);
    const messages = flat(JSON.parse(read(`frontend/src/i18n/${locale}.json`)));
    // languageToggle.* belongs to the client's own LanguageToggle (it keeps its labels in code); main's
    // locale files do not carry every one of those keys in every language.
    const missing = Object.keys(en).filter((key) => !key.startsWith('languageToggle.') && !(key in messages));
    assert.deepEqual(missing, [], `${locale} is missing keys`);
  }
});

test('existing translations were not overwritten (German still German, key text added only where missing)', () => {
  const de = flat(JSON.parse(read('frontend/src/i18n/de.json')));
  assert.equal(de['goodpicks.completed'], 'Abgeschlossen');
  const es = flat(JSON.parse(read('frontend/src/i18n/es.json')));
  assert.equal(es['nav.home'], 'Inicio');
});

test('step label and description are stored per language for all 10 languages and survive the save payload', async () => {
  const { buildGoalTextPayload } = await load('frontend/src/utils/directOfferPayload.js');
  const { normalizeGoals } = require('../utils/offerGoals');
  const translations = Object.fromEntries(LOCALES.map((l) => [l, { label: `label-${l}`, description: `desc-${l}` }]));
  const payload = buildGoalTextPayload({ goalKey: 'register', translations });
  const [saved] = normalizeGoals([{ goalKey: 'register', rewardAmount: 10, ...payload }]);
  for (const locale of LOCALES) {
    assert.equal(saved.translations[locale].label, `label-${locale}`, locale);
    assert.equal(saved.translations[locale].description, `desc-${locale}`, locale);
  }
});

test('a language with no step text falls back to English; a translated language shows its own text', async () => {
  const { getGoalDisplayText, getOfferDisplayText } = await load('frontend/src/utils/offerTranslations.js');
  const goal = { goalKey: 'register', label: 'Register', translations: { es: { label: 'Registrarse' } } };
  assert.equal(getGoalDisplayText(goal, 'es').label, 'Registrarse');
  assert.equal(getGoalDisplayText(goal, 'it').label, 'Register');
  const offer = { title: 'Game', description: 'Play', translations: { pl: { title: 'Gra', description: 'Graj' } } };
  assert.equal(getOfferDisplayText(offer, 'pl').title, 'Gra');
  assert.equal(getOfferDisplayText(offer, 'tr').title, 'Game');
  assert.equal(getOfferDisplayText(offer, 'tr').description, 'Play');
});

test('days label follows the language of the shown offer text and falls back to English', async () => {
  const { formatGoalTimeLimitText, formatGoalTimeLimit } = await load('frontend/src/utils/goalTimeLimit.js');
  const { getOfferDisplayLocale } = await load('frontend/src/utils/offerTranslations.js');

  assert.equal(formatGoalTimeLimitText(3, 'en'), '3 days');
  assert.equal(formatGoalTimeLimitText(1, 'en'), '1 day');
  assert.equal(formatGoalTimeLimitText(3, 'de'), '3 Tage');
  assert.equal(formatGoalTimeLimitText(1, 'de'), '1 Tag');
  assert.equal(formatGoalTimeLimitText(3, 'es'), '3 días');
  assert.equal(formatGoalTimeLimitText(2, 'ru'), '2 дня');
  assert.equal(formatGoalTimeLimitText(5, 'ru'), '5 дней');
  assert.equal(formatGoalTimeLimitText(21, 'ru'), '21 день');
  assert.equal(formatGoalTimeLimitText(3, 'xx'), '3 days');
  assert.equal(formatGoalTimeLimitText(0, 'de'), null);
  assert.equal(formatGoalTimeLimitText('x', 'de'), null);
  // The original compact formatter used as the "show a badge" guard is unchanged.
  assert.equal(formatGoalTimeLimit(3), '3D');

  // Selected Spanish, but the offer only has English text: days must be English too.
  const englishOnly = { title: 'Game', description: 'Play' };
  assert.equal(getOfferDisplayLocale(englishOnly, 'es'), 'en');
  assert.equal(formatGoalTimeLimitText(3, getOfferDisplayLocale(englishOnly, 'es')), '3 days');
  // Selected Spanish and the offer has Spanish text: Spanish days.
  const withSpanish = { title: 'Game', translations: { es: { title: 'Juego' } } };
  assert.equal(getOfferDisplayLocale(withSpanish, 'es'), 'es');
  assert.equal(formatGoalTimeLimitText(3, getOfferDisplayLocale(withSpanish, 'es')), '3 días');
  assert.equal(getOfferDisplayLocale(withSpanish, 'en'), 'en');
  // German legacy columns count as German text.
  assert.equal(getOfferDisplayLocale({ title: 'A', titleDe: 'B' }, 'de'), 'de');
});

test('Featured and Goodpicks modals use the same display text and localized days label', () => {
  const card = read('frontend/src/components/offers/DirectOfferCard.jsx');
  assert.match(card, /getOfferDisplayLocale\(offer, selectedLanguage\)/);
  assert.match(card, /formatGoalTimeLimitText\(goal\.timeLimitDays, displayLocale\)/);

  const goodpicks = read('frontend/src/components/offers/GoodpicksModal.jsx');
  assert.match(goodpicks, /getOfferDisplayText\(offer, selectedLanguage\)/);
  assert.match(goodpicks, /formatGoalRewardInstruction\(goal, selectedLanguage, t\)/);
  assert.match(goodpicks, /getOfferDisplayText\(item, listLanguage\)/);
  assert.match(goodpicks, /getOfferDisplayText\(offer, listLanguage\)/);
  assert.match(goodpicks, /formatGoalTimeLimitText\(req\.timeLimitDays, displayLocale\)/);
});

test('each multi-step goal has its own language switcher tied to the offer language state', () => {
  const admin = read('frontend/src/pages/admin/AdminDirectOffers.jsx');
  assert.match(admin, /aria-label=\{`Step \$\{idx \+ 1\} language`\}/);
  assert.equal((admin.match(/setActiveLanguage\(e\.target\.value\)/g) || []).length, 2); // top switcher + per-step switcher
  assert.match(admin, /users see the English text/);
});
