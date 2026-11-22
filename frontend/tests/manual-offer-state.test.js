import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import i18next from 'i18next';
import { getProofInstructionsView, hasManualOfferStarted, resolveProofInstructions } from '../src/utils/manualOfferState.js';

test('manual proof stays available after reopening from server submission state', () => {
  assert.equal(hasManualOfferStarted({ submissionStatus: 'started' }), true);
  assert.equal(hasManualOfferStarted({ submissionStatus: 'rejected' }), true);
  assert.equal(hasManualOfferStarted({ submissionStatus: 'pending' }), false);
  assert.equal(hasManualOfferStarted({ submissionStatus: 'approved' }), false);
});

test('legacy clicked manual offer can be started again', () => {
  assert.equal(hasManualOfferStarted({ clickStatus: 'clicked' }), true);
  assert.equal(hasManualOfferStarted({ clickStatus: null }), false);
});

test('proof instructions: the selected language wins, otherwise the required English text is shown', () => {
  const offer = { proofInstructions: 'Send proof to support.', proofInstructionsDe: 'Senden Sie den Nachweis.' };
  assert.equal(resolveProofInstructions(offer, 'en'), 'Send proof to support.');
  assert.equal(resolveProofInstructions(offer, 'en-US'), 'Send proof to support.');
  assert.equal(resolveProofInstructions(offer, 'de'), 'Senden Sie den Nachweis.');
  assert.equal(resolveProofInstructions({ proofInstructions: 'English only' }, 'de'), 'English only');
});

const loadLocale = (code) => JSON.parse(fs.readFileSync(new URL(`../src/i18n/${code}.json`, import.meta.url), 'utf8'));

test('German user with only English proof instructions sees the English text (no blank area, no notice)', async () => {
  const offer = { proofInstructions: 'Send proof to support.' };
  assert.deepEqual(getProofInstructionsView(offer, 'de'), { text: 'Send proof to support.', unavailable: false });
  assert.deepEqual(getProofInstructionsView(offer, 'en'), { text: 'Send proof to support.', unavailable: false });
  assert.deepEqual(getProofInstructionsView({ translations: { fr: { proofInstructions: 'Preuve' } } }, 'de'), { text: '', unavailable: true });
  // No instructions in any language: nothing to show, nothing to flag.
  assert.deepEqual(getProofInstructionsView({}, 'de'), { text: '', unavailable: false });
  assert.deepEqual(getProofInstructionsView({ proofInstructionsDe: 'Nachweis senden.' }, 'de'), { text: 'Nachweis senden.', unavailable: false });

  const i18n = i18next.createInstance();
  await i18n.init({ lng: 'de', fallbackLng: false, resources: { de: { translation: loadLocale('de') } } });
  assert.equal(i18n.t('offers.translationUnavailable'), 'Übersetzung nicht verfügbar');
  assert.equal(i18n.t('offers.proofInstructions'), 'Nachweis-Anweisungen');
});

test('offer cards render the unavailable notice for manual offers instead of hiding the area', () => {
  for (const file of ['DirectOfferCard.jsx', 'GoodpicksModal.jsx']) {
    const src = fs.readFileSync(new URL(`../src/components/offers/${file}`, import.meta.url), 'utf8');
    assert.match(src, /getProofInstructionsView\(offer, selectedLanguage\)/, file);
    assert.match(src, /proofView\.text \|\| proofView\.unavailable/, file);
    assert.match(src, /proofView\.text \|\| t\('offers\.translationUnavailable'/, file);
  }
});

test('a manual offer started in this session keeps its proof area after the popup is closed and reopened', async () => {
  const { hasManualOfferStarted, rememberManualOfferStarted } = await import('../src/utils/manualOfferState.js');
  const stale = { _id: 'offer-stale', trackingMode: 'manual', submissionStatus: null, clickStatus: null };
  assert.equal(hasManualOfferStarted(stale), false);
  rememberManualOfferStarted('offer-stale');
  assert.equal(hasManualOfferStarted(stale), true, 'stale list data must not hide the proof area');
  // once submitted / approved the upload area is no longer offered
  assert.equal(hasManualOfferStarted({ ...stale, submissionStatus: 'pending' }), false);
  assert.equal(hasManualOfferStarted({ ...stale, submissionStatus: 'approved' }), false);
  assert.equal(hasManualOfferStarted({ ...stale, submissionStatus: 'chargebacked' }), false);
  // other offers are unaffected
  assert.equal(hasManualOfferStarted({ _id: 'other' }), false);
});
