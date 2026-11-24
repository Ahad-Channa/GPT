import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fitWithin, validateImageFile, MAX_IMAGE_FILE_BYTES } from '../src/utils/imageUpload.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const form = fs.readFileSync(path.join(root, 'src', 'pages', 'admin', 'AdminDirectOffers.jsx'), 'utf8');

test('direct offer form: emoji picker and cover URL field are gone, an upload control replaces them', () => {
  assert.doesNotMatch(form, /PRESET_ICONS/);
  assert.doesNotMatch(form, /Icon \/ Emoji/);
  assert.doesNotMatch(form, /Cover Image URL/);
  assert.doesNotMatch(form, /image URL/);
  assert.match(form, /type="file"/);
  assert.match(form, /readImageAsDataUrl/);
  assert.match(form, /Remove image/);
});

test('validateImageFile accepts images and rejects other types or oversized files', () => {
  assert.equal(validateImageFile({ type: 'image/png', size: 1000 }), '');
  assert.equal(validateImageFile({ type: 'image/webp', size: MAX_IMAGE_FILE_BYTES }), '');
  assert.match(validateImageFile({ type: 'application/pdf', size: 10 }), /PNG, JPG, WebP or GIF/);
  assert.match(validateImageFile({ type: 'image/svg+xml', size: 10 }), /PNG, JPG, WebP or GIF/);
  assert.match(validateImageFile({ type: 'image/png', size: MAX_IMAGE_FILE_BYTES + 1 }), /5 MB/);
  assert.ok(validateImageFile(null));
});

test('fitWithin shrinks the longest side to the limit and keeps the aspect ratio', () => {
  assert.deepEqual(fitWithin(1600, 800, 800), { width: 800, height: 400 });
  assert.deepEqual(fitWithin(500, 2000, 800), { width: 200, height: 800 });
  assert.deepEqual(fitWithin(300, 200, 800), { width: 300, height: 200 });
});

test('step label editor keeps typed spaces (no trimming while typing)', async () => {
  const { getGoalEditorText, getGoalTranslation } = await import('../src/utils/offerTranslations.js');
  const goal = { goalKey: 'g', translations: { es: { label: 'Deposit ', description: ' ' } } };
  assert.equal(getGoalTranslation(goal, 'es').label, 'Deposit'); // display text is trimmed
  assert.equal(getGoalEditorText(goal, 'es').label, 'Deposit '); // editor input is not
  assert.equal(getGoalEditorText(goal, 'es').description, ' ');
  assert.equal(getGoalEditorText({ translations: { es: { label: '' } }, label: 'Fallback' }, 'es').label, '');
  assert.equal(getGoalEditorText({ label: 'Legacy ' }, 'en').label, 'Legacy ');
  const src = fs.readFileSync(path.join(root, 'src', 'pages', 'admin', 'AdminDirectOffers.jsx'), 'utf8');
  assert.match(src, /value=\{getGoalEditorText\(goal, activeLanguage\)\.label\}/);
});

test('each multi-step goal shows a user preview built with the real user-side formatter', () => {
  const src = fs.readFileSync(path.join(root, 'src', 'pages', 'admin', 'AdminDirectOffers.jsx'), 'utf8');
  assert.match(src, /data-testid="step-preview"/);
  assert.match(src, /formatGoalRewardInstruction\(\{ \.\.\.goal, rewardAmount: Number\(goal\.rewardAmount\) \|\| 0 \}, activeLanguage, i18n\.getFixedT\(activeLanguage\)\)/);
  assert.match(src, /users see the English text/);
});

test('profile recent-activity amounts and dates share one right edge', () => {
  const src = fs.readFileSync(path.join(root, 'src', 'components', 'PublicProfileModal.jsx'), 'utf8');
  const marker = src.indexOf('Right: Combined layout height 31px');
  assert.ok(marker > 0);
  const block = src.slice(marker, marker + 600);
  assert.match(block, /alignItems: 'flex-end'/);
  assert.doesNotMatch(block, /alignItems: 'flex-start'/);
});
