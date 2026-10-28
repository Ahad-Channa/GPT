const mongoose = require('mongoose');
const crypto = require('crypto');

// Optional multi-step / goal configuration. When empty, the offer keeps the
// original single-reward behavior using rewardAmount.
const directOfferGoalSchema = new mongoose.Schema(
  {
    goalKey: { type: String, required: true, trim: true },
    label: { type: String, trim: true, default: '' },
    labelDe: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    descriptionDe: { type: String, trim: true, default: '' },
    // External partner event identifier (e.g. Plarium "Game Event 269").
    externalEventId: { type: String, trim: true, default: '' },
    externalEventAliases: { type: [String], default: [] },
    rewardAmount: { type: Number, required: true, min: 0 },
    payoutAmount: { type: Number, default: 0, min: 0 },
    // Display-only label (e.g. "3D"). Not an expiry/deadline; no enforcement.
    timeLimitDays: { type: Number, default: null, min: 1 },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const directOfferSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    titleDe: { type: String, default: '' },
    description: { type: String, required: true },
    descriptionDe: { type: String, default: '' },
    // 'postback' keeps the original automatic S2S tracking. 'manual' uses the
    // manual proof submission workflow instead and never accepts postbacks.
    // Historical documents without this field are treated as postback.
    trackingMode: {
      type: String,
      enum: ['postback', 'manual'],
      default: 'postback',
    },
    proofInstructions: { type: String, default: '' },
    proofInstructionsDe: { type: String, default: '' },
    rewardAmount: { type: Number, required: true }, // Coins to credit user on approval
    // Optional offer-specific earning hold policy. Only active when holdEnabled
    // is true; otherwise the global earningHoldConfig applies. Shared by the
    // Featured and Goodpicks placements because it belongs to the offer itself.
    holdEnabled: { type: Boolean, default: false },
    holdDays: { type: Number, default: 30, min: 0 },
    holdThreshold: { type: Number, default: 0, min: 0 },
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
    requirementsDe: { type: [String], default: [] },
    requirementType: { 
      type: String, 
      enum: ['bullets', 'paragraph'], 
      default: 'bullets' 
    },
    // Optional multi-step goals. Empty array = single-reward offer (unchanged).
    goals: { type: [directOfferGoalSchema], default: [] },
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
      reversedValue:      { type: String, default: 'reversed' },   // Value that means "reversal/chargeback"
      chargebackValue:    { type: String, default: '' },           // Optional legacy alias for reversal/chargeback
    },
    // Optional overall (not per-user) total click cap. null = unlimited.
    // Enforced atomically at click time; editing it never resets totalClicks.
    maxTotalClicks: { type: Number, default: null, min: 1 },
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
