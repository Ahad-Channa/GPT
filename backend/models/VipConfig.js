const mongoose = require('mongoose');

// Stores admin-configurable reward amount for each VIP level
const vipConfigSchema = new mongoose.Schema({
  levelKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  rewardAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  threshold: {
    type: Number,
    min: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('VipConfig', vipConfigSchema);
