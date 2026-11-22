import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let outDir;
let m;

before(async () => {
  outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'goodpicks-history-'));
  await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [react()],
    ssr: { noExternal: true },
    define: {
      'import.meta.env.VITE_FIREBASE_API_KEY': '"test-key"',
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': '"test.example"',
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': '"test"',
      'import.meta.env.VITE_FIREBASE_APP_ID': '"1:1:web:1"',
    },
    build: {
      ssr: path.join(root, 'tests/helpers/goodpicks-history-entry.js'),
      outDir,
      emptyOutDir: true,
      rollupOptions: { output: { format: 'esm', entryFileNames: 'entry.mjs' } },
    },
  });
  globalThis.window ??= {
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    location: { href: 'http://localhost/', origin: 'http://localhost', hostname: 'localhost', protocol: 'http:', search: '', hash: '', pathname: '/' },
  };
  m = await import(pathToFileURL(path.join(outDir, 'entry.mjs')).href);
}, { timeout: 120000 });

after(() => { if (outDir) fs.rmSync(outDir, { recursive: true, force: true }); });

const renderAction = async (offer, language) => {
  await m.i18n.changeLanguage(language);
  return m.renderToString(m.createElement(m.GoodpicksHistoryAction, { offer, onOpen() {} })).replace(/<!-- -->/g, '');
};

const offer = (id, lifecycle, extra = {}) => ({ _id: id, title: `Offer ${id}`, lifecycle, startedAt: '2026-01-01T00:00:00Z', ...extra });

// ── History status rendering ────────────────────────────────────────────────
test('German completed history row shows "Abgeschlossen" as plain text only', async () => {
  const html = await renderAction(offer('a', 'completed'), 'de');
  assert.match(html, />Abgeschlossen</);
  assert.doesNotMatch(html, /<button/i);
  assert.doesNotMatch(html, /<a[\s>]/i);
  assert.doesNotMatch(html, /onclick|role="button"|tabindex/i);
  assert.doesNotMatch(html, /cursor:\s*pointer/i);
  assert.doesNotMatch(html, /Details ansehen/);
});

test('English completed history row shows "Completed" as plain text only', async () => {
  const html = await renderAction(offer('a', 'completed'), 'en');
  assert.match(html, />Completed</);
  assert.doesNotMatch(html, /<button|<a[\s>]|See Details|cursor:\s*pointer/i);
});

test('started / pending / rejected / reversed rows keep a details-resume button', async () => {
  for (const lifecycle of ['started', 'pending', 'rejected', 'reversed']) {
    const html = await renderAction(offer('a', lifecycle), 'en');
    assert.match(html, /<button/, lifecycle);
    assert.match(html, /See Details/, lifecycle);
    assert.doesNotMatch(html, /Completed/, lifecycle);
  }
  assert.match(await renderAction(offer('a', 'started'), 'de'), /Details ansehen/);
});

// ── Shared lifecycle helpers (Home, Earn, Goodpicks) ────────────────────────
test('active lists drop only fully completed offers; partly credited multi-step stays', () => {
  const list = [
    offer('single-done', 'completed'),
    offer('multi-partial', 'started', { clickStatus: 'approved', completedGoalKeys: ['a'] }), // approved click alone is NOT completion
    offer('fresh', 'available'),
    offer('manual-pending', 'pending'),
    offer('manual-rejected', 'rejected'),
    offer('reversed', 'reversed'),
  ];
  assert.deepEqual(m.filterActiveOffers(list).map((o) => o._id), ['multi-partial', 'fresh', 'manual-pending', 'manual-rejected', 'reversed']);
  assert.equal(m.isOfferCompleted(list[1]), false);
});

test('the client never derives completion from clickStatus (server lifecycle only)', () => {
  assert.equal(m.isOfferCompleted({ _id: 'x', clickStatus: 'approved' }), false);
  assert.equal(m.isOfferCompleted({ _id: 'x', clickStatus: 'approved', lifecycle: 'bogus' }), false);
  assert.equal(m.isOfferCompleted({ _id: 'x', lifecycle: 'completed' }), true);
});

test('History = started offers only, deduplicated by offer ID, newest first', () => {
  const history = m.buildGoodpicksHistory([
    offer('old', 'started', { startedAt: '2026-01-01T00:00:00Z' }),
    offer('new', 'completed', { startedAt: '2026-03-01T00:00:00Z' }),
    offer('old', 'started', { startedAt: '2026-01-01T00:00:00Z' }), // repeated click / duplicate row
    offer('never', 'available'),
    { title: 'no id', lifecycle: 'started' },
  ]);
  assert.deepEqual(history.map((o) => o._id), ['new', 'old']);
});

test('completed offers stay in History while leaving active lists', () => {
  const offers = [offer('done', 'completed'), offer('open', 'started')];
  assert.deepEqual(m.filterActiveOffers(offers).map((o) => o._id), ['open']);
  assert.deepEqual(m.buildGoodpicksHistory(offers).map((o) => o._id).sort(), ['done', 'open']);
});

test('starting an offer adds it to History immediately and stays active until credited', () => {
  const before = [offer('a', 'available', { startedAt: null })];
  assert.equal(m.buildGoodpicksHistory(before).length, 0);
  const after = m.markOfferStarted(before, 'a', { clickStatus: 'clicked' });
  assert.equal(after[0].lifecycle, 'started');
  assert.deepEqual(m.buildGoodpicksHistory(after).map((o) => o._id), ['a']);
  assert.equal(m.filterActiveOffers(after).length, 1);
  // a second click never downgrades a credited/pending offer
  const credited = m.markOfferStarted([offer('a', 'completed')], 'a');
  assert.equal(credited[0].lifecycle, 'completed');
  // and does not duplicate the History row
  assert.equal(m.buildGoodpicksHistory([...after, ...m.markOfferStarted(after, 'a')]).length, 1);
});

// ── Wiring: History is API-backed, the mock is gone, lists share the helper ──
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('Goodpicks modal loads History from the API and the mock data is removed', () => {
  const modal = read('src/components/offers/GoodpicksModal.jsx');
  assert.doesNotMatch(modal, /defaultGoodpicksHistory|gp_hist_/);
  assert.match(modal, /direct-offers\?placement=all/);
  assert.match(modal, /buildGoodpicksHistory\(/);
  // refetched on every mount (reload / reopen) and whenever the History tab opens
  assert.match(modal, /useEffect\(\(\) => \{\s*refreshHistory\(\);[\s\S]{0,120}\[token\]/);
  assert.match(modal, /if \(currentView === 'history'\) refreshHistory\(\)/);
  // postback AND manual starts notify the parent so History updates immediately
  assert.match(modal, /Manual and postback offers both enter History/);
  assert.match(modal, /<GoodpicksHistoryAction offer=\{item\} onOpen=\{setSelectedOffer\} \/>/);
  // browse list is filtered with the shared helper
  assert.match(modal, /filterActiveOffers\(data\.offers\)/);
});

test('Home and Earn Featured lists hide completed direct offers via the shared helper', () => {
  for (const file of ['src/pages/Home.jsx', 'src/pages/Earn.jsx']) {
    const src = read(file);
    assert.match(src, /import \{ isOfferCompleted, markOfferStarted \} from '..\/utils\/offerLifecycle\.js'/, file);
    assert.match(src, /\.filter\(o => !isOfferCompleted\(o\)\)/, file);
    assert.match(src, /markOfferStarted\(prev, offerId\)/, file);
  }
});

// ── History platform badges ─────────────────────────────────────────────────
const renderBadges = (platforms) =>
  m.renderToString(m.createElement(m.GoodpicksPlatformBadges, { platforms })).replace(/<!-- -->/g, '');
const platformsIn = (html) => [...html.matchAll(/data-platform="(\w+)"/g)].map((match) => match[1]);

test('History shows every supported platform, not just one (PC + Android + iOS)', () => {
  assert.deepEqual(platformsIn(renderBadges({ desktop: true, android: true, ios: true })), ['desktop', 'android', 'ios']);
});

test('History shows only the enabled platforms', () => {
  assert.deepEqual(platformsIn(renderBadges({ android: true, ios: false, desktop: false })), ['android']);
  assert.deepEqual(platformsIn(renderBadges({ ios: true })), ['ios']);
  assert.deepEqual(platformsIn(renderBadges({ desktop: true, ios: true })), ['desktop', 'ios']);
});

test('History shows no platform badge (and no invented Android icon) when no platform is set', () => {
  assert.equal(renderBadges({}), '');
  assert.equal(renderBadges(undefined), '');
});

test('History rows use the multi-platform badges component', () => {
  const modal = read('src/components/offers/GoodpicksModal.jsx');
  assert.match(modal, /<GoodpicksPlatformBadges platforms=\{item\.platforms\} \/>/);
  assert.doesNotMatch(modal, /item\.platforms\?\.desktop \? 'Desktop' : item\.platforms\?\.ios \? 'iOS' : 'Android'/);
});
