const mongoose = require('mongoose');

const customOfferSubmissionSchema = new mongoose.Schema(
  {
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomOffer',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    proofText: { type: String, default: '' },
    proofImage: { type: String, default: '' }, // Support Base64 Image or URL
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    adminNote: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CustomOfferSubmission', customOfferSubmissionSchema);
