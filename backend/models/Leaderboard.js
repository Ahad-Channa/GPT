const mongoose = require('mongoose');

/**
 * LeaderboardCycle — one document per reset cycle per period.
 * Active cycle = current running window.
 * Completed cycle = snapshotted winners + rewards paid.
 */
const leaderboardCycleSchema = new mongoose.Schema(
  {
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
      index: true,
    },
    cycleStart: {
      type: Date,
      required: true,
    },
    cycleEnd: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
    // Snapshot of top earners when the cycle completed (supports N ranks)
    winners: [
      {
        rank:        { type: Number, required: true },
        userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        displayName: { type: String, default: 'Unknown' },
        coinsEarned: { type: Number, default: 0 },
        rewardPaid:  { type: Number, default: 0 },
      },
    ],
    // Flexible reward tiers used for this cycle (snapshot at time of reset)
    // Array where index = rank-1, value = reward amount
    rewardTiers: {
      type: [Number],
      default: [],
    },
    // How many ranks were rewarded in this cycle (snapshot)
    rewardedRanks: {
      type: Number,
      default: 3,
    },
  },
  { timestamps: true }
);

leaderboardCycleSchema.index({ period: 1, status: 1 });
leaderboardCycleSchema.index({ period: 1, cycleStart: -1 });

module.exports = mongoose.model('LeaderboardCycle', leaderboardCycleSchema);
