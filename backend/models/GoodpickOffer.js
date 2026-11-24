const mongoose = require('mongoose');

const goodpickOfferSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    titleDe: { type: String, default: '' },
    titleUr: { type: String, default: '' },
    titleFr: { type: String, default: '' },
    titleEs: { type: String, default: '' },
    titleRu: { type: String, default: '' },
    titlePt: { type: String, default: '' },
    titleIt: { type: String, default: '' },
    titlePl: { type: String, default: '' },
    titleTr: { type: String, default: '' },
    description: { type: String, required: true },
    descriptionDe: { type: String, default: '' },
    descriptionUr: { type: String, default: '' },
    descriptionFr: { type: String, default: '' },
    descriptionEs: { type: String, default: '' },
    descriptionRu: { type: String, default: '' },
    descriptionPt: { type: String, default: '' },
    descriptionIt: { type: String, default: '' },
    descriptionPl: { type: String, default: '' },
    descriptionTr: { type: String, default: '' },
    rewardAmount: { type: Number, required: true },
    externalLink: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    expirationDate: { type: Date, default: null },
    icon: { type: String, default: null },
    coverImage: { type: String, default: null },
    requirements: [{ type: String }],
    requirementsDe: [{ type: String }],
    requirementsUr: [{ type: String }],
    requirementsFr: [{ type: String }],
    requirementsEs: [{ type: String }],
    requirementsRu: [{ type: String }],
    requirementsPt: [{ type: String }],
    requirementsIt: [{ type: String }],
    requirementsPl: [{ type: String }],
    requirementsTr: [{ type: String }],
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
