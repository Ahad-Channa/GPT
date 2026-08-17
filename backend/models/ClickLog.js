const mongoose = require('mongoose');

const clickLogSchema = new mongoose.Schema(
  {
    // Unique identifier passed in tracking links — advertiser sends this back in postback
    clickId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DirectOffer',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Request metadata at click time
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown',
    },
    country: { type: String, default: '' },
    // Conversion tracking
    status: {
      type: String,
      enum: ['clicked', 'pending', 'approved', 'rejected'],
      default: 'clicked',
      index: true,
    },
    rewardAmount: { type: Number, required: true }, // Snapshot of offer reward at click time
    advertiserPayout: { type: Number, default: 0 }, // Optional: advertiser can send payout amount in postback
    convertedAt: { type: Date, default: null }, // Timestamp when postback confirmed
    // Link back to Transaction once approved
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for fast per-offer and per-user queries
clickLogSchema.index({ offerId: 1, createdAt: -1 });
clickLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ClickLog', clickLogSchema);
