// One-off cleanup of the design-only offerwalls (Harun, 2026-11-28).
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DUMMY_OFFERWALL_IDS,
  planRemoval,
  removeDummyOfferwalls,
} = require('../scripts/remove-dummy-offerwalls');

const ALL = [
  { id: 'goodpicks', label: 'Goodpicks', enabled: true },
  { id: 'lootably', label: 'Lootably', enabled: true },
  ...['primeearn', 'torox', 'revu', 'adtowall', 'cpx', 'adgem', 'ayet', 'adscend'].map((id) => ({ id, label: id, enabled: false })),
];

const fakeCollection = (doc) => {
  const calls = [];
  return {
    calls,
    async findOne(filter) { calls.push(['findOne', filter]); return doc; },
    async updateOne(filter, update) { calls.push(['updateOne', filter, update]); return { modifiedCount: 1 }; },
  };
};

test('only the 8 dummy ids are targeted; Goodpicks and Lootably are never in the list', () => {
  assert.deepEqual([...DUMMY_OFFERWALL_IDS].sort(), ['adgem', 'adscend', 'adtowall', 'ayet', 'cpx', 'primeearn', 'revu', 'torox']);
  assert.equal(DUMMY_OFFERWALL_IDS.includes('goodpicks'), false);
  assert.equal(DUMMY_OFFERWALL_IDS.includes('lootably'), false);
  const { keep, remove } = planRemoval(ALL);
  assert.deepEqual(keep.map((p) => p.id), ['goodpicks', 'lootably']);
  assert.equal(remove.length, 8);
});

test('dry run is the default and writes nothing', async () => {
  const col = fakeCollection({ offerwallProviders: ALL });
  const out = await removeDummyOfferwalls({ collection: col, log: () => {} });
  assert.equal(out.dryRun, true);
  assert.equal(col.calls.some(([op]) => op === 'updateOne'), false);
});

test('--yes pulls exactly the dummy ids from the singleton settings document', async () => {
  const col = fakeCollection({ offerwallProviders: ALL });
  const out = await removeDummyOfferwalls({ collection: col, apply: true, log: () => {} });
  const update = col.calls.find(([op]) => op === 'updateOne');
  assert.deepEqual(update[1], { _singleton: 'platform_settings' });
  assert.deepEqual(update[2], { $pull: { offerwallProviders: { id: { $in: DUMMY_OFFERWALL_IDS } } } });
  assert.deepEqual(out.kept, ['goodpicks', 'lootably']);
});

test('nothing to do when already clean or when no settings document exists', async () => {
  const clean = fakeCollection({ offerwallProviders: ALL.slice(0, 2) });
  const a = await removeDummyOfferwalls({ collection: clean, apply: true, log: () => {} });
  assert.deepEqual(a.removed, []);
  assert.equal(clean.calls.some(([op]) => op === 'updateOne'), false);
  const none = fakeCollection(null);
  const b = await removeDummyOfferwalls({ collection: none, apply: true, log: () => {} });
  assert.equal(b.found, false);
});
