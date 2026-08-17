const mongoose = require('mongoose');

const isDirectOfferClick = (doc) =>
  doc.providerType === 'direct_offer' && doc.campaignType === 'direct_offer';

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
      required: [
        function () {
          return isDirectOfferClick(this);
        },
        'Direct-offer clicks require offerId.',
      ],
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Future shared tracking fields. Existing direct-offer behavior still uses offerId.
    providerId: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
      validate: {
        validator(value) {
          return isDirectOfferClick(this) || (Boolean(value) && value !== 'direct');
        },
        message: 'Generic provider clicks require a non-direct providerId.',
      },
      default: 'direct',
      index: true,
    },
    providerType: {
      type: String,
      enum: ['direct_offer', 'offerwall', 'affiliate_network', 'advertiser', 'unknown'],
      validate: {
        validator(value) {
          return isDirectOfferClick(this) || (Boolean(value) && value !== 'direct_offer' && value !== 'unknown');
        },
        message: 'Generic provider clicks require a non-direct providerType.',
      },
      default: 'direct_offer',
      index: true,
    },
    campaignType: {
      type: String,
      enum: ['direct_offer', 'custom_offer', 'offerwall', 'campaign', 'unknown'],
      validate: {
        validator(value) {
          return isDirectOfferClick(this) || (Boolean(value) && value !== 'direct_offer' && value !== 'unknown');
        },
        message: 'Generic provider clicks require a non-direct campaignType.',
      },
      default: 'direct_offer',
      index: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [
        function () {
          return !isDirectOfferClick(this);
        },
        'Generic provider clicks require campaignId and a non-unknown campaignType.',
      ],
      validate: {
        validator(value) {
          return isDirectOfferClick(this) || (Boolean(value) && this.campaignType !== 'unknown');
        },
        message: 'Generic provider clicks require campaignId and a non-unknown campaignType.',
      },
      default: null,
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
    trackingParams: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    destinationUrl: { type: String, default: '' },
    redirectUrl: { type: String, default: '' },
    // Conversion tracking
    status: {
      type: String,
      enum: ['clicked', 'pending', 'approved', 'rejected'],
      default: 'clicked',
      index: true,
    },
    rewardAmount: { type: Number, required: true }, // Snapshot of offer reward at click time
    rewardSnapshot: {
      amount: { type: Number, default: null },
      currency: { type: String, default: 'coins' },
      source: { type: String, default: 'offer_reward_amount' },
    },
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
clickLogSchema.index({ providerId: 1, createdAt: -1 });
clickLogSchema.index({ providerId: 1, userId: 1, createdAt: -1 });
clickLogSchema.index({ campaignType: 1, campaignId: 1, createdAt: -1 });

module.exports = mongoose.model('ClickLog', clickLogSchema);
