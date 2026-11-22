const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const DirectOffer = require('../models/DirectOffer');
const ClickLog = require('../models/ClickLog');
const Conversion = require('../models/Conversion');
const CustomOfferSubmission = require('../models/CustomOfferSubmission');
const User = require('../models/User');
const router = require('../routes/directOffers');
const { isClickCapReached } = require('../services/tracking/clickService');

const listHandler = router.stack
  .find((layer) => layer.route?.path === '/' && layer.route.methods.get)
  .route.stack.at(-1).handle;

const oid = () => new mongoose.Types.ObjectId();
const USER_ID = oid();

// Chainable fake covering .sort/.select/.lean/.distinct used by the list route.
const chain = (rows) => {
  const c = {
    sort: () => c, select: () => c,
    lean: async () => rows,
    distinct: async (field) => rows.map((row) => row[field]),
  };
  return c;
};

const makeOffer = (extra = {}) => ({
  _id: oid(), isActive: true, trackingMode: 'postback', title: 'click limit test', advertiserUrl: 'https://adv.example',
  rewardAmount: 297, goals: [], displayPlacements: { featured: true }, maxTotalClicks: null, totalClicks: 0, ...extra,
});

const run = async ({ offers, user = { _id: USER_ID }, clicks = [], placement = 'featured' }) => {
  const saved = {
    userFindOne: User.findOne, offerFind: DirectOffer.find, clickFind: ClickLog.find,
    convFind: Conversion.find, subFind: CustomOfferSubmission.find,
  };
  User.findOne = () => chain(user ? [user] : []).lean ? { select: () => ({ lean: async () => user }) } : null;
  DirectOffer.find = () => chain(offers);
  ClickLog.find = () => chain(clicks);
  Conversion.find = () => chain([]);
  CustomOfferSubmission.find = () => chain([]);
  try {
    let body;
    await listHandler(
      { query: { placement }, user: { uid: 'firebase-uid' } },
      { status() { return this; }, json(payload) { body = payload; return this; } }
    );
    return body;
  } finally {
    User.findOne = saved.userFindOne; DirectOffer.find = saved.offerFind; ClickLog.find = saved.clickFind;
    Conversion.find = saved.convFind; CustomOfferSubmission.find = saved.subFind;
  }
};

const ids = (body) => body.offers.map((offer) => String(offer._id));

test('isClickCapReached: unlimited / invalid caps never hide; reached caps do', () => {
  assert.equal(isClickCapReached({ maxTotalClicks: null, totalClicks: 99 }), false);
  assert.equal(isClickCapReached({ totalClicks: 99 }), false);
  assert.equal(isClickCapReached({ maxTotalClicks: 0, totalClicks: 5 }), false);
  assert.equal(isClickCapReached({ maxTotalClicks: 'abc', totalClicks: 5 }), false);
  assert.equal(isClickCapReached({ maxTotalClicks: 1, totalClicks: 0 }), false);
  assert.equal(isClickCapReached({ maxTotalClicks: 1, totalClicks: 1 }), true);
  assert.equal(isClickCapReached({ maxTotalClicks: 3, totalClicks: 7 }), true);
  assert.equal(isClickCapReached({ maxTotalClicks: 2 }), false, 'missing totalClicks counts as 0');
});

test('offer at its click cap is invisible to users who have not started it', async () => {
  const full = makeOffer({ maxTotalClicks: 1, totalClicks: 1 });
  const open = makeOffer();
  const body = await run({ offers: [full, open] });
  assert.deepEqual(ids(body), [String(open._id)]);
});

test('offer below its cap, and unlimited offers, stay visible', async () => {
  const below = makeOffer({ maxTotalClicks: 5, totalClicks: 4 });
  const unlimited = makeOffer({ maxTotalClicks: null, totalClicks: 1000 });
  const body = await run({ offers: [below, unlimited] });
  assert.equal(body.offers.length, 2);
});

test('raising the cap makes the same offer reappear (nothing was deleted)', async () => {
  const offer = makeOffer({ maxTotalClicks: 1, totalClicks: 1 });
  assert.equal((await run({ offers: [offer] })).offers.length, 0);
  offer.maxTotalClicks = 10; // admin raises the limit
  const body = await run({ offers: [offer] });
  assert.deepEqual(ids(body), [String(offer._id)]);
});

test('a user who already started the capped offer still sees it and can resume', async () => {
  const offer = makeOffer({ maxTotalClicks: 1, totalClicks: 1 });
  const click = { offerId: offer._id, status: 'clicked', clickId: 'click-1', createdAt: new Date() };
  const body = await run({ offers: [offer], clicks: [click] });
  assert.equal(body.offers.length, 1);
  assert.equal(body.offers[0].lifecycle, 'started');
});

test('logged-out requests never receive capped offers', async () => {
  const full = makeOffer({ maxTotalClicks: 2, totalClicks: 2 });
  const open = makeOffer();
  const body = await run({ offers: [full, open], user: null });
  assert.deepEqual(ids(body), [String(open._id)]);
});

test('History (placement=all) still returns a capped offer the user started, but not unstarted capped ones', async () => {
  const started = makeOffer({ maxTotalClicks: 1, totalClicks: 1 });
  const other = makeOffer({ maxTotalClicks: 1, totalClicks: 1 });
  const click = { offerId: started._id, status: 'clicked', clickId: 'c', createdAt: new Date() };
  const body = await run({ offers: [started, other], clicks: [click], placement: 'all' });
  assert.deepEqual(ids(body), [String(started._id)]);
});

test('the click endpoint still enforces the cap atomically for new clicks (unchanged)', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const click = fs.readFileSync(path.join(__dirname, '../services/tracking/clickService.js'), 'utf8');
  assert.match(click, /\$lt: \[\{ \$ifNull: \['\$totalClicks', 0\] \}, '\$maxTotalClicks'\]/);
});
