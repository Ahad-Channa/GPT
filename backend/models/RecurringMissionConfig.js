const mongoose = require('mongoose');

/**
 * RecurringMissionConfig — Repeating mission templates per period.
 *
 * Concept:
 *   daily:   7 entries (cycleDayIndex 0=Mon … 6=Sun), repeats every week.
 *   weekly:  4 entries (cycleDayIndex 1–4), repeats every 4 weeks.
 *   monthly: 1 entry  (cycleDayIndex 0), repeats every month.
 *
 * Resolution at runtime:
 *   1. ScheduledMissionConfig for the exact periodKey → use if found  (spot overrides / instant changes)
 *   2. RecurringMissionConfig for the matching cycleIndex              ← NEW default
 *   3. MissionConfig (legacy always-live default)                     ← fallback
 *
 * cycleDayIndex mapping:
 *   daily   → dayOfWeek (0=Monday, 1=Tuesday … 6=Sunday)
 *   weekly  → weekInCycle (0, 1, 2, 3) — cycles through 4 weeks then repeats
 *   monthly → always 0
 */
const recurringMissionConfigSchema = new mongoose.Schema(
  {
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
    },
    /**
     * cycleDayIndex:
     *   daily   → 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
     *   weekly  → 0=Week1, 1=Week2, 2=Week3, 3=Week4
     *   monthly → always 0
     */
    cycleDayIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    // Display slot (1–3)
    displayOrder: {
      type: Number,
      min: 1,
      max: 3,
      required: true,
    },
    templateKey: {
      type: String,
      ref: 'MissionTemplate',
      default: '',
    },
    targetValue: {
      type: Number,
      default: 0,
      min: 0,
    },
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

// One entry per period + cycleDayIndex + displayOrder
recurringMissionConfigSchema.index(
  { period: 1, cycleDayIndex: 1, displayOrder: 1 },
  { unique: true }
);

// Fast lookup by period + cycleDayIndex
recurringMissionConfigSchema.index({ period: 1, cycleDayIndex: 1 });

module.exports = mongoose.model('RecurringMissionConfig', recurringMissionConfigSchema);
