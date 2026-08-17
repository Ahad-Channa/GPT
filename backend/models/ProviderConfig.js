const mongoose = require('mongoose');

const providerConfigSchema = new mongoose.Schema(
  {
    providerId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: ['offerwall', 'direct', 'affiliate_network', 'advertiser', 'internal'],
      default: 'offerwall',
      index: true,
    },
    enabled: {
      type: Boolean,
      default: false,
      index: true,
    },
    parameterMappings: {
      clickId: { type: String, default: 'click_id' },
      transactionId: { type: String, default: 'transaction_id' },
      status: { type: String, default: 'status' },
      payout: { type: String, default: 'payout' },
      eventType: { type: String, default: 'event_type' },
      extra: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    statusMappings: {
      pending: { type: [String], default: ['pending'] },
      approved: { type: [String], default: ['approved', 'completed'] },
      rejected: { type: [String], default: ['rejected', 'declined'] },
      reversal: { type: [String], default: ['reversed', 'chargeback'] },
    },
    security: {
      method: {
        type: String,
        enum: ['none', 'shared_secret', 'md5', 'sha256', 'hmac', 'token', 'custom_adapter'],
        default: 'none',
      },
      signatureParam: { type: String, default: '' },
      tokenParam: { type: String, default: '' },
      headerName: { type: String, default: '' },
      hashAlgorithm: { type: String, default: '' },
      hashTemplate: { type: String, default: '' },
      secretEnvVar: { type: String, default: '' },
      adapterKey: { type: String, default: '' },
      config: { type: mongoose.Schema.Types.Mixed, default: {} },
      credentials: {
        type: mongoose.Schema.Types.Mixed,
        default: undefined,
        select: false,
      },
    },
    responseConfig: {
      successStatus: { type: Number, default: 200 },
      successBody: { type: String, default: '1' },
      duplicateStatus: { type: Number, default: 200 },
      duplicateBody: { type: String, default: '1' },
      errorStatus: { type: Number, default: 200 },
      errorBody: { type: String, default: '0' },
    },
    ipAllowlist: {
      type: [String],
      default: [],
    },
    providerSettings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        if (ret.security) {
          delete ret.security.credentials;
        }
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret) => {
        if (ret.security) {
          delete ret.security.credentials;
        }
        return ret;
      },
    },
  }
);

providerConfigSchema.index({ enabled: 1, type: 1 });

module.exports = mongoose.model('ProviderConfig', providerConfigSchema);
