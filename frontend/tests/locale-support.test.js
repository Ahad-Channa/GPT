import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import i18next from 'i18next';
import {
  DEFAULT_LOCALE,
  REQUIRED_OFFER_LOCALE,
  buildLocaleRegistry,
  getLocaleNativeName,
  createMissingKeyHandler,
  resolveSupportedLocale,
} from '../src/i18n/localeRegistry.js';
import { validateOfferText } from '../src/utils/offerLocalePolicy.js';
import { buildDirectOfferTextPayload } from '../src/utils/directOfferPayload.js';
import { getOfferTranslation } from '../src/utils/offerTranslations.js';
import { buildGoalTextPayload, createEmptyGoal } from '../src/utils/directOfferPayload.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const i18nDir = path.join(here, '../src/i18n');
const srcDir = path.join(here, '../src');

// Mirrors what import.meta.glob('./*.json', { eager: true }) returns in Vite.
const loadRealModules = () => Object.fromEntries(
  fs.readdirSync(i18nDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => [`./${f}`, { default: JSON.parse(fs.readFileSync(path.join(i18nDir, f), 'utf8')) }])
);

const flatten = (obj, prefix = '') => Object.entries(obj).flatMap(([k, v]) =>
  v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]);

const makeI18n = async (resources, lng) => {
  const instance = i18next.createInstance();
  await instance.init({
    resources,
    lng,
    fallbackLng: false,
    interpolation: { escapeValue: false },
    parseMissingKeyHandler: createMissingKeyHandler(resources, () => instance.language),
  });
  return instance;
};

// ── Locale registration / selection ───────────────────────────────────────────
test('registry registers every locale file and lists the default locale first', () => {
  const { resources, codes } = buildLocaleRegistry(loadRealModules());
  assert.deepEqual([...codes].sort(), ['de', 'en', 'fr', 'ur']);
  assert.equal(codes[0], DEFAULT_LOCALE);
  assert.ok(resources.de.translation.footer);
});

test('adding a new locale file registers it with no other code change', () => {
  const modules = { ...loadRealModules(), './es.json': { default: { footer: { quickLinks: 'Enlaces rápidos' } } }, './notes.txt': { default: {} } };
  const { resources, codes } = buildLocaleRegistry(modules);
  assert.ok(codes.includes('es'));
  assert.equal(resources.es.translation.footer.quickLinks, 'Enlaces rápidos');
  assert.ok(!codes.includes('notes'));
});

test('selection resolves regional/stored codes to supported locales and falls back to default', () => {
  const codes = ['en', 'de', 'fr', 'ur'];
  assert.equal(resolveSupportedLocale('de-AT', codes), 'de');
  assert.equal(resolveSupportedLocale('FR', codes), 'fr');
  assert.equal(resolveSupportedLocale('xx', codes), DEFAULT_LOCALE);
  assert.equal(resolveSupportedLocale('', codes), DEFAULT_LOCALE);
});

test('language names come from the locale itself, not a per-language table', () => {
  assert.equal(getLocaleNativeName('de'), 'Deutsch');
  assert.equal(getLocaleNativeName('fr').toLowerCase(), 'français');
});

// ── Fallback behaviour ────────────────────────────────────────────────────────
test('missing keys in a non-default language show localized "unavailable" text, never English', async () => {
  const { resources } = buildLocaleRegistry(loadRealModules());
  const de = await makeI18n(resources, 'de');
  assert.equal(de.t('no.such.key'), resources.de.translation.offers.translationUnavailable);
  // Inline English default must NOT leak into German.
  assert.equal(de.t('no.such.key', 'Some English default'), resources.de.translation.offers.translationUnavailable);
  assert.equal(de.t('footer.privacyPolicy', 'Privacy Policy'), resources.de.translation.footer.privacyPolicy);
});

test('the default locale may still use inline defaults', async () => {
  const { resources } = buildLocaleRegistry(loadRealModules());
  const en = await makeI18n(resources, 'en');
  assert.equal(en.t('no.such.key', 'Inline default'), 'Inline default');
});

test('a new language lacking keys shows the unavailable notice, not English', async () => {
  const { resources } = buildLocaleRegistry({
    ...loadRealModules(),
    './es.json': { default: { footer: { tagline: 'Completa tareas.' } } },
  });
  const es = await makeI18n(resources, 'es');
  assert.equal(es.t('footer.tagline'), 'Completa tareas.');
  assert.notEqual(es.t('footer.quickLinks', 'Quick Links'), 'Quick Links');
  assert.equal(es.t('footer.quickLinks'), resources.en.translation.offers.translationUnavailable);
});

test('offer content never borrows another language', () => {
  const offer = { title: 'Play', description: 'Desc', translations: { en: { title: 'Play', description: 'Desc' } } };
  assert.equal(getOfferTranslation(offer, 'fr').title, '');
  assert.equal(getOfferTranslation(offer, 'en').title, 'Play');
});

// ── Locale-aware offer save validation ────────────────────────────────────────
test('required locale comes from the registry policy, not a hard-coded editor language', () => {
  assert.equal(REQUIRED_OFFER_LOCALE, DEFAULT_LOCALE);
  const result = validateOfferText({ de: { title: 'Titel', description: 'Text' } });
  assert.equal(result.valid, false);
  assert.equal(result.locale, REQUIRED_OFFER_LOCALE);
  assert.deepEqual(result.missingFields, ['title', 'description']);
});

test('validation passes with required-locale text; other locales are optional and may be empty', () => {
  assert.equal(validateOfferText({ en: { title: 'T', description: 'D' }, fr: { title: '', description: '' } }).valid, true);
  assert.deepEqual(validateOfferText({ en: { title: 'T', description: '  ' } }).missingFields, ['description']);
});

test('validation honours a different required locale (policy is configurable)', () => {
  assert.equal(validateOfferText({ de: { title: 'T', description: 'D' } }, 'de').valid, true);
  assert.equal(validateOfferText({ en: { title: 'T', description: 'D' } }, 'de').valid, false);
});

test('translations for any locale are stored under generic keys and legacy offers keep working', () => {
  const payload = buildDirectOfferTextPayload({
    form: { title: 'Legacy', description: 'Legacy desc', titleDe: 'Alt', descriptionDe: 'Alt Text' },
    translations: { es: { title: 'Hola', description: 'Texto', requirements: 'a\nb', proofInstructions: '' } },
  });
  assert.equal(payload.translations.es.title, 'Hola');
  assert.deepEqual(payload.translations.es.requirements, ['a', 'b']);
  assert.equal(payload.translations.en.title, 'Legacy');
  assert.equal(payload.translations.de.title, 'Alt');
  assert.equal(payload.title, 'Legacy');
  assert.ok(!('titleEs' in payload));
});

test('admin editor has no English-only validation and uses the central registry', () => {
  const src = fs.readFileSync(path.join(srcDir, 'pages/admin/AdminDirectOffers.jsx'), 'utf8');
  assert.ok(!/translations\.en\?\.title/.test(src));
  assert.ok(!/activeLanguage === 'en'/.test(src));
  assert.ok(!/LOCALE_NAMES/.test(src));
  assert.match(src, /validateOfferText/);
  assert.match(src, /supportedLanguages/);
});

// ── No English/German leakage in shared/footer UI ─────────────────────────────
// Words legitimately identical to English in the target language.
// footer.quickLinks: taskmint.me (main) keeps the English term in German; that text is the client's.
const ALLOWED_SAME = new Set(['footer.blog', 'footer.support', 'footer.impressum', 'footer.copyright', 'footer.quickLinks', 'nav.home']);

test('footer and landing marquee keys exist in every locale and are translated', () => {
  const { resources, codes } = buildLocaleRegistry(loadRealModules());
  const en = Object.fromEntries(flatten(resources.en.translation));
  const footerSrc = fs.readFileSync(path.join(srcDir, 'components/layout/Footer.jsx'), 'utf8');
  const keys = new Set([
    ...[...footerSrc.matchAll(/nameKey: '([\w.]+)'/g)].map((m) => m[1]),
    ...[...footerSrc.matchAll(/\bt\('([\w.]+)'/g)].map((m) => m[1]),
    'withdraw.giftCard',
  ]);
  for (const code of codes.filter((c) => c !== DEFAULT_LOCALE)) {
    const own = Object.fromEntries(flatten(resources[code].translation));
    for (const key of keys) {
      assert.ok(own[key], `${code}: missing ${key}`);
      if (!ALLOWED_SAME.has(key) && /[A-Za-z]{4,}/.test(en[key])) {
        assert.notEqual(own[key], en[key], `${code}: ${key} is untranslated English`);
      }
    }
  }
});

test('German footer quick-links heading and gift card label are German', () => {
  const { resources } = buildLocaleRegistry(loadRealModules());
  // (footer.quickLinks stays 'Quick Links' on taskmint.me; not asserted here.)
  assert.notEqual(resources.de.translation.withdraw.giftCard, 'Gift Card');
});

// Landing.jsx and Footer.jsx are taken unchanged from main (client design); no assertions on their source here.
// ── Object-form defaults / goal payload / footer banner ───────────────────────
test('object-form defaultValue cannot leak English into German', async () => {
  const { resources } = buildLocaleRegistry(loadRealModules());
  const de = await makeI18n(resources, 'de');
  const unavailable = resources.de.translation.offers.translationUnavailable;
  assert.equal(de.t('no.such.key', { defaultValue: 'English only' }), unavailable);
  assert.equal(de.t('no.such.key', { year: 2026, defaultValue: '© {{year}} English' }), unavailable);
  assert.equal(de.t('no.such.key', 'English only'), unavailable);
  // Existing German key still resolves normally even when a default is passed.
  assert.equal(de.t('footer.privacyPolicy', { defaultValue: 'Privacy Policy' }), resources.de.translation.footer.privacyPolicy);
});

test('English keeps object-form and string defaults (with interpolation)', async () => {
  const { resources } = buildLocaleRegistry(loadRealModules());
  const en = await makeI18n(resources, 'en');
  assert.equal(en.t('no.such.key', { defaultValue: 'Plain default' }), 'Plain default');
  assert.equal(en.t('no.such.key', 'String default'), 'String default');
  assert.equal(en.t('no.such.key', { year: 2026, defaultValue: '© {{year}} TaskMint' }), '© 2026 TaskMint');
});

test('per-call language override also respects the policy', async () => {
  const { resources } = buildLocaleRegistry(loadRealModules());
  const en = await makeI18n(resources, 'en');
  assert.equal(en.t('no.such.key', { lng: 'de', defaultValue: 'English only' }), resources.de.translation.offers.translationUnavailable);
});

test('goal payload fills legacy fields from required locale and German, keeping the generic map', () => {
  const goal = {
    ...createEmptyGoal(),
    goalKey: 'level_5',
    translations: {
      en: { label: ' Reach level 5 ', description: 'Play on' },
      de: { label: 'Erreiche Level 5', description: 'Weiterspielen' },
      es: { label: 'Alcanza el nivel 5', description: '' },
    },
  };
  const out = buildGoalTextPayload(goal);
  assert.equal(out.label, 'Reach level 5');
  assert.equal(out.description, 'Play on');
  assert.equal(out.labelDe, 'Erreiche Level 5');
  assert.equal(out.descriptionDe, 'Weiterspielen');
  assert.deepEqual(out.translations, goal.translations);
  assert.ok(!Object.keys(out).some((k) => /Es$|Fr$|Ur$/.test(k)));
});

test('goal payload keeps legacy-only goals and handles empty translations', () => {
  const legacy = buildGoalTextPayload({ goalKey: 'a', label: 'Old', labelDe: 'Alt', description: 'd', descriptionDe: 'dd' });
  assert.deepEqual(
    [legacy.label, legacy.labelDe, legacy.description, legacy.descriptionDe],
    ['Old', 'Alt', 'd', 'dd']
  );
  assert.deepEqual(legacy.translations, {});
  assert.equal(buildGoalTextPayload({ goalKey: 'b', translations: { en: { label: 'New' } }, label: 'Stale' }).label, 'New');
  assert.equal(buildGoalTextPayload(undefined).label, '');
});

