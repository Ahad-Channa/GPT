const mongoose = require('mongoose');
const { sanitizePostbackPayload } = require('../services/tracking/postbackSanitizer');

const postbackLogSchema = new mongoose.Schema(
  {
    providerId: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      index: true,
    },
    route: {
      type: String,
      default: '',
    },
    method: {
      type: String,
      default: 'GET',
    },
    sanitizedQuery: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sanitizedBody: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sanitizedHeaders: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    mappedFields: {
      clickId: { type: String, default: '' },
      transactionId: { type: String, default: '' },
      status: { type: String, default: '' },
      payout: { type: mongoose.Schema.Types.Mixed, default: null },
      eventType: { type: String, default: '' },
      extra: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    sourceIp: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    security: {
      checked: { type: Boolean, default: false },
      passed: { type: Boolean, default: false },
      method: { type: String, default: '' },
      reason: { type: String, default: '' },
    },
    processingResult: {
      type: String,
      enum: ['received', 'accepted', 'rejected', 'duplicate', 'ignored', 'error'],
      default: 'received',
      index: true,
    },
    isDuplicate: {
      type: Boolean,
      default: false,
      index: true,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    clickLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClickLog',
      default: null,
      index: true,
    },
    conversionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversion',
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
  },
  { timestamps: true }
);

postbackLogSchema.statics.sanitizePayload = sanitizePostbackPayload;

postbackLogSchema.index({ providerId: 1, createdAt: -1 });
postbackLogSchema.index({ processingResult: 1, createdAt: -1 });
postbackLogSchema.index({ isDuplicate: 1, createdAt: -1 });

module.exports = mongoose.model('PostbackLog', postbackLogSchema);
