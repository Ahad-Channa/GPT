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
        'daily_bonus',         // Daily Bonus
        'referral_reward',     // Referral Reward
        'withdrawal',          // Withdrawal
        'admin_adjustment',    // Admin Adjustment
        'promo_code',          // Promo Code
        'leaderboard_reward',  // Leaderboard Reward
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
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'rejected'],
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

module.exports = mongoose.model('Transaction', transactionSchema);
