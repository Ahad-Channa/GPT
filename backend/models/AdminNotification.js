const mongoose = require('mongoose');

const adminNotificationSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['withdrawals', 'offerwalls', 'users', 'security', 'system'],
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24 * 30, // 30 days time-to-live
    },
  },
  {
    timestamps: false, // Custom TTL requires no auto-update timestamps
  }
);

// Compound index for fast counting and fetching
adminNotificationSchema.index({ adminId: 1, isRead: 1, category: 1 });
adminNotificationSchema.index({ adminId: 1, createdAt: -1 });

module.exports = mongoose.model('AdminNotification', adminNotificationSchema);
