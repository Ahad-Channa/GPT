const mongoose = require('mongoose');

const conversionSchema = new mongoose.Schema(
  {
    providerId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    providerTransactionId: {
      type: String,
      trim: true,
      default: null,
    },
    clickId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    clickLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClickLog',
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    campaignType: {
      type: String,
      enum: ['direct_offer', 'custom_offer', 'offerwall', 'campaign', 'unknown'],
      default: 'unknown',
      index: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DirectOffer',
      default: null,
    },
    incomingStatus: {
      type: String,
      trim: true,
      default: '',
    },
    internalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'reversed'],
      default: 'pending',
      index: true,
    },
    eventType: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    payout: {
      amount: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
    },
    rewardAmount: {
      type: Number,
      default: 0,
    },
    processingState: {
      type: String,
      enum: ['received', 'claimed', 'processing', 'processed', 'duplicate', 'ignored', 'failed'],
      default: 'received',
      index: true,
    },
    rewardTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
    reversalTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
    originalConversionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversion',
      default: null,
      index: true,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    errorReason: {
      type: String,
      default: '',
    },
    security: {
      method: { type: String, default: '' },
      passed: { type: Boolean, default: false },
      checked: { type: Boolean, default: false },
      reason: { type: String, default: '' },
    },
    idempotencyKey: {
      type: String,
      trim: true,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Normal provider idempotency. Partial index keeps legacy/incomplete records from colliding.
conversionSchema.index(
  { providerId: 1, providerTransactionId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      providerTransactionId: { $type: 'string', $gt: '' },
    },
  }
);

// Fallback idempotency for providers without transaction IDs must be explicitly generated.
conversionSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: 'string', $gt: '' },
    },
  }
);

conversionSchema.index({ providerId: 1, clickId: 1, eventType: 1, createdAt: -1 });
conversionSchema.index({ userId: 1, createdAt: -1 });
conversionSchema.index({ campaignType: 1, campaignId: 1, createdAt: -1 });

module.exports = mongoose.model('Conversion', conversionSchema);
