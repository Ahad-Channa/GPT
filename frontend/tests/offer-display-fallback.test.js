import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getOfferTranslation, getOfferDisplayText, getGoalTranslation, getGoalDisplayText } from '../src/utils/offerTranslations.js';
import { formatGoalLabel } from '../src/utils/offerGoalDisplay.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const englishOnly = {
  title: 'click limit test', description: 'test the click limits', requirements: ['Do the thing'], proofInstructions: 'Send a screenshot',
};

test('German user sees the English title, description, requirements and proof instructions when German is missing', () => {
  const text = getOfferDisplayText(englishOnly, 'de');
  assert.equal(text.title, 'click limit test');
  assert.equal(text.description, 'test the click limits');
  assert.deepEqual(text.requirements, ['Do the thing']);
  assert.equal(text.proofInstructions, 'Send a screenshot');
});

test('German text wins when it exists, field by field (a missing German field falls back alone)', () => {
  const offer = { ...englishOnly, titleDe: 'klicks testen', descriptionDe: '' };
  const text = getOfferDisplayText(offer, 'de-DE');
  assert.equal(text.title, 'klicks testen');
  assert.equal(text.description, 'test the click limits');
});

test('translations map is honoured, and English is the fallback for any other locale too', () => {
  const offer = { ...englishOnly, translations: { fr: { title: 'test des clics' } } };
  assert.equal(getOfferDisplayText(offer, 'fr').title, 'test des clics');
  assert.equal(getOfferDisplayText(offer, 'ur').title, 'click limit test');
  assert.equal(getOfferDisplayText(offer, 'en').title, 'click limit test');
});

test('the strict resolvers are unchanged: the admin editor still sees an empty German field', () => {
  assert.equal(getOfferTranslation(englishOnly, 'de').title, '');
  assert.equal(getGoalTranslation({ label: 'Deposit' }, 'de').label, '');
});

test('goal labels fall back to English for German, and a German label still wins', () => {
  assert.equal(getGoalDisplayText({ label: 'Deposit' }, 'de').label, 'Deposit');
  assert.equal(formatGoalLabel({ goalKey: 'deposit_50', label: 'Deposit 50 EUR' }, 'de', 'Label fehlt'), 'Deposit 50 €');
  assert.equal(formatGoalLabel({ goalKey: 'deposit_50', label: 'Deposit 50 EUR', labelDe: '50 EUR einzahlen' }, 'de'), '50 € einzahlen');
  // nothing in either language: still the localized "missing" text
  assert.equal(formatGoalLabel({ goalKey: '', label: '' }, 'de', 'Label fehlt'), 'Label fehlt');
});

test('user-facing screens use the fallback resolver; only the admin editor stays strict', () => {
  assert.match(read('src/components/offers/DirectOfferCard.jsx'), /getOfferDisplayText\(offer, language\)/);
  assert.match(read('src/components/offers/DirectOfferCard.jsx'), /getOfferDisplayText\(offer, selectedLanguage\)/);
  assert.match(read('src/pages/Profile.jsx'), /getOfferDisplayText\(offer,/);
  assert.match(read('src/utils/manualOfferState.js'), /getOfferDisplayText\(offer, language\)\.proofInstructions/);
  assert.doesNotMatch(read('src/pages/admin/AdminDirectOffers.jsx'), /getOfferDisplayText|getGoalDisplayText/);
});
