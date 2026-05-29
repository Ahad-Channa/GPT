const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: [
        'offer_reward',        // Offer Reward
        'custom_offer_reward', // Custom Offer Reward
        'daily_bonus',         // Daily Bonus
        'referral_reward',     // Referral Reward
        'withdrawal',          // Withdrawal
        'admin_adjustment',    // Admin Adjustment
        'promo_code',          // Promo Code
        'leaderboard_reward',  // Leaderboard Reward
        'chargeback',          // Chargeback deduct
        'vip_reward',          // VIP Reward
        'mission_reward',      // Mission Reward
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      // positive for rewards/credits, negative for withdrawals/deductions
    },
    // Fee deducted on withdrawals (stored for audit trail)
    fee: {
      type: Number,
      default: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    // Fraud tracking / Advanced relation linking
    sourceType: {
      type: String,
      enum: ['offer', 'referral', 'daily_bonus', 'withdrawal', 'chargeback', 'leaderboard', 'admin', 'promo', 'vip', 'mission', 'system'],
      default: null,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    linkedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null, // Used to link referral_reward/chargeback to the original offer_reward
    },
    holdUntil: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'rejected', 'hold', 'reversed'],
      default: 'completed',
    },
    // Withdrawal-specific fields
    method: {
      type: String,
      enum: ['litecoin', 'paypal', 'giftcard', null],
      default: null,
    },
    // Address/account for withdrawal payout
    payoutDestination: {
      type: String,
      default: null,
    },
    // Extra data (gift card provider, exchange rate snapshot, etc.)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Tracing external IDs from Offerwalls to prevent duplicate crediting payloads
    externalId: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

// Index for fast history queries
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ status: 1, transactionType: 1 });

// Post-save hook to initialize Day 1 daily bonus timer on first completed earning
transactionSchema.post('save', async function (doc) {
  if (
    doc.status === 'completed' &&
    ['offer_reward', 'custom_offer_reward'].includes(doc.transactionType) &&
    doc.amount > 0
  ) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(doc.userId);
      if (user) {
        const now = new Date();
        const STREAK_EXPIRE_MS = 48 * 60 * 60 * 1000;
        const DAY1_TIMER_MS = 24 * 60 * 60 * 1000;

        let streak = user.dailyBonusStreak || 0;
        if (user.lastDailyBonusClaim) {
          const msSinceClaim = now.getTime() - new Date(user.lastDailyBonusClaim).getTime();
          if (msSinceClaim >= STREAK_EXPIRE_MS) {
            streak = 0;
          }
        }

        if (streak === 0) {
          let needsUpdate = false;
          let updateObj = {};

          if (user.dailyBonusStreak !== 0) {
            updateObj.dailyBonusStreak = 0;
            needsUpdate = true;
          }

          const hasTimer = user.dailyBonusTimerStart;
          const isTimerExpired = hasTimer && (now.getTime() - new Date(user.dailyBonusTimerStart).getTime() >= DAY1_TIMER_MS);

          if (!hasTimer || isTimerExpired) {
            updateObj.dailyBonusTimerStart = doc.createdAt || now;
            needsUpdate = true;
          }

          if (needsUpdate) {
            await User.updateOne({ _id: user._id }, { $set: updateObj });
          }
        }
      }
    } catch (err) {
      console.error('[Transaction Hook] Error processing daily bonus timer:', err);
    }
  }

  // ─── MISSION PROGRESS TRACKING ─────────────────────────────────────────────
  if (doc.status === 'completed') {
    try {
      const { incrementMissionProgress } = require('../utils/missionUtils');
      
      // 1. coins_earned (only from offer_reward and custom_offer_reward to avoid bonus-from-bonus)
      if (doc.amount > 0 && ['offer_reward', 'custom_offer_reward'].includes(doc.transactionType)) {
        await incrementMissionProgress(doc.userId, 'coins_earned', doc.amount);
      }
      
      // 2. offers_completed
      if (doc.transactionType === 'offer_reward') {
        await incrementMissionProgress(doc.userId, 'offers_completed', 1);
      }
      
      // 3. custom_offers_completed
      if (doc.transactionType === 'custom_offer_reward') {
        await incrementMissionProgress(doc.userId, 'custom_offers_completed', 1);
      }
      
      // 4. daily_bonus_claimed
      if (doc.transactionType === 'daily_bonus') {
        await incrementMissionProgress(doc.userId, 'daily_bonus_claimed', 1);
      }
      
      // 5. referral_earnings
      if (doc.transactionType === 'referral_reward') {
        await incrementMissionProgress(doc.userId, 'referral_earnings', doc.amount);
      }
      
      // 6. promo_codes_used
      if (doc.transactionType === 'promo_code') {
        await incrementMissionProgress(doc.userId, 'promo_codes_used', 1);
      }

      // 7. withdrawals_made
      if (doc.transactionType === 'withdrawal') {
        await incrementMissionProgress(doc.userId, 'withdrawals_made', 1);
      }

      // 8. surveys_completed (tracked when offer_reward is completed via 'cpx' provider)
      if (doc.transactionType === 'offer_reward' && doc.metadata?.providerId === 'cpx') {
        await incrementMissionProgress(doc.userId, 'surveys_completed', 1);
      }
    } catch (err) {
      console.error('[Transaction Hook] Error processing mission progress:', err);
    }
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);
