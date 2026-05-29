const mongoose = require('mongoose');

/**
 * ScheduledMissionConfig — Period-specific mission overrides.
 *
 * When an admin schedules missions "for next period" or configures missions
 * ahead of time, those configs are stored here keyed by exact periodKey.
 *
 * Resolution order at runtime:
 *   1. Check ScheduledMissionConfig for the current periodKey → use if found
 *   2. Else fall back to MissionConfig (always-live default)
 *
 * periodKey formats:
 *   daily:   "2026-05-29"
 *   weekly:  "2026-W22"
 *   monthly: "2026-06"
 */
const scheduledMissionConfigSchema = new mongoose.Schema(
  {
    // The exact period key this config is for (e.g. "2026-05-29")
    periodKey: {
      type: String,
      required: true,
    },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
    },
    // Display slot (1–3) within the period
    displayOrder: {
      type: Number,
      min: 1,
      max: 3,
      required: true,
    },
    // Which mission template to use
    templateKey: {
      type: String,
      ref: 'MissionTemplate',
      default: '',
    },
    // X — required progress to complete the mission (0 = empty/disabled slot)
    targetValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Y — coins awarded on completion & claim
    rewardAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// One scheduled entry per period key + period + display slot
scheduledMissionConfigSchema.index(
  { periodKey: 1, period: 1, displayOrder: 1 },
  { unique: true }
);

// Fast lookup: all scheduled configs for a period + periodKey
scheduledMissionConfigSchema.index({ period: 1, periodKey: 1 });

module.exports = mongoose.model('ScheduledMissionConfig', scheduledMissionConfigSchema);
