const mongoose = require('mongoose');

// Tracks which VIP level bonuses each user has already claimed
const vipClaimSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  levelKey: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  claimedAt: {
    type: Date,
    default: Date.now,
  },
});

// One claim per user per level
vipClaimSchema.index({ userId: 1, levelKey: 1 }, { unique: true });

module.exports = mongoose.model('VipClaim', vipClaimSchema);
