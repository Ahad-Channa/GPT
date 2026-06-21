const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    // Singleton identifier — only one Settings document exists
    _singleton: {
      type: String,
      default: 'platform_settings',
      unique: true,
    },
    // Withdrawal fee percentage (e.g. 5 = 5%)
    withdrawalFeePercent: {
      type: Number,
      default: 5,
      min: 0,
      max: 50,
    },
    // Per-method withdrawal minimums (in USD equivalent)
    withdrawalMethods: {
      type: [
        {
          id: { type: String, required: true },      // e.g. 'litecoin'
          label: { type: String, required: true },   // e.g. 'Litecoin'
          minUSD: { type: Number, required: true },  // minimum withdrawal in USD
          feePercent: { type: Number, default: 5, min: 0, max: 100 }, // method specific fee
          enabled: { type: Boolean, default: true },
          icon: { type: String, default: '💰' },
        },
      ],
      default: [
        { id: 'litecoin', label: 'Litecoin', minUSD: 1.0, feePercent: 5, enabled: true, icon: 'Ł' },
        { id: 'paypal', label: 'PayPal', minUSD: 5.0, feePercent: 5, enabled: true, icon: '💳' },
        { id: 'giftcard', label: 'Gift Card', minUSD: 10.0, feePercent: 5, enabled: true, icon: '🎁' },
      ],
    },
    // Coins-per-USD rate — how many platform coins = $1 USD
    // e.g. 100 = 100 coins per dollar
    coinsPerUSD: {
      type: Number,
      default: 100,
    },
    // Block A — Reward Engine (Daily Bonus config)
    rewardEngine: {
      dailyBonusEarnGate: {
        type: [Number],
        default: Array(30).fill(1000)
      },
      dailyBonusReward: {
        type: [Number],
        default: Array.from({length: 30}, (_, i) => {
          if (i + 1 === 10) return 500;
          if (i + 1 === 20) return 1000;
          if (i + 1 === 30) return 2500;
          return 100 + (i * 10);
        })
      },
      dailyBonusMaxStreak: {
        type: Number,
        default: 7
      },
      dailyBonusAfterMax: {
        type: String,
        enum: ['reset', 'hold'],
        default: 'reset'
      }
    },
    // Block B — Referral System Config
    referralConfig: {
      holdDays: {
        type: Number,
        default: 30, // Default 30 days hold
        min: 0,
      },
      globalPercentage: {
        type: Number,
        default: 5,  // 5% standard reward
        min: 0,
        max: 100,
      },
      // Optional flat coin bonus when referred user completes their FIRST offer
      // Set to 0 to disable. This is credited immediately (no hold) as a thank-you bonus.
      signupBonusCoins: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    // Block B2 - Earning Hold Config (for real earnings like offerwalls/featured offers)
    earningHoldConfig: {
      enabled: { type: Boolean, default: false },
      threshold: { type: Number, default: 5000, min: 0 },
      holdDays: { type: Number, default: 30, min: 0 }
    },
    // Block C — Offerwall Provider Registry
    offerwallProviders: {
      type: [
        {
          id: { type: String, required: true },
          label: { type: String, required: true },
          enabled: { type: Boolean, default: false },
          conversionRatio: { type: Number, default: 100 },
          secretConfigured: { type: Boolean, default: false },
          category: {
            type: String,
            enum: ['surveys', 'gaming', 'mixed'],
            default: 'mixed'
          }
        }
      ],
      default: [
        { id: 'cpx', label: 'CPX Research', enabled: false, conversionRatio: 100, secretConfigured: false, category: 'surveys' },
        { id: 'adgem', label: 'AdGem', enabled: false, conversionRatio: 100, secretConfigured: false, category: 'gaming' },
        { id: 'lootably', label: 'Lootably', enabled: false, conversionRatio: 100, secretConfigured: false, category: 'mixed' },
        { id: 'torox', label: 'Torox', enabled: false, conversionRatio: 100, secretConfigured: false, category: 'gaming' },
        { id: 'primeearn', label: 'Prime Earn', enabled: false, conversionRatio: 100, secretConfigured: false, category: 'surveys' },
        { id: 'ayet', label: 'Ayet Studios', enabled: false, conversionRatio: 100, secretConfigured: false, category: 'mixed' },
        { id: 'adtowall', label: 'AdToWall', enabled: false, conversionRatio: 100, secretConfigured: false, category: 'mixed' },
        { id: 'revu', label: 'Revu', enabled: false, conversionRatio: 100, secretConfigured: false, category: 'surveys' }
      ]
    },
    // Block D — Leaderboard Configuration
    // Now supports N-rank visible slots and N-rank reward tiers (independently configurable)
    leaderboardConfig: {
      daily: {
        enabled: { type: Boolean, default: false },
        visibleSlots: { type: Number, default: 25, min: 5, max: 100 },
        rewardedRanks: { type: Number, default: 3, min: 0, max: 100 },
        rewardTiers: { type: [Number], default: [5000, 2500, 1000] },
        lastResetAt: { type: Date, default: null },
        nextConfig: {
          isScheduled: { type: Boolean, default: false },
          visibleSlots: { type: Number, default: 25, min: 5, max: 100 },
          rewardedRanks: { type: Number, default: 3, min: 0, max: 100 },
          rewardTiers: { type: [Number], default: [5000, 2500, 1000] },
        }
      },
      weekly: {
        enabled: { type: Boolean, default: false },
        visibleSlots: { type: Number, default: 25, min: 5, max: 100 },
        rewardedRanks: { type: Number, default: 3, min: 0, max: 100 },
        rewardTiers: { type: [Number], default: [20000, 10000, 5000] },
        lastResetAt: { type: Date, default: null },
        nextConfig: {
          isScheduled: { type: Boolean, default: false },
          visibleSlots: { type: Number, default: 25, min: 5, max: 100 },
          rewardedRanks: { type: Number, default: 3, min: 0, max: 100 },
          rewardTiers: { type: [Number], default: [20000, 10000, 5000] },
        }
      },
      monthly: {
        enabled: { type: Boolean, default: false },
        visibleSlots: { type: Number, default: 25, min: 5, max: 100 },
        rewardedRanks: { type: Number, default: 3, min: 0, max: 100 },
        rewardTiers: { type: [Number], default: [100000, 50000, 25000] },
        lastResetAt: { type: Date, default: null },
        nextConfig: {
          isScheduled: { type: Boolean, default: false },
          visibleSlots: { type: Number, default: 25, min: 5, max: 100 },
          rewardedRanks: { type: Number, default: 3, min: 0, max: 100 },
          rewardTiers: { type: [Number], default: [100000, 50000, 25000] },
        }
      },
    },
    // Show/Hide Global Stats on the Homepage
    // When false, the "Total Members" and "Total Paid Out" cards are hidden from users.
    // Tracking and counting always continue in the background — this is visibility only.
    showGlobalStats: {
      type: Boolean,
      default: false,
    },
    // Toggle for the entire Missions feature visibility for users
    missionsEnabled: {
      type: Boolean,
      default: true,
    },
    // Block E — Mission Period Completion Bonus
    // Extra reward when user completes ALL missions in a period
    missionCompletionBonus: {
      daily: {
        enabled: { type: Boolean, default: true },
        bonusAmount: { type: Number, default: 0, min: 0 },
      },
      weekly: {
        enabled: { type: Boolean, default: true },
        bonusAmount: { type: Number, default: 0, min: 0 },
      },
      monthly: {
        enabled: { type: Boolean, default: true },
        bonusAmount: { type: Number, default: 0, min: 0 },
      },
    },
    // Block F — Book Rewards
    // When true: only users with a German IP see books in the withdrawal section
    // When false: all users worldwide can see and order books
    booksGermanyOnly: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Static method: always fetch (or create) the singleton Settings document
settingsSchema.statics.getSingleton = async function () {
  let settings = await this.findOne({ _singleton: 'platform_settings' });
  if (!settings) {
    settings = await this.create({ _singleton: 'platform_settings' });
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
