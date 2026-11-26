import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('Direct offer card: completed offers never reopen the link; partial progress is not called "already credited"', () => {
  const card = read('src/components/offers/DirectOfferCard.jsx');
  const completed = card.indexOf('data.alreadyCompleted');
  const open = card.indexOf('navigateReservedOfferTab(pendingTab, data.url)');
  assert.ok(completed > -1 && open > completed, 'completed branch must run before the tab is navigated');
  assert.match(card, /data\.alreadyCompleted\) \{[\s\S]{0,200}closeReservedOfferTab\(pendingTab\)/);
  assert.match(card, /t\('offers\.actionAlreadyCompleted'\)/);
  // the old behaviour keyed the "already credited" message off clickStatus-derived alreadyApproved
  assert.doesNotMatch(card, /data\.alreadyApproved\s*\?\s*t\('offers\.actionAlreadyCredited'\)/);
});

test('Goodpicks modal: completed offers do not open a window', () => {
  const modal = read('src/components/offers/GoodpicksModal.jsx');
  const completed = modal.indexOf('data.alreadyCompleted');
  const open = modal.indexOf("window.open(data.url, '_blank'");
  assert.ok(completed > -1 && open > completed);
  assert.match(modal, /data\.alreadyCompleted\) \{[\s\S]{0,400}return;/);
});

test('"already completed" copy exists in English and German', () => {
  for (const [lang, text] of [['en', /already completed/i], ['de', /bereits abgeschlossen/i]]) {
    const json = JSON.parse(read(`src/i18n/${lang}.json`));
    assert.match(json.offers.actionAlreadyCompleted, text);
  }
});

test('manual flows also set the submission status when the server says the offer is completed', () => {
  assert.match(read('src/components/offers/DirectOfferCard.jsx'), /data\.alreadyCompleted\) \{[\s\S]{0,300}setSubmissionStatus\(data\.submissionStatus\)/);
  assert.match(read('src/components/offers/GoodpicksModal.jsx'), /data\.alreadyCompleted\) \{[\s\S]{0,300}setSubmissionStatus\(data\.submissionStatus\)/);
});

test('offer modal never shows the internal click ID and has no stretched layout gaps', () => {
  const card = read('src/components/offers/DirectOfferCard.jsx');
  assert.doesNotMatch(card, /clickIdLabel|startedClickId/);
  // Tracked offers use the designer modal, whose frame is content-sized (no fixed height).
  const designer = read('src/components/offers/OfferCards.jsx');
  const from = designer.indexOf("width: '626px'");
  assert.ok(from > -1, 'designer modal frame found');
  const modalStyle = designer.slice(from, designer.indexOf('className="relative shadow-2xl', from));
  assert.doesNotMatch(modalStyle, /justifyContent:\s*'space-between'/);
  assert.doesNotMatch(modalStyle, /687px/);
  assert.doesNotMatch(modalStyle, /[^a-zA-Z]height:\s*'/);
  assert.match(modalStyle, /maxHeight: '92vh'/);
});

test('manual popups: live i18n language, remembered start, secondary start-again, portal image preview', () => {
  for (const file of ['src/components/offers/DirectOfferCard.jsx', 'src/components/offers/GoodpicksModal.jsx']) {
    const src = read(file);
    assert.doesNotMatch(src, /__taskmintCurrentLang/, `${file}: stale window language override`);
    assert.match(src, /const selectedLanguage = i18n\.resolvedLanguage \|\| i18n\.language \|\| 'en'/, file);
    assert.match(src, /rememberManualOfferStarted\(offer\._id\)/, file);
  }
  // Goodpicks keeps its own secondary "start again" button; the Featured popup passes the
  // "Start Offer Again" label to the designer modal's single Start button.
  assert.match(read('src/components/offers/GoodpicksModal.jsx'), /startAgainIsSecondary = isManual && proofStarted/);
  assert.match(read('src/components/offers/DirectOfferCard.jsx'), /isManual && proofStarted \? t\('offers\.startOfferAgain'\)/);
  const proof = read('src/components/offers/ProofUploadView.jsx');
  assert.match(proof, /createPortal\(/);
  assert.match(proof, /document\.body/);
});

test('Featured offer cards never show a progress/status badge: only the coin reward', () => {
  const card = read('src/components/offers/DirectOfferCard.jsx');
  assert.doesNotMatch(card, /getStatusConfig|statusCfg|badgeStatus|getOfferBadgeStatus/);
  assert.doesNotMatch(card, /statusInProgress|statusPending|statusApproved/);
  // The card is the designer's FeaturedOfferCard, which only draws the coin reward.
  assert.match(card, /<FeaturedOfferCard offer=\{withDisplayText\(offer, \{ title \}\)\}/);
  const designer = read('src/components/offers/OfferCards.jsx');
  assert.doesNotMatch(designer, /statusCfg|getOfferBadgeStatus|statusInProgress/);
});

test('starting an offer does not show an "Offer click recorded." banner', () => {
  const card = read('src/components/offers/DirectOfferCard.jsx');
  assert.doesNotMatch(card, /actionClickRecorded/);
  // the completed-offer notice is still shown
  assert.match(card, /t\('offers\.actionAlreadyCompleted'\)/);
});
