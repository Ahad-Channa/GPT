const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');

process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'your-project-id';

const adminRouter = require('../routes/admin');
const directOffersRouter = require('../routes/directOffers');
const DirectOffer = require('../models/DirectOffer');
const User = require('../models/User');
const AdminLog = require('../models/AdminLog');
const { normalizeDisplayPlacements } = require('../utils/directOfferInput');

const { buildPlacementClause, resolveClickPlacement } = directOffersRouter.__testInternals;

// ─── Model defaults / backward compatibility ──────────────────────────────────

test('Featured placement defaults on and branded defaults off for legacy/omitted config', () => {
  const offer = new DirectOffer({
    title: 'Legacy Featured',
    description: 'desc',
    rewardAmount: 100,
    advertiserUrl: 'https://example.com',
  });
  assert.equal(offer.displayPlacements.featured, true);
  assert.equal(offer.displayPlacements.brandedOfferwall, false);

  assert.deepEqual(normalizeDisplayPlacements(undefined), { featured: true, brandedOfferwall: false });
  assert.deepEqual(normalizeDisplayPlacements({}), { featured: true, brandedOfferwall: false });
});

// ─── Server-side filtering sources of truth ───────────────────────────────────

test('featured and branded filters are independent and driven by displayPlacements', () => {
  assert.deepEqual(buildPlacementClause('featured'), { 'displayPlacements.featured': { $ne: false } });
  assert.deepEqual(buildPlacementClause('brandedOfferwall'), { 'displayPlacements.brandedOfferwall': true });
  assert.deepEqual(buildPlacementClause('all'), {
    $or: [
      { 'displayPlacements.featured': { $ne: false } },
      { 'displayPlacements.brandedOfferwall': true },
    ],
  });
});

test('a featured-off, branded-on offer is rejected from Featured but allowed in branded', () => {
  const offer = { displayPlacements: { featured: false, brandedOfferwall: true } };
  assert.deepEqual(resolveClickPlacement(offer, 'featured'), { placement: 'featured', allowed: false });
  assert.deepEqual(resolveClickPlacement(offer, 'brandedOfferwall'), { placement: 'brandedOfferwall', allowed: true });
});

// ─── Create-time placement persistence ────────────────────────────────────────

test('create accepts Featured on and Featured off (with branded on) and rejects no-placement', () => {
  assert.deepEqual(normalizeDisplayPlacements({ featured: true, brandedOfferwall: false }), {
    featured: true,
    brandedOfferwall: false,
  });
  assert.deepEqual(normalizeDisplayPlacements({ featured: false, brandedOfferwall: true }), {
    featured: false,
    brandedOfferwall: true,
  });
  assert.throws(() => normalizeDisplayPlacements({ featured: false, brandedOfferwall: false }), /At least one direct-offer placement/);
});

// ─── Admin edit: Featured toggle is independent and non-destructive ────────────

const request = (app, { method = 'GET', path: requestPath, headers = {}, body } = {}) => new Promise((resolve, reject) => {
  const server = http.createServer(app);
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      method,
      path: requestPath,
      headers: {
        ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
        ...headers,
      },
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { server.close(); resolve({ statusCode: res.statusCode, body: data ? JSON.parse(data) : {} }); });
    });
    req.on('error', (error) => { server.close(); reject(error); });
    if (payload) req.write(payload);
    req.end();
  });
});

const makeDbUser = (overrides = {}) => ({
  _id: 'admin-user-id',
  firebaseUid: 'dev-mock-uid',
  email: 'admin@example.com',
  role: 'admin',
  adminPermissions: ['manage_offerwalls'],
  ...overrides,
});

const editPayload = (displayPlacements) => ({
  title: 'Live Offer',
  titleDe: 'Live Angebot',
  description: 'desc',
  descriptionDe: 'beschreibung',
  rewardAmount: 500,
  advertiserPayoutAmount: 2,
  advertiserUrl: 'https://example.com/landing',
  isActive: true,
  displayPlacements,
  allowedCountries: ['US'],
  platforms: { desktop: true, android: true, ios: true },
  requirements: ['Do the thing'],
  requirementsDe: ['Mach die Sache'],
  requirementType: 'bullets',
  goals: [{ goalKey: 'deposit', label: 'Deposit', rewardAmount: 250, payoutAmount: 1, timeLimitDays: 3, enabled: true }],
  postbackMapping: { clickIdParam: 'click_id', transactionIdParam: 'txn_id', statusParam: 'status' },
  maxTotalClicks: 100,
});

const putOffer = async (app, payload) => {
  let captured = null;
  const originalFindByIdAndUpdate = DirectOffer.findByIdAndUpdate;
  const originalUserFindOne = User.findOne;
  const originalAdminLogCreate = AdminLog.create;

  User.findOne = () => Promise.resolve(makeDbUser());
  AdminLog.create = async () => ({});
  DirectOffer.findByIdAndUpdate = async (id, update, options) => {
    captured = { id, update, options };
    return {
      _id: id,
      title: update.title,
      displayPlacements: update.displayPlacements,
      isActive: update.isActive,
      maxTotalClicks: update.maxTotalClicks,
      totalClicks: 42,
      goals: update.goals,
    };
  };

  try {
    const res = await request(app, {
      method: 'PUT',
      path: '/api/admin/direct-offers/offer-123',
      headers: { authorization: 'Bearer dev' },
      body: payload,
    });
    return { res, captured };
  } finally {
    DirectOffer.findByIdAndUpdate = originalFindByIdAndUpdate;
    User.findOne = originalUserFindOne;
    AdminLog.create = originalAdminLogCreate;
  }
};

test('editing a live offer toggles Featured and preserves id, active status, clicks, goals, and branded placement', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);

  // Featured ON (branded ON stays untouched)
  const onResult = await putOffer(app, editPayload({ featured: true, brandedOfferwall: true }));
  assert.equal(onResult.res.statusCode, 200);
  assert.equal(onResult.captured.id, 'offer-123');
  assert.equal(onResult.captured.update.displayPlacements.featured, true);
  assert.equal(onResult.captured.update.displayPlacements.brandedOfferwall, true);
  assert.equal(onResult.captured.update.isActive, true);
  assert.equal(onResult.captured.update.maxTotalClicks, 100);
  assert.equal(onResult.captured.update.goals[0].timeLimitDays, 3);
  assert.equal(onResult.captured.update.goals[0].goalKey, 'deposit');
  // Click history is never part of the update payload.
  assert.equal(Object.prototype.hasOwnProperty.call(onResult.captured.update, 'totalClicks'), false);

  // Featured OFF (branded ON unchanged; same document id)
  const offResult = await putOffer(app, editPayload({ featured: false, brandedOfferwall: true }));
  assert.equal(offResult.res.statusCode, 200);
  assert.equal(offResult.captured.id, 'offer-123');
  assert.equal(offResult.captured.update.displayPlacements.featured, false);
  assert.equal(offResult.captured.update.displayPlacements.brandedOfferwall, true);
  assert.equal(offResult.captured.update.isActive, true);
  assert.equal(Object.prototype.hasOwnProperty.call(offResult.captured.update, 'totalClicks'), false);

  // Featured back ON with branded OFF => branded is not auto-enabled
  const reOnResult = await putOffer(app, editPayload({ featured: true, brandedOfferwall: false }));
  assert.equal(reOnResult.captured.update.displayPlacements.featured, true);
  assert.equal(reOnResult.captured.update.displayPlacements.brandedOfferwall, false);
});

test('admin edit rejects removing every placement (featured off with branded off)', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);

  const originalFindByIdAndUpdate = DirectOffer.findByIdAndUpdate;
  const originalUserFindOne = User.findOne;
  const originalAdminLogCreate = AdminLog.create;
  let called = false;
  try {
    User.findOne = () => Promise.resolve(makeDbUser());
    AdminLog.create = async () => ({});
    DirectOffer.findByIdAndUpdate = async () => { called = true; return null; };

    const res = await request(app, {
      method: 'PUT',
      path: '/api/admin/direct-offers/offer-123',
      headers: { authorization: 'Bearer dev' },
      body: editPayload({ featured: false, brandedOfferwall: false }),
    });
    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /At least one direct-offer placement/);
    assert.equal(called, false, 'no update should run when the placement invariant is violated');
  } finally {
    DirectOffer.findByIdAndUpdate = originalFindByIdAndUpdate;
    User.findOne = originalUserFindOne;
    AdminLog.create = originalAdminLogCreate;
  }
});
