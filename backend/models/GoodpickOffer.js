const mongoose = require('mongoose');

const goodpickOfferSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    rewardAmount: { type: Number, required: true },
    externalLink: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    expirationDate: { type: Date, default: null },
    icon: { type: String, default: null },
    coverImage: { type: String, default: null },
    requirements: [{ type: String }],
    requirementType: { 
      type: String, 
      enum: ['bullets', 'paragraph'], 
      default: 'bullets' 
    },
    platforms: {
      desktop: { type: Boolean, default: true },
      android: { type: Boolean, default: true },
      ios: { type: Boolean, default: true }
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GoodpickOffer', goodpickOfferSchema);
