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
          enabled: { type: Boolean, default: true },
          icon: { type: String, default: '💰' },
        },
      ],
      default: [
        { id: 'litecoin', label: 'Litecoin', minUSD: 1.0, enabled: true, icon: 'Ł' },
        { id: 'paypal',   label: 'PayPal',   minUSD: 5.0, enabled: true, icon: '💳' },
        { id: 'giftcard', label: 'Gift Card', minUSD: 10.0, enabled: true, icon: '🎁' },
      ],
    },
    // Coins-per-USD rate — how many platform coins = $1 USD
    // e.g. 100 = 100 coins per dollar
    coinsPerUSD: {
      type: Number,
      default: 100,
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
