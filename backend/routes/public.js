const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');

// ── Obfuscator Helper ────────────────────────────────────────────────────────
// Sanitizes transaction descriptions for private profiles.
function scrubTransaction(tx) {
  let doc = tx._doc || tx; // Handle both mongoose docs and lean docs

  // Create a copy to avoid modifying the original if it's cached
  let scrubbed = { ...doc };

  // Obfuscate the description (hide precise offer title)
  if (scrubbed.transactionType === 'withdrawal') {
    scrubbed.description = 'Requested a Withdrawal';
  } else if (scrubbed.transactionType === 'leaderboard_reward') {
    scrubbed.description = 'Earned a Leaderboard Prize';
  } else if (scrubbed.transactionType === 'vip_reward') {
    scrubbed.description = 'Earned a VIP Reward';
  } else if (scrubbed.transactionType === 'mission_reward') {
    scrubbed.description = 'Completed a Mission';
  } else if (scrubbed.transactionType === 'daily_bonus') {
    scrubbed.description = 'Claimed Daily Bonus';
  } else if (scrubbed.transactionType === 'promo_code') {
    scrubbed.description = 'Redeemed a Promo Code';
  } else if (scrubbed.method && scrubbed.method !== 'none' && scrubbed.transactionType !== 'withdrawal') {
    scrubbed.description = `Earned from ${scrubbed.method}`;
  } else if (scrubbed.metadata?.offerwall) {
    scrubbed.description = `Earned from ${scrubbed.metadata.offerwall}`;
  } else {
    scrubbed.description = `Completed an Offer`;
  }

  // Remove sensitive metadata that might contain tracking IDs or names
  if (scrubbed.metadata) {
    scrubbed.metadata = { offerwall: scrubbed.metadata.offerwall };
  }

  return scrubbed;
}

// ── GET /api/public/user/:id ──────────────────────────────────────────────────
// Returns a user's public profile data and their recent completed offers.
router.get('/user/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if ID is a valid ObjectId
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Only return safe public info
    const isPrivate = !!user.isPrivate;

    const publicProfile = {
      _id: user._id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isPrivate,
      createdAt: user.createdAt,
      // totalEarned only exposed for public profiles
      ...(isPrivate ? {} : { totalEarned: user.totalEarned || 0 }),
    };

    // If private — return profile card data but NO earnings/history
    if (isPrivate) {
      return res.status(200).json({
        success: true,
        profile: publicProfile,
        recentActiveOffers: [],
      });
    }

    const settings = await Settings.findOne({}) || {};
    const missionsEnabled = settings.missionsEnabled ?? true;

    const validTransactionTypes = [
      'offer_reward',
      'custom_offer_reward',
      'daily_bonus',
      'referral_reward',
      'admin_adjustment',
      'promo_code',
      'leaderboard_reward',
      'vip_reward',
    ];
    if (missionsEnabled) validTransactionTypes.push('mission_reward');

    // Fetch the user's latest 100 credited activities (public profiles only)
    const recentActiveOffers = await Transaction.find({
      userId: user._id,
      transactionType: {
        $in: validTransactionTypes
      },
      status: { $in: ['completed', 'hold'] },
      amount: { $gt: 0 }
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.status(200).json({
      success: true,
      profile: publicProfile,
      recentActiveOffers
    });

  } catch (err) {
    console.error('[/api/public/user/:id] Error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch public profile' });
  }
});

// ── GET /api/public/recent-earnings ───────────────────────────────────────────
// Returns the 20 most recent earnings globally, intended for the Live Earning Bar.
router.get('/recent-earnings', async (req, res) => {
  try {
    const settings = await Settings.findOne({}) || {};
    const missionsEnabled = settings.missionsEnabled ?? true;

    const validTransactionTypes = ['offer_reward', 'custom_offer_reward', 'daily_bonus', 'admin_adjustment', 'promo_code', 'leaderboard_reward', 'vip_reward'];
    if (missionsEnabled) validTransactionTypes.push('mission_reward');

    let recentEarnings = await Transaction.find({
      $or: [
        {
          transactionType: { $in: validTransactionTypes },
          status: { $in: ['completed', 'hold'] },
          amount: { $gt: 0 }
        },
        {
          transactionType: 'withdrawal',
          status: { $in: ['pending', 'completed'] }
        }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('userId', 'displayName avatarUrl isPrivate')
      .lean();

    // Scrub data for users who have their profile set to private
    recentEarnings = recentEarnings.map(tx => {
      // If the user was deleted, handle gracefully
      if (!tx.userId) {
        tx.userId = { displayName: 'Unknown', avatarUrl: '', isPrivate: true };
      }

      let processedTx = tx;
      if (tx.userId.isPrivate) {
        processedTx = scrubTransaction(tx);
      }
      return processedTx;
    });

    res.status(200).json({ success: true, earnings: recentEarnings });

  } catch (err) {
    console.error('[/api/public/recent-earnings] Error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch recent earnings' });
  }
});

// ── GET /api/public/stats ───────────────────────────────────────────────────────
// Returns global stats: total users and total amount paid out (approved withdrawals)
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    // Sum up all approved (completed) withdrawals using the absolute value of amount
    // to correctly tally both legacy (positive) and newer (negative) withdrawal records.
    const withdrawalStats = await Transaction.aggregate([
      { $match: { transactionType: 'withdrawal', status: 'completed' } },
      { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } }
    ]);

    const totalPaidOutCoins = withdrawalStats.length > 0 ? withdrawalStats[0].total : 0;

    // Convert to USD using the global coinsPerUSD setting
    const settings = await Settings.findOne({}) || { coinsPerUSD: 1000 };
    const totalPaidOutUSD = Number((totalPaidOutCoins / settings.coinsPerUSD).toFixed(2));

    res.status(200).json({ 
      success: true, 
      totalUsers, 
      totalPaidOut: totalPaidOutUSD, 
      showGlobalStats: settings.showGlobalStats,
      missionsEnabled: settings.missionsEnabled ?? true 
    });
  } catch (err) {
    console.error('[/api/public/stats] Error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch public stats' });
  }
});

// ── GET /api/public/r/:code ───────────────────────────────────────────────────
// Resolves a short referral code to the referrer's user ID.
// The frontend stores this in localStorage as 'ref' and redirects to the home page.
router.get('/r/:code', async (req, res) => {
  try {
    const { code } = req.params;
    if (!code || code.length < 6) {
      return res.status(400).json({ success: false, error: 'Invalid referral code' });
    }

    const user = await User.findOne({ referralCode: code.toUpperCase() }).lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'Referral code not found' });
    }

    res.status(200).json({ success: true, referrerId: user._id });
  } catch (err) {
    console.error('[/api/public/r/:code] Error:', err);
    res.status(500).json({ success: false, error: 'Failed to resolve referral code' });
  }
});

module.exports = router;
