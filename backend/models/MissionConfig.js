const mongoose = require('mongoose');

/**
 * MissionConfig — Admin-configured mission slots per period.
 * Each slot links a MissionTemplate with admin-set target and reward values.
 * Max 3 configs per period enforced at route level.
 */
const missionConfigSchema = new mongoose.Schema(
  {
    templateKey: {
      type: String,
      required: true,
      ref: 'MissionTemplate',
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
    // X — required progress to complete the mission
    targetValue: {
      type: Number,
      required: true,
      min: 1,
    },
    // Y — coins awarded on completion & claim
    rewardAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Unique slot per period: one config per displayOrder per period
missionConfigSchema.index({ period: 1, displayOrder: 1 }, { unique: true });

module.exports = mongoose.model('MissionConfig', missionConfigSchema);
