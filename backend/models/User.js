const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: [true, 'Firebase UID is required'],
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    avatarUrl: {
      type: String,
    },
    role: {
      type: String,
      enum: ['user', 'moderator', 'admin'],
      default: 'user',
    },
    adminPermissions: [{
      type: String,
      enum: ['manage_users', 'manage_withdrawals', 'manage_support', 'manage_offerwalls', 'manage_admins'],
    }],
    // Core Wallet configuration
    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Progression tracking
    xp: {
      type: Number,
      default: 0,
    },
    vipLevel: {
      type: Number,
      default: 1,
    },
    lastDailyBonusClaim: {
      type: Date,
      default: null,
    },
    dailyBonusStreak: {
      type: Number,
      default: 0,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
