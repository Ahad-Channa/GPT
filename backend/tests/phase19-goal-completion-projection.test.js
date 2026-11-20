const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

const {
  groupCompletedGoalKeysByOffer,
  resolveCompletedGoalKeys,
} = require('../services/tracking/offerGoalCompletion');

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

// Exact staging identifiers/shape from the reported regression.
const OFFER_ID_HEX = '6ad1ca66eb01d4014ad16512';
const OFFER_ID = new mongoose.Types.ObjectId(OFFER_ID_HEX);
const USER_ID = new mongoose.Types.ObjectId();

const multiStepOffer = (id = OFFER_ID) => ({
  _id: id,
  goals: [
    { goalKey: 'register', enabled: true },
    { goalKey: 'deposit', enabled: true },
  ],
});

const creditedRegister = (overrides = {}) => ({
  providerId: 'direct',
  offerId: OFFER_ID,
  campaignId: OFFER_ID,
  userId: USER_ID,
  goalKey: 'register',
  internalStatus: 'approved',
  processingState: 'processed',
  rewardTransactionId: new mongoose.Types.ObjectId(),
  ...overrides,
});

const completedKeys = (conversions, offer = multiStepOffer()) =>
  resolveCompletedGoalKeys(offer, groupCompletedGoalKeysByOffer(conversions));

test('staging-shape credited register yields exactly ["register"] and deposit stays absent', () => {
  const conversions = [creditedRegister()];
  assert.deepEqual(completedKeys(conversions), ['register']);
  assert.equal(completedKeys(conversions).includes('deposit'), false);
});

test('ObjectId/string offer id normalization is consistent', () => {
  // Conversion ids as ObjectId, offer._id as ObjectId
  assert.deepEqual(completedKeys([creditedRegister()], multiStepOffer(OFFER_ID)), ['register']);

  // Conversion ids as string, offer._id as string / ObjectId
  assert.deepEqual(
    completedKeys([creditedRegister({ offerId: OFFER_ID_HEX, campaignId: OFFER_ID_HEX })], multiStepOffer(OFFER_ID_HEX)),
    ['register']
  );

  // Mixed: conversion ObjectId, offer string
  assert.deepEqual(completedKeys([creditedRegister()], multiStepOffer(OFFER_ID_HEX)), ['register']);
});

test('campaignId-only linkage (no offerId) still resolves the goal', () => {
  const conversions = [creditedRegister({ offerId: null, campaignId: OFFER_ID })];
  assert.deepEqual(completedKeys(conversions), ['register']);
});

test('reversed register is no longer completed', () => {
  const reversed = creditedRegister({ internalStatus: 'reversed', processingState: 'reversed', reversalTransactionId: new mongoose.Types.ObjectId() });
  assert.deepEqual(completedKeys([reversed]), []);
});

test('duplicate goal entries resolve to a single completion', () => {
  const duplicated = [creditedRegister(), creditedRegister()];
  const grouped = groupCompletedGoalKeysByOffer(duplicated);
  assert.equal(grouped[String(OFFER_ID)].size, 1);
  assert.deepEqual(completedKeys(duplicated), ['register']);
});

test('single-step offers and non-enabled goal keys remain empty', () => {
  assert.deepEqual(resolveCompletedGoalKeys({ _id: OFFER_ID, goals: [] }, groupCompletedGoalKeysByOffer([creditedRegister()])), []);
  // Credited goal that is disabled on the offer is not reported.
  const offerWithDisabled = { _id: OFFER_ID, goals: [{ goalKey: 'register', enabled: false }, { goalKey: 'deposit', enabled: true }] };
  assert.deepEqual(completedKeys([creditedRegister()], offerWithDisabled), []);
});

test('the Direct Offer GET route projects every field the strict guard checks', () => {
  const source = read('backend/routes/directOffers.js');
  assert.match(
    source,
    /Conversion\.find\(buildActiveGoalConversionQuery\(user\._id\)\)[\s\S]{0,120}?\.select\([^)]*internalStatus[^)]*processingState[^)]*rewardTransactionId[^)]*\)/,
    'Conversion projection must include internalStatus, processingState, and rewardTransactionId'
  );
});
