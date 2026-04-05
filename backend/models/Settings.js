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
        { id: 'paypal',   label: 'PayPal',   minUSD: 5.0, feePercent: 5, enabled: true, icon: '💳' },
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
        default: [1000, 1200, 1400, 1600, 1800, 2000, 2200]
      },
      dailyBonusReward: {
        type: [Number],
        default: [100, 120, 140, 160, 180, 200, 220]
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
    // Block B — Offerwall Provider Registry
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
    }
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
