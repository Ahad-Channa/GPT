const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const DirectOffer = require('../models/DirectOffer');
const ClickLog = require('../models/ClickLog');
const Conversion = require('../models/Conversion');
const CustomOfferSubmission = require('../models/CustomOfferSubmission');
const User = require('../models/User');
const UserActivityLog = require('../models/UserActivityLog');
const router = require('../routes/directOffers');
const { upsertManualProofConversion } = require('../services/tracking/manualProofService');

const lastHandler = (routePath, method) => router.stack
  .find((layer) => layer.route?.path === routePath && layer.route.methods[method])
  .route.stack.at(-1).handle;
const startHandler = lastHandler('/click/:offerId', 'post');
const submitHandler = lastHandler('/:offerId/submit', 'post');

const oid = () => new mongoose.Types.ObjectId();
const USER_ID = oid();
const makeManualOffer = () => ({
  _id: oid(), isActive: true, trackingMode: 'manual', title: 'Manual Goodpicks', advertiserUrl: 'https://adv.example/manual',
  rewardAmount: 400, displayPlacements: { featured: true }, postbackMapping: {}, platforms: {}, goals: [],
});

// In-memory manual-offer world: one submission, at most one click.
const withWorld = async (state, fn) => {
  const saved = {
    userFindOne: User.findOne, offerFindById: DirectOffer.findById, offerUpdate: DirectOffer.findOneAndUpdate,
    clickFindOne: ClickLog.findOne, clickCreate: ClickLog.create, clickDelete: ClickLog.deleteOne,
    subFindOne: CustomOfferSubmission.findOne, subFindOneAndUpdate: CustomOfferSubmission.findOneAndUpdate,
    subFindById: CustomOfferSubmission.findById, subFindByIdAndUpdate: CustomOfferSubmission.findByIdAndUpdate,
    convCreate: Conversion.create, convFindOne: Conversion.findOne, activityCreate: UserActivityLog.create,
  };
  Object.assign(state, { clicksCreated: 0, reserved: 0, conversionsCreated: 0 });
  User.findOne = async () => ({ _id: USER_ID, isBanned: false });
  DirectOffer.findById = async () => state.offer;
  DirectOffer.findOneAndUpdate = async (_f, update) => {
    if (update?.$inc?.totalClicks === 1) { state.reserved += 1; return state.offer; }
    return state.offer;
  };
  ClickLog.findOne = async (q) => (state.click && (!q?.clickId || q.clickId === state.click.clickId) ? state.click : null);
  ClickLog.create = async (doc) => {
    state.clicksCreated += 1;
    state.click = { ...doc, _id: oid(), status: 'clicked' };
    return state.click;
  };
  ClickLog.deleteOne = async () => ({});
  CustomOfferSubmission.findOneAndUpdate = async (filter, update) => {
    if (update.$setOnInsert) {
      state.submission = state.submission || { _id: oid(), status: 'started', clickId: '', userId: USER_ID, directOfferId: state.offer._id };
      return state.submission;
    }
    if (filter._id && state.submission && !state.submission.clickId) {
      Object.assign(state.submission, update.$set);
      return state.submission;
    }
    return null;
  };
  CustomOfferSubmission.findOne = async () => state.submission || null;
  CustomOfferSubmission.findById = async () => state.submission || null;
  CustomOfferSubmission.findByIdAndUpdate = async (_id, update) => Object.assign(state.submission, update.$set);
  Conversion.create = async (payload) => { state.conversionsCreated += 1; return { _id: oid(), ...payload }; };
  Conversion.findOne = async () => null;
  UserActivityLog.create = async () => ({});
  try {
    return await fn();
  } finally {
    User.findOne = saved.userFindOne; DirectOffer.findById = saved.offerFindById; DirectOffer.findOneAndUpdate = saved.offerUpdate;
    ClickLog.findOne = saved.clickFindOne; ClickLog.create = saved.clickCreate; ClickLog.deleteOne = saved.clickDelete;
    CustomOfferSubmission.findOne = saved.subFindOne; CustomOfferSubmission.findOneAndUpdate = saved.subFindOneAndUpdate;
    CustomOfferSubmission.findById = saved.subFindById; CustomOfferSubmission.findByIdAndUpdate = saved.subFindByIdAndUpdate;
    Conversion.create = saved.convCreate; Conversion.findOne = saved.convFindOne; UserActivityLog.create = saved.activityCreate;
  }
};

const call = async (handler, state, { body = {} } = {}) => {
  const req = {
    params: { offerId: String(state.offer._id) },
    body: { placement: 'featured', ...body },
    query: {},
    user: { uid: 'firebase-uid' },
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    ip: '127.0.0.1',
  };
  let statusCode = 200;
  let payload;
  await handler(req, { status(c) { statusCode = c; return this; }, json(p) { payload = p; return this; } });
  return { statusCode, body: payload };
};

test('repeated manual starts reuse one click ID and one submission, and take one slot', async () => {
  const state = { offer: makeManualOffer() };
  await withWorld(state, async () => {
    const first = await call(startHandler, state);
    assert.equal(first.body.success, true);
    assert.equal(first.body.alreadyStarted, false);
    assert.equal(first.body.submissionStatus, 'started');
    const submissionId = state.submission._id;

    const second = await call(startHandler, state);
    const third = await call(startHandler, state);
    for (const again of [second, third]) {
      assert.equal(again.body.alreadyStarted, true);
      assert.equal(again.body.clickId, first.body.clickId);
      assert.equal(again.body.url, first.body.url);
    }
    assert.equal(state.clicksCreated, 1);
    assert.equal(state.reserved, 1);
    assert.equal(state.submission._id, submissionId);
  });
});

test('approved manual offer: no advertiser URL, no new click, no slot - completed state returned', async () => {
  const state = { offer: makeManualOffer() };
  await withWorld(state, async () => {
    const first = await call(startHandler, state);
    state.submission.status = 'approved';

    const again = await call(startHandler, state);
    assert.equal(again.statusCode, 200);
    assert.equal(again.body.success, true);
    assert.equal(again.body.alreadyCompleted, true);
    assert.equal(again.body.submissionStatus, 'approved');
    assert.equal(again.body.lifecycle, 'completed');
    assert.equal(again.body.clickId, first.body.clickId);
    assert.equal('url' in again.body, false, 'advertiser link must not be reopened');
    assert.equal(state.clicksCreated, 1);
    assert.equal(state.reserved, 1);
  });
});

test('chargebacked manual offer: no URL, no new click, no slot, and the chargeback state is untouched', async () => {
  const state = { offer: makeManualOffer() };
  await withWorld(state, async () => {
    const first = await call(startHandler, state);
    state.submission.status = 'chargebacked';

    const again = await call(startHandler, state);
    assert.equal(again.statusCode, 409);
    assert.equal(again.body.success, false);
    assert.equal(again.body.alreadyReversed, true);
    assert.equal(again.body.submissionStatus, 'chargebacked');
    assert.equal(again.body.lifecycle, 'reversed');
    assert.equal(again.body.clickId, first.body.clickId);
    assert.equal('url' in again.body, false, 'advertiser link must not be reopened');
    assert.equal(state.clicksCreated, 1, 'no second click');
    assert.equal(state.reserved, 1, 'no second slot');
    assert.equal(state.submission.status, 'chargebacked', 'status unchanged');
    assert.equal(state.conversionsCreated, 0, 'no reward path touched');
  });
});

test('started, pending and rejected manual offers keep the stored click and the proof workflow', async () => {
  for (const status of ['started', 'pending', 'rejected']) {
    const state = { offer: makeManualOffer() };
    await withWorld(state, async () => {
      const first = await call(startHandler, state);
      state.submission.status = status;
      const again = await call(startHandler, state);
      assert.equal(again.body.success, true, status);
      assert.equal(again.body.alreadyCompleted, undefined, status);
      assert.equal(again.body.submissionStatus, status, status);
      assert.equal(again.body.clickId, first.body.clickId, status);
      assert.equal(again.body.url, first.body.url, status);
      assert.equal(state.clicksCreated, 1, status);
    });
  }
});

test('proof submission stays possible for started/rejected and is refused for pending/approved/chargebacked', async () => {
  const proof = { proofText: 'screenshot attached' };
  for (const [status, allowed] of [['started', true], ['rejected', true], ['pending', false], ['approved', false], ['chargebacked', false]]) {
    const state = { offer: makeManualOffer() };
    await withWorld(state, async () => {
      await call(startHandler, state);
      state.submission.status = status;
      state.submission.save = async () => state.submission;
      const res = await call(submitHandler, state, { body: proof });
      if (allowed) {
        assert.equal(res.statusCode, 200, status);
        assert.equal(state.submission.status, 'pending', status);
        assert.equal(state.conversionsCreated, 1, status);
      } else {
        assert.equal(res.statusCode, 400, status);
        assert.equal(state.conversionsCreated, 0, `${status}: no conversion may be created`);
      }
    });
  }
});

test('retries cannot create a second reward: a credited or reversed manual proof is refused', async () => {
  const offer = makeManualOffer();
  const submission = { _id: oid(), userId: USER_ID, directOfferId: offer._id, clickId: 'click-1' };
  const clickLog = { _id: oid(), clickId: 'click-1', userId: USER_ID, offerId: offer._id, rewardAmount: 400 };
  for (const existing of [
    { processingState: 'processed', rewardTransactionId: oid(), internalStatus: 'approved' },
    { processingState: 'reversed', rewardTransactionId: oid(), internalStatus: 'reversed' },
  ]) {
    let created = 0;
    const model = {
      findOne: async () => existing,
      findOneAndUpdate: async () => { throw new Error('must not touch a credited conversion'); },
      create: async () => { created += 1; return {}; },
    };
    await assert.rejects(
      upsertManualProofConversion({ submission, clickLog, offer, conversionModel: model }),
      (error) => error.code === 'MANUAL_PROOF_ALREADY_CREDITED'
    );
    assert.equal(created, 0);
  }
});

test('a pending (not yet credited) manual proof is updated in place, never duplicated', async () => {
  const offer = makeManualOffer();
  const submission = { _id: oid(), userId: USER_ID, directOfferId: offer._id, clickId: 'click-1' };
  const clickLog = { _id: oid(), clickId: 'click-1', userId: USER_ID, offerId: offer._id, rewardAmount: 400 };
  let created = 0;
  let updated = 0;
  const model = {
    findOne: async () => ({ processingState: 'pending', internalStatus: 'pending', rewardTransactionId: null }),
    findOneAndUpdate: async () => { updated += 1; return {}; },
    create: async () => { created += 1; return {}; },
  };
  await upsertManualProofConversion({ submission, clickLog, offer, conversionModel: model });
  assert.equal(created, 0);
  assert.equal(updated, 1);
});
