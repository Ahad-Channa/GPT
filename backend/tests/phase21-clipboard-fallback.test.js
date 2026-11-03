const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const clipboardUrl = pathToFileURL(path.join(repoRoot, 'frontend/src/utils/clipboard.js')).href;
const loadClipboard = () => import(clipboardUrl);

const makeFakeDoc = ({ execResult = true, execThrows = false } = {}) => {
  const appended = [];
  const textarea = {
    value: '',
    style: {},
    attrs: {},
    focused: false,
    selected: false,
    setAttribute(key, value) { this.attrs[key] = value; },
    focus() { this.focused = true; },
    select() { this.selected = true; },
  };
  const doc = {
    textarea,
    appended,
    lastCommand: null,
    createElement() { return textarea; },
    body: {
      appendChild(el) { appended.push(el); },
      removeChild(el) { const i = appended.indexOf(el); if (i >= 0) appended.splice(i, 1); },
    },
    execCommand(command) {
      this.lastCommand = command;
      if (execThrows) throw new Error('exec failed');
      return execResult;
    },
  };
  return doc;
};

const FULL_CLICK_ID = 'Ec2sBUgUeYLrFdKSzGQRTnByo6rYQByQ';

test('uses the async Clipboard API when available (secure context)', async () => {
  const { writeClipboardText } = await loadClipboard();
  const calls = [];
  const nav = { clipboard: { writeText: async (t) => { calls.push(t); } } };
  const doc = makeFakeDoc();

  const ok = await writeClipboardText(FULL_CLICK_ID, { nav, doc });
  assert.equal(ok, true);
  assert.deepEqual(calls, [FULL_CLICK_ID]);
  assert.equal(doc.lastCommand, null, 'fallback must not run when the modern API succeeds');
});

test('non-secure HTTP environment (no navigator.clipboard) falls back to textarea/execCommand', async () => {
  const { writeClipboardText } = await loadClipboard();
  const nav = {}; // e.g. HTTP staging: navigator.clipboard is undefined
  const doc = makeFakeDoc({ execResult: true });

  const ok = await writeClipboardText(FULL_CLICK_ID, { nav, doc });
  assert.equal(ok, true);
  assert.equal(doc.textarea.value, FULL_CLICK_ID, 'full click ID must be copied unchanged');
  assert.equal(doc.textarea.attrs.readonly, '');
  assert.equal(doc.textarea.selected, true);
  assert.equal(doc.lastCommand, 'copy');
  assert.equal(doc.appended.length, 0, 'temporary textarea must be removed');
});

test('clipboard.writeText rejection (permissions/insecure) falls back instead of failing', async () => {
  const { writeClipboardText } = await loadClipboard();
  const nav = { clipboard: { writeText: async () => { throw new Error('NotAllowedError'); } } };
  const doc = makeFakeDoc({ execResult: true });

  const ok = await writeClipboardText(FULL_CLICK_ID, { nav, doc });
  assert.equal(ok, true);
  assert.equal(doc.lastCommand, 'copy');
  assert.equal(doc.textarea.value, FULL_CLICK_ID);
});

test('genuine copy failure rejects (error is surfaced, not swallowed)', async () => {
  const { writeClipboardText } = await loadClipboard();
  const nav = { clipboard: { writeText: async () => { throw new Error('denied'); } } };
  const doc = makeFakeDoc({ execResult: false });

  await assert.rejects(() => writeClipboardText(FULL_CLICK_ID, { nav, doc }), /Copy failed/);
  assert.equal(doc.appended.length, 0, 'textarea cleaned up even on failure');
});

test('empty or null values are rejected, never silently copied', async () => {
  const { writeClipboardText } = await loadClipboard();
  await assert.rejects(() => writeClipboardText('', { nav: {}, doc: makeFakeDoc() }), /Nothing to copy/);
  await assert.rejects(() => writeClipboardText(null, { nav: {}, doc: makeFakeDoc() }), /Nothing to copy/);
  await assert.rejects(() => writeClipboardText(undefined, { nav: {}, doc: makeFakeDoc() }), /Nothing to copy/);
});

test('no document available rejects with a clear error', async () => {
  const { writeClipboardText } = await loadClipboard();
  // Node has no global document, so the helper cannot use the fallback path.
  await assert.rejects(() => writeClipboardText(FULL_CLICK_ID, { nav: {} }), /not available/);
});

test('AdminDirectOffers reuses the shared helper and shows success/error feedback', () => {
  const source = read('frontend/src/pages/admin/AdminDirectOffers.jsx');
  assert.match(source, /import \{ writeClipboardText \} from '\.\.\/\.\.\/utils\/clipboard'/);
  assert.doesNotMatch(source, /navigator\.clipboard\.writeText/, 'must not call the Clipboard API directly');
  assert.match(source, /await writeClipboardText\(clickId\)/);
  assert.match(source, /setCopiedClickId\(clickId\)/);
  assert.match(source, /Could not copy this Click ID automatically/);
  assert.match(source, /copyError/);
});
