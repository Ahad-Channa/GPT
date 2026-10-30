const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'your-project-id';

const DirectOffer = require('../models/DirectOffer');
const { parseMaxTotalClicks } = require('../utils/directOfferInput');
const { reserveDirectOfferClickSlot, releaseDirectOfferClickSlot } = require('../services/tracking/clickService');

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

// Fake DirectOffer model mirroring the real guarded findOneAndUpdate semantics:
//   reserve filter: { _id, $or: [ { maxTotalClicks: null }, { $expr: total < max } ] }
//   release filter: { _id, totalClicks: { $gt: 0 } }
const makeOfferModel = (offer) => ({
  async findOneAndUpdate(filter, update) {
    if (String(filter._id) !== String(offer._id)) return null;
    if (filter.$or) {
      const max = offer.maxTotalClicks;
      const total = Number(offer.totalClicks) || 0;
      const allowed = max == null || total < max;
      if (!allowed) return null;
    }
    if (filter.totalClicks && filter.totalClicks.$gt !== undefined) {
      if (!((Number(offer.totalClicks) || 0) > filter.totalClicks.$gt)) return null;
    }
    if (update.$inc) {
      for (const [key, value] of Object.entries(update.$inc)) {
        offer[key] = (Number(offer[key]) || 0) + value;
      }
    }
    return offer;
  },
});

// ─── Validation ───────────────────────────────────────────────────────────────

test('parseMaxTotalClicks accepts blank as unlimited and positive integers', () => {
  assert.equal(parseMaxTotalClicks(undefined), null);
  assert.equal(parseMaxTotalClicks(null), null);
  assert.equal(parseMaxTotalClicks(''), null);
  assert.equal(parseMaxTotalClicks(5), 5);
  assert.equal(parseMaxTotalClicks('100'), 100);
});

test('parseMaxTotalClicks rejects zero, negative, decimal, and invalid strings with 400', () => {
  for (const invalid of [0, -1, 1.5, 'abc', '2.5']) {
    assert.throws(
      () => parseMaxTotalClicks(invalid),
      (error) => error.statusCode === 400 && /positive integer/.test(error.message),
      `maxTotalClicks ${invalid} must be rejected`
    );
  }
});

test('DirectOffer defaults maxTotalClicks to null and stores a positive integer', () => {
  const base = { title: 't', description: 'd', rewardAmount: 10, advertiserUrl: 'https://example.com' };
  assert.equal(new DirectOffer(base).maxTotalClicks, null);
  assert.equal(new DirectOffer({ ...base, maxTotalClicks: 100 }).maxTotalClicks, 100);
});

// ─── Reservation semantics / live edits ───────────────────────────────────────

test('below cap reserves and increments totalClicks exactly once', async () => {
  const offer = { _id: 'o1', totalClicks: 50, maxTotalClicks: 100 };
  const reserved = await reserveDirectOfferClickSlot({ offerId: 'o1', offerModel: makeOfferModel(offer) });
  assert.ok(reserved);
  assert.equal(offer.totalClicks, 51);
});

test('the final slot reserves; the next click is blocked', async () => {
  const offer = { _id: 'o2', totalClicks: 99, maxTotalClicks: 100 };
  const model = makeOfferModel(offer);
  assert.ok(await reserveDirectOfferClickSlot({ offerId: 'o2', offerModel: model }));
  assert.equal(offer.totalClicks, 100);
  assert.equal(await reserveDirectOfferClickSlot({ offerId: 'o2', offerModel: model }), null);
  assert.equal(offer.totalClicks, 100);
});

test('an old offer with missing totalClicks and a cap can still reserve', async () => {
  const offer = { _id: 'o3', maxTotalClicks: 100 };
  const reserved = await reserveDirectOfferClickSlot({ offerId: 'o3', offerModel: makeOfferModel(offer) });
  assert.ok(reserved);
  assert.equal(offer.totalClicks, 1);
});

test('unlimited offers (maxTotalClicks null) always reserve', async () => {
  const offer = { _id: 'o4', totalClicks: 999, maxTotalClicks: null };
  assert.ok(await reserveDirectOfferClickSlot({ offerId: 'o4', offerModel: makeOfferModel(offer) }));
  assert.equal(offer.totalClicks, 1000);
});

test('raising the limit while live re-opens capacity; no reset of totalClicks', async () => {
  const offer = { _id: 'o5', totalClicks: 100, maxTotalClicks: 100 };
  assert.equal(await reserveDirectOfferClickSlot({ offerId: 'o5', offerModel: makeOfferModel(offer) }), null);
  offer.maxTotalClicks = 200;
  assert.ok(await reserveDirectOfferClickSlot({ offerId: 'o5', offerModel: makeOfferModel(offer) }));
  assert.equal(offer.totalClicks, 101);
});

test('lowering the limit below the current count blocks immediately', async () => {
  const offer = { _id: 'o6', totalClicks: 150, maxTotalClicks: 200 };
  assert.ok(await reserveDirectOfferClickSlot({ offerId: 'o6', offerModel: makeOfferModel(offer) }));
  offer.maxTotalClicks = 100;
  assert.equal(await reserveDirectOfferClickSlot({ offerId: 'o6', offerModel: makeOfferModel(offer) }), null);
});

test('clearing the limit makes the offer unlimited immediately', async () => {
  const offer = { _id: 'o7', totalClicks: 100, maxTotalClicks: 100 };
  assert.equal(await reserveDirectOfferClickSlot({ offerId: 'o7', offerModel: makeOfferModel(offer) }), null);
  offer.maxTotalClicks = null;
  assert.ok(await reserveDirectOfferClickSlot({ offerId: 'o7', offerModel: makeOfferModel(offer) }));
});

test('simultaneous final-slot requests cannot exceed the cap', async () => {
  const offer = { _id: 'o8', totalClicks: 0, maxTotalClicks: 5 };
  const model = makeOfferModel(offer);
  const results = await Promise.all(
    Array.from({ length: 20 }, () => reserveDirectOfferClickSlot({ offerId: 'o8', offerModel: model }))
  );
  assert.equal(results.filter(Boolean).length, 5);
  assert.equal(offer.totalClicks, 5);
});

// ─── Compensation / defensive release ─────────────────────────────────────────

test('compensation returns the counter to its previous value', async () => {
  const offer = { _id: 'o9', totalClicks: 50, maxTotalClicks: 100 };
  const model = makeOfferModel(offer);
  await reserveDirectOfferClickSlot({ offerId: 'o9', offerModel: model });
  assert.equal(offer.totalClicks, 51);
  await releaseDirectOfferClickSlot({ offerId: 'o9', offerModel: model });
  assert.equal(offer.totalClicks, 50);
});

test('release cannot drive totalClicks below zero', async () => {
  const offer = { _id: 'o10', totalClicks: 0, maxTotalClicks: 100 };
  const released = await releaseDirectOfferClickSlot({ offerId: 'o10', offerModel: makeOfferModel(offer) });
  assert.equal(released, null);
  assert.equal(offer.totalClicks, 0);
});

test('a blocked attempt does not change totalClicks', async () => {
  const offer = { _id: 'o11', totalClicks: 100, maxTotalClicks: 100 };
  const before = offer.totalClicks;
  assert.equal(await reserveDirectOfferClickSlot({ offerId: 'o11', offerModel: makeOfferModel(offer) }), null);
  assert.equal(offer.totalClicks, before);
});

// ─── Route wiring ─────────────────────────────────────────────────────────────

test('the click route reserves the only increment, blocks with 409, and never increments twice', () => {
  const source = read('backend/routes/directOffers.js');
  // Old independent increment removed.
  assert.doesNotMatch(source, /\$inc: \{ totalClicks: 1 \}/);
  assert.match(source, /reserveDirectOfferClickSlot\(\{ offerId: offer\._id \}\)/);
  assert.match(source, /releaseDirectOfferClickSlot\(\{ offerId: offer\._id \}\)/);
  assert.match(source, /status\(409\)/);
  assert.match(source, /limitReached: true/);
  // Reserve happens after the reused-click branch (which must not consume a slot)...
  assert.ok(source.indexOf('await reserveDirectOfferClickSlot') > source.indexOf('existingApproved'));
  // ...and before ClickLog creation.
  assert.ok(source.indexOf('await reserveDirectOfferClickSlot') < source.indexOf('await createDirectOfferClick'));
});

test('postback/reward paths are unaffected by the click cap', () => {
  for (const file of [
    'backend/services/tracking/conversionService.js',
    'backend/services/tracking/offerGoalCompletion.js',
    'backend/services/rewards/rewardService.js',
  ]) {
    assert.doesNotMatch(read(file), /maxTotalClicks/, `${file} must not use maxTotalClicks`);
  }
});

// ─── Frontend ─────────────────────────────────────────────────────────────────

const offerClickLimitUrl = pathToFileURL(path.join(repoRoot, 'frontend/src/utils/offerClickLimit.js')).href;

test('isOfferClickLimitReached reports the cap state for the UI', async () => {
  const { isOfferClickLimitReached } = await import(offerClickLimitUrl);
  assert.equal(isOfferClickLimitReached({ maxTotalClicks: null, totalClicks: 10 }), false);
  assert.equal(isOfferClickLimitReached({ totalClicks: 10 }), false);
  assert.equal(isOfferClickLimitReached({ maxTotalClicks: 5, totalClicks: 4 }), false);
  assert.equal(isOfferClickLimitReached({ maxTotalClicks: 5, totalClicks: 5 }), true);
  assert.equal(isOfferClickLimitReached({ maxTotalClicks: 5, totalClicks: 6 }), true);
  assert.equal(isOfferClickLimitReached({ maxTotalClicks: '5', totalClicks: '5' }), true);
});

test('frontend click handlers honor limitReached without opening the advertiser URL', () => {
  const card = read('frontend/src/components/offers/DirectOfferCard.jsx');
  assert.match(card, /isOfferClickLimitReached\(offer\)/);
  assert.match(card, /data\.limitReached/);
  assert.match(card, /This offer has reached its click limit\./);
  assert.match(card, /disabled=\{loading \|\| isExpired \|\| limitReached\}/);

  const goodpicks = read('frontend/src/components/offers/GoodpicksModal.jsx');
  assert.match(goodpicks, /isOfferClickLimitReached\(offer\)/);
  assert.match(goodpicks, /data\.limitReached/);
  assert.match(goodpicks, /This offer has reached its click limit\./);
  assert.match(goodpicks, /disabled=\{loading \|\| limitReached\}/);
});

test('admin direct-offer form exposes the total click cap and current count', () => {
  const admin = read('frontend/src/pages/admin/AdminDirectOffers.jsx');
  assert.match(admin, /maxTotalClicks: offer\?\.maxTotalClicks \?\? ''/);
  assert.match(admin, /maxTotalClicks: \(form\.maxTotalClicks === '' \|\| form\.maxTotalClicks == null\) \? null : Number\(form\.maxTotalClicks\)/);
  assert.match(admin, /Max Total Clicks/);
  assert.match(admin, /Clicks: \{isEdit \? \(offer\?\.totalClicks \?\? 0\) : 0\}/);
});
