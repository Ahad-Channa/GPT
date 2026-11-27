const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { resolveOfferLifecycle, groupOfferCreditState } = require('../services/tracking/offerGoalCompletion');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', '..', p), 'utf8');

// ── VIP: a level is announced only once ─────────────────────────────────────
const stubModel = (modulePath, impl) => {
  const resolved = require.resolve(modulePath);
  const previous = require.cache[resolved];
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: impl };
  return () => {
    if (previous) require.cache[resolved] = previous;
    else delete require.cache[resolved];
  };
};

const leanQuery = (rows) => ({ select: () => ({ lean: async () => rows }) });

const runLevelUp = async ({ claimedKeys = [], notifiedKeys = [] }) => {
  const created = [];
  const emitted = [];
  const restore = [
    stubModel('../models/VipConfig', {
      find: async () => [],
      findOne: async ({ levelKey }) => ({ levelKey, rewardAmount: levelKey === 'bronze_1' ? 50 : 100 }),
    }),
    stubModel('../models/VipClaim', {
      find: () => leanQuery(claimedKeys.map((levelKey) => ({ levelKey }))),
    }),
    stubModel('../models/Notification', {
      find: () => leanQuery(notifiedKeys.map((levelKey) => ({ metadata: { levelKey } }))),
      create: async (doc) => { created.push(doc); return doc; },
    }),
  ];
  try {
    delete require.cache[require.resolve('../utils/vipUtils')];
    const { processVipLevelUp, VIP_LEVELS } = require('../utils/vipUtils');
    const bronze1 = VIP_LEVELS.find((lvl) => lvl.key === 'bronze_1');
    const user = { _id: 'u1', firebaseUid: 'fb1', totalEarned: bronze1.threshold + 10 };
    await processVipLevelUp(user, 20, (...args) => emitted.push(args));
  } finally {
    restore.forEach((fn) => fn());
    delete require.cache[require.resolve('../utils/vipUtils')];
  }
  return { created, emitted };
};

test('VIP level-up notification is sent the first time a level is reached', async () => {
  const { created, emitted } = await runLevelUp({});
  assert.equal(created.length, 1);
  assert.equal(created[0].metadata.levelKey, 'bronze_1');
  assert.equal(emitted.length, 1);
});

test('no VIP notification again for a level that was already claimed (progress dropped after a chargeback)', async () => {
  const { created, emitted } = await runLevelUp({ claimedKeys: ['bronze_1'] });
  assert.equal(created.length, 0);
  assert.equal(emitted.length, 0);
});

test('a level notified before but not claimed is announced again (the claim is still possible)', async () => {
  const { created, emitted } = await runLevelUp({ notifiedKeys: ['bronze_1'] });
  assert.equal(created.length, 1);
  assert.equal(emitted.length, 1);
});

// ── Charged-back offers are closed ──────────────────────────────────────────
const offer = { _id: 'o1', trackingMode: 'postback' };
const click = (goalsSnapshot) => ({ status: 'approved', goalsSnapshot });
const conv = (goalKey, internalStatus) => ({
  offerId: 'o1',
  goalKey,
  internalStatus,
  processingState: internalStatus === 'reversed' ? 'reversed' : 'processed',
  rewardTransactionId: 'tx',
});

test('single-step charged-back offer is reversed', () => {
  const creditState = groupOfferCreditState([conv(null, 'reversed')]).o1;
  assert.equal(resolveOfferLifecycle({ offer, click: click(null), creditState }), 'reversed');
});

test('multi-step: no step left to earn and one charged back -> reversed; open step left -> started', () => {
  const steps = { a: { amount: 1 }, b: { amount: 2 } };
  const allDone = groupOfferCreditState([conv('a', 'approved'), conv('b', 'reversed')]).o1;
  assert.equal(
    resolveOfferLifecycle({ offer, click: click(steps), completedGoalKeys: ['a'], creditState: allDone }),
    'reversed'
  );
  const oneOpen = groupOfferCreditState([conv('a', 'reversed')]).o1;
  assert.equal(
    resolveOfferLifecycle({ offer, click: click(steps), completedGoalKeys: [], creditState: oneOpen }),
    'started'
  );
  const allCredited = groupOfferCreditState([conv('a', 'approved'), conv('b', 'approved')]).o1;
  assert.equal(
    resolveOfferLifecycle({ offer, click: click(steps), completedGoalKeys: ['a', 'b'], creditState: allCredited }),
    'completed'
  );
});

test('a charged-back offer cannot be started again and the list query carries goalKey', () => {
  const routes = read('backend/routes/directOffers.js');
  assert.match(routes, /if \(lifecycle === 'reversed'\) \{[\s\S]{0,300}status\(409\)[\s\S]{0,200}charged back and cannot be earned again/);
  assert.match(routes, /buildOfferCreditConversionQuery\(user\._id\)\)\s*\n\s*\.select\('offerId campaignId goalKey /);
});
