const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const adminApiUrl = pathToFileURL(path.join(repoRoot, 'frontend/src/utils/adminApi.js')).href;
const loadAdminApi = () => import(adminApiUrl);

const makeResponse = (status) => ({ status, ok: status >= 200 && status < 300 });

const makeFetch = (responses) => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return responses[Math.min(calls.length - 1, responses.length - 1)];
  };
  fetchImpl.calls = calls;
  return fetchImpl;
};

const makeUser = ({ initial = 'token-initial', refreshed = 'token-refreshed', refreshError = null } = {}) => {
  const calls = [];
  return {
    calls,
    getIdToken: async (force = false) => {
      calls.push(force);
      if (force && refreshError) throw refreshError;
      return force ? refreshed : initial;
    },
  };
};

test('normal authenticated request uses the current token and preserves caller headers', async () => {
  const { createAdminApi } = await loadAdminApi();
  const user = makeUser();
  const fetchImpl = makeFetch([makeResponse(200)]);
  const adminApi = createAdminApi(user, 'https://api.example', { fetchImpl });

  const res = await adminApi('/admin/direct-offers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ x: 1 }),
  });

  assert.equal(res.status, 200);
  assert.equal(fetchImpl.calls.length, 1);
  assert.equal(fetchImpl.calls[0].url, 'https://api.example/admin/direct-offers');
  assert.equal(fetchImpl.calls[0].init.headers.Authorization, 'Bearer token-initial');
  assert.equal(fetchImpl.calls[0].init.headers['Content-Type'], 'application/json');
  assert.deepEqual(user.calls, [false]);
});

test('stale token 401 forces refresh and retries exactly once with the refreshed token', async () => {
  const { createAdminApi } = await loadAdminApi();
  const user = makeUser();
  const fetchImpl = makeFetch([makeResponse(401), makeResponse(200)]);
  const adminApi = createAdminApi(user, 'https://api.example', { fetchImpl });

  const res = await adminApi('/admin/direct-offers/1/clicks', {
    headers: { 'Content-Type': 'application/json' },
  });

  assert.equal(res.status, 200);
  assert.equal(fetchImpl.calls.length, 2);
  assert.equal(fetchImpl.calls[0].init.headers.Authorization, 'Bearer token-initial');
  assert.equal(fetchImpl.calls[1].init.headers.Authorization, 'Bearer token-refreshed');
  assert.equal(fetchImpl.calls[1].init.headers['Content-Type'], 'application/json');
  assert.deepEqual(user.calls, [false, true]);
});

test('a retry that is still 401 is returned to the caller (no infinite retry)', async () => {
  const { createAdminApi } = await loadAdminApi();
  const user = makeUser();
  const fetchImpl = makeFetch([makeResponse(401), makeResponse(401)]);
  const adminApi = createAdminApi(user, 'https://api.example', { fetchImpl });

  const res = await adminApi('/admin/direct-offers');

  assert.equal(res.status, 401);
  assert.equal(fetchImpl.calls.length, 2, 'must retry at most once');
  assert.deepEqual(user.calls, [false, true]);
});

test('non-401 errors are returned immediately without a refresh attempt', async () => {
  const { createAdminApi } = await loadAdminApi();
  const user = makeUser();
  const fetchImpl = makeFetch([makeResponse(500)]);
  const adminApi = createAdminApi(user, 'https://api.example', { fetchImpl });

  const res = await adminApi('/admin/direct-offers');
  assert.equal(res.status, 500);
  assert.equal(fetchImpl.calls.length, 1);
  assert.deepEqual(user.calls, [false]);
});

test('a failing forced refresh throws a clear auth error instead of being swallowed', async () => {
  const { createAdminApi } = await loadAdminApi();
  const user = makeUser({ refreshError: new Error('network down') });
  const fetchImpl = makeFetch([makeResponse(401), makeResponse(200)]);
  const adminApi = createAdminApi(user, 'https://api.example', { fetchImpl });

  await assert.rejects(
    () => adminApi('/admin/direct-offers'),
    (error) => error.code === 'AUTH_REFRESH_FAILED' && /session expired/i.test(error.message)
  );
  assert.equal(fetchImpl.calls.length, 1, 'no retry when refresh fails');
});

test('missing user is rejected with a clear auth error', async () => {
  const { createAdminApi } = await loadAdminApi();
  const adminApi = createAdminApi(null, 'https://api.example', { fetchImpl: makeFetch([makeResponse(200)]) });
  await assert.rejects(() => adminApi('/admin/direct-offers'), (e) => e.code === 'NOT_AUTHENTICATED');
});

test('a fresh token is obtained on every request (not cached from page load)', async () => {
  const { createAdminApi } = await loadAdminApi();
  const user = makeUser();
  const fetchImpl = makeFetch([makeResponse(200), makeResponse(200)]);
  const adminApi = createAdminApi(user, 'https://api.example', { fetchImpl });

  await adminApi('/admin/direct-offers');
  await adminApi('/admin/direct-offers');

  assert.equal(fetchImpl.calls.length, 2);
  assert.deepEqual(user.calls, [false, false]);
});

test('AdminDirectOffers wires all direct-offer requests through the shared adminApi', () => {
  const source = read('frontend/src/pages/admin/AdminDirectOffers.jsx');
  assert.match(source, /import \{ createAdminApi \} from '\.\.\/\.\.\/utils\/adminApi'/);
  assert.match(source, /createAdminApi\(currentUser, API\)/);
  // No cached Bearer-token request pattern remains.
  assert.doesNotMatch(source, /Bearer \$\{token\}/);
  assert.doesNotMatch(source, /getIdToken\(\)\.then\(setToken\)/);
  // Modals receive the shared helper.
  assert.match(source, /adminApi=\{adminApi\}/);
});

test('ClickLogsModal clears prior errors, drops stale rows, and surfaces auth failures', () => {
  const source = read('frontend/src/pages/admin/AdminDirectOffers.jsx');
  assert.match(source, /setLoadError\(''\)/, 'must clear previous load error before a new request');
  assert.match(source, /setClicks\(\[\]\)/, 'must clear stale rows on failure');
  assert.match(source, /res\.status === 401/);
  assert.match(source, /Your session expired\. Please refresh the page and sign in again\./);
  assert.match(source, /loadError \?/);
});
