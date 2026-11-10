const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const offerwallsRouter = require('../routes/offerwalls');
const {
  ADAPTERS,
  DISABLED_ROUTE_RESPONSES,
  ayetSignedString,
  buildAdapters,
  isAdapterEnabled,
  primeEarnSignedString,
  resolveEnabledAdapter,
} = require('../services/offerwalls/adapters');
const { recordDisabledRouteHit, recordReplayAlert } = require('../services/offerwalls/notices');
const { classifyLegacyRows, runBackfill } = require('../scripts/backfill-offerwall-identities');
const { compareAyetLegacyMapping, parseCsv } = require('../scripts/compare-ayet-legacy-mapping');
const { parseLootablyWebhook, verifyLootablyWebhook } = require('../services/offerwalls/lootablyWebhook');

const {
  creditLegacyOfferReward,
  reverseLegacyOfferTransaction,
  handleLegacyOfferwallPostback,
  handleLootablyWebhook,
} = offerwallsRouter.__testInternals;

// ── In-memory world ─────────────────────────────────────────────────────────
// Models what the fix relies on: unique indexes (Transaction.externalId and the
// identity {providerId,userId,identityKey}), atomic conditional updates, and a
// transaction runner that is serialized and rolls back every write on throw.
const tick = () => new Promise((resolve) => setImmediate(resolve));
const S = (value) => String(value);

const matchValue = (docValue, cond) => {
  if (cond && typeof cond === 'object' && '$ne' in cond) return S(docValue) !== S(cond.$ne);
  return S(docValue) === S(cond);
};
const matches = (doc, filter = {}) => Object.entries(filter).every(([key, cond]) => matchValue(doc[key], cond));
const applyUpdate = (doc, update = {}, inserting = false) => {
  if (inserting) for (const [f, v] of Object.entries(update.$setOnInsert || {})) doc[f] = v;
  for (const [f, v] of Object.entries(update.$set || {})) doc[f] = v;
  for (const [f, v] of Object.entries(update.$inc || {})) doc[f] = (doc[f] || 0) + v;
};
const query = (value) => {
  const promise = Promise.resolve(value);
  promise.session = () => query(value);
  return promise;
};

const USER_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER_USER_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';

const makeWorld = () => {
  const world = {
    users: new Map(),
    txs: [],
    identities: [],
    alerts: [],
    notices: [],
    receipts: [],
    nextId: 1,
    blindIdentityFindOnce: false,
    adminNotifications: [],
    userNotifications: [],
    postbackLogs: [],
    settingsCalls: 0,
    writes: 0,
  };

  const uniqueUpsertModel = (store, keys) => ({
    async updateOne(filter, update, options = {}) {
      await tick();
      const doc = store().find((item) => matches(item, filter));
      if (doc) { applyUpdate(doc, update); world.writes += 1; return { upsertedCount: 0, modifiedCount: 1 }; }
      if (!options.upsert) return { upsertedCount: 0, modifiedCount: 0 };
      const created = { _id: `d${world.nextId++}`, ...filter };
      applyUpdate(created, update, true);
      store().push(created);
      world.writes += 1;
      return { upsertedCount: 1, modifiedCount: 0 };
    },
    findOne(filter) {
      const doc = store().find((item) => matches(item, filter));
      return query(doc ? { ...doc } : null);
    },
    async create(payload) {
      await tick();
      const items = Array.isArray(payload) ? payload : [payload];
      const out = [];
      for (const item of items) {
        if (store().some((existing) => keys.every((k) => S(existing[k]) === S(item[k])))) {
          throw Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });
        }
        const doc = { _id: `d${world.nextId++}`, ...item };
        store().push(doc);
        world.writes += 1;
        out.push({ ...doc });
      }
      return Array.isArray(payload) ? out : out[0];
    },
  });

  world.User = {
    async findById(id) { const u = world.users.get(S(id)); return u ? { ...u } : null; },
    async findOneAndUpdate(filter, update, options = {}) {
      await tick();
      const user = world.users.get(S(filter._id));
      if (!user) return null;
      const before = { ...user };
      applyUpdate(user, update);
      world.writes += 1;
      return options.new === false ? before : { ...user };
    },
    async findByIdAndUpdate(id, update) {
      await tick();
      const user = world.users.get(S(id));
      if (user) { applyUpdate(user, update); world.writes += 1; }
      return user ? { ...user } : null;
    },
  };

  const txBase = uniqueUpsertModel(() => world.txs, ['externalId']);
  world.Transaction = {
    ...txBase,
    findOne(filter) {
      const doc = world.txs.find((tx) => matches(tx, filter));
      return query(doc ? { ...doc } : null);
    },
    find(filter) { return query(world.txs.filter((tx) => matches(tx, filter)).map((tx) => ({ ...tx }))); },
    async findOneAndUpdate(filter, update, options = {}) {
      await tick();
      const doc = world.txs.find((tx) => matches(tx, filter));
      if (!doc) return null;
      const before = { ...doc };
      applyUpdate(doc, update);
      world.writes += 1;
      return options.new === false ? before : { ...doc };
    },
  };

  const identityBase = uniqueUpsertModel(() => world.identities, ['providerId', 'userId', 'identityKey']);
  world.Identity = {
    ...identityBase,
    findOne(filter) {
      if (world.blindIdentityFindOnce) { world.blindIdentityFindOnce = false; return query(null); }
      return identityBase.findOne(filter);
    },
  };
  world.Alert = uniqueUpsertModel(() => world.alerts, ['providerId', 'userId', 'identityKey', 'blockedExternalId']);
  world.Notice = uniqueUpsertModel(() => world.notices, ['providerId', 'kind', 'bucket']);
  world.Receipt = uniqueUpsertModel(() => world.receipts, ['providerId', 'webhookId']);

  let queue = Promise.resolve();
  world.runInTransaction = (operation) => {
    const run = queue.then(async () => {
      const snapshot = {
        users: new Map([...world.users].map(([k, v]) => [k, { ...v }])),
        txs: world.txs.map((t) => ({ ...t })),
        identities: world.identities.map((i) => ({ ...i })),
      };
      try {
        return await operation({ fakeSession: true });
      } catch (error) {
        world.users = snapshot.users;
        world.txs = snapshot.txs;
        world.identities = snapshot.identities;
        throw error;
      }
    });
    queue = run.catch(() => {});
    return run;
  };

  world.models = {
    User: world.User,
    Transaction: world.Transaction,
    OfferwallRewardIdentity: world.Identity,
    OfferwallReplayAlert: world.Alert,
    OfferwallRouteNotice: world.Notice,
    OfferwallWebhookReceipt: world.Receipt,
  };
  world.deps = {
    Settings: {
      async getSingleton() {
        world.settingsCalls += 1;
        return {
          earningHoldConfig: { enabled: false },
          referralConfig: {},
          offerwallProviders: [
            { id: 'lootably', label: 'Lootably', enabled: true, conversionRatio: 100 },
            { id: 'primeearn', label: 'PrimeEarn', enabled: true, conversionRatio: 100 },
            { id: 'ayet', label: 'Ayet Studios', enabled: true, conversionRatio: 100 },
          ],
        };
      },
    },
    User: world.User,
    notify: async (...args) => { world.userNotifications.push(args); },
    notifyAdmins: async (payload) => { world.adminNotifications.push(payload); },
    emitWalletUpdate: () => {},
    processVipLevelUp: async () => {},
    writePostbackLog: async (payload) => { world.postbackLogs.push(payload); },
  };
  world.users.set(USER_ID, { _id: USER_ID, displayName: 'Tester', firebaseUid: 'fb-1', walletBalance: 1000, totalEarned: 0 });
  return world;
};

// ── Enabled adapter fixtures (production defaults stay disabled) ────────────
const SALT = 'primeearn-test-salt';
const BASE_URL = 'https://taskmint.example';
const AYET_KEY = 'ayet-test-api-key';
const ROUTE = '/api/offerwalls/postback/primeearn';

const enabledRegistry = () => {
  const registry = buildAdapters();
  for (const adapter of Object.values(registry)) {
    for (const key of Object.keys(adapter.confirmations)) adapter.confirmations[key] = true;
  }
  return registry;
};
const adapterOptions = (registry = enabledRegistry()) => ({
  registry,
  env: {
    OFFERWALL_ADAPTER_PRIMEEARN_ENABLED: 'true',
    OFFERWALL_ADAPTER_AYET_ENABLED: 'true',
    OFFERWALL_ADAPTER_LOOTABLY_ENABLED: 'true',
    PRIMEEARN_SECRET: SALT,
    PRIMEEARN_POSTBACK_BASE_URL: BASE_URL,
    AYET_API_KEY: AYET_KEY,
    LOOTABLY_WEBHOOK_SECRET: 'lootably-test-webhook-secret',
    LOOTABLY_PLACEMENT_ID: 'placement-test-123',
    LOOTABLY_CURRENCY_REWARD_IS_COINS: 'true',
    LOOTABLY_WEBHOOK_ALLOWED_IPS: '203.0.113.10',
  },
});

const makeRes = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this; },
  send(body) { this.body = body; return this; },
});

const primeEarnReq = (params, { hash, omitHash = false, tamper = {} } = {}) => {
  const pairs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  const unsignedUrl = `${ROUTE}?${pairs.join('&')}`;
  const signedString = primeEarnSignedString({ originalUrl: unsignedUrl }, BASE_URL);
  const computed = hash ?? (omitHash ? null : crypto.createHash('sha1').update(signedString + SALT).digest('hex'));
  const finalParams = { ...params, ...tamper };
  const finalPairs = Object.entries(finalParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  const originalUrl = `${ROUTE}?${finalPairs.join('&')}${computed === null ? '' : `&hash=${computed}`}`;
  const query = Object.fromEntries(new URLSearchParams(originalUrl.split('?')[1]));
  return { method: 'GET', originalUrl, query, body: {}, headers: {}, ip: '168.119.57.82', get: () => '' };
};

const ayetReq = (params, { key = AYET_KEY, header } = {}) => {
  const hash = crypto.createHmac('sha256', key).update(ayetSignedString(params)).digest('hex');
  const headers = header === null ? {} : { 'x-ayetstudios-security-hash': header ?? hash };
  return { method: 'GET', originalUrl: '/api/offerwalls/postback/ayet', query: { ...params }, body: {}, headers, ip: '51.79.101.241', get: () => '' };
};

const lootablyReq = ({
  event = 'approved',
  webhookId = 'wh-default',
  transactionId = 'loot-tx-1',
  userId = USER_ID,
  offerType = 'multistep',
  goalId = 'goal-install',
  currencyReward = 120,
  secret = 'lootably-test-webhook-secret',
  placementId = 'placement-test-123',
  sourceIp = '203.0.113.10',
  eventHeader = event,
} = {}) => ({
  method: 'POST',
  path: '/webhook/lootably',
  originalUrl: '/api/offerwalls/webhook/lootably',
  body: {
    event,
    data: {
      placementID: placementId,
      userID: userId,
      transactionID: transactionId,
      conversionTime: '2026-11-10T12:00:00.000Z',
      ip: '198.51.100.20',
      countryCode: 'US',
      offerName: 'Sample App',
      offerID: 'offer-10',
      revenue: 1.2,
      currencyReward,
      offerType,
      ...(offerType === 'multistep' ? { goalID: goalId, goalDescription: 'Install and open' } : {}),
    },
  },
  headers: {
    'content-type': 'application/json',
    'x-lootably-webhook-secret': secret,
    'x-lootably-webhook-id': webhookId,
    'x-lootably-webhook-timestamp': '2026-11-10T12:00:00.000Z',
    'x-lootably-webhook-type': eventHeader,
  },
  socket: { remoteAddress: sourceIp },
  query: {},
  get: () => '',
});

const run = async (world, providerId, req, overrides = {}) => {
  const res = makeRes();
  await handleLegacyOfferwallPostback(providerId, req, res, {}, {
    adapterOptions: adapterOptions(),
    models: world.models,
    runInTransaction: world.runInTransaction,
    deps: world.deps,
    ...overrides,
  });
  return res;
};

const runLootably = async (world, req, overrides = {}) => {
  const res = makeRes();
  await handleLootablyWebhook(req, res, {
    adapterOptions: adapterOptions(),
    models: world.models,
    runInTransaction: world.runInTransaction,
    deps: world.deps,
    ...overrides,
  });
  return res;
};

const credit = (world, txId, extra = {}) =>
  run(world, 'primeearn', primeEarnReq({ user: USER_ID, tx_id: txId, status: 'COMPLETED', reward: '5', ...extra }));
const reverse = (world, baseId) =>
  run(world, 'primeearn', primeEarnReq({ user: USER_ID, tx_id: `r-${baseId}`, status: 'RECONCILED', reward: '-5' }));

const wallet = (world) => world.users.get(USER_ID).walletBalance;
const rewards = (world) => world.txs.filter((tx) => tx.transactionType === 'offer_reward');

// ── Defaults: everything disabled, legacy matching off ──────────────────────
test('every adapter is disabled by default and cannot be enabled by an env flag alone', () => {
  const registry = buildAdapters();
  assert.deepEqual(Object.keys(registry).sort(), ['ayet', 'lootably', 'primeearn']);
  for (const adapter of Object.values(registry)) {
    assert.equal(adapter.legacyIdMatchesNew, false);
    assert.equal(isAdapterEnabled(adapter, { [`OFFERWALL_ADAPTER_${adapter.id.toUpperCase()}_ENABLED`]: 'true' }), false);
    assert.equal(resolveEnabledAdapter(adapter.id, { env: { [`OFFERWALL_ADAPTER_${adapter.id.toUpperCase()}_ENABLED`]: 'true' } }), null);
  }
  assert.equal(registry.lootably.confirmations.transactionIdStableAcrossEvents, true);
  assert.equal(registry.lootably.confirmations.rejectedAfterApprovalMeansReversal, true);
  assert.equal(registry.lootably.confirmations.currencyRewardIsTaskMintCoins, true);
  assert.equal(ADAPTERS.primeearn.legacyIdMatchesNewAllowed, false);
});

test('an adapter is enabled only when every confirmation is true AND the env flag is set', () => {
  const registry = enabledRegistry();
  assert.equal(isAdapterEnabled(registry.ayet, { OFFERWALL_ADAPTER_AYET_ENABLED: 'true' }), true);
  assert.equal(isAdapterEnabled(registry.ayet, {}), false);
  registry.ayet.confirmations.reversalCallbacksSigned = false;
  assert.equal(isAdapterEnabled(registry.ayet, { OFFERWALL_ADAPTER_AYET_ENABLED: 'true' }), false);
});

test('Lootably requires the webhook secret, placement, exact IP allowlist and coin-unit confirmation', () => {
  const lootably = buildAdapters().lootably;
  const base = {
    OFFERWALL_ADAPTER_LOOTABLY_ENABLED: 'true',
    LOOTABLY_WEBHOOK_SECRET: 'secret',
    LOOTABLY_PLACEMENT_ID: 'placement-1',
    LOOTABLY_WEBHOOK_ALLOWED_IPS: '203.0.113.10',
  };
  assert.equal(isAdapterEnabled(lootably, base), false);
  assert.equal(isAdapterEnabled(lootably, { ...base, LOOTABLY_CURRENCY_REWARD_IS_COINS: 'true' }), true);
  assert.equal(isAdapterEnabled(lootably, { ...base, LOOTABLY_CURRENCY_REWARD_IS_COINS: 'true', LOOTABLY_WEBHOOK_ALLOWED_IPS: '' }), false);
});

test('Lootably webhook authentication checks the header, configured placement, event, path and source IP', () => {
  const req = lootablyReq();
  const env = {
    LOOTABLY_WEBHOOK_SECRET: 'lootably-test-webhook-secret',
    LOOTABLY_PLACEMENT_ID: 'placement-test-123',
    LOOTABLY_WEBHOOK_ALLOWED_IPS: '203.0.113.10',
  };
  assert.equal(verifyLootablyWebhook(req, { env }).passed, true);
  assert.equal(verifyLootablyWebhook(lootablyReq({ secret: 'wrong' }), { env }).passed, false);
  assert.equal(verifyLootablyWebhook(lootablyReq({ sourceIp: '203.0.113.11' }), { env }).passed, false);
  assert.equal(verifyLootablyWebhook(lootablyReq({ placementId: 'other-placement' }), { env }).passed, false);
  assert.equal(verifyLootablyWebhook(lootablyReq({ eventHeader: 'rejected' }), { env }).passed, false);
  assert.equal(verifyLootablyWebhook({ ...req, method: 'GET', path: '/postback/lootably' }, { env }).passed, false);
  assert.equal(verifyLootablyWebhook(req, { env: { ...env, LOOTABLY_WEBHOOK_ALLOWED_IPS: '' } }).passed, false);
});

test('Lootably parses per-step completion identity and maps webhook states without trusting query parameters', () => {
  const approved = parseLootablyWebhook(lootablyReq({ transactionId: 'T1', goalId: 'goal-a', currencyReward: 125 }));
  assert.equal(approved.ok, true);
  assert.equal(approved.kind, 'credit');
  assert.equal(approved.platformCoins, 125);
  assert.equal(approved.baseId, 'webhook:T1:goal-a');
  assert.equal(approved.stepLabel, 'Install and open');

  assert.equal(parseLootablyWebhook(lootablyReq({ event: 'pending' })).kind, 'ignore');
  assert.equal(parseLootablyWebhook(lootablyReq({ event: 'rejected' })).kind, 'reversal');
  assert.equal(parseLootablyWebhook(lootablyReq({ currencyReward: 1.5 })).ok, false);
  assert.equal(parseLootablyWebhook(lootablyReq({ offerType: 'multistep', goalId: '' })).ok, false);
});

test('Lootably webhook credits once, reverses the same step once, and permits a fresh conversion or a different step', async () => {
  const world = makeWorld();

  const first = await runLootably(world, lootablyReq({ webhookId: 'wh-approved-1', transactionId: 'T1', goalId: 'goal-a', currencyReward: 125 }));
  assert.equal(first.statusCode, 200);
  assert.equal(first.body, '1');
  assert.equal(wallet(world), 1125, 'currencyReward is already the placement currency, not multiplied by the admin ratio');
  assert.equal(world.txs.filter((tx) => tx.transactionType === 'offer_reward').length, 1);

  const sameWebhook = await runLootably(world, lootablyReq({ webhookId: 'wh-approved-1', transactionId: 'T1', goalId: 'goal-a', currencyReward: 125 }));
  assert.equal(sameWebhook.statusCode, 200);
  assert.equal(wallet(world), 1125);

  const retryWithNewWebhookId = await runLootably(world, lootablyReq({ webhookId: 'wh-approved-2', transactionId: 'T1', goalId: 'goal-a', currencyReward: 125 }));
  assert.equal(retryWithNewWebhookId.body, '1');
  assert.equal(wallet(world), 1125, 'transaction identity also dedupes a re-delivery with a different webhook ID');

  const rejected = await runLootably(world, lootablyReq({ event: 'rejected', webhookId: 'wh-rejected-1', transactionId: 'T1', goalId: 'goal-a', currencyReward: 125 }));
  assert.equal(rejected.body, '1');
  assert.equal(wallet(world), 1000);

  await runLootably(world, lootablyReq({ event: 'rejected', webhookId: 'wh-rejected-2', transactionId: 'T1', goalId: 'goal-a', currencyReward: 125 }));
  assert.equal(wallet(world), 1000, 'repeated rejection never deducts twice');

  await runLootably(world, lootablyReq({ webhookId: 'wh-replay-after-reversal', transactionId: 'T1', goalId: 'goal-a', currencyReward: 125 }));
  assert.equal(wallet(world), 1000, 'an approved callback for the reversed same transaction remains blocked');

  await runLootably(world, lootablyReq({ webhookId: 'wh-new-completion', transactionId: 'T2', goalId: 'goal-a', currencyReward: 125 }));
  assert.equal(wallet(world), 1125, 'a new provider conversion can be rewarded after the user restarts the offer');

  await runLootably(world, lootablyReq({ webhookId: 'wh-another-goal', transactionId: 'T3', goalId: 'goal-b', currencyReward: 115 }));
  assert.equal(wallet(world), 1240, 'a distinct approved goal remains independently rewardable');
  assert.equal(world.receipts.length, 7);
});

test('concurrent Lootably delivery retries credit once, and an early rejection tombstone blocks a late approval', async () => {
  const world = makeWorld();
  const retries = await Promise.all(Array.from({ length: 10 }, (_, index) => runLootably(
    world,
    lootablyReq({ webhookId: `wh-parallel-${index}`, transactionId: 'T-parallel', goalId: 'goal-a', currencyReward: 77 })
  )));
  assert.ok(retries.every((res) => res.statusCode === 200 && res.body === '1'));
  assert.equal(wallet(world), 1077);
  assert.equal(rewards(world).length, 1);

  const earlyReject = await runLootably(world, lootablyReq({
    event: 'rejected', webhookId: 'wh-early-reject', transactionId: 'T-out-of-order', goalId: 'goal-b',
  }));
  assert.equal(earlyReject.body, '1');
  const lateApproval = await runLootably(world, lootablyReq({
    webhookId: 'wh-late-approval', transactionId: 'T-out-of-order', goalId: 'goal-b', currencyReward: 80,
  }));
  assert.equal(lateApproval.body, '1');
  assert.equal(wallet(world), 1077, 'the rejected completion remains tombstoned when approval arrives later');
  assert.equal(rewards(world).length, 1);
});

test('Lootably webhook rejects bad credentials and malformed callbacks without wallet or ledger writes', async () => {
  const world = makeWorld();
  const badSecret = await runLootably(world, lootablyReq({ webhookId: 'wh-bad-secret', secret: 'wrong' }));
  assert.equal(badSecret.statusCode, 400);
  const wrongIp = await runLootably(world, lootablyReq({ webhookId: 'wh-bad-ip', sourceIp: '203.0.113.99' }));
  assert.equal(wrongIp.statusCode, 400);
  const fractionalCoins = await runLootably(world, lootablyReq({ webhookId: 'wh-fraction', currencyReward: 1.2 }));
  assert.equal(fractionalCoins.statusCode, 400);
  assert.equal(wallet(world), 1000);
  assert.equal(world.txs.length, 0);
  assert.equal(world.receipts.length, 0);
});

test('Lootably webhook returns retryable 503 while unconfirmed or unconfigured and does not move money', async () => {
  const world = makeWorld();
  const res = await runLootably(world, lootablyReq(), { adapterOptions: undefined });
  assert.equal(res.statusCode, 503);
  assert.equal(res.body, '0');
  assert.equal(world.settingsCalls, 0);
  assert.equal(wallet(world), 1000);
  assert.equal(world.txs.length, 0);
});

test('Lootably legacy GET callback stays blocked when the webhook adapter is enabled', async () => {
  const world = makeWorld();
  const res = await run(world, 'lootably', {
    method: 'GET',
    path: '/postback/lootably',
    query: { userID: USER_ID, transactionID: 'editable', currencyReward: '100' },
    body: {},
    headers: {},
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, '0');
  assert.equal(wallet(world), 1000);
  assert.equal(world.txs.length, 0);
});

// ── Fail closed ─────────────────────────────────────────────────────────────
test('every legacy provider route fails closed by default with its documented response and no money movement', async () => {
  const expected = {
    cpx: [410, '0'], adgem: [410, '0'], lootably: [200, '0'], torox: [410, '0'],
    primeearn: [410, '0'], ayet: [503, '0'], adtowall: [410, '0'], revu: [410, '0'],
  };
  for (const [providerId, [status, body]] of Object.entries(expected)) {
    const world = makeWorld();
    const res = await run(world, providerId, { query: { user_id: USER_ID }, body: {}, headers: {}, method: 'GET' }, { adapterOptions: undefined });
    assert.equal(res.statusCode, status, providerId);
    assert.equal(res.body, body, providerId);
    assert.equal(world.settingsCalls, 0, `${providerId}: settings/wallet path must not run`);
    assert.equal(world.txs.length, 0);
    assert.equal(wallet(world), 1000);
    assert.equal(world.identities.length, 0);
  }
  assert.deepEqual(DISABLED_ROUTE_RESPONSES.lootably, { status: 200, body: '0' });
});

test('a negative (reversal) callback to a disabled route is also refused and moves nothing', async () => {
  const world = makeWorld();
  world.txs.push({ _id: 'orig', userId: USER_ID, externalId: 'cpx:1', transactionType: 'offer_reward', amount: 500, status: 'completed' });
  const res = await run(world, 'cpx', { query: { user_id: USER_ID, reward: '-5' }, body: {}, headers: {}, method: 'GET' }, { adapterOptions: undefined });
  assert.equal(res.statusCode, 410);
  assert.equal(world.txs[0].status, 'completed');
  assert.equal(wallet(world), 1000);
});

test('disabled-route bookkeeping is bounded: one counter row per provider-hour, one admin alert per day', async () => {
  const world = makeWorld();
  const noon = new Date('2026-11-08T12:00:00Z');
  for (let i = 0; i < 5; i += 1) await recordDisabledRouteHit({ models: world.models, providerId: 'cpx', now: new Date(noon.getTime() + i * 60000) });
  assert.equal(world.notices.filter((n) => n.kind === 'disabled_hit').length, 1);
  assert.equal(world.notices.find((n) => n.kind === 'disabled_hit').attempts, 5);
  assert.equal(world.notices.filter((n) => n.kind === 'disabled_alert').length, 1);

  const nextHour = await recordDisabledRouteHit({ models: world.models, providerId: 'cpx', now: new Date('2026-11-08T13:00:00Z') });
  assert.equal(nextHour.firstHitOfHour, true);
  assert.equal(nextHour.firstAlertOfDay, false);
  const nextDay = await recordDisabledRouteHit({ models: world.models, providerId: 'cpx', now: new Date('2026-11-09T00:01:00Z') });
  assert.equal(nextDay.firstAlertOfDay, true);

  // end-to-end through the handler: ten retries -> exactly one admin notification
  const w2 = makeWorld();
  await Promise.all(Array.from({ length: 10 }, () => run(w2, 'cpx', { query: {}, body: {}, headers: {}, method: 'GET' }, { adapterOptions: undefined })));
  assert.equal(w2.adminNotifications.filter((n) => n.type === 'offerwall_route_disabled').length, 1);
  assert.equal(w2.notices.find((n) => n.kind === 'disabled_hit').attempts, 10);
});

// ── PrimeEarn: legitimate flow, reversal, replay ────────────────────────────
test('legitimate separate completions (different base IDs, same user) both credit', async () => {
  const world = makeWorld();
  assert.equal((await credit(world, 'tx-A')).body, '1');
  assert.equal((await credit(world, 'tx-B')).body, '1');
  assert.equal(rewards(world).length, 2);
  assert.equal(wallet(world), 1000 + 500 + 500);
  assert.equal(world.identities.length, 2);
});

test('T1 credit -> chargeback -> late callback of the SAME completion is blocked, no reward, one alert', async () => {
  const world = makeWorld();
  await credit(world, 'tx-T1');
  assert.equal(wallet(world), 1500);

  const rev = await reverse(world, 'tx-T1');
  assert.equal(rev.body, '1');
  assert.equal(wallet(world), 1000);
  assert.equal(world.identities[0].status, 'reversed');

  const replay = await credit(world, 'tx-T1');
  assert.equal(replay.statusCode, 200);
  assert.equal(replay.body, '1');
  assert.equal(rewards(world).length, 1, 'no second reward row');
  assert.equal(wallet(world), 1000, 'wallet must not increase');
  assert.equal(world.alerts.length, 1);
  assert.equal(world.adminNotifications.filter((n) => n.type === 'offerwall_replay_blocked').length, 1);
});

test('concurrent replays of a reversed completion create zero rewards and exactly one alert', async () => {
  const world = makeWorld();
  await credit(world, 'tx-T1');
  await reverse(world, 'tx-T1');

  const results = await Promise.all(Array.from({ length: 10 }, () => credit(world, 'tx-T1')));
  assert.ok(results.every((r) => r.body === '1'));
  assert.equal(rewards(world).length, 1);
  assert.equal(wallet(world), 1000);
  assert.equal(world.alerts.length, 1);
  assert.equal(world.alerts[0].attempts, 10);
  assert.equal(world.adminNotifications.filter((n) => n.type === 'offerwall_replay_blocked').length, 1);
});

test('a tampered transaction ID on a valid signed callback is rejected and credits nothing', async () => {
  const world = makeWorld();
  await credit(world, 'tx-T1');
  await reverse(world, 'tx-T1');

  // Attacker re-sends the signed T1 URL with a changed ID, keeping the old hash.
  const signedFor = { user: USER_ID, tx_id: 'tx-T1', status: 'COMPLETED', reward: '5' };
  const tampered = primeEarnReq(signedFor, { tamper: { tx_id: 'tx-T2' } });
  const res = await run(world, 'primeearn', tampered);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body, '0');
  assert.equal(rewards(world).length, 1);
  assert.equal(wallet(world), 1000);
  assert.ok(world.postbackLogs.some((l) => /Signature mismatch/.test(l.rejectionReason)));
});

test('LIMIT: a genuinely new provider-signed T2 with a new base ID is a new completion and is NOT linked to T1', async () => {
  // PrimeEarn documents no stable ID shared across re-issued completions, so the
  // system must not (and does not) claim to link them.
  const world = makeWorld();
  await credit(world, 'tx-T1');
  await reverse(world, 'tx-T1');
  const t2 = await credit(world, 'tx-T2');
  assert.equal(t2.body, '1');
  assert.equal(rewards(world).filter((tx) => tx.status !== 'reversed').length, 1);
  assert.equal(wallet(world), 1500);
});

test('p- and c- callbacks never credit; r- reverses exactly once even when concurrent', async () => {
  const world = makeWorld();
  for (const [prefix, status] of [['p-', 'PENDING'], ['c-', 'PENDING_RECONCILED']]) {
    const res = await run(world, 'primeearn', primeEarnReq({ user: USER_ID, tx_id: `${prefix}tx-P`, status, reward: '5' }));
    assert.equal(res.body, '1');
  }
  assert.equal(rewards(world).length, 0);
  assert.equal(wallet(world), 1000);

  await credit(world, 'tx-R');
  await Promise.all(Array.from({ length: 6 }, () => reverse(world, 'tx-R')));
  assert.equal(wallet(world), 1000, 'deducted once');
  assert.equal(world.userNotifications.filter((n) => n[1] === 'chargeback').length, 1);
});

test('out-of-order reversal tombstones the base ID so the later credit is blocked', async () => {
  const world = makeWorld();
  await reverse(world, 'tx-LATE');
  assert.equal(world.identities.find((i) => i.identityKey === 'tx-LATE').status, 'reversed');
  const res = await credit(world, 'tx-LATE');
  assert.equal(res.body, '1');
  assert.equal(rewards(world).length, 0);
  assert.equal(wallet(world), 1000);
});

test('malformed status/prefix combinations are rejected without writes', async () => {
  const world = makeWorld();
  const cases = [
    { user: USER_ID, tx_id: 'r-tx-X', status: 'COMPLETED', reward: '5' },
    { user: USER_ID, tx_id: 'tx-X', status: 'RECONCILED', reward: '-5' },
    { user: USER_ID, tx_id: 'tx-X', status: 'WHATEVER', reward: '5' },
  ];
  for (const params of cases) {
    const res = await run(world, 'primeearn', primeEarnReq(params));
    assert.equal(res.statusCode, 400);
  }
  assert.equal(world.txs.length, 0);
  assert.equal(world.identities.length, 0);
});

// ── Signatures ──────────────────────────────────────────────────────────────
test('PrimeEarn: missing, wrong, and field-tampered signatures are rejected with no writes', async () => {
  const base = { user: USER_ID, tx_id: 'tx-S', status: 'COMPLETED', reward: '5' };
  const attempts = [
    primeEarnReq(base, { omitHash: true }),                          // missing hash
    primeEarnReq(base, { hash: 'deadbeef' }),                    // wrong hash
    primeEarnReq(base, { tamper: { user: OTHER_USER_ID } }),     // tampered user
    primeEarnReq(base, { tamper: { reward: '500' } }),           // tampered reward
    primeEarnReq(base, { tamper: { tx_id: 'tx-OTHER' } }),       // tampered tx_id
  ];
  for (const req of attempts) {
    const world = makeWorld();
    const res = await run(world, 'primeearn', req);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body, '0');
    assert.equal(world.txs.length, 0);
    assert.equal(wallet(world), 1000);
  }
});

test('PrimeEarn: an allowed source IP without a valid hash is rejected, and missing secrets fail closed', async () => {
  const world = makeWorld();
  const noHash = primeEarnReq({ user: USER_ID, tx_id: 'tx-IP', status: 'COMPLETED', reward: '5' }, { omitHash: true });
  assert.equal(noHash.ip, '168.119.57.82');
  assert.equal((await run(world, 'primeearn', noHash)).statusCode, 400);

  const options = adapterOptions();
  options.env.PRIMEEARN_SECRET = '';
  const noSecret = await run(world, 'primeearn', primeEarnReq({ user: USER_ID, tx_id: 'tx-IP', status: 'COMPLETED', reward: '5' }), { adapterOptions: options });
  assert.equal(noSecret.statusCode, 400);
  const options2 = adapterOptions();
  options2.env.PRIMEEARN_POSTBACK_BASE_URL = '';
  const noBase = await run(world, 'primeearn', primeEarnReq({ user: USER_ID, tx_id: 'tx-IP', status: 'COMPLETED', reward: '5' }), { adapterOptions: options2 });
  assert.equal(noBase.statusCode, 400);
  assert.equal(world.txs.length, 0);
});

test('PrimeEarn: a repeated query parameter is rejected', async () => {
  const world = makeWorld();
  const req = primeEarnReq({ user: USER_ID, tx_id: 'tx-D', status: 'COMPLETED', reward: '5' });
  req.query.reward = ['5', '500'];
  assert.equal((await run(world, 'primeearn', req)).statusCode, 400);
  assert.equal(world.txs.length, 0);
});

const ayetParams = (overrides = {}) => ({
  external_identifier: USER_ID, transaction_id: 'ay-1', currency_amount: '5', is_chargeback: '0', offer_name: 'Test Offer', ...overrides,
});

test('ayeT: valid HMAC credits; wrong key, missing header and tampered transaction_id are rejected', async () => {
  const good = makeWorld();
  assert.equal((await run(good, 'ayet', ayetReq(ayetParams()))).body, '1');
  assert.equal(rewards(good).length, 1);
  assert.equal(wallet(good), 1500);

  const wrongKey = makeWorld();
  assert.equal((await run(wrongKey, 'ayet', ayetReq(ayetParams(), { key: 'other-key' }))).statusCode, 400);
  const noHeader = makeWorld();
  assert.equal((await run(noHeader, 'ayet', ayetReq(ayetParams(), { header: null }))).statusCode, 400);

  const tampered = makeWorld();
  const req = ayetReq(ayetParams());
  req.query.transaction_id = 'ay-2';
  assert.equal((await run(tampered, 'ayet', req)).statusCode, 400);
  for (const w of [wrongKey, noHeader, tampered]) {
    assert.equal(w.txs.length, 0);
    assert.equal(wallet(w), 1000);
  }
});

test('ayeT: space is signed as "+", repeated keys are rejected, a missing API key fails closed', async () => {
  assert.equal(ayetSignedString({ offer_name: 'TEST OFFER', a: '1' }), 'a=1&offer_name=TEST+OFFER');

  const world = makeWorld();
  const repeated = ayetReq(ayetParams());
  repeated.query.offer_name = ['a', 'b'];
  assert.equal((await run(world, 'ayet', repeated)).statusCode, 400);

  const options = adapterOptions();
  options.env.AYET_API_KEY = '';
  assert.equal((await run(world, 'ayet', ayetReq(ayetParams()), { adapterOptions: options })).statusCode, 400);
  assert.equal(world.txs.length, 0);
});

test('ayeT: reversal without a header is rejected; a signed r- reversal works once; flag/prefix disagreement is rejected', async () => {
  const world = makeWorld();
  await run(world, 'ayet', ayetReq(ayetParams()));
  assert.equal(wallet(world), 1500);

  const reversalParams = ayetParams({ transaction_id: 'r-ay-1', is_chargeback: '1' });
  assert.equal((await run(world, 'ayet', ayetReq(reversalParams, { header: null }))).statusCode, 400);
  assert.equal(wallet(world), 1500);

  await Promise.all(Array.from({ length: 5 }, () => run(world, 'ayet', ayetReq(reversalParams))));
  assert.equal(wallet(world), 1000);

  const disagree = ayetParams({ transaction_id: 'r-ay-9', is_chargeback: '0' });
  assert.equal((await run(world, 'ayet', ayetReq(disagree))).statusCode, 400);

  // replay of the reversed ayeT completion is blocked
  const replay = await run(world, 'ayet', ayetReq(ayetParams()));
  assert.equal(replay.body, '1');
  assert.equal(wallet(world), 1000);
  assert.equal(rewards(world).length, 1);
});

// ── Helper-level identity race, rollback and classification ─────────────────
const helperArgs = (world, overrides = {}) => ({
  models: world.models,
  runInTransaction: world.runInTransaction,
  userId: USER_ID,
  externalId: 'prov:T1',
  providerId: 'prov',
  identityKey: 'T1',
  creditBalance: 500,
  totalEarnedIncrement: 500,
  transactionPayload: { transactionType: 'offer_reward', sourceType: 'offer', amount: 500, description: 'x', status: 'completed', metadata: {} },
  ...overrides,
});

test('same identity under different external IDs (future shared-ID adapters): exactly one credit under concurrency', async () => {
  const world = makeWorld();
  const results = await Promise.all(
    Array.from({ length: 10 }, (_, i) => creditLegacyOfferReward(helperArgs(world, { externalId: `prov:T1-v${i}` })))
  );
  assert.equal(results.filter((r) => !r.duplicate && !r.blocked).length, 1);
  assert.equal(results.filter((r) => r.blocked && r.reason === 'changed_id_duplicate').length, 9);
  assert.equal(wallet(world), 1500);
  assert.equal(rewards(world).length, 1);
});

test('identity E11000 race: transaction aborts (wallet rolled back) BEFORE the duplicate is classified', async () => {
  const world = makeWorld();
  await creditLegacyOfferReward(helperArgs(world));
  assert.equal(wallet(world), 1500);

  // The in-transaction pre-check misses the committed row, so only the unique index stops it.
  world.blindIdentityFindOnce = true;
  const second = await creditLegacyOfferReward(helperArgs(world, { externalId: 'prov:T1-changed' }));
  assert.equal(second.blocked, true);
  assert.equal(second.reason, 'changed_id_duplicate');
  assert.equal(wallet(world), 1500, 'wallet increment rolled back');
  assert.equal(rewards(world).length, 1);
  assert.equal(world.identities.length, 1);

  // reversed identity + blind pre-check -> classified as reversed_replay after abort
  world.identities[0].status = 'reversed';
  world.blindIdentityFindOnce = true;
  const third = await creditLegacyOfferReward(helperArgs(world, { externalId: 'prov:T1-again' }));
  assert.equal(third.reason, 'reversed_replay');
  assert.equal(wallet(world), 1500);
});

test('an unexplained duplicate key is surfaced as an error so the provider retries', async () => {
  const world = makeWorld();
  const realCreate = world.Transaction.create;
  world.Transaction.create = async () => { throw Object.assign(new Error('E11000'), { code: 11000 }); };
  await assert.rejects(() => creditLegacyOfferReward(helperArgs(world)), /E11000/);
  assert.equal(wallet(world), 1000);
  world.Transaction.create = realCreate;
});

test('replay alerts are idempotent: concurrent identical T2 -> one row, attempts counted, T1 and T2 recorded, one notification signal', async () => {
  const world = makeWorld();
  const outcomes = await Promise.all(
    Array.from({ length: 10 }, () => recordReplayAlert({
      models: world.models, providerId: 'prov', userId: USER_ID, identityKey: 'T1',
      blockedExternalId: 'prov:T2', reason: 'changed_id_duplicate', firstExternalId: 'prov:T1', firstTransactionId: 'tx1',
    }))
  );
  assert.equal(outcomes.filter((o) => o.firstTime).length, 1);
  assert.equal(world.alerts.length, 1);
  assert.equal(world.alerts[0].attempts, 10);
  assert.equal(world.alerts[0].firstExternalId, 'prov:T1');
  assert.equal(world.alerts[0].blockedExternalId, 'prov:T2');
});

// ── Pre-deployment (legacy) rows ────────────────────────────────────────────
const legacyReversedRow = (externalId = 'ayet:LEG-1') => ({
  _id: 'legacy1', userId: USER_ID, externalId, transactionType: 'offer_reward', amount: 500, status: 'reversed', metadata: { providerId: 'ayet' },
});

test('legacy reversed reward with no identity row: exact-ID callback is blocked and a lazy tombstone is created (legacyIdMatchesNew proven)', async () => {
  const world = makeWorld();
  world.txs.push(legacyReversedRow());
  const result = await creditLegacyOfferReward(helperArgs(world, {
    providerId: 'ayet', identityKey: 'LEG-1', externalId: 'ayet:LEG-1', legacyIdMatchesNew: true,
  }));
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'reversed_replay');
  assert.equal(wallet(world), 1000);
  const tomb = world.identities.find((i) => i.identityKey === 'LEG-1');
  assert.equal(tomb.status, 'reversed');
  assert.equal(tomb.source, 'lazy');
});

test('legacy fallback never claims protection for an ID it cannot match: a new unlinkable ID credits normally', async () => {
  const world = makeWorld();
  world.txs.push(legacyReversedRow());
  const result = await creditLegacyOfferReward(helperArgs(world, {
    providerId: 'ayet', identityKey: 'BRAND-NEW', externalId: 'ayet:BRAND-NEW', legacyIdMatchesNew: true,
  }));
  assert.equal(result.duplicate, false);
  assert.equal(result.blocked, undefined);
  assert.equal(wallet(world), 1500);
});

test('legacyIdMatchesNew=false: a legacy row with an identical-looking ID is NOT matched and no protection is claimed', async () => {
  const world = makeWorld();
  world.txs.push(legacyReversedRow());
  const result = await creditLegacyOfferReward(helperArgs(world, {
    providerId: 'ayet', identityKey: 'LEG-1', externalId: 'ayet:LEG-1', legacyIdMatchesNew: false,
  }));
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'legacy_match_unavailable');
  assert.equal(wallet(world), 1000);
  assert.equal(world.identities.length, 0, 'no tombstone is invented');
});

test('handler logs legacy_match_unavailable and sends one honest alert for a legacy collision (default flags)', async () => {
  const world = makeWorld();
  world.txs.push(legacyReversedRow('ayet:LEG-9'));
  const res = await run(world, 'ayet', ayetReq(ayetParams({ transaction_id: 'LEG-9' })));
  assert.equal(res.body, '1');
  assert.equal(wallet(world), 1000);
  assert.ok(world.postbackLogs.some((l) => l.rejectionReason === 'legacy_match_unavailable'));
  const alert = world.adminNotifications.find((n) => n.type === 'offerwall_replay_blocked');
  assert.match(alert.message, /NOT available/);
});

test('PrimeEarn legacy matching can never be enabled (old handler stored offer_id, a different thing)', async () => {
  const registry = enabledRegistry();
  registry.primeearn.legacyIdMatchesNew = true; // even if someone flips it
  const world = makeWorld();
  world.txs.push({ _id: 'old', userId: USER_ID, externalId: 'primeearn:tx-OLD', transactionType: 'offer_reward', amount: 500, status: 'reversed', metadata: {} });
  const res = await run(world, 'primeearn',
    primeEarnReq({ user: USER_ID, tx_id: 'tx-OLD', status: 'COMPLETED', reward: '5' }),
    { adapterOptions: adapterOptions(registry) });
  assert.equal(res.body, '1');
  assert.equal(wallet(world), 1000);
  assert.ok(world.postbackLogs.some((l) => l.rejectionReason === 'legacy_match_unavailable'));
  assert.equal(world.identities.length, 0);
});

// ── Backfill classification ─────────────────────────────────────────────────
const row = (id, externalId, userId, status = 'completed') => ({ _id: id, externalId, userId, status, createdAt: new Date('2026-01-01') });

test('backfill: by default nothing is mappable (all adapters have legacyIdMatchesNew=false)', async () => {
  const world = makeWorld();
  const rows = [row('1', 'ayet:A', USER_ID), row('2', 'primeearn:B', USER_ID, 'reversed')];
  const report = classifyLegacyRows({ rows, existingUserIds: new Set([USER_ID]) });
  assert.equal(report.counts.mapped, 0);
  assert.equal(report.counts.unmappable_provider, 2);
  assert.equal(report.reversedUnprotected.length, 1);
  assert.equal(world.writes, 0);
});

test('backfill classification: mapped / unmappable_user / unmappable_format / conflict / reversed-cannot-be-protected', () => {
  const registry = buildAdapters();
  registry.ayet.legacyIdMatchesNew = true;
  const rows = [
    row('1', 'ayet:OK-1', USER_ID),
    row('2', 'ayet:OK-2', USER_ID, 'reversed'),
    row('3', 'ayet:GONE', 'cccccccccccccccccccccccc'),
    row('4', 'ayet:PLACEMENT', USER_ID),
    row('5', 'ayet:PLACEMENT', OTHER_USER_ID),
    row('6', 'ayet:DUP', USER_ID),
    row('7', 'ayet:DUP', USER_ID),
    row('8', 'ayet:', USER_ID),
    row('9', 'primeearn:X', USER_ID, 'reversed'),
  ];
  const report = classifyLegacyRows({ rows, registry, existingUserIds: new Set([USER_ID, OTHER_USER_ID]) });
  assert.equal(report.counts.mapped, 2);
  assert.equal(report.counts.unmappable_user, 1);
  assert.equal(report.counts.unmappable_format, 3); // two shared-across-users + empty value
  assert.equal(report.counts.conflict, 2);
  assert.equal(report.counts.unmappable_provider, 1);
  assert.deepEqual(report.rows.mapped.map((r) => r.identityStatus).sort(), ['credited', 'reversed']);
  assert.deepEqual(report.reversedUnprotected.map((r) => r._id), ['9']);
});

const backfillModels = (world, rows, users) => {
  const writes = { count: 0, forbidden: 0 };
  const forbidden = () => { writes.forbidden += 1; throw new Error('forbidden write'); };
  return {
    writes,
    models: {
      Transaction: {
        find: () => ({ lean: async () => rows }),
        updateOne: forbidden, updateMany: forbidden, deleteOne: forbidden, deleteMany: forbidden, findOneAndUpdate: forbidden, create: forbidden,
      },
      User: {
        find: () => ({ lean: async () => users.map((_id) => ({ _id })) }),
        updateOne: forbidden, updateMany: forbidden, deleteOne: forbidden, deleteMany: forbidden, findOneAndUpdate: forbidden,
      },
      OfferwallRewardIdentity: {
        async updateOne(filter, update, options) {
          assert.equal(options.upsert, true);
          const result = await world.Identity.updateOne(filter, update, options);
          writes.count += 1;
          return result;
        },
      },
    },
  };
};

test('backfill dry-run performs zero writes; --apply inserts only mapped rows, copies reversed, is idempotent, never touches Transaction/User', async () => {
  const registry = buildAdapters();
  registry.ayet.legacyIdMatchesNew = true;
  const rows = [
    row('1', 'ayet:OK-1', USER_ID),
    row('2', 'ayet:OK-2', USER_ID, 'reversed'),
    row('3', 'ayet:GONE', 'cccccccccccccccccccccccc'),
    row('4', 'primeearn:X', USER_ID, 'reversed'),
  ];

  const dry = makeWorld();
  const dryModels = backfillModels(dry, rows, [USER_ID]);
  const dryReport = await runBackfill({ models: dryModels.models, apply: false, registry });
  assert.equal(dryReport.dryRun, true);
  assert.equal(dryReport.counts.mapped, 2);
  assert.equal(dryModels.writes.count, 0);
  assert.equal(dry.identities.length, 0);

  const live = makeWorld();
  const liveModels = backfillModels(live, rows, [USER_ID]);
  const first = await runBackfill({ models: liveModels.models, apply: true, registry });
  assert.equal(first.applied, 2);
  assert.equal(live.identities.length, 2);
  assert.deepEqual(live.identities.map((i) => i.status).sort(), ['credited', 'reversed']);
  assert.ok(live.identities.every((i) => i.source === 'backfill'));

  const second = await runBackfill({ models: liveModels.models, apply: true, registry });
  assert.equal(second.applied, 0);
  assert.equal(live.identities.length, 2);
  assert.equal(liveModels.writes.forbidden, 0);
});

// ── Old vs new ayeT field mapping comparison ────────────────────────────────
test('ayeT comparison: full-dataset proof requires every row to match AND a confirmed template', () => {
  const tx = [
    { _id: 't1', externalId: 'ayet:A', userId: USER_ID },
    { _id: 't2', externalId: 'ayet:B', userId: OTHER_USER_ID },
  ];
  const exportRows = [
    { transaction_id: 'A', external_identifier: USER_ID },
    { transaction_id: 'B', external_identifier: OTHER_USER_ID },
  ];
  const users = new Set([USER_ID, OTHER_USER_ID]);

  const proven = compareAyetLegacyMapping({ txRows: tx, exportRows, userIds: users, templateConfirmed: true });
  assert.equal(proven.fullDatasetProven, true);
  assert.equal(proven.coverage, 1);

  assert.equal(compareAyetLegacyMapping({ txRows: tx, exportRows, userIds: users, templateConfirmed: false }).fullDatasetProven, false);

  // sid is not the transaction_id (e.g. a placement ID repeated across users)
  const placement = compareAyetLegacyMapping({
    txRows: [{ _id: 't1', externalId: 'ayet:PL-1', userId: USER_ID }, { _id: 't2', externalId: 'ayet:PL-1', userId: OTHER_USER_ID }],
    exportRows: [{ transaction_id: 'A', external_identifier: USER_ID }], userIds: users, templateConfirmed: true,
  });
  assert.equal(placement.fullDatasetProven, false);
  assert.equal(placement.sidSharedAcrossUsers.length, 1);
  assert.equal(placement.unmatched.length, 2);

  // external_identifier is ayeT's internal numeric id, not User._id
  const numeric = compareAyetLegacyMapping({
    txRows: tx, exportRows: [{ transaction_id: 'A', external_identifier: '48213' }, { transaction_id: 'B', external_identifier: OTHER_USER_ID }],
    userIds: users, templateConfirmed: true,
  });
  assert.equal(numeric.fullDatasetProven, false);
  assert.equal(numeric.userMismatch.length, 1);

  // one unmatched row out of many is not "mostly proven": the flag stays false
  const partial = compareAyetLegacyMapping({ txRows: tx, exportRows: [exportRows[0]], userIds: users, templateConfirmed: true });
  assert.equal(partial.fullDatasetProven, false);
  assert.equal(partial.coverage, 0.5);
});

test('ayeT comparison CSV parsing handles quotes and CRLF', () => {
  const rows = parseCsv('transaction_id,external_identifier,offer_name\r\nA1,u1,"Offer, with comma"\r\nA2,u2,"He said ""hi"""\r\n');
  assert.deepEqual(rows, [
    { transaction_id: 'A1', external_identifier: 'u1', offer_name: 'Offer, with comma' },
    { transaction_id: 'A2', external_identifier: 'u2', offer_name: 'He said "hi"' },
  ]);
});

// ── Guards ──────────────────────────────────────────────────────────────────
test('legacy routes do not read provider secrets inline or fall back to non-transactional writes; Direct Offers is untouched', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'routes', 'offerwalls.js'), 'utf8');
  assert.doesNotMatch(source, /PROVIDER_SECRET_MAP|createHash\('md5'\)|runAtomic\(/);
  assert.match(source, /resolveEnabledAdapter\(providerId/);
  assert.doesNotMatch(source, /require\('\.\/directOffers'\)|DirectOffer/);
  assert.match(source, /router\.post\(`\/postback\/\$\{providerId\}`/);
  assert.match(source, /router\.post\('\/webhook\/lootably', handleLootablyWebhook\)/);
});
