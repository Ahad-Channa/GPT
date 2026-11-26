// QR section rule: PC-only offers never show it; Android/iOS offers always do,
// identically in Featured, Earn and Goodpicks modals.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const repoRoot = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(repoRoot, p), 'utf8').replace(/\r\n/g, '\n');
const loadUtil = () => import(pathToFileURL(path.join(repoRoot, 'frontend/src/utils/offerPlatforms.js')).href);

test('PC-only offer shows no QR', async () => {
  const { shouldShowQr } = await loadUtil();
  assert.equal(shouldShowQr({ desktop: true, android: false, ios: false }), false);
});

test('Android, iOS, Android+iOS and all-platform offers show the QR', async () => {
  const { shouldShowQr } = await loadUtil();
  assert.equal(shouldShowQr({ desktop: false, android: true, ios: false }), true);
  assert.equal(shouldShowQr({ desktop: false, android: false, ios: true }), true);
  assert.equal(shouldShowQr({ desktop: false, android: true, ios: true }), true);
  assert.equal(shouldShowQr({ desktop: true, android: true, ios: true }), true);
  assert.equal(shouldShowQr({ desktop: true, android: true, ios: false }), true);
});

test('legacy offers without a platforms object keep the QR; no platform at all does not', async () => {
  const { shouldShowQr } = await loadUtil();
  assert.equal(shouldShowQr(undefined), true);
  assert.equal(shouldShowQr(null), true);
  assert.equal(shouldShowQr({ desktop: false, android: false, ios: false }), false);
});

test('shared component is gated by shouldShowQr and renders nothing for PC-only', () => {
  const component = read('frontend/src/components/offers/OfferQrSection.jsx');
  assert.match(component, /import \{ shouldShowQr \} from '..\/..\/utils\/offerPlatforms\.js'/);
  assert.match(component, /if \(!shouldShowQr\(platforms\)\) return null;/);
});

test('Featured (direct + custom) and Goodpicks modals all use the shared QR section, with no inline QR left', () => {
  // Tracked Featured offers reuse the designer's FeaturedOfferModal (OfferCards.jsx), so
  // that one file covers both direct and custom Featured offers.
  const files = {
    goodpicks: 'frontend/src/components/offers/GoodpicksModal.jsx',
    featured: 'frontend/src/components/offers/OfferCards.jsx',
  };
  for (const [name, file] of Object.entries(files)) {
    const src = read(file);
    assert.match(src, /import OfferQrSection from '\.\/OfferQrSection\.jsx'/, `${name} imports the shared section`);
    assert.match(src, /<OfferQrSection platforms=\{offer\.platforms\}/, `${name} renders it with the offer's platforms`);
    assert.doesNotMatch(src, /BsQrCode/, `${name} has no inline QR icon`);
  }
});
