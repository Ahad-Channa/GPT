const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const DirectOffer = require('../models/DirectOffer');
const Conversion = require('../models/Conversion');
const { createOrResolveConversion } = require('../services/tracking/conversionService');

const oid = () => new mongoose.Types.ObjectId();
const providerConfig = { providerId: 'direct', providerSettings: {} };
const mapped = (clickId) => ({ clickId, transactionId: `manual:${clickId}`, status: 'approved', payout: null, eventType: '', providerUserId: '', extra: {} });
const security = { checked: true, passed: true, method: 'admin_manual', reason: 'Manual admin click approval' };

// Fake conversion model that, like Mongoose, rejects a filter whose offerId /
// userId cannot be cast to an ObjectId (CastError) - the real cause of
// "Failed to approve click".
const makeModel = (state) => {
  const castFilter = (filter) => Conversion.find(filter).cast(Conversion);
  return {
    findOne: async (filter) => {
      castFilter(filter);
      state.queries.push(filter);
      return null;
    },
    create: async (payload) => {
      state.created.push(payload);
      return { _id: oid(), ...payload };
    },
  };
};

const makeClick = (offerRef, userId) => ({ _id: oid(), clickId: 'click-1', userId, offerId: offerRef, campaignId: offerRef?._id || offerRef, campaignType: 'direct_offer', rewardAmount: 5000 });

test('admin click approval: a click loaded with populate("offerId") resolves a conversion instead of throwing a CastError', async () => {
  const userId = oid();
  const offer = new DirectOffer({ title: 'english', advertiserUrl: 'https://adv.example', rewardAmount: 5000 }); // a populated document
  const state = { queries: [], created: [] };

  const result = await createOrResolveConversion({
    providerConfig, mapped: mapped('click-1'), internalStatus: 'approved',
    clickLog: makeClick(offer, userId), payoutAmount: 0, security, goalKey: null, rewardAmount: 5000,
    conversionModel: makeModel(state),
  });

  assert.ok(result.conversion, 'a conversion is created');
  assert.equal(state.created.length, 1);
  // identity uses ids, never a stringified document
  assert.equal(state.created[0].idempotencyKey, `direct-offer-reward:${userId}:${offer._id}:single`);
  for (const query of state.queries) {
    if (query.offerId) assert.equal(query.offerId, String(offer._id));
    if (query.campaignId) assert.equal(query.campaignId, String(offer._id));
  }
});

test('populated and unpopulated clicks produce the SAME reward identity (admin approval cannot bypass duplicate protection)', async () => {
  const userId = oid();
  const offer = new DirectOffer({ title: 'english', advertiserUrl: 'https://adv.example', rewardAmount: 5000 });
  const keyFor = async (offerRef) => {
    const state = { queries: [], created: [] };
    await createOrResolveConversion({
      providerConfig, mapped: mapped('click-1'), internalStatus: 'approved',
      clickLog: makeClick(offerRef, userId), payoutAmount: 0, security, goalKey: null,
      conversionModel: makeModel(state),
    });
    return state.created[0].idempotencyKey;
  };
  assert.equal(await keyFor(offer), await keyFor(offer._id));
});

test('replay protection is unchanged: an existing user+offer conversion for another click is still refused', async () => {
  const userId = oid();
  const offerId = oid();
  const existing = { _id: oid(), clickLogId: oid(), clickId: 'other-click', providerTransactionId: 'txn-1' };
  const model = { findOne: async () => existing, create: async () => { throw new Error('must not create'); } };
  const result = await createOrResolveConversion({
    providerConfig, mapped: mapped('click-2'), internalStatus: 'approved',
    clickLog: makeClick(offerId, userId), payoutAmount: 0, security, conversionModel: model,
  });
  assert.equal(result.isDuplicate, true);
  assert.equal(result.shouldProcess, false);
  assert.equal(result.transition, 'direct_offer_goal_already_rewarded');
});
