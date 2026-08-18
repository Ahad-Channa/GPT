const mongoose = require('mongoose');
const crypto = require('crypto');

const directOfferSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    rewardAmount: { type: Number, required: true }, // Coins to credit user on approval
    advertiserPayoutAmount: { type: Number, default: 0 }, // USD you earn from advertiser (record only)
    advertiserUrl: { type: String, required: true }, // Where user is redirected after click
    isActive: { type: Boolean, default: true },
    expirationDate: { type: Date, default: null },
    icon: { type: String, default: null }, // Emoji or image URL
    coverImage: { type: String, default: null }, // Card cover image URL
    displayPlacements: {
      featured: { type: Boolean, default: true },
      brandedOfferwall: { type: Boolean, default: false },
    },
    allowedCountries: {
      type: [String],
      default: [],
      set: (countries) => {
        if (!Array.isArray(countries)) return [];
        return [...new Set(countries
          .map((country) => String(country || '').trim().toUpperCase())
          .filter((country) => /^[A-Z]{2}$/.test(country)))];
      },
    },
    platforms: {
      desktop: { type: Boolean, default: true },
      android: { type: Boolean, default: true },
      ios: { type: Boolean, default: true },
    },
    requirements: [{ type: String }], // Step-by-step description of what user must do
    // S2S postback security
    postbackSecretKey: {
      type: String,
      required: true,
      default: () => crypto.randomBytes(24).toString('hex'), // Auto-generate on creation
    },
    // Configurable postback parameter mapping — each advertiser may use different macros
    postbackMapping: {
      clickIdParam:       { type: String, default: 'click_id' },   // Query param that contains our click ID
      transactionIdParam: { type: String, default: 'txn_id' },     // Query param for advertiser's transaction ID
      payoutParam:        { type: String, default: 'payout' },     // Query param for payout/revenue amount
      statusParam:        { type: String, default: 'status' },     // Query param for conversion status
      approvedValue:      { type: String, default: 'approved' },   // Value that means "approved"
      rejectedValue:      { type: String, default: 'rejected' },   // Value that means "rejected"
    },
    // Stats (denormalized for fast admin view)
    totalClicks: { type: Number, default: 0 },
    totalApproved: { type: Number, default: 0 },
    totalRejected: { type: Number, default: 0 },
  },
  { timestamps: true }
);

directOfferSchema.pre('validate', function () {
  this.allowedCountries = this.allowedCountries || [];
  const placements = this.displayPlacements || {};
  if (placements.featured === false && placements.brandedOfferwall === false) {
    this.invalidate('displayPlacements', 'At least one direct-offer placement must be selected.');
  }
});

module.exports = mongoose.model('DirectOffer', directOfferSchema);
