const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const providerUrlModuleUrl = pathToFileURL(path.join(repoRoot, 'frontend/src/utils/providerUrl.js')).href;
const loadProviderUrl = () => import(providerUrlModuleUrl);

const singleValue = (url, param) => new URL(url).searchParams.getAll(param);
const SECRETISH = /secret|token|api[_-]?key|password|authorization|bearer/i;

test('Lootably wall URL is built from placementId + SID', async () => {
  const { buildProviderUrl } = await loadProviderUrl();
  const url = buildProviderUrl({ id: 'lootably', placementId: 'p123' }, 'user-1');
  assert.equal(url, 'https://desktop-wall.lootably.com/?placementID=p123&sid=user-1');
});

test('configured URL keeps existing query params and appends SID once', async () => {
  const { buildProviderUrl } = await loadProviderUrl();
  const url = buildProviderUrl({ id: 'lootably', iframeUrl: 'https://partner.example/wall?a=1&b=2' }, 'user-1');
  const params = new URL(url).searchParams;
  assert.equal(params.get('a'), '1');
  assert.equal(params.get('b'), '2');
  assert.deepEqual(singleValue(url, 'sid'), ['user-1']);
});

test('an existing single SID is preserved, not duplicated or replaced', async () => {
  const { buildProviderUrl } = await loadProviderUrl();
  const url = buildProviderUrl({ id: 'lootably', iframeUrl: 'https://partner.example/wall?sid=existing' }, 'user-1');
  assert.deepEqual(singleValue(url, 'sid'), ['existing']);
});

test('duplicate SID params are normalized to a single effective value', async () => {
  const { buildProviderUrl } = await loadProviderUrl();
  const url = buildProviderUrl({ id: 'lootably', iframeUrl: 'https://partner.example/wall?sid=a&sid=b' }, 'user-1');
  assert.deepEqual(singleValue(url, 'sid'), ['a']);
});

test('duplicate placementID params are normalized and never invented', async () => {
  const { buildProviderUrl } = await loadProviderUrl();

  const duplicated = buildProviderUrl({ id: 'lootably', iframeUrl: 'https://partner.example/wall?placementID=a&placementID=b' }, 'user-1');
  assert.deepEqual(singleValue(duplicated, 'placementID'), ['a']);

  const noPlacement = buildProviderUrl({ id: 'lootably', iframeUrl: 'https://partner.example/wall' }, 'user-1');
  assert.deepEqual(singleValue(noPlacement, 'placementID'), []);
});

test('offerwallUrl override wins over placementId; iframeUrl wins over offerwallUrl', async () => {
  const { buildProviderUrl } = await loadProviderUrl();

  const offerwall = buildProviderUrl(
    { id: 'lootably', placementId: 'p-should-not-be-used', offerwallUrl: 'https://override.example/wall' },
    'user-1'
  );
  assert.ok(offerwall.startsWith('https://override.example/wall'));
  assert.equal(offerwall.includes('p-should-not-be-used'), false);
  assert.deepEqual(singleValue(offerwall, 'sid'), ['user-1']);

  const iframe = buildProviderUrl(
    { id: 'lootably', offerwallUrl: 'https://offerwall.example/wall', iframeUrl: 'https://iframe.example/wall' },
    'user-1'
  );
  assert.ok(iframe.startsWith('https://iframe.example/wall'));
});

test('no secret/token parameters ever appear in the generated URL', async () => {
  const { buildProviderUrl } = await loadProviderUrl();
  const url = buildProviderUrl({ id: 'lootably', placementId: 'p1' }, 'user-1');
  for (const key of new URL(url).searchParams.keys()) {
    assert.doesNotMatch(key, SECRETISH, `unexpected sensitive param: ${key}`);
  }
});

test('CPX and generic providers are unchanged', async () => {
  const { buildProviderUrl } = await loadProviderUrl();
  assert.equal(
    buildProviderUrl({ id: 'cpx' }, 'user-1'),
    'https://offers.cpx-research.com/index.php?app_id=32283&ext_user_id=user-1'
  );
  assert.equal(
    buildProviderUrl({ id: 'torox', iframeUrl: 'https://torox.example/wall?uid={USER_ID}' }, 'user-1'),
    'https://torox.example/wall?uid=user-1'
  );
});

test('OfferCards re-exports the shared builder and the modal opens the same URL in a new tab', () => {
  const offerCards = read('frontend/src/components/offers/OfferCards.jsx');
  assert.match(offerCards, /import \{ buildProviderUrl \} from '\.\.\/\.\.\/utils\/providerUrl'/);
  assert.match(offerCards, /export \{ buildProviderUrl \}/);

  const modal = read('frontend/src/components/offers/OfferwallModal.jsx');
  assert.match(modal, /import \{ buildProviderUrl, getProviderLogo \} from '\.\/OfferCards'/);
  assert.match(modal, /const url = buildProviderUrl\(provider, userId\)/);
  // Same `url` used for the iframe and the new-tab action.
  assert.match(modal, /src=\{url\}/);
  assert.match(modal, /window\.open\(url, '_blank', 'noopener,noreferrer'\)/);
});
