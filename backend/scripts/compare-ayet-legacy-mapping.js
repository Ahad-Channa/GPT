#!/usr/bin/env node
/*
 * Read-only comparison of the OLD ayeT handler mapping against ayeT's documented
 * fields, to decide whether legacyIdMatchesNew may ever be set for ayeT.
 *
 * Old handler: transactionId = query `sid`, user = query `uid`.
 * New adapter: transactionId = `transaction_id`, user = `external_identifier`.
 * These are NOT assumed equal. This script only reports; it never edits code,
 * config or data, and was not run when written.
 *
 *   node scripts/compare-ayet-legacy-mapping.js --export ayet-export.csv|json --template-confirmed
 *
 * Inputs
 *   --export             ayeT conversion export covering the FULL period in which
 *                        the old handler was live (columns: transaction_id, external_identifier)
 *   --template-confirmed pass ONLY after you verified the configured ayeT callback
 *                        URL template and iframe link (sid={transaction_id},
 *                        uid/external_identifier = the TaskMint User._id)
 *
 * `fullDatasetProven` is true only when EVERY legacy ayet Transaction row has
 * exactly one export row with sid == transaction_id and external_identifier ==
 * String(userId), there are no extra/ambiguous matches, and the template was
 * confirmed. A sample is never enough: the result carries the coverage numbers.
 */
const fs = require('fs');

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell); cell = '';
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); if (row.some((value) => value !== '')) rows.push(row); }
  const [header = [], ...body] = rows;
  return body.map((values) => Object.fromEntries(header.map((name, index) => [name.trim(), (values[index] || '').trim()])));
};

// Pure comparison. txRows: legacy Transaction rows ({_id, externalId:'ayet:<sid>', userId}).
// exportRows: [{transaction_id, external_identifier}].
const compareAyetLegacyMapping = ({ txRows, exportRows, userIds = null, templateConfirmed = false }) => {
  const byTransactionId = new Map();
  for (const row of exportRows) {
    const key = String(row.transaction_id || '');
    if (!byTransactionId.has(key)) byTransactionId.set(key, []);
    byTransactionId.get(key).push(row);
  }

  const usersBySid = new Map();
  const result = {
    txRows: txRows.length,
    exportRows: exportRows.length,
    matched: 0,
    unmatched: [],            // legacy rows with no export row where sid == transaction_id
    ambiguous: [],            // more than one export row for one sid
    userMismatch: [],         // external_identifier != String(Transaction.userId)
    sidSharedAcrossUsers: [], // the old `sid` repeats across users (placement-ID signature)
    userNotFound: [],
    templateConfirmed: Boolean(templateConfirmed),
  };

  for (const tx of txRows) {
    const sid = String(tx.externalId || '').replace(/^ayet:/i, '');
    if (!usersBySid.has(sid)) usersBySid.set(sid, new Set());
    usersBySid.get(sid).add(String(tx.userId));
  }
  for (const [sid, users] of usersBySid) {
    if (users.size > 1) result.sidSharedAcrossUsers.push({ sid, users: [...users] });
  }

  for (const tx of txRows) {
    const sid = String(tx.externalId || '').replace(/^ayet:/i, '');
    const candidates = byTransactionId.get(sid) || [];
    if (candidates.length === 0) { result.unmatched.push({ _id: String(tx._id), sid }); continue; }
    if (candidates.length > 1) { result.ambiguous.push({ _id: String(tx._id), sid }); continue; }
    if (String(candidates[0].external_identifier) !== String(tx.userId)) {
      result.userMismatch.push({ _id: String(tx._id), sid });
      continue;
    }
    if (userIds && !userIds.has(String(tx.userId))) { result.userNotFound.push({ _id: String(tx._id), sid }); continue; }
    result.matched += 1;
  }

  result.coverage = txRows.length ? result.matched / txRows.length : 0;
  result.fullDatasetProven =
    txRows.length > 0 &&
    result.matched === txRows.length &&
    result.unmatched.length === 0 &&
    result.ambiguous.length === 0 &&
    result.userMismatch.length === 0 &&
    result.sidSharedAcrossUsers.length === 0 &&
    result.userNotFound.length === 0 &&
    result.templateConfirmed === true;
  return result;
};

module.exports = { compareAyetLegacyMapping, parseCsv };

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const exportIndex = args.indexOf('--export');
    if (exportIndex === -1 || !args[exportIndex + 1]) {
      console.error('Usage: compare-ayet-legacy-mapping.js --export <file.csv|json> [--template-confirmed]');
      process.exit(2);
    }
    if (!process.env.MONGODB_URI) { console.error('MONGODB_URI is not set.'); process.exit(2); }
    const file = args[exportIndex + 1];
    const text = fs.readFileSync(file, 'utf8');
    const exportRows = file.toLowerCase().endsWith('.json') ? JSON.parse(text) : parseCsv(text);

    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    try {
      const Transaction = require('../models/Transaction');
      const User = require('../models/User');
      const txRows = await Transaction.find(
        { transactionType: 'offer_reward', externalId: { $regex: /^ayet:/i } },
        { externalId: 1, userId: 1 }
      ).lean();
      const users = await User.find({ _id: { $in: [...new Set(txRows.map((r) => String(r.userId)))] } }, { _id: 1 }).lean();
      const result = compareAyetLegacyMapping({
        txRows,
        exportRows,
        userIds: new Set(users.map((u) => String(u._id))),
        templateConfirmed: args.includes('--template-confirmed'),
      });
      console.log(JSON.stringify(result, null, 2));
      console.log(result.fullDatasetProven
        ? '\nFull dataset proven. Setting legacyIdMatchesNew is a manual, reviewed code change; this script changes nothing.'
        : '\nNOT proven. legacyIdMatchesNew must stay false for ayeT.');
    } finally {
      await mongoose.disconnect();
    }
  })().catch((error) => { console.error('Comparison failed:', error.message); process.exit(1); });
}
