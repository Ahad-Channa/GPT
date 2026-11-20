const mongoose = require('mongoose');

const customOfferSubmissionSchema = new mongoose.Schema(
  {
    // Backward compatible source discriminator. Historical documents have no
    // offerType and are treated as Custom Offer submissions.
    offerType: {
      type: String,
      enum: ['custom_offer', 'direct_offer'],
      default: 'custom_offer',
      index: true,
    },
    // Existing Custom Offer linkage. Required for Custom Offer submissions and
    // optional for Direct Offers (which use directOfferId below).
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomOffer',
      default: null,
      required: function () {
        return this.offerType !== 'direct_offer';
      },
    },
    // Manual Direct Offer linkage.
    directOfferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DirectOffer',
      default: null,
      index: true,
      required: function () {
        return this.offerType === 'direct_offer';
      },
    },
    // Click created when the user starts a manual Direct Offer. Used to reuse
    // the same click on repeated starts and to reward from the trusted snapshot.
    clickId: { type: String, default: '' },
    // Pending/processed Conversion created on proof submission.
    conversionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversion',
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    proofText: { type: String, default: '' },
    proofImage: { type: String, default: '' }, // Legacy fallback
    proofImages: { type: [String], default: [] }, // New array for multiple images
    status: {
      type: String,
      enum: ['started', 'pending', 'approved', 'rejected', 'chargebacked'],
      default: 'started'
    },
    adminNote: { type: String, default: '' }
  },
  { timestamps: true }
);

// One manual Direct Offer submission per user/offer. Repeated Start Offer calls
// must reuse the same submission and click instead of consuming extra slots.
customOfferSubmissionSchema.index(
  { directOfferId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { offerType: 'direct_offer' },
  }
);

module.exports = mongoose.model('CustomOfferSubmission', customOfferSubmissionSchema);
