const test = require('node:test');
const assert = require('node:assert/strict');

const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Settings = require('../models/Settings');
const LeaderboardCycle = require('../models/Leaderboard');
const { resetLeaderboard } = require('../routes/leaderboard');

// Runs a reset at a fixed moment against fake data. Prizes are 0, so nothing is
// credited; the saved winners show which earnings the reset counted.
const runReset = async (t, { period, now, lastResetAt, earnings }) => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date(now).getTime() });
  let saved;
  t.mock.method(Settings, 'getSingleton', async () => ({
    leaderboardConfig: {
      [period]: { enabled: true, visibleSlots: 5, rewardedRanks: 1, rewardTiers: [0], lastResetAt: lastResetAt && new Date(lastResetAt) },
    },
  }));
  t.mock.method(Settings, 'findOneAndUpdate', async () => null);
  t.mock.method(Transaction, 'aggregate', async (pipeline) => {
    const { $gte, $lt } = pipeline[0].$match.createdAt;
    return earnings
      .filter(([, at]) => new Date(at) >= $gte && (!$lt || new Date(at) < $lt))
      .map(([userId]) => ({ userId, coinsEarned: 500 }));
  });
  t.mock.method(User, 'find', () => ({ sort() { return this; }, limit() { return this; }, lean: async () => [] }));
  t.mock.method(LeaderboardCycle, 'create', async (doc) => { saved = doc; });
  await resetLeaderboard(period);
  return { winners: saved.winners.map((w) => w.userId), cycleStart: saved.cycleStart.toISOString() };
};

const cases = [
  ['daily', '2026-11-26T00:00:00.050Z', '2026-11-25T00:00:00.040Z', '2026-11-25T15:00:00Z', '2026-11-24T15:00:00Z'],
  ['weekly', '2026-11-23T00:00:00.050Z', '2026-11-16T00:00:00.040Z', '2026-11-19T15:00:00Z', '2026-11-12T15:00:00Z'],
  ['monthly', '2026-12-01T00:00:00.050Z', '2026-11-01T00:00:00.040Z', '2026-11-19T15:00:00Z', '2026-10-19T15:00:00Z'],
];

for (const [period, now, lastResetAt, inside, older] of cases) {
  test(`${period} reset at the boundary ranks the period that just ended`, async (t) => {
    const result = await runReset(t, { period, now, lastResetAt, earnings: [['ended', inside], ['older', older]] });
    assert.deepEqual(result.winners, ['ended']);
    assert.equal(result.cycleStart, new Date(lastResetAt).toISOString());
  });
}

test('first reset without a stored lastResetAt still ranks the ended day', async (t) => {
  const result = await runReset(t, {
    period: 'daily', now: '2026-11-26T00:00:01Z', lastResetAt: null, earnings: [['ended', '2026-11-25T15:00:00Z']],
  });
  assert.deepEqual(result.winners, ['ended']);
  assert.equal(result.cycleStart, '2026-11-25T00:00:00.000Z');
});

test('manual reset during the day counts only earnings since the last reset', async (t) => {
  const result = await runReset(t, {
    period: 'daily', now: '2026-11-26T14:00:00Z', lastResetAt: '2026-11-26T10:00:00Z',
    earnings: [['after', '2026-11-26T11:00:00Z'], ['alreadyRewarded', '2026-11-26T09:00:00Z']],
  });
  assert.deepEqual(result.winners, ['after']);
});
