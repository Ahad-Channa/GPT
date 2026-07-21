const mongoose = require('mongoose');

const customOfferSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    rewardAmount: { type: Number, required: true },
    externalLink: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    expirationDate: { type: Date, default: null },
    icon: { type: String, default: null },
    coverImage: { type: String, default: null }, // URL displayed as card cover image
    trackingType: { 
      type: String, 
      enum: ['click', 'manual_approval'], 
      default: 'manual_approval' 
    },
    requirements: [{ type: String }],
    platforms: {
      desktop: { type: Boolean, default: true },
      android: { type: Boolean, default: true },
      ios: { type: Boolean, default: true }
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CustomOffer', customOfferSchema);
