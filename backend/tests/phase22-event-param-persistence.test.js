const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');
const mongoose = require('mongoose');

process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'your-project-id';

const adminRouter = require('../routes/admin');
const DirectOffer = require('../models/DirectOffer');
const User = require('../models/User');
const AdminLog = require('../models/AdminLog');
const { buildDirectOfferProviderConfig } = require('../services/tracking/directOfferProvider');
const { mapPostbackParameters } = require('../services/tracking/parameterMapper');
const { buildGoalsSnapshot, resolveGoal } = require('../utils/offerGoals');

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
      res.on('end', () => {
        server.close();
        resolve({ statusCode: res.statusCode, body: data ? JSON.parse(data) : {} });
      });
    });
    req.on('error', (error) => { server.close(); reject(error); });
    if (payload) req.write(payload);
    req.end();
  });
});

const makeDbUser = () => ({
  _id: 'admin-user-id',
  firebaseUid: 'dev-mock-uid',
  email: 'admin@example.com',
  role: 'admin',
  adminPermissions: ['manage_offerwalls'],
});

const baseOfferPayload = (overrides = {}) => ({
  title: 'Plarium Vikings',
  description: 'Play Vikings',
  rewardAmount: 500,
  advertiserUrl: 'https://advertiser.example/offer',
  displayPlacements: { featured: true, brandedOfferwall: false },
  goals: [{
    goalKey: 'fight_20_battles',
    label: 'Fight 20 Battles',
    rewardAmount: 250,
    externalEventId: 'Game Event 269',
    enabled: true,
  }],
  ...overrides,
});

const withMocks = async (run) => {
  const originalUserFindOne = User.findOne;
  const originalAdminLogCreate = AdminLog.create;
  const originalCreate = DirectOffer.create;
  const originalFindById = DirectOffer.findById;
  const originalFindByIdAndUpdate = DirectOffer.findByIdAndUpdate;
  User.findOne = () => Promise.resolve(makeDbUser());
  AdminLog.create = async () => ({});
  try {
    return await run();
  } finally {
    User.findOne = originalUserFindOne;
    AdminLog.create = originalAdminLogCreate;
    DirectOffer.create = originalCreate;
    DirectOffer.findById = originalFindById;
    DirectOffer.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
};

const adminApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);
  return app;
};

test('admin create persists eventTypeParam through real Mongoose casting/serialization', async () => {
  let created = null;
  DirectOffer.create = async (payload) => {
    const doc = new DirectOffer(payload);
    const validationError = doc.validateSync();
    if (validationError) throw validationError;
    created = doc;
    return doc;
  };

  await withMocks(async () => {
    const res = await request(adminApp(), {
      method: 'POST',
      path: '/api/admin/direct-offers',
      headers: { authorization: 'Bearer dev' },
      body: baseOfferPayload({
        postbackMapping: { eventTypeParam: 'event_id' },
      }),
    });
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.offer.postbackMapping.eventTypeParam, 'event_id');
  });

  assert.ok(created);
  assert.equal(created.postbackMapping.eventTypeParam, 'event_id');
  assert.equal(created.toObject().postbackMapping.eventTypeParam, 'event_id');
  assert.ok(DirectOffer.schema.path('postbackMapping.eventTypeParam'));
});

test('admin edit does not revert a saved custom event parameter', async () => {
  const existing = new DirectOffer(baseOfferPayload({
    postbackMapping: { eventTypeParam: 'event_id' },
  }));
  let updated = null;

  DirectOffer.findByIdAndUpdate = async (id, update) => {
    const merged = new DirectOffer({ ...existing.toObject(), ...update, _id: id });
    updated = merged;
    return merged;
  };

  await withMocks(async () => {
    const res = await request(adminApp(), {
      method: 'PUT',
      path: '/api/admin/direct-offers/offer-123',
      headers: { authorization: 'Bearer dev' },
      body: { title: 'Plarium Vikings Renamed' },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.offer.postbackMapping.eventTypeParam, 'event_id');
  });

  assert.ok(updated);
  assert.equal(updated.postbackMapping.eventTypeParam, 'event_id');
  assert.equal(updated.toObject().postbackMapping.eventTypeParam, 'event_id');
});

test('provider config and generated postback URL use the saved event_id parameter', async () => {
  const offer = new DirectOffer(baseOfferPayload({
    postbackMapping: {
      eventTypeParam: 'event_id',
      clickIdParam: 'click_id',
    },
  }));

  const config = buildDirectOfferProviderConfig(offer);
  assert.equal(config.parameterMappings.eventType, 'event_id');
  assert.deepEqual(config.statusMappings.pending, ['pending']);

  DirectOffer.findById = async () => offer;
  await withMocks(async () => {
    const res = await request(adminApp(), {
      method: 'GET',
      path: `/api/admin/direct-offers/${offer._id}/postback-url`,
      headers: { authorization: 'Bearer dev' },
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.body.postbackUrl, /event_id=\{EVENT_TYPE\}/);
  });
});

test('incoming event_id=Game Event 269 resolves to the configured internal goal', () => {
  const offer = new DirectOffer(baseOfferPayload({
    postbackMapping: { eventTypeParam: 'event_id' },
  }));
  const config = buildDirectOfferProviderConfig(offer);
  const snapshot = buildGoalsSnapshot(offer.goals);

  const mapped = mapPostbackParameters({
    query: {
      click_id: 'click-1',
      txn_id: 'txn-1',
      status: 'approved',
      event_id: 'Game Event 269',
    },
    body: {},
    mappings: config.parameterMappings,
    requiredFields: config.providerSettings.requiredFields,
  });

  assert.equal(mapped.isValid, true);
  assert.equal(mapped.mapped.eventType, 'Game Event 269');

  const resolution = resolveGoal({
    goalsSnapshot: snapshot,
    eventType: mapped.mapped.eventType,
  });
  assert.equal(resolution.matched, true);
  assert.equal(resolution.goalKey, 'fight_20_battles');
});

test('unknown and ambiguous external events still fail safely', () => {
  const snapshot = buildGoalsSnapshot(new DirectOffer(baseOfferPayload()).goals);

  assert.equal(resolveGoal({ goalsSnapshot: snapshot, eventType: 'Game Event 999' }).matched, false);

  const ambiguous = {
    ...snapshot,
    another_goal: {
      amount: 100,
      label: 'Another goal',
      externalEventId: 'Game Event 269',
      externalEventAliases: [],
    },
  };
  const result = resolveGoal({ goalsSnapshot: ambiguous, eventType: 'Game Event 269' });
  assert.equal(result.matched, false);
  assert.match(result.reason, /Ambiguous/);
});

test('postback mappings remain backward compatible and pending stays fixed', () => {
  const legacyOffer = new DirectOffer(baseOfferPayload());
  assert.equal(legacyOffer.postbackMapping.eventTypeParam, 'event_type');

  const config = buildDirectOfferProviderConfig(legacyOffer);
  assert.equal(config.parameterMappings.eventType, 'event_type');
  assert.deepEqual(config.statusMappings.pending, ['pending']);

  const withLegacyPendingValue = buildDirectOfferProviderConfig({
    postbackMapping: { pendingValue: 'waiting' },
  });
  assert.deepEqual(withLegacyPendingValue.statusMappings.pending, ['pending']);
});
