const mongoose = require('mongoose');

/**
 * UserMission — Tracks each user's progress on a mission for a specific period.
 *
 * A new document is created each period (identified by periodKey).
 * Old-period documents are kept for audit but cannot be claimed.
 *
 * periodKey formats:
 *   daily:   "2026-05-24"
 *   weekly:  "2026-W21"
 *   monthly: "2026-05"
 */
const userMissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    configId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MissionConfig',
      required: true,
    },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
    },
    // String key scoping this record to one calendar period
    periodKey: {
      type: String,
      required: true,
    },
    // Current progress toward targetValue
    progress: {
      type: Number,
      default: 0,
      min: 0,
    },
    completed: {
      type: Boolean,
      default: false,
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

// One progress record per user per config per period
userMissionSchema.index({ userId: 1, configId: 1, periodKey: 1 }, { unique: true });
// Fast query: all missions for a user in current period
userMissionSchema.index({ userId: 1, period: 1, periodKey: 1 });

module.exports = mongoose.model('UserMission', userMissionSchema);
