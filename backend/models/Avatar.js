const mongoose = require('mongoose');

const avatarSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true,
      unique: true
    },
    isPremium: {
      type: Boolean,
      default: false
    },
    price: {
      type: Number,
      default: 0
    },
    quantity: {
      type: Number,
      default: null // null means unlimited
    },
    description: {
      type: String,
      default: ''
    },
    rarity: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Avatar', avatarSchema);
