const mongoose = require('mongoose');

/**
 * MissionTemplate — Fixed mission "types" that admins configure.
 * These are seeded once and never changed by users/admins.
 * Admins only configure: which templates appear, target (X), reward (Y).
 */
const missionTemplateSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    // Description with {X} = target, {Y} = reward placeholders
    descriptionTemplate: {
      type: String,
      required: true,
    },
    // Which periods this template can appear in
    allowedPeriods: {
      type: [String],
      enum: ['daily', 'weekly', 'monthly'],
      default: ['daily', 'weekly', 'monthly'],
    },
    // The internal metric this mission tracks
    trackingField: {
      type: String,
      enum: [
        'offers_completed',
        'coins_earned',
        'referrals_made',
        'affiliate_offers',
        'custom_offers_completed',
        'referral_earnings',
        'daily_bonus_claimed',
        'withdrawals_made',
        'offerwall_count',
        'promo_codes_used',
      ],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MissionTemplate', missionTemplateSchema);
