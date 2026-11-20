const mongoose = require('mongoose');

// Idempotent record of a blocked replay: T1 (the original completion/transaction)
// and T2 (the blocked callback). Written with an upsert so that concurrent retries
// of the same T2 produce ONE row (attempts is incremented) and therefore one admin
// alert.
const offerwallReplayAlertSchema = new mongoose.Schema(
  {
    providerId: { type: String, required: true, trim: true, lowercase: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    identityKey: { type: String, required: true, trim: true },
    blockedExternalId: { type: String, required: true, trim: true },
    reason: { type: String, default: '' },
    firstExternalId: { type: String, default: '' },
    firstTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

offerwallReplayAlertSchema.index(
  { providerId: 1, userId: 1, identityKey: 1, blockedExternalId: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.OfferwallReplayAlert ||
  mongoose.model('OfferwallReplayAlert', offerwallReplayAlertSchema);
