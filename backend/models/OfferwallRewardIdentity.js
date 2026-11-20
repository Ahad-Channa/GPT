const mongoose = require('mongoose');

// One row per provider-issued completion identity (the BASE transaction ID, i.e.
// without a reversal prefix) for a user on a legacy offerwall route.
//
// A row whose status is 'reversed' is a permanent tombstone: it is never deleted,
// so a reversed completion can never become rewardable again. The unique index is
// what makes the "same completion, changed callback ID" check race-safe.
//
// NOTE: this identifies one provider *transaction*. It does NOT link two different
// provider-issued completions of the same task; that needs a stable shared task ID
// from the provider, which none of the verified providers documents.
const offerwallRewardIdentitySchema = new mongoose.Schema(
  {
    providerId: { type: String, required: true, trim: true, lowercase: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    identityKey: { type: String, required: true, trim: true },
    firstExternalId: { type: String, default: '' },
    firstTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
    status: { type: String, enum: ['credited', 'reversed'], required: true, default: 'credited' },
    source: { type: String, enum: ['live', 'backfill', 'lazy'], required: true, default: 'live' },
    reversedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

offerwallRewardIdentitySchema.index(
  { providerId: 1, userId: 1, identityKey: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.OfferwallRewardIdentity ||
  mongoose.model('OfferwallRewardIdentity', offerwallRewardIdentitySchema);
