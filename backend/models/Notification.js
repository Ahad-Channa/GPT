const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'welcome',
        'offer_reward',
        'withdrawal_submitted',
        'withdrawal_approved',
        'withdrawal_rejected',
        'withdrawal_update',
        'admin_adjustment',
        'chargeback',
        'offer_approved',
        'offer_rejected',
        'leaderboard_reward',
        'account_banned',
        'referral_signup',
        'referral_earning',
        'announcement',
        'streak_warning',
        'vip_level_up',
        'mission_reward',
        'mission_completed',
        'mission_reminder',
        'mission_new',
        'book_order_placed',
        'book_order_updated',
        'book_order_cancelled',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    message: {
      type: String,
      required: true,
      maxlength: 300,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    // Flexible metadata for deep-linking (txId, amount, rank, etc.)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      // TTL index: auto-delete after 30 days
      expires: 60 * 60 * 24 * 30,
    },
  },
  {
    // Prevent Mongoose from auto-managing createdAt/updatedAt
    // because we need the TTL on createdAt specifically
    timestamps: false,
  }
);

// Compound index for fast per-user queries (newest first)
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
