const mongoose = require('mongoose');

/**
 * PeriodBonus — tracks the "complete all missions" bonus for a user per period.
 *
 * Created automatically when a user completes ALL enabled missions in a period.
 * Claimed separately from individual mission rewards.
 */
const periodBonusSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
    },
    // The period this bonus belongs to (e.g. "2026-05-26", "2026-W21", "2026-05")
    periodKey: {
      type: String,
      required: true,
    },
    // Snapshot of the bonus amount at time it was granted
    bonusAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    claimed: {
      type: Boolean,
      default: false,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// One bonus record per user per period per periodKey
periodBonusSchema.index({ userId: 1, period: 1, periodKey: 1 }, { unique: true });

module.exports = mongoose.model('PeriodBonus', periodBonusSchema);
