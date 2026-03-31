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
      enum: ['offerwall_reward', 'daily_bonus', 'withdrawal', 'admin_correction', 'referral_bonus'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      // positive for rewards, negative for withdrawals
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
    // Tracing external IDs from Offerwalls to prevent duplicate crediting payloads
    externalId: {
      type: String,
      unique: true,
      sparse: true,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
