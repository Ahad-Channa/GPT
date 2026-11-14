import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { ESLint } from 'eslint';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let outDir;
let editor;

before(async () => {
  outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'offer-editor-smoke-'));
  await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [react()],
    ssr: { noExternal: true },
    // Dummy, non-secret values so importing the app's Firebase config does not throw.
    define: {
      'import.meta.env.VITE_FIREBASE_API_KEY': '"test-key"',
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': '"test.example"',
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': '"test"',
      'import.meta.env.VITE_FIREBASE_APP_ID': '"1:1:web:1"',
    },
    build: {
      ssr: path.join(root, 'tests/helpers/offer-editor-entry.js'),
      outDir,
      emptyOutDir: true,
      rollupOptions: { output: { format: 'esm', entryFileNames: 'entry.mjs' } },
    },
  });
  // Minimal browser stub: some app modules touch `window` at import time.
  globalThis.window ??= {
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    location: { href: 'http://localhost/', origin: 'http://localhost', hostname: 'localhost', protocol: 'http:', search: '', hash: '', pathname: '/' },
  };
  editor = await import(pathToFileURL(path.join(outDir, 'entry.mjs')).href);
}, { timeout: 120000 });

after(() => { if (outDir) fs.rmSync(outDir, { recursive: true, force: true }); });

// React SSR inserts <!-- --> between adjacent text nodes; strip so text can be matched.
const render = (props) => editor.renderToString(editor.createElement(editor.OfferFormModal, {
  adminApi: async () => ({ json: async () => ({}) }),
  onClose() {},
  onSaved() {},
  ...props,
})).replace(/<!-- -->/g, '');

// The old crash: the goal form rendered with >=1 goal threw a ReferenceError
// (getGoalTranslation was not imported). Rendering the state produced by
// "Add Goal" is exactly that path.
const offerWithNewGoal = () => ({
  title: 'T', description: 'D', trackingMode: 'postback',
  goals: [{ ...editor.createEmptyGoal(), goalKey: 'level_5' }],
});

test('Add Goal render path works with English selected', () => {
  const html = render({ offer: offerWithNewGoal(), initialLanguage: 'en' });
  assert.match(html, /Goal #1/);
  assert.match(html, /Step label \(English\)/);
  assert.match(html, /Step description \(English\)/);
});

test('Add Goal render path works with German selected', () => {
  const html = render({ offer: offerWithNewGoal(), initialLanguage: 'de' });
  assert.match(html, /Goal #1/);
  assert.match(html, /Step label \(Deutsch\)/);
  assert.match(html, /Deutsch users see a/);
});

test('new-offer form renders (no goals yet) in both languages', () => {
  assert.match(render({ offer: null, initialLanguage: 'en' }), /Add Goal/);
  assert.match(render({ offer: null, initialLanguage: 'de' }), /Add Goal/);
});

test('editor explains the required base language and optional translations', () => {
  const base = render({ offer: null, initialLanguage: 'en' });
  assert.match(base, /English is the required base language/);
  const other = render({ offer: null, initialLanguage: 'de' });
  assert.match(other, /Editing Deutsch \(optional translation\)/);
  assert.match(other, /required base language is English/);
});

test('goal label/description state is clear per language', () => {
  assert.match(render({ offer: offerWithNewGoal(), initialLanguage: 'en' }), /optional · base language/);
  assert.match(render({ offer: offerWithNewGoal(), initialLanguage: 'de' }), /optional · if empty, Deutsch users see/);
});

test('error boundary shows a contained fallback instead of blanking the page', () => {
  const Boundary = editor.OfferEditorErrorBoundary;
  const instance = new Boundary({ onClose() {}, children: null });
  assert.equal(instance.render(), null);
  instance.state = Boundary.getDerivedStateFromError(new Error('boom'));
  const fallback = instance.render();
  assert.equal(fallback.props.role, 'alert');
});

test('lint catches undefined identifiers and the editor has none', async () => {
  const eslint = new ESLint({ cwd: root });
  const [control] = await eslint.lintText('export const x = notImportedAnywhere(1);\n', { filePath: path.join(root, 'src/control.js') });
  assert.ok(control.messages.some((m) => m.ruleId === 'no-undef'));
  const results = await eslint.lintFiles(['src/pages/admin/AdminDirectOffers.jsx', 'src/components/admin/OfferEditorErrorBoundary.jsx']);
  const undef = results.flatMap((r) => r.messages).filter((m) => m.ruleId === 'no-undef');
  assert.deepEqual(undef, []);
});
