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
    // Stats (denormalized for fast admin view)
    totalClicks: { type: Number, default: 0 },
    totalApproved: { type: Number, default: 0 },
    totalRejected: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DirectOffer', directOfferSchema);
