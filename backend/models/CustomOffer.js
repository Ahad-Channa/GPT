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
    trackingType: { 
      type: String, 
      enum: ['click', 'manual_approval'], 
      default: 'manual_approval' 
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CustomOffer', customOfferSchema);
