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
      unique: true,
      sparse: true,
    },
    avatarUrl: {
      type: String,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['user', 'moderator', 'admin', 'owner'],
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
    },
    // Progression tracking
    totalEarned: {
      type: Number,
      default: 0,
    },
    xp: {
      type: Number,
      default: 0,
    },
    lastDailyBonusClaim: {
      type: Date,
      default: null,
    },
    dailyBonusStreak: {
      type: Number,
      default: 0,
    },
    dailyBonusTimerStart: {
      type: Date,
      default: null,
    },
    unlockedAvatars: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Avatar'
    }],
    isBanned: {
      type: Boolean,
      default: false,
    },
    // Referrals and Fraud
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    referralEarnings: {
      type: Number,
      default: 0,
    },
    fraudFlag: {
      type: Number,
      default: 0,
    },
    referralPercentage: {
      type: Number,
      default: null, // If null, fallback to global settings
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
