const mongoose = require('mongoose');

const userActivityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: true,
    },
    actionType: {
      type: String,
      enum: ['offer_click', 'click_offer', 'proof_submit', 'bonus_claim', 'withdrawal_request'],
      required: true,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    country: {
      type: String,
      default: '',
    },
    deviceInfo: {
      type: String,
      default: '',
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null, // e.g. pointing to a CustomOffer id or CustomOfferSubmission id
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Index for analyzing suspicious behaviour (e.g. tracking by IP)
userActivityLogSchema.index({ ipAddress: 1, createdAt: -1 });

module.exports = mongoose.model('UserActivityLog', userActivityLogSchema);
