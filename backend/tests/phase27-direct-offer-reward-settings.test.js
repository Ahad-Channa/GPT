const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'your-project-id';

const adminRouter = require('../routes/admin');
const directOffersRouter = require('../routes/directOffers');
const DirectOffer = require('../models/DirectOffer');
const ClickLog = require('../models/ClickLog');
const Conversion = require('../models/Conversion');
const CustomOfferSubmission = require('../models/CustomOfferSubmission');
const User = require('../models/User');
const AdminLog = require('../models/AdminLog');
const {
  assertCoinRewardAmount, assertEnabledGoalRewards, normalizeGoals, parseCoinReward, sumEnabledGoalRewards,
} = require('../utils/offerGoals');

const { stripAdminOnlyPayoutFields } = directOffersRouter.__testInternals;
const repoRoot = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

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

const adminApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);
  return app;
};
const publicApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/direct-offers', directOffersRouter);
  return app;
};

const ADMIN = {
  _id: 'admin-user-id', firebaseUid: 'dev-mock-uid', email: 'admin@example.com', role: 'admin', adminPermissions: ['manage_offerwalls'],
};
const AUTH = { authorization: 'Bearer dev' };

const goal = (overrides = {}) => ({ goalKey: 'deposit', label: 'Deposit', rewardAmount: 250, payoutAmount: 1, enabled: true, ...overrides });
const offerBody = (overrides = {}) => ({
  title: 'Plarium',
  description: 'Play',
  advertiserUrl: 'https://advertiser.example/offer',
  displayPlacements: { featured: true, brandedOfferwall: false },
  rewardAmount: 100,
  advertiserPayoutAmount: 2.5,
  goals: [],
  ...overrides,
});

// Runs `fn` with the admin user + stores stubbed, capturing the DirectOffer write.
// `stored` is what DirectOffer.findById(...).select(...).lean() returns on the update path
// (undefined means "not found"). `captured.findByIdCalls` counts reads of the stored offer.
const withAdminMocks = async (fn, { stored } = {}) => {
  const originals = {
    findOne: User.findOne, logCreate: AdminLog.create, create: DirectOffer.create, update: DirectOffer.findByIdAndUpdate, findById: DirectOffer.findById,
  };
  const captured = { created: null, updated: null, writes: 0, findByIdCalls: 0 };
  DirectOffer.findById = () => {
    captured.findByIdCalls += 1;
    const link = { select: () => link, lean: async () => stored || null };
    return link;
  };
  User.findOne = () => Promise.resolve(ADMIN);
  AdminLog.create = async () => ({});
  DirectOffer.create = async (payload) => { captured.created = payload; captured.writes += 1; return { _id: 'new-offer', ...payload }; };
  DirectOffer.findByIdAndUpdate = async (id, update) => { captured.updated = { id, update }; captured.writes += 1; return { _id: id, ...update }; };
  try {
    await fn(captured);
  } finally {
    User.findOne = originals.findOne;
    AdminLog.create = originals.logCreate;
    DirectOffer.create = originals.create;
    DirectOffer.findByIdAndUpdate = originals.update;
    DirectOffer.findById = originals.findById;
  }
};

const post = (body) => request(adminApp(), { method: 'POST', path: '/api/admin/direct-offers', headers: AUTH, body });
const put = (body) => request(adminApp(), { method: 'PUT', path: '/api/admin/direct-offers/offer-1', headers: AUTH, body });

// ── Automatic total ─────────────────────────────────────────────────────────
test('create: multi-step total is calculated from enabled step rewards and ignores any submitted total', async () => {
  await withAdminMocks(async (captured) => {
    const res = await post(offerBody({
      rewardAmount: 999999, // a manually typed total must be ignored
      goals: [
        goal({ goalKey: 'register', rewardAmount: 100 }),
        goal({ goalKey: 'deposit', rewardAmount: 250 }),
        goal({ goalKey: 'level5', rewardAmount: 5000, enabled: false }), // disabled: not counted
      ],
    }));
    assert.equal(res.statusCode, 201);
    assert.equal(captured.created.rewardAmount, 350);
    assert.equal(res.body.offer.rewardAmount, 350);
    assert.equal(captured.created.goals.length, 3);
  });
});

test('create: single-step offers keep using the submitted coin reward', async () => {
  await withAdminMocks(async (captured) => {
    const res = await post(offerBody({ rewardAmount: 321 }));
    assert.equal(res.statusCode, 201);
    assert.equal(captured.created.rewardAmount, 321);
  });
});

test('update: total is recalculated from enabled steps and ignores a manually submitted total', async () => {
  await withAdminMocks(async (captured) => {
    const res = await put({
      rewardAmount: 12345,
      goals: [goal({ goalKey: 'a', rewardAmount: 40 }), goal({ goalKey: 'b', rewardAmount: 60 }), goal({ goalKey: 'c', rewardAmount: 9, enabled: false })],
    });
    assert.equal(res.statusCode, 200);
    assert.equal(captured.updated.update.rewardAmount, 100);
  });
});

test('update: an edit without goals leaves rewardAmount alone unless one is explicitly provided', async () => {
  await withAdminMocks(async (captured) => {
    await put({ title: 'Renamed' });
    assert.equal('rewardAmount' in captured.updated.update, false);
    assert.equal('goals' in captured.updated.update, false);
  });
});

test('storage-layer normalizeGoals is unchanged (fractional coins can no longer reach it because requests are rejected first)', () => {
  const stored = normalizeGoals([{ goalKey: 'a', rewardAmount: 1.9 }, { goalKey: 'b', rewardAmount: 2.2 }]);
  assert.deepEqual(stored.map((g) => g.rewardAmount), [1, 2]);
  assert.equal(sumEnabledGoalRewards(stored), 3);
});

// ── Enabled-goal validation ─────────────────────────────────────────────────
test('assertEnabledGoalRewards rejects an enabled step with zero, negative, blank or non-numeric coins', () => {
  for (const bad of [0, '0', -5, '', '   ', 'abc', null, undefined, NaN, Infinity, 0.5, '0.9', 1.9, '1.9', 2.5, '1e2', true, []]) {
    assert.throws(
      () => assertEnabledGoalRewards([goal({ rewardAmount: bad })]),
      (error) => error.statusCode === 400 && /Step 1 \("Deposit"\) is enabled/.test(error.message) && /whole number of at least 1/.test(error.message),
      `expected ${JSON.stringify(bad)} to be rejected`
    );
  }
});

test('assertEnabledGoalRewards accepts whole-number rewards and ignores disabled steps (even fractional ones)', () => {
  assert.doesNotThrow(() => assertEnabledGoalRewards([
    goal({ goalKey: 'ok', rewardAmount: 1 }),
    goal({ goalKey: 'big', rewardAmount: 5000 }),
    goal({ goalKey: 'str', rewardAmount: '250' }),
    goal({ goalKey: 'off', rewardAmount: 0, enabled: false }),
    goal({ goalKey: 'off2', rewardAmount: '', enabled: false }),
    goal({ goalKey: 'off3', rewardAmount: 1.9, enabled: false }),
  ]));
  assert.doesNotThrow(() => assertEnabledGoalRewards([]));
  assert.doesNotThrow(() => assertEnabledGoalRewards(undefined));
});

test('assertEnabledGoalRewards names the offending step number and label', () => {
  assert.throws(
    () => assertEnabledGoalRewards([goal({ goalKey: 'first', label: 'First', rewardAmount: 10 }), goal({ goalKey: 'second', label: 'Second', rewardAmount: 0 })]),
    /Step 2 \("Second"\)/
  );
});

test('create: an enabled zero-coin step is rejected with a clear 400 and nothing is written', async () => {
  await withAdminMocks(async (captured) => {
    const res = await post(offerBody({ goals: [goal({ goalKey: 'a', rewardAmount: 100 }), goal({ goalKey: 'b', label: 'Level 5', rewardAmount: 0 })] }));
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.error, /Step 2 \("Level 5"\) is enabled but its coin reward must be a whole number of at least 1/);
    assert.equal(captured.writes, 0);
  });
});

test('create: a blank or non-numeric enabled step reward is rejected instead of being silently dropped', async () => {
  await withAdminMocks(async (captured) => {
    for (const bad of ['', 'abc']) {
      const res = await post(offerBody({ goals: [goal({ rewardAmount: bad })] }));
      assert.equal(res.statusCode, 400, JSON.stringify(bad));
    }
    assert.equal(captured.writes, 0);
  });
});

test('create: a disabled zero-coin step is allowed and does not count toward the total', async () => {
  await withAdminMocks(async (captured) => {
    const res = await post(offerBody({ goals: [goal({ goalKey: 'a', rewardAmount: 75 }), goal({ goalKey: 'b', rewardAmount: 0, enabled: false })] }));
    assert.equal(res.statusCode, 201);
    assert.equal(captured.created.rewardAmount, 75);
  });
});

test('update: an enabled zero-coin step is rejected with a clear 400 and nothing is written', async () => {
  await withAdminMocks(async (captured) => {
    const res = await put({ goals: [goal({ goalKey: 'a', rewardAmount: 0 })] });
    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /Step 1 \("Deposit"\) is enabled/);
    assert.equal(captured.writes, 0);
  });
});

test('manual offers ignore goals as before and are not blocked by step validation', async () => {
  await withAdminMocks(async (captured) => {
    const res = await post(offerBody({ trackingMode: 'manual', rewardAmount: 50, goals: [goal({ rewardAmount: 0 })] }));
    assert.equal(res.statusCode, 201);
    assert.equal(captured.created.rewardAmount, 50);
  });
});

// ── Whole-number coin rewards ───────────────────────────────────────────────
test('parseCoinReward accepts only whole numbers of at least 1 and never rounds', () => {
  for (const [input, expected] of [[1, 1], [250, 250], ['250', 250], [' 7 ', 7], [5000, 5000]]) {
    assert.equal(parseCoinReward(input), expected, JSON.stringify(input));
  }
  for (const bad of [1.9, '1.9', 0.5, '0.5', 2.0000001, 0, '0', -1, '-1', '', '   ', 'abc', '1e2', '0x10', NaN, Infinity, -Infinity, null, undefined, true, false, [], [5], {}, Number.MAX_SAFE_INTEGER + 2]) {
    assert.equal(parseCoinReward(bad), null, String(JSON.stringify(bad)));
  }
});

test('assertCoinRewardAmount returns the integer or throws a 400 without converting', () => {
  assert.equal(assertCoinRewardAmount('321'), 321);
  for (const bad of [1.9, '1.9', 0.5, 0, -3, '', 'x', null, undefined]) {
    assert.throws(() => assertCoinRewardAmount(bad), (error) => error.statusCode === 400 && /whole number of at least 1/.test(error.message), String(JSON.stringify(bad)));
  }
});

test('create: a fractional enabled step reward (1.9, "1.9", 0.5) is rejected with a 400 and nothing is written', async () => {
  await withAdminMocks(async (captured) => {
    for (const bad of [1.9, '1.9', 0.5]) {
      const res = await post(offerBody({ goals: [goal({ goalKey: 'a', rewardAmount: 100 }), goal({ goalKey: 'b', label: 'Level 5', rewardAmount: bad })] }));
      assert.equal(res.statusCode, 400, JSON.stringify(bad));
      assert.match(res.body.error, /Step 2 \("Level 5"\) is enabled but its coin reward must be a whole number of at least 1/);
    }
    assert.equal(captured.writes, 0);
  });
});

test('update: a fractional enabled step reward (1.9, "1.9", 0.5) is rejected with a 400 and nothing is written', async () => {
  await withAdminMocks(async (captured) => {
    for (const bad of [1.9, '1.9', 0.5]) {
      const res = await put({ goals: [goal({ goalKey: 'a', rewardAmount: bad })] });
      assert.equal(res.statusCode, 400, JSON.stringify(bad));
      assert.match(res.body.error, /whole number of at least 1/);
    }
    assert.equal(captured.writes, 0);
    assert.equal(captured.findByIdCalls, 0);
  });
});

test('create: a single-step reward must be a whole number (1.9, "1.9", 0.5, 0, negative, blank are all 400)', async () => {
  await withAdminMocks(async (captured) => {
    for (const bad of [1.9, '1.9', 0.5, 0, -10, '', 'abc', undefined]) {
      const res = await post(offerBody({ rewardAmount: bad }));
      assert.equal(res.statusCode, 400, String(JSON.stringify(bad)));
      assert.match(res.body.error, /rewardAmount must be a whole number of at least 1/);
    }
    assert.equal(captured.writes, 0);
  });
});

test('create: a manual offer and an all-steps-disabled offer also need a whole-number reward', async () => {
  await withAdminMocks(async (captured) => {
    const manual = await post(offerBody({ trackingMode: 'manual', rewardAmount: 1.9, goals: [] }));
    assert.equal(manual.statusCode, 400);
    const disabledSteps = await post(offerBody({ rewardAmount: 2.5, goals: [goal({ rewardAmount: 40, enabled: false })] }));
    assert.equal(disabledSteps.statusCode, 400);
    assert.equal(captured.writes, 0);
  });
});

test('update: a single-step reward must be a whole number; a valid value saves unchanged', async () => {
  await withAdminMocks(async (captured) => {
    for (const bad of [1.9, '1.9', 0.5, 0, -2]) {
      const res = await put({ rewardAmount: bad });
      assert.equal(res.statusCode, 400, JSON.stringify(bad));
    }
    assert.equal(captured.writes, 0);

    const ok = await put({ rewardAmount: 321 });
    assert.equal(ok.statusCode, 200);
    assert.equal(captured.updated.update.rewardAmount, 321);
  }, { stored: { trackingMode: 'postback', goals: [], rewardAmount: 100 } });
});

test('valid whole-number rewards still save and total correctly on create and update (numbers and numeric strings)', async () => {
  await withAdminMocks(async (captured) => {
    const created = await post(offerBody({ rewardAmount: 1, goals: [goal({ goalKey: 'a', rewardAmount: 100 }), goal({ goalKey: 'b', rewardAmount: '250' }), goal({ goalKey: 'c', rewardAmount: 1.9, enabled: false })] }));
    assert.equal(created.statusCode, 201);
    assert.equal(captured.created.rewardAmount, 350);
    assert.deepEqual(captured.created.goals.filter((g) => g.enabled).map((g) => g.rewardAmount), [100, 250]);

    const updated = await put({ rewardAmount: 99999, goals: [goal({ goalKey: 'a', rewardAmount: 7 }), goal({ goalKey: 'b', rewardAmount: 3 })] });
    assert.equal(updated.statusCode, 200);
    assert.equal(captured.updated.update.rewardAmount, 10);
    assert.equal(captured.findByIdCalls, 0, 'goals were sent, so the stored offer is not read');
  });
});

test('update WITHOUT goals on an existing multi-step offer keeps the calculated step total and ignores a conflicting rewardAmount', async () => {
  const stored = {
    trackingMode: 'postback',
    rewardAmount: 350,
    goals: [
      { goalKey: 'register', rewardAmount: 100, enabled: true },
      { goalKey: 'deposit', rewardAmount: 250, enabled: true },
      { goalKey: 'later', rewardAmount: 9000, enabled: false },
    ],
  };
  await withAdminMocks(async (captured) => {
    for (const conflicting of [5, 99999, 1.9, '1.9', 0, -4, 'abc']) {
      captured.updated = null;
      const res = await put({ title: 'Renamed', rewardAmount: conflicting });
      assert.equal(res.statusCode, 200, JSON.stringify(conflicting));
      assert.equal(captured.updated.update.rewardAmount, 350, `submitted ${JSON.stringify(conflicting)} must not overwrite the calculated total`);
      assert.equal('goals' in captured.updated.update, false, 'stored goals are not touched');
      assert.equal(captured.updated.update.title, 'Renamed');
    }
  }, { stored });
});

test('update WITHOUT goals: stored offer with only disabled steps, or manual mode, takes the submitted reward as a standalone whole number', async () => {
  const disabledOnly = { trackingMode: 'postback', rewardAmount: 40, goals: [{ goalKey: 'a', rewardAmount: 40, enabled: false }] };
  await withAdminMocks(async (captured) => {
    assert.equal((await put({ rewardAmount: 1.9 })).statusCode, 400);
    const ok = await put({ rewardAmount: 500 });
    assert.equal(ok.statusCode, 200);
    assert.equal(captured.updated.update.rewardAmount, 500);
  }, { stored: disabledOnly });

  const manualStored = { trackingMode: 'manual', rewardAmount: 40, goals: [{ goalKey: 'a', rewardAmount: 40, enabled: true }] };
  await withAdminMocks(async (captured) => {
    assert.equal((await put({ rewardAmount: 2.5 })).statusCode, 400);
    const ok = await put({ rewardAmount: 75 });
    assert.equal(ok.statusCode, 200);
    assert.equal(captured.updated.update.rewardAmount, 75);
  }, { stored: manualStored });

  // Switching a stored multi-step offer to manual in the same request makes the reward standalone.
  const multi = { trackingMode: 'postback', rewardAmount: 350, goals: [{ goalKey: 'a', rewardAmount: 350, enabled: true }] };
  await withAdminMocks(async (captured) => {
    assert.equal((await put({ trackingMode: 'manual', rewardAmount: 1.9 })).statusCode, 400);
    const ok = await put({ trackingMode: 'manual', rewardAmount: 60 });
    assert.equal(ok.statusCode, 200);
    assert.equal(captured.updated.update.rewardAmount, 60);
  }, { stored: multi });
});

test('update without goals: an unknown offer id is a 404, and omitting rewardAmount reads nothing and writes no reward', async () => {
  await withAdminMocks(async (captured) => {
    const res = await put({ rewardAmount: 100 });
    assert.equal(res.statusCode, 404);
    assert.equal(captured.writes, 0);
  }, { stored: undefined });

  await withAdminMocks(async (captured) => {
    const res = await put({ title: 'Only a title' });
    assert.equal(res.statusCode, 200);
    assert.equal(captured.findByIdCalls, 0);
    assert.equal('rewardAmount' in captured.updated.update, false);
  });
});

// ── Payout visibility: public vs admin ──────────────────────────────────────
const storedOffer = (overrides = {}) => ({
  _id: 'offer-1',
  title: 'Plarium',
  description: 'Play',
  rewardAmount: 350,
  advertiserPayoutAmount: 2.5,
  advertiserUrl: 'https://advertiser.example/offer',
  isActive: true,
  trackingMode: 'postback',
  goals: [
    { goalKey: 'register', label: 'Register', rewardAmount: 100, payoutAmount: 1, externalEventId: 'Game Event 1', enabled: true },
    { goalKey: 'deposit', label: 'Deposit', rewardAmount: 250, payoutAmount: 3, enabled: true },
  ],
  ...overrides,
});

test('stripAdminOnlyPayoutFields removes only the USD tracking fields and does not mutate its input', () => {
  const original = storedOffer();
  const snapshot = JSON.parse(JSON.stringify(original));
  const stripped = stripAdminOnlyPayoutFields(original);

  assert.equal('advertiserPayoutAmount' in stripped, false);
  assert.ok(stripped.goals.every((g) => !('payoutAmount' in g)));
  assert.equal(stripped.rewardAmount, 350);
  assert.deepEqual(stripped.goals.map((g) => g.rewardAmount), [100, 250]);
  assert.equal(stripped.goals[0].externalEventId, 'Game Event 1');
  assert.deepEqual(original, snapshot);
  assert.equal(stripAdminOnlyPayoutFields(null), null);
  assert.deepEqual(stripAdminOnlyPayoutFields({ title: 'x' }), { title: 'x' });
});

const chain = (value) => {
  const link = { select: () => link, sort: () => link, limit: () => link, lean: async () => value, then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) };
  return link;
};

const withPublicMocks = async (dbUser, fn) => {
  const originals = {
    offerFind: DirectOffer.find, userFindOne: User.findOne, clickFind: ClickLog.find, convFind: Conversion.find, subFind: CustomOfferSubmission.find,
  };
  DirectOffer.find = () => chain([storedOffer()]);
  User.findOne = () => chain(dbUser);
  ClickLog.find = () => chain([]);
  Conversion.find = () => chain([]);
  CustomOfferSubmission.find = () => chain([]);
  try {
    await fn();
  } finally {
    DirectOffer.find = originals.offerFind;
    User.findOne = originals.userFindOne;
    ClickLog.find = originals.clickFind;
    Conversion.find = originals.convFind;
    CustomOfferSubmission.find = originals.subFind;
  }
};

test('public GET /api/direct-offers never returns advertiser payout or step payout metadata (known user)', async () => {
  await withPublicMocks({ _id: 'user-1' }, async () => {
    const res = await request(publicApp(), { path: '/api/direct-offers?placement=featured', headers: AUTH });
    assert.equal(res.statusCode, 200);
    const offer = res.body.offers[0];
    assert.equal('advertiserPayoutAmount' in offer, false);
    assert.ok(offer.goals.every((g) => !('payoutAmount' in g)));
    assert.equal(JSON.stringify(res.body).includes('advertiserPayoutAmount'), false);
    assert.equal(JSON.stringify(res.body).includes('payoutAmount'), false);
    // Users still get the coin rewards they need to see.
    assert.equal(offer.rewardAmount, 350);
    assert.deepEqual(offer.goals.map((g) => g.rewardAmount), [100, 250]);
  });
});

test('public GET /api/direct-offers also strips payout fields when the user record is missing', async () => {
  await withPublicMocks(null, async () => {
    const res = await request(publicApp(), { path: '/api/direct-offers?placement=featured', headers: AUTH });
    assert.equal(res.statusCode, 200);
    assert.equal(JSON.stringify(res.body).includes('ayoutAmount'), false);
    assert.equal(res.body.offers[0].rewardAmount, 350);
  });
});

test('admin GET /api/admin/direct-offers still returns the USD tracking fields (and never the secret)', async () => {
  const originals = { findOne: User.findOne, find: DirectOffer.find };
  User.findOne = () => Promise.resolve(ADMIN);
  DirectOffer.find = () => ({ sort: async () => [{ toObject: () => ({ ...storedOffer(), postbackSecretKey: 'top-secret' }) }] });
  try {
    const res = await request(adminApp(), { path: '/api/admin/direct-offers', headers: AUTH });
    assert.equal(res.statusCode, 200);
    const offer = res.body.offers[0];
    assert.equal(offer.advertiserPayoutAmount, 2.5);
    assert.deepEqual(offer.goals.map((g) => g.payoutAmount), [1, 3]);
    assert.equal(offer.postbackSecretConfigured, true);
    assert.equal(JSON.stringify(res.body).includes('top-secret'), false);
  } finally {
    User.findOne = originals.findOne;
    DirectOffer.find = originals.find;
  }
});

test('the admin postback guide keeps its source: payout comes from the admin offer data, not the public route', () => {
  const guide = read('frontend/src/utils/postbackGuide.js');
  const adminPage = read('frontend/src/pages/admin/AdminDirectOffers.jsx');
  assert.match(guide, /goal\?\.payoutAmount/);
  assert.match(adminPage, /adminApi\(`\/admin\/direct-offers\/\$\{offer\._id\}\/postback-url`\)/);
  assert.doesNotMatch(adminPage, /\$\{API\}\/direct-offers\?/);
  // Public screens never read the admin-only USD fields.
  for (const file of [
    'frontend/src/pages/Earn.jsx',
    'frontend/src/pages/Home.jsx',
    'frontend/src/pages/Profile.jsx',
    'frontend/src/components/offers/DirectOfferCard.jsx',
    'frontend/src/components/offers/GoodpicksModal.jsx',
  ]) {
    assert.doesNotMatch(read(file), /advertiserPayoutAmount|payoutAmount/, file);
  }
});

// ── Admin form wording (source guards) ──────────────────────────────────────
test('admin form explains the USD fields as optional records that never change user coins', () => {
  const source = read('frontend/src/pages/admin/AdminDirectOffers.jsx');
  assert.match(source, /Optional advertiser tracking/);
  assert.match(source, /never change the coins a user receives or their wallet/);
  assert.match(source, /Advertiser Payout \(USD\)[\s\S]{0,120}optional/);
  assert.match(source, /Payout Metadata \(USD\)[\s\S]{0,120}optional/);
  assert.match(source, /only pre-fills/);
  assert.match(source, /\{PAYOUT\}/);
  assert.match(source, /not shown to users/);
  assert.match(source, /This is the only reward amount that affects the user/);
  assert.match(source, /It cannot be edited here; change the step rewards instead\./);
  // Total stays read-only and calculated; the submit path still overrides it.
  assert.match(source, /readOnly=\{hasEnabledGoals\}/);
  assert.match(source, /rewardAmount: hasEnabledGoals \? calculatedGoalReward : Number\(form\.rewardAmount\)/);
});

test('admin form blocks saving an enabled step without coins before calling the API', () => {
  const source = read('frontend/src/pages/admin/AdminDirectOffers.jsx');
  assert.match(source, /const isValidGoalReward = /);
  assert.match(source, /goal\.enabled !== false && !isValidGoalReward\(goal\.rewardAmount\)/);
  assert.match(source, /const isValidCoinReward = /);
  assert.match(source, /Number\.isSafeInteger\(amount\) && amount >= 1/);
  assert.doesNotMatch(source, /Math\.floor\(amount\) >= 1/, 'the UI must not accept fractions by flooring');
  assert.match(source, /is enabled but its coin reward must be a whole number of at least 1/);
  assert.match(source, /!hasEnabledGoals && !isValidCoinReward\(form\.rewardAmount\)/);
  assert.match(source, /Reward \(Coins\) must be a whole number of at least 1/);
});

test('reward calculation and wallet code are untouched by this requirement', () => {
  // Rewards still come only from the click-time snapshot, never from USD fields.
  const rewardService = read('backend/services/rewards/rewardService.js');
  assert.doesNotMatch(rewardService, /advertiserPayoutAmount|payoutAmount/);
  const offerGoals = read('backend/utils/offerGoals.js');
  assert.match(offerGoals, /payoutAmount: toSafeAmount\(raw\.payoutAmount\) \|\| 0/);
});
