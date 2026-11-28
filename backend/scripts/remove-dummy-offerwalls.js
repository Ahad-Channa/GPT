#!/usr/bin/env node
/*
 * One-off cleanup: removes the 8 design-only offerwalls from the stored
 * platform settings, so Admin -> Offerwalls lists only real ones
 * (Goodpicks and Lootably). Harun's request, 2026-11-28.
 *
 * Usage (on the server, in backend/):
 *   node scripts/remove-dummy-offerwalls.js          # dry run: shows what would be removed
 *   node scripts/remove-dummy-offerwalls.js --yes    # removes them
 *
 * Only the entries in settings.offerwallProviders with these ids are removed.
 * Goodpicks, Lootably, transactions, conversions and postback logs are never
 * touched. Run it once per database (staging now, taskmint.me at go-live).
 * Settings.js no longer re-adds these ids, so they stay gone.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const mongoose = require('mongoose');

const DUMMY_OFFERWALL_IDS = Object.freeze(['cpx', 'torox', 'primeearn', 'ayet', 'adtowall', 'revu', 'adgem', 'adscend']);
const SETTINGS_FILTER = { _singleton: 'platform_settings' };

// Pure planning step (also used by the tests): what stays, what goes.
const planRemoval = (providers = []) => {
  const list = Array.isArray(providers) ? providers : [];
  return {
    remove: list.filter((p) => DUMMY_OFFERWALL_IDS.includes(p && p.id)),
    keep: list.filter((p) => !DUMMY_OFFERWALL_IDS.includes(p && p.id)),
  };
};

const describe = (p) => `${p.id} (${p.label || '-'}, ${p.enabled ? 'ON' : 'OFF'})`;

// Runs against the given native collection (the Settings collection).
const removeDummyOfferwalls = async ({ collection, apply = false, log = console.log }) => {
  const settings = await collection.findOne(SETTINGS_FILTER, { projection: { offerwallProviders: 1 } });
  if (!settings) {
    log('No platform settings document found. Nothing to do.');
    return { found: false, removed: [], kept: [] };
  }
  const { remove, keep } = planRemoval(settings.offerwallProviders);
  log(`Keeping (${keep.length}): ${keep.map(describe).join(', ') || '-'}`);
  log(`Removing (${remove.length}): ${remove.map(describe).join(', ') || '-'}`);

  if (!remove.length) {
    log('Nothing to remove.');
    return { found: true, removed: [], kept: keep.map((p) => p.id) };
  }
  if (!apply) {
    log('Dry run only. Run again with --yes to remove them.');
    return { found: true, dryRun: true, removed: remove.map((p) => p.id), kept: keep.map((p) => p.id) };
  }

  const result = await collection.updateOne(
    SETTINGS_FILTER,
    { $pull: { offerwallProviders: { id: { $in: DUMMY_OFFERWALL_IDS } } } }
  );
  log(`Done. Settings updated: ${result.modifiedCount === 1 ? 'yes' : 'no'}.`);
  return { found: true, removed: remove.map((p) => p.id), kept: keep.map((p) => p.id), modified: result.modifiedCount };
};

const main = async () => {
  const apply = process.argv.slice(2).includes('--yes');
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is missing (backend/.env).');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    // Native collection: no Settings model, so getSingleton cannot re-add anything.
    await removeDummyOfferwalls({ collection: mongoose.connection.db.collection('settings'), apply });
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  main().catch((error) => {
    console.error('Failed:', error.message);
    process.exit(1);
  });
}

module.exports = { DUMMY_OFFERWALL_IDS, planRemoval, removeDummyOfferwalls };
