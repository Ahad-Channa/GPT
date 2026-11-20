#!/usr/bin/env node
/*
 * Backfill OfferwallRewardIdentity rows from legacy offerwall Transaction rows.
 *
 * STAGING ONLY. DRY-RUN BY DEFAULT. INSERT-ONLY: never updates or deletes any
 * Transaction or User. This script is NOT run automatically and was not run when
 * it was written.
 *
 *   node scripts/backfill-offerwall-identities.js                       # dry run, prints report
 *   node scripts/backfill-offerwall-identities.js --apply --confirm-staging
 *
 * A legacy row is mapped ONLY when its provider's adapter has legacyIdMatchesNew
 * === true (proved from the configured callback template AND the FULL historical
 * dataset; see compare-ayet-legacy-mapping.js). By default no provider qualifies,
 * so every row is reported as unmappable_provider and nothing can be inserted.
 */
const { ADAPTERS, adapterLegacyIdMatchesNew, stripReversalPrefix } = require('../services/offerwalls/adapters');

const CLASSES = ['mapped', 'unmappable_provider', 'unmappable_user', 'unmappable_format', 'conflict'];
const MAX_ID_LENGTH = 128;

const splitExternalId = (externalId) => {
  const value = String(externalId || '');
  const index = value.indexOf(':');
  if (index <= 0) return { providerId: '', raw: value };
  return { providerId: value.slice(0, index), raw: value.slice(index + 1) };
};

// Pure classification. `existingUserIds` is a Set of String(User._id).
const classifyLegacyRows = ({ rows, registry = ADAPTERS, existingUserIds }) => {
  const report = { total: rows.length, counts: {}, rows: {}, reversedUnprotected: [] };
  for (const name of CLASSES) {
    report.counts[name] = 0;
    report.rows[name] = [];
  }
  const add = (name, row, extra = {}) => {
    const entry = {
      _id: String(row._id),
      externalId: row.externalId,
      userId: String(row.userId),
      status: row.status,
      createdAt: row.createdAt || null,
      ...extra,
    };
    report.counts[name] += 1;
    report.rows[name].push(entry);
    if (name !== 'mapped' && row.status === 'reversed') report.reversedUnprotected.push({ class: name, ...entry });
  };

  // Group by provider + identity value to spot placement-ID-like values and conflicts.
  const groups = new Map();
  const parsed = rows.map((row) => {
    const { providerId, raw } = splitExternalId(row.externalId);
    const identityKey = stripReversalPrefix(raw);
    const key = `${providerId}\u0000${identityKey}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
    return { row, providerId, raw, identityKey, key };
  });

  for (const { row, providerId, raw, identityKey, key } of parsed) {
    if (!adapterLegacyIdMatchesNew(registry[providerId])) {
      add('unmappable_provider', row);
      continue;
    }
    if (!identityKey || /\s/.test(raw) || raw.length > MAX_ID_LENGTH) {
      add('unmappable_format', row, { reason: 'empty_or_odd_value' });
      continue;
    }
    const group = groups.get(key);
    const distinctUsers = new Set(group.map((item) => String(item.userId)));
    if (distinctUsers.size > 1) {
      // One value shared by several users looks like a placement/constant ID, not a completion ID.
      add('unmappable_format', row, { reason: 'value_shared_across_users' });
      continue;
    }
    if (!existingUserIds.has(String(row.userId))) {
      add('unmappable_user', row, { reason: 'user_missing' });
      continue;
    }
    if (group.length > 1) {
      add('conflict', row, { reason: 'multiple_rows_for_one_identity' });
      continue;
    }
    add('mapped', row, { providerId, identityKey, identityStatus: row.status === 'reversed' ? 'reversed' : 'credited' });
  }
  return report;
};

// Reads (find only), classifies, and - only when apply === true - inserts identity rows.
// The only write is IdentityModel.updateOne(... $setOnInsert ..., {upsert:true}).
const runBackfill = async ({ models, apply = false, registry = ADAPTERS }) => {
  const { Transaction, User, OfferwallRewardIdentity } = models;
  const rows = await Transaction.find(
    { transactionType: 'offer_reward', externalId: { $regex: /^[a-z0-9_-]+:/i } },
    { externalId: 1, userId: 1, status: 1, createdAt: 1 }
  ).lean();

  const userIds = [...new Set(rows.map((row) => String(row.userId)))];
  const users = userIds.length ? await User.find({ _id: { $in: userIds } }, { _id: 1 }).lean() : [];
  const existingUserIds = new Set(users.map((user) => String(user._id)));

  const report = classifyLegacyRows({ rows, registry, existingUserIds });
  report.applied = 0;
  report.dryRun = !apply;

  if (apply) {
    for (const entry of report.rows.mapped) {
      const result = await OfferwallRewardIdentity.updateOne(
        { providerId: entry.providerId, userId: entry.userId, identityKey: entry.identityKey },
        {
          $setOnInsert: {
            firstExternalId: entry.externalId,
            firstTransactionId: entry._id,
            status: entry.identityStatus,
            source: 'backfill',
            reversedAt: entry.identityStatus === 'reversed' ? new Date() : null,
          },
        },
        { upsert: true }
      );
      if (Number(result?.upsertedCount || 0) > 0) report.applied += 1;
    }
  }
  return report;
};

const printReport = (report) => {
  console.log(JSON.stringify({ total: report.total, counts: report.counts, applied: report.applied, dryRun: report.dryRun }, null, 2));
  for (const name of CLASSES.filter((n) => n !== 'mapped')) {
    for (const entry of report.rows[name]) console.log(`${name}\t${entry._id}\t${entry.externalId}\t${entry.userId}\t${entry.status}\t${entry.createdAt || ''}`);
  }
  console.log(`\nreversed, cannot be protected: ${report.reversedUnprotected.length}`);
  for (const entry of report.reversedUnprotected) console.log(`  ${entry.class}\t${entry._id}\t${entry.externalId}\t${entry.userId}`);
};

module.exports = { CLASSES, classifyLegacyRows, runBackfill, splitExternalId };

if (require.main === module) {
  (async () => {
    const apply = process.argv.includes('--apply');
    if (apply && !process.argv.includes('--confirm-staging')) {
      console.error('Refusing to write: --apply also requires --confirm-staging. Staging only.');
      process.exit(2);
    }
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI is not set.');
      process.exit(2);
    }
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    try {
      const report = await runBackfill({
        models: {
          Transaction: require('../models/Transaction'),
          User: require('../models/User'),
          OfferwallRewardIdentity: require('../models/OfferwallRewardIdentity'),
        },
        apply,
      });
      printReport(report);
    } finally {
      await mongoose.disconnect();
    }
  })().catch((error) => {
    console.error('Backfill failed:', error.message);
    process.exit(1);
  });
}
