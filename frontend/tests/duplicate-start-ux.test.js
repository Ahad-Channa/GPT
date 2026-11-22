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
