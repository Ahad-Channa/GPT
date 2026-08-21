const mongoose = require('mongoose');

const fraudLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ip: { type: String, required: true, index: true },
    // proxycheck.io results
    isProxy: { type: Boolean, default: false },
    isVpn: { type: Boolean, default: false },
    isTor: { type: Boolean, default: false },
    riskScore: { type: Number, default: 0 },
    provider: { type: String, default: '' },
    country: { type: String, default: '' },
    city: { type: String, default: '' },
    asn: { type: String, default: '' },
    proxyType: { type: String, default: '' }, // VPN, TOR, SOCKS, HTTP, DNS, etc.
    // Device fingerprint from frontend
    fingerprint: { type: String, default: '', index: true },
    // What happened
    route: { type: String, default: '' }, // which endpoint triggered this
    action: {
      type: String,
      enum: ['allowed', 'warned', 'blocked'],
      default: 'allowed',
    },
    rawResponse: { type: mongoose.Schema.Types.Mixed, default: {} }, // full proxycheck response for debugging
  },
  { timestamps: true }
);

// Fast lookups for admin views
fraudLogSchema.index({ createdAt: -1 });
fraudLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('FraudLog', fraudLogSchema);
