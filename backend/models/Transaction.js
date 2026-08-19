const mongoose = require('mongoose');
const { isRealOfferEarningType } = require('../utils/earningTypes');

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
        'direct_offer_reward', // Direct Partner Offer Reward (S2S postback)
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
      enum: ['offer', 'direct_offer', 'referral', 'daily_bonus', 'withdrawal', 'chargeback', 'leaderboard', 'admin', 'promo', 'vip', 'mission', 'system'],
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
    conversionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversion',
      default: null,
    },
    reversalOfConversionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversion',
      default: null,
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
      enum: ['litecoin', 'paypal', 'giftcard', 'book', null],
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
transactionSchema.index({ conversionId: 1 }, { sparse: true });
transactionSchema.index({ reversalOfConversionId: 1 }, { sparse: true });

// Post-save hook to initialize Day 1 daily bonus timer on first completed earning
transactionSchema.post('save', async function (doc) {
  if (
    doc.status === 'completed' &&
    isRealOfferEarningType(doc.transactionType) &&
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

});

module.exports = mongoose.model('Transaction', transactionSchema);
