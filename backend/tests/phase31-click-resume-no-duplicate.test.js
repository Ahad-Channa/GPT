const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

const DirectOffer = require('../models/DirectOffer');
const ClickLog = require('../models/ClickLog');
const Conversion = require('../models/Conversion');
const User = require('../models/User');
const router = require('../routes/directOffers');
const { resolveUserOfferLifecycle } = require('../services/tracking/offerGoalCompletion');

// ── Drives the REAL POST /click/:offerId handler with the models' query methods
// replaced by in-memory fakes (no database). ──────────────────────────────────
const clickHandler = router.stack
  .find((layer) => layer.route?.path === '/click/:offerId' && layer.route.methods.post)
  .route.stack.at(-1).handle;

const oid = () => new mongoose.Types.ObjectId();
const USER_ID = oid();

const makeOffer = (goals = []) => ({
  _id: oid(),
  isActive: true,
  trackingMode: 'postback',
  title: 'Plarium Vikings',
  advertiserUrl: 'https://adv.example/offer',
  rewardAmount: 100,
  displayPlacements: { featured: true },
  postbackMapping: {},
  platforms: {},
  goals,
});
const goal = (goalKey, enabled = true) => ({ goalKey, enabled, label: goalKey, rewardAmount: 50, payoutAmount: 0 });
const conv = (offer, goalKey, extra = {}) => ({
  offerId: offer._id, campaignId: offer._id, goalKey, internalStatus: 'approved', processingState: 'processed', rewardTransactionId: oid(), ...extra,
});

const chain = (rows) => ({ select: () => ({ lean: async () => rows }) });

// state: { offer, click, conversions }
const withFakes = async (state, fn) => {
  const originals = {
    userFindOne: User.findOne, offerFindById: DirectOffer.findById, offerUpdate: DirectOffer.findOneAndUpdate,
    clickFindOne: ClickLog.findOne, clickCreate: ClickLog.create, convFind: Conversion.find,
  };
  state.created = 0;
  state.reserved = 0;
  state.released = 0;
  state.createAttempts = 0;
  User.findOne = async () => ({ _id: USER_ID, isBanned: false });
  DirectOffer.findById = async () => state.offer;
  DirectOffer.findOneAndUpdate = async (filter, update) => {
    if (update?.$inc?.totalClicks === 1) { state.reserved += 1; return state.offer; }
    if (update?.$inc?.totalClicks === -1) { state.released += 1; return state.offer; }
    return null;
  };
  ClickLog.findOne = async () => state.click || null;
  ClickLog.create = async (doc) => {
    state.createAttempts += 1;
    if (state.click) {
      const error = new Error('E11000 duplicate key directOfferClaimKey');
      error.code = 11000;
      error.keyPattern = { directOfferClaimKey: 1 };
      throw error;
    }
    state.created += 1;
    state.click = { ...doc, _id: oid(), status: 'clicked', createdAt: new Date() };
    return state.click;
  };
  Conversion.find = () => chain(state.conversions || []);
  try {
    return await fn();
  } finally {
    User.findOne = originals.userFindOne;
    DirectOffer.findById = originals.offerFindById;
    DirectOffer.findOneAndUpdate = originals.offerUpdate;
    ClickLog.findOne = originals.clickFindOne;
    ClickLog.create = originals.clickCreate;
    Conversion.find = originals.convFind;
  }
};

const start = async (state) => {
  const req = {
    params: { offerId: String(state.offer._id) },
    body: { placement: 'featured' },
    query: {},
    user: { uid: 'firebase-uid' },
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    ip: '127.0.0.1',
  };
  let statusCode = 200;
  let body;
  const res = { status(code) { statusCode = code; return this; }, json(payload) { body = payload; return this; } };
  await clickHandler(req, res);
  return { statusCode, body };
};

const existingClick = (offer, status = 'clicked') => ({
  _id: oid(), clickId: 'click-original', userId: USER_ID, offerId: offer._id, status,
  redirectUrl: 'https://adv.example/offer?click_id=click-original',
});

test('first start creates exactly one click; repeated starts reuse it and never create or reserve another', async () => {
  const state = { offer: makeOffer(), conversions: [] };
  await withFakes(state, async () => {
    const first = await start(state);
    assert.equal(first.statusCode, 200);
    assert.equal(first.body.alreadyStarted, false);
    assert.equal(state.created, 1);
    assert.equal(state.reserved, 1);

    const second = await start(state);
    const third = await start(state);
    for (const again of [second, third]) {
      assert.equal(again.body.success, true);
      assert.equal(again.body.alreadyStarted, true);
      assert.equal(again.body.alreadyCompleted, false);
      assert.equal(again.body.clickId, first.body.clickId);
      assert.equal(again.body.url, first.body.url);
    }
    assert.equal(state.created, 1, 'no second click ID');
    assert.equal(state.reserved, 1, 'no extra click slot');
  });
});

test('concurrent starts collapse onto one click ID and give the extra slot back', async () => {
  const state = { offer: makeOffer(), conversions: [] };
  await withFakes(state, async () => {
    const [a, b] = await Promise.all([start(state), start(state)]);
    assert.equal(a.body.success && b.body.success, true);
    assert.equal(a.body.clickId, b.body.clickId);
    assert.equal(state.created, 1);
    assert.equal(state.reserved - state.released, 1, 'exactly one slot stays consumed');
  });
});

test('unfinished multi-step offer: a repeated start resumes the ORIGINAL click (needed to earn remaining goals)', async () => {
  const offer = makeOffer([goal('register'), goal('deposit'), goal('level_10')]);
  // First goal credited, so click.status is already "approved" - this is NOT completion.
  const state = { offer, click: existingClick(offer, 'approved'), conversions: [conv(offer, 'register')] };
  await withFakes(state, async () => {
    const res = await start(state);
    assert.equal(res.body.success, true);
    assert.equal(res.body.alreadyStarted, true);
    assert.equal(res.body.alreadyApproved, true, 'legacy flag unchanged');
    assert.equal(res.body.alreadyCompleted, false);
    assert.equal(res.body.lifecycle, 'started');
    assert.equal(res.body.clickId, 'click-original');
    assert.equal(res.body.url, 'https://adv.example/offer?click_id=click-original');
    assert.equal(state.createAttempts, 0, 'never creates another click');
    assert.equal(state.reserved, 0);
  });
});

test('fully credited multi-step offer: original click returned, no tracking link to reopen', async () => {
  const offer = makeOffer([goal('register'), goal('deposit'), goal('retired', false)]); // disabled goal does not block
  const state = { offer, click: existingClick(offer, 'approved'), conversions: [conv(offer, 'register'), conv(offer, 'deposit')] };
  await withFakes(state, async () => {
    const res = await start(state);
    assert.equal(res.body.success, true);
    assert.equal(res.body.alreadyCompleted, true);
    assert.equal(res.body.lifecycle, 'completed');
    assert.equal(res.body.clickId, 'click-original');
    assert.equal('url' in res.body, false);
    assert.equal(state.createAttempts, 0);
    assert.equal(state.reserved, 0);
  });
});

test('credited single-step offer: no new click and no link to reopen', async () => {
  const offer = makeOffer();
  const state = { offer, click: existingClick(offer, 'approved'), conversions: [conv(offer, null)] };
  await withFakes(state, async () => {
    const res = await start(state);
    assert.equal(res.body.alreadyCompleted, true);
    assert.equal('url' in res.body, false);
    assert.equal(state.createAttempts, 0);
  });
});

test('reversed single-step offer: still the original click only, never completed, never re-creditable', async () => {
  const offer = makeOffer();
  const state = {
    offer,
    click: existingClick(offer, 'approved'),
    conversions: [conv(offer, null, { internalStatus: 'reversed', processingState: 'reversed' })],
  };
  await withFakes(state, async () => {
    const res = await start(state);
    // charged back: no tracking link at all, and never a second click
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.lifecycle, 'reversed');
    assert.equal(res.body.url, undefined);
    assert.equal(state.createAttempts, 0, 'a reversal never opens the door to a second click');
  });
});

test('multi-step with one reversed goal stays resumable on the original click only while a step is open', async () => {
  const offer = makeOffer([goal('register'), goal('deposit'), goal('level')]);
  const state = {
    offer,
    click: existingClick(offer, 'approved'),
    conversions: [conv(offer, 'register'), conv(offer, 'deposit', { internalStatus: 'reversed', processingState: 'reversed' })],
  };
  await withFakes(state, async () => {
    const res = await start(state);
    assert.equal(res.body.alreadyCompleted, false);
    assert.equal(res.body.lifecycle, 'started');
    assert.equal(state.createAttempts, 0);
  });
});

test('pending / rejected clicks keep returning the original click', async () => {
  for (const status of ['pending', 'rejected']) {
    const offer = makeOffer();
    const state = { offer, click: existingClick(offer, status), conversions: [] };
    await withFakes(state, async () => {
      const res = await start(state);
      assert.equal(res.body.alreadyCompleted, false, status);
      assert.equal(res.body.clickId, 'click-original', status);
      assert.equal(state.createAttempts, 0, status);
    });
  }
});

test('resolveUserOfferLifecycle is read-only and scoped to one user and one offer', async () => {
  const offer = makeOffer([goal('a')]);
  const queries = [];
  const model = { find: (query) => { queries.push(query); return chain([conv(offer, 'a')]); } };
  const lifecycle = await resolveUserOfferLifecycle({
    offer, click: existingClick(offer, 'approved'), userId: USER_ID, conversionModel: model,
  });
  assert.equal(lifecycle, 'completed');
  assert.equal(String(queries[0].userId), String(USER_ID));
  assert.equal(queries[0].providerId, 'direct');
  assert.deepEqual(queries[0].$or, [{ offerId: offer._id }, { campaignId: offer._id }]);
  const source = fs.readFileSync(path.join(__dirname, '../services/tracking/offerGoalCompletion.js'), 'utf8');
  assert.doesNotMatch(source, /findOneAndUpdate|updateOne|updateMany|\.save\(|\.create\(/);
});

test('reward identity, idempotency and reversal code are untouched by this change', () => {
  const service = fs.readFileSync(path.join(__dirname, '../services/tracking/conversionService.js'), 'utf8');
  assert.match(service, /direct-offer-reward:\$\{userId\}:\$\{offerId\}:\$\{normalizedGoalKey \|\| 'single'\}/);
  const route = fs.readFileSync(path.join(__dirname, '../routes/directOffers.js'), 'utf8');
  assert.match(route, /findExistingDirectOfferClick\(\{/);
  assert.match(route, /reserveDirectOfferClickSlot\(\{ offerId: offer\._id \}\)/);
});
