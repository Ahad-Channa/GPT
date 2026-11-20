const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const offerwallsRouter = require('../routes/offerwalls');

const { creditLegacyOfferReward, reverseLegacyOfferTransaction } = offerwallsRouter.__testInternals;

// ── In-memory models ────────────────────────────────────────────────────────
// Mimic what the real database provides that the fix relies on:
//  * unique Transaction.externalId (E11000 on duplicate insert)
//  * atomic conditional findOneAndUpdate
//  * a transaction runner that is serialized (isolation) and rolls back every
//    write when the callback throws (abort).
const tick = () => new Promise((resolve) => setImmediate(resolve));

const matchesStatus = (doc, cond) => {
  if (cond === undefined) return true;
  if (cond && typeof cond === 'object' && '$ne' in cond) return doc.status !== cond.$ne;
  return doc.status === cond;
};

const matches = (doc, filter = {}) =>
  Object.entries(filter).every(([key, cond]) => (key === 'status' ? matchesStatus(doc, cond) : String(doc[key]) === String(cond)));

const applyUpdate = (doc, update = {}) => {
  for (const [field, value] of Object.entries(update.$set || {})) doc[field] = value;
  for (const [field, value] of Object.entries(update.$inc || {})) doc[field] = (doc[field] || 0) + value;
};

const makeWorld = () => {
  const world = { users: new Map(), txs: [], nextId: 1, blindFindOneOnce: false, failNextUserUpdate: false };

  const query = (value) => {
    const promise = Promise.resolve(value);
    promise.session = () => query(value);
    return promise;
  };

  world.User = {
    async findOneAndUpdate(filter, update, options = {}) {
      await tick();
      if (world.failNextUserUpdate) { world.failNextUserUpdate = false; throw new Error('injected user failure'); }
      const user = world.users.get(String(filter._id));
      if (!user) return null;
      const before = { ...user };
      applyUpdate(user, update);
      return options.new === false ? before : { ...user };
    },
    async findByIdAndUpdate(id, update) {
      await tick();
      const user = world.users.get(String(id));
      if (user) applyUpdate(user, update);
      return user ? { ...user } : null;
    },
  };

  world.Transaction = {
    findOne(filter) {
      if (world.blindFindOneOnce) {
        // Simulates the race: the pre-check ran before the competing insert committed.
        world.blindFindOneOnce = false;
        return query(null);
      }
      const doc = world.txs.find((tx) => matches(tx, filter));
      return query(doc ? { ...doc } : null);
    },
    find(filter) {
      return query(world.txs.filter((tx) => matches(tx, filter)).map((tx) => ({ ...tx })));
    },
    async create(payload) {
      await tick();
      const payloads = Array.isArray(payload) ? payload : [payload];
      const created = [];
      for (const item of payloads) {
        if (item.externalId && world.txs.some((tx) => tx.externalId === item.externalId)) {
          throw Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });
        }
        const doc = { _id: `tx${world.nextId++}`, status: 'completed', ...item };
        world.txs.push(doc);
        created.push({ ...doc });
      }
      return Array.isArray(payload) ? created : created[0];
    },
    async findOneAndUpdate(filter, update, options = {}) {
      await tick();
      const doc = world.txs.find((tx) => matches(tx, filter));
      if (!doc) return null;
      const before = { ...doc };
      applyUpdate(doc, update);
      return options.new === false ? before : { ...doc };
    },
  };

  // Serialized transaction with rollback on throw.
  let queue = Promise.resolve();
  world.runInTransaction = (operation) => {
    const run = queue.then(async () => {
      const snapshot = {
        users: new Map([...world.users].map(([k, v]) => [k, { ...v }])),
        txs: world.txs.map((tx) => ({ ...tx })),
      };
      try {
        return await operation({ fakeSession: true });
      } catch (error) {
        world.users = snapshot.users;
        world.txs = snapshot.txs;
        throw error;
      }
    });
    queue = run.catch(() => {});
    return run;
  };

  world.models = { User: world.User, Transaction: world.Transaction };
  return world;
};

const creditArgs = (world, overrides = {}) => ({
  models: world.models,
  runInTransaction: world.runInTransaction,
  userId: 'u1',
  externalId: 'cpx:txn-1',
  creditBalance: 500,
  totalEarnedIncrement: 500,
  transactionPayload: {
    transactionType: 'offer_reward',
    sourceType: 'offer',
    amount: 500,
    description: 'Offer Reward',
    status: 'completed',
    metadata: { providerId: 'cpx' },
  },
  ...overrides,
});

const seedUser = (world) => world.users.set('u1', { _id: 'u1', walletBalance: 1000, totalEarned: 0 });

// ── Positive callbacks ──────────────────────────────────────────────────────
test('concurrent duplicate positive callbacks credit the wallet and ledger exactly once', async () => {
  const world = makeWorld();
  seedUser(world);

  const results = await Promise.all(
    Array.from({ length: 10 }, () => creditLegacyOfferReward(creditArgs(world)))
  );

  assert.equal(results.filter((r) => !r.duplicate).length, 1);
  assert.equal(results.filter((r) => r.duplicate).length, 9);
  assert.equal(world.users.get('u1').walletBalance, 1500);
  assert.equal(world.users.get('u1').totalEarned, 500);
  assert.equal(world.txs.filter((tx) => tx.externalId === 'cpx:txn-1').length, 1);
  assert.equal(world.txs[0].balanceAfter, 1500);
  assert.equal(world.txs[0].amount, 500);
  assert.equal(world.txs[0].transactionType, 'offer_reward');
});

test('a duplicate that slips past the pre-check rolls back its wallet increment', async () => {
  const world = makeWorld();
  seedUser(world);

  const first = await creditLegacyOfferReward(creditArgs(world));
  assert.equal(first.duplicate, false);
  assert.equal(world.users.get('u1').walletBalance, 1500);

  // Pre-check misses the committed row (the race); the unique key must still stop it.
  world.blindFindOneOnce = true;
  const second = await creditLegacyOfferReward(creditArgs(world));

  assert.equal(second.duplicate, true);
  assert.equal(world.users.get('u1').walletBalance, 1500, 'wallet increment must be rolled back');
  assert.equal(world.users.get('u1').totalEarned, 500);
  assert.equal(world.txs.length, 1);
});

test('a failure after the wallet increment leaves neither wallet nor ledger changed', async () => {
  const world = makeWorld();
  seedUser(world);
  const originalCreate = world.Transaction.create;
  world.Transaction.create = async () => { throw new Error('ledger write failed'); };

  await assert.rejects(() => creditLegacyOfferReward(creditArgs(world)), /ledger write failed/);
  assert.equal(world.users.get('u1').walletBalance, 1000);
  assert.equal(world.users.get('u1').totalEarned, 0);
  assert.equal(world.txs.length, 0);

  world.Transaction.create = originalCreate;
  const retry = await creditLegacyOfferReward(creditArgs(world));
  assert.equal(retry.duplicate, false);
  assert.equal(world.users.get('u1').walletBalance, 1500);
});

test('different transaction IDs are still credited independently (behavior unchanged)', async () => {
  const world = makeWorld();
  seedUser(world);

  await creditLegacyOfferReward(creditArgs(world, { externalId: 'cpx:a' }));
  await creditLegacyOfferReward(creditArgs(world, { externalId: 'cpx:b' }));

  assert.equal(world.users.get('u1').walletBalance, 2000);
  assert.equal(world.txs.length, 2);
});

// ── Chargebacks ─────────────────────────────────────────────────────────────
const seedRewardWithLinks = async (world) => {
  seedUser(world);
  world.users.get('u1').walletBalance = 1500;
  world.users.get('u1').commissionGenerated = 25;
  world.users.set('ref', { _id: 'ref', walletBalance: 100, referralEarnings: 25 });
  world.txs.push(
    { _id: 'orig', userId: 'u1', externalId: 'cpx:txn-1', transactionType: 'offer_reward', amount: 500, status: 'completed' },
    { _id: 'link-hold', userId: 'ref', linkedTransactionId: 'orig', transactionType: 'referral_reward', amount: 25, status: 'hold' },
    { _id: 'link-bonus', userId: 'ref', linkedTransactionId: 'orig', transactionType: 'referral_reward', amount: 10, status: 'completed' }
  );
};

const reverseArgs = (world, overrides = {}) => ({
  models: world.models,
  runInTransaction: world.runInTransaction,
  userId: 'u1',
  originalExternalId: 'cpx:txn-1',
  ...overrides,
});

test('concurrent duplicate chargebacks deduct the wallet and linked rows exactly once', async () => {
  const world = makeWorld();
  await seedRewardWithLinks(world);

  const results = await Promise.all(
    Array.from({ length: 10 }, () => reverseLegacyOfferTransaction(reverseArgs(world)))
  );

  assert.equal(results.filter((r) => r.reversed).length, 1);
  assert.equal(world.users.get('u1').walletBalance, 1000, 'original 500 deducted once');
  assert.equal(world.users.get('u1').commissionGenerated, 25 - 25 - 10);
  // held referral: only referralEarnings reduced; completed bonus: wallet and earnings reduced.
  assert.equal(world.users.get('ref').walletBalance, 100 - 10);
  assert.equal(world.users.get('ref').referralEarnings, 25 - 25 - 10);
  assert.ok(world.txs.every((tx) => tx.status === 'reversed'));
});

test('a chargeback for an already-reversed or unknown original is a no-op', async () => {
  const world = makeWorld();
  await seedRewardWithLinks(world);
  await reverseLegacyOfferTransaction(reverseArgs(world));
  const balanceAfterFirst = world.users.get('u1').walletBalance;

  const repeat = await reverseLegacyOfferTransaction(reverseArgs(world));
  assert.equal(repeat.reversed, false);
  assert.equal(repeat.originalTx.status, 'reversed');

  const unknown = await reverseLegacyOfferTransaction(reverseArgs(world, { originalExternalId: 'cpx:missing' }));
  assert.equal(unknown.reversed, false);
  assert.equal(unknown.originalTx, null);
  assert.equal(world.users.get('u1').walletBalance, balanceAfterFirst);
});

test('a chargeback failing midway rolls back the status flip and every deduction', async () => {
  const world = makeWorld();
  await seedRewardWithLinks(world);
  const realUpdate = world.User.findByIdAndUpdate;
  let calls = 0;
  world.User.findByIdAndUpdate = async (...args) => {
    calls += 1;
    if (calls === 2) throw new Error('injected mid-chargeback failure');
    return realUpdate(...args);
  };

  await assert.rejects(() => reverseLegacyOfferTransaction(reverseArgs(world)), /mid-chargeback/);
  assert.equal(world.users.get('u1').walletBalance, 1500);
  assert.equal(world.users.get('ref').walletBalance, 100);
  assert.ok(world.txs.every((tx) => tx.status !== 'reversed'));

  world.User.findByIdAndUpdate = realUpdate;
  const retry = await reverseLegacyOfferTransaction(reverseArgs(world));
  assert.equal(retry.reversed, true);
  assert.equal(world.users.get('u1').walletBalance, 1000);
});

test('negative-balance policy is preserved: a chargeback larger than the balance goes negative', async () => {
  const world = makeWorld();
  seedUser(world);
  world.users.get('u1').walletBalance = 100;
  world.txs.push({ _id: 'orig', userId: 'u1', externalId: 'cpx:txn-1', transactionType: 'offer_reward', amount: 500, status: 'completed' });

  const result = await reverseLegacyOfferTransaction(reverseArgs(world));
  assert.equal(result.reversed, true);
  assert.equal(world.users.get('u1').walletBalance, -400);
});

// ── Source-level guards on the handler wiring ───────────────────────────────
test('legacy handler credits and reverses only through the transactional helpers', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'routes', 'offerwalls.js'), 'utf8');
  const handler = source.slice(source.indexOf('const handleLegacyOfferwallPostback'));

  assert.match(handler, /await creditLegacyOfferReward\(/);
  assert.match(handler, /await reverseLegacyOfferTransaction\(/);
  // No bare wallet mutation or non-atomic ledger insert left in the handler's reward/chargeback path.
  assert.doesNotMatch(handler.slice(0, handler.indexOf('// 12. Send Offer Reward Notification')), /User\.findOneAndUpdate|Transaction\.create\(|originalTx\.save\(\)/);
  // The helper uses a real transaction and has no non-transactional fallback.
  assert.match(source, /session\.withTransaction/);
  assert.doesNotMatch(source, /runAtomic\(|strategy:\s*'fallback'/);
});
