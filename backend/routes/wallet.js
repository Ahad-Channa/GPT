const express = require('express');
const router = express.Router();
const https = require('https');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const PromoCode = require('../models/PromoCode');
const Avatar = require('../models/Avatar');
const { verifyToken } = require('../middlewares/authMiddleware');
const notify = require('../utils/notify');
const { notifyAdmins } = require('../utils/adminNotify');

/* ─────────────────────────────────────────────────────────────────
   UTILITY: Fetch live USD rates via CoinGecko (free, no key needed)
   Returns { ltc: <usd_per_ltc> }
   Falls back to a cached value if the API call fails.
───────────────────────────────────────────────────────────────── */
let rateCache = { ltc: null, fetchedAt: 0 };
const RATE_TTL_MS = 5 * 60 * 1000; // 5-minute cache

async function getLitecoinRate() {
  const now = Date.now();
  if (rateCache.ltc && now - rateCache.fetchedAt < RATE_TTL_MS) {
    return rateCache.ltc;
  }

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.coingecko.com',
      path: '/api/v3/simple/price?ids=litecoin&vs_currencies=usd',
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'GPT-WalletTracker-Backend/1.0.0'
      },
    };

    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const rate = json?.litecoin?.usd;
          if (rate) {
            rateCache = { ltc: rate, fetchedAt: Date.now() };
            resolve(rate);
          } else {
            console.warn('[rate] CoinGecko returned unexpected structure:', data);
            resolve(rateCache.ltc || 80); // fallback
          }
        } catch (e) {
          console.warn('[rate] Parse error:', e.message);
          resolve(rateCache.ltc || 80); // fallback
        }
      });
    });

    req.on('error', (e) => {
      console.warn('[rate] Network error fetching LTC rate:', e.message);
      resolve(rateCache.ltc || 80); // fallback
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve(rateCache.ltc || 80); // fallback on timeout
    });
  });
}

/* ─────────────────────────────────────────────────────────────────
   GET /api/wallet/settings
   Returns: withdrawal methods, fee %, coins-per-USD, live LTC rate
───────────────────────────────────────────────────────────────── */
router.get('/settings', verifyToken, async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    const ltcRateUSD = await getLitecoinRate();

    res.status(200).json({
      success: true,
      withdrawalFeePercent: settings.withdrawalFeePercent,
      withdrawalMethods: settings.withdrawalMethods.filter((m) => m.enabled),
      offerwalls: settings.offerwallProviders.filter((p) => p.enabled),
      coinsPerUSD: settings.coinsPerUSD,
      exchangeRates: { ltcUSD: ltcRateUSD },
    });
  } catch (error) {
    console.error('[/api/wallet/settings] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch wallet settings' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/wallet/affiliate-stats
   Returns: totalAffiliates, totalAffiliateEarnings, last30DaysEarnings
───────────────────────────────────────────────────────────────── */
router.get('/affiliate-stats', verifyToken, async (req, res) => {
  try {
    // Always load settings first so referralPercentage is always available
    const settings = await Settings.getSingleton();
    const globalPct = settings.referralConfig?.globalPercentage ?? 5;

    // Use firebaseUid (consistent with all other wallet routes)
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const totalAffiliates = await User.countDocuments({ referredBy: user._id });

    // Calculate last 30 days earnings from referrals
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const thirtyDaysStats = await Transaction.aggregate([
      {
        $match: {
          userId: user._id,
          transactionType: 'referral_reward',
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const last30DaysEarnings = thirtyDaysStats.length > 0 ? thirtyDaysStats[0].total : 0;

    // Use user's personal override if set, otherwise the global platform setting
    const effectivePct = (user.referralPercentage != null)
      ? user.referralPercentage
      : globalPct;

    res.status(200).json({
      success: true,
      totalAffiliates,
      totalAffiliateEarnings: user.referralEarnings || 0,
      last30DaysEarnings,
      referralPercentage: effectivePct,
    });
  } catch (error) {
    console.error('[/api/wallet/affiliate-stats] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch affiliate stats' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/wallet/history
   Query params:
     page    (default 1)
     limit   (default 20, max 50)
     type    (filter by transactionType, or 'all')
───────────────────────────────────────────────────────────────── */
router.get('/history', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const type = req.query.type || 'all';

    const query = { userId: user._id };
    if (type !== 'all') {
      if (type === 'chargeback') {
        query.status = 'reversed';
      } else if (type.includes(',')) {
        query.transactionType = { $in: type.split(',') };
      } else {
        query.transactionType = type;
      }
    }

    const [transactions, total, earnedResult, withdrawnResult, pendingCount] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Transaction.countDocuments(query),
      Transaction.aggregate([
        {
          $match: {
            userId: user._id,
            amount: { $gt: 0 },
            description: { $not: /^Withdrawal Refund/ }
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Transaction.aggregate([
        { $match: { userId: user._id, transactionType: 'withdrawal', status: { $nin: ['rejected', 'cancelled', 'failed'] } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Transaction.countDocuments({ userId: user._id, transactionType: 'withdrawal', status: 'pending' })
    ]);

    const totalEarned = earnedResult.length > 0 ? earnedResult[0].total : 0;
    const totalWithdrawn = withdrawnResult.length > 0 ? Math.abs(withdrawnResult[0].total) : 0;

    res.status(200).json({
      success: true,
      balance: user.walletBalance,
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
      stats: {
        totalEarned,
        totalWithdrawn,
        pendingCount
      }
    });
  } catch (error) {
    console.error('[/api/wallet/history] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch wallet history' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   POST /api/wallet/withdraw
   Body: { method, amount (in coins), payoutDestination }
   
   Flow:
   1. Load Settings (fee %, coinsPerUSD, method minimums)
   2. Validate method is enabled and amount ≥ minimum (in coins)
   3. Fetch live LTC rate if method is litecoin
   4. Calculate fee
   5. Verify user has enough balance
   6. Atomically deduct balance
   7. Create Transaction record (status: pending)
───────────────────────────────────────────────────────────────── */
router.post('/withdraw', verifyToken, async (req, res) => {
  try {
    const { method, amount, payoutDestination } = req.body;

    // --- 1. Basic input validation ---
    if (!method || !amount || !payoutDestination) {
      return res.status(400).json({ success: false, error: 'method, amount, and payoutDestination are required' });
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, error: 'Amount must be a positive number' });
    }

    // --- 2. Load settings ---
    const settings = await Settings.getSingleton();
    const methodConfig = settings.withdrawalMethods.find((m) => m.id === method && m.enabled);
    if (!methodConfig) {
      return res.status(400).json({ success: false, error: `Withdrawal method "${method}" is not available` });
    }

    // --- 3. Compute minimum in coins + fetch live rate if needed ---
    const { coinsPerUSD } = settings;
    const feePercent = methodConfig.feePercent !== undefined ? methodConfig.feePercent : (settings.withdrawalFeePercent || 0);
    let ltcRateUSD = null;
    let exchangeRateSnapshot = {};

    if (method === 'litecoin') {
      ltcRateUSD = await getLitecoinRate();
      exchangeRateSnapshot = { ltcUSD: ltcRateUSD, fetchedAt: new Date().toISOString() };
    }

    // Minimum coins = method.minUSD * coinsPerUSD
    const minimumCoins = methodConfig.minUSD * coinsPerUSD;
    if (amountNum < minimumCoins) {
      return res.status(400).json({
        success: false,
        error: `Minimum withdrawal for ${methodConfig.label} is ${minimumCoins.toLocaleString()} Coins ($${methodConfig.minUSD} USD)`,
      });
    }

    // --- 4. Calculate fee ---
    const feeCoins = Math.ceil(amountNum * (feePercent / 100));
    const totalDeduction = amountNum + feeCoins; // total coins deducted from balance

    // --- 5. Load user ---
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (user.walletBalance < totalDeduction) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance. You need ${totalDeduction.toLocaleString()} Coins (${amountNum} + ${feeCoins} fee) but have ${user.walletBalance.toLocaleString()} Coins`,
      });
    }

    // --- 6. Atomic balance deduction ---
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, walletBalance: { $gte: totalDeduction } },
      { $inc: { walletBalance: -totalDeduction } },
      { returnDocument: 'after' }
    );

    if (!updatedUser) {
      return res.status(409).json({ success: false, error: 'Balance changed during request. Please try again.' });
    }

    // --- 7. Create Transaction record ---
    const transaction = await Transaction.create({
      userId: user._id,
      transactionType: 'withdrawal',
      amount: -amountNum, // negative = deduction
      fee: feeCoins,
      balanceAfter: updatedUser.walletBalance,
      description: `Withdrawal via ${methodConfig.label} — ${payoutDestination}`,
      status: 'pending',
      method,
      payoutDestination,
      metadata: {
        feePercent,
        coinsPerUSD,
        exchangeRateSnapshot,
        ...(ltcRateUSD && {
          estimatedUSD: (amountNum / coinsPerUSD).toFixed(4),
          estimatedLTC: (amountNum / coinsPerUSD / ltcRateUSD).toFixed(8),
        }),
      },
    });

    await notify(
      user._id,
      'withdrawal_submitted',
      'Withdrawal Pending',
      `Your withdrawal of ${amountNum} coins is pending review.`,
      { amount: amountNum, transactionId: transaction._id }
    );

    // Add admin notification
    await notifyAdmins({
      category: 'withdrawals',
      type: 'withdrawal_requested',
      message: `User ${user.username} requested a withdrawal of ${amountNum} Coins via ${methodConfig.label}.`,
      permissionRequired: 'manage_withdrawals',
      metadata: { userId: user._id, transactionId: transaction._id }
    });

    res.status(201).json({
      success: true,
      message: `Withdrawal request submitted! ${amountNum} Coins (${feeCoins} fee applied) will be sent to your ${methodConfig.label} account.`,
      transaction,
      newBalance: updatedUser.walletBalance,
    });
  } catch (error) {
    console.error('[/api/wallet/withdraw] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to process withdrawal' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/wallet/daily-bonus-status
   Polling endpoint for daily bonus state.
───────────────────────────────────────────────────────────────── */
router.get('/daily-bonus-status', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const settings = await Settings.getSingleton();
    const rd = settings.rewardEngine;

    let streak = user.dailyBonusStreak || 0;
    const now = new Date();

    // ── Timing constants (all within 48 hours) ────────────────────
    // Cooldown: 24h after last claim — user must wait this long before claiming again
    // Streak expires: 48h after last claim — must claim within this window or streak resets
    const COOLDOWN_MS     = 24 * 60 * 60 * 1000; // 24 hours
    const STREAK_EXPIRE_MS = 48 * 60 * 60 * 1000; // 48 hours

    let alreadyClaimed = false;
    let nextClaimAt = null;
    let expiresAt = null;

    if (user.lastDailyBonusClaim) {
      const msSinceClaim = now.getTime() - new Date(user.lastDailyBonusClaim).getTime();

      if (msSinceClaim < COOLDOWN_MS) {
        // Still within cooldown — cannot claim yet
        alreadyClaimed = true;
        nextClaimAt = new Date(new Date(user.lastDailyBonusClaim).getTime() + COOLDOWN_MS).toISOString();
      } else if (msSinceClaim >= STREAK_EXPIRE_MS) {
        // Past 24h — streak is broken, reset to 0
        streak = 0;
      } else {
        // Between 20h and 24h = eligible to claim, streak still alive
        expiresAt = new Date(new Date(user.lastDailyBonusClaim).getTime() + STREAK_EXPIRE_MS).toISOString();
      }
    }

    let nextStreakToClaim = streak + 1;
    if (nextStreakToClaim > 30) {
      nextStreakToClaim = 1;
    }

    // Dynamic reward calculations for 30-day streak
    const getRewardForDay = (streakDay) => {
      // Use dynamic settings if available, else falback to default
      const rd = settings?.rewardEngine?.dailyBonusReward;
      if (rd && rd.length >= streakDay) return rd[streakDay - 1];

      if (streakDay === 10) return 500;
      if (streakDay === 20) return 1000;
      if (streakDay === 30) return 2500;
      return 100 + ((streakDay - 1) * 10);
    };

    const getGateForDay = (streakDay) => {
      const rd = settings?.rewardEngine?.dailyBonusEarnGate;
      if (rd && rd.length >= streakDay) return rd[streakDay - 1];

      return 1000; // Flat earn gate, can be adjusted
    };

    let earnedToday = 0;
    if (!alreadyClaimed) {
      // Earnings only count AFTER the cooldown has ended
      const windowStart = user.lastDailyBonusClaim
        ? new Date(new Date(user.lastDailyBonusClaim).getTime() + COOLDOWN_MS)
        : new Date(now.getTime() - STREAK_EXPIRE_MS);

      const earnedResult = await Transaction.aggregate([
        {
          $match: {
            userId: user._id,
            amount: { $gt: 0 },
            // Only count real offer/survey/referral earnings — NOT daily bonus, leaderboard, etc.
            transactionType: { $nin: ['daily_bonus', 'promo_code', 'admin_adjustment', 'leaderboard_reward'] },
            status: 'completed',
            createdAt: { $gte: windowStart }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      earnedToday = earnedResult.length > 0 ? earnedResult[0].total : 0;
    }

    const required = getGateForDay(nextStreakToClaim);
    const gateUnlocked = earnedToday >= required;
    const rewardToday = getRewardForDay(nextStreakToClaim);

    let nextDayStreak = alreadyClaimed ? nextStreakToClaim : (nextStreakToClaim + 1);
    if (nextDayStreak > 30) {
      nextDayStreak = 1;
    }
    const rewardTomorrow = getRewardForDay(nextDayStreak);
    
    // special rewards for display
    const rewardDay10 = getRewardForDay(10);
    const rewardDay20 = getRewardForDay(20);
    const rewardDay30 = getRewardForDay(30);

    res.status(200).json({
      success: true,
      alreadyClaimed,
      gateUnlocked,
      earned: earnedToday,
      required,
      streak: alreadyClaimed ? streak : nextStreakToClaim,
      rewardToday,
      rewardTomorrow,
      rewardDay10,
      rewardDay20,
      rewardDay30,
      nextClaimAt,
      expiresAt
    });
  } catch (error) {
    console.error('[/api/wallet/daily-bonus-status] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch status' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   POST /api/wallet/daily-bonus
   Securely credits daily progression bonus using Atomic Mongo locks
───────────────────────────────────────────────────────────────── */
router.post('/daily-bonus', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const now = new Date();
    // Cooldown: 24h — Streak expires: 48h
    const COOLDOWN_MS      = 24 * 60 * 60 * 1000;
    const STREAK_EXPIRE_MS = 48 * 60 * 60 * 1000;

    // 1. Verify cooldown
    if (user.lastDailyBonusClaim) {
      const msSinceClaim = now.getTime() - new Date(user.lastDailyBonusClaim).getTime();
      if (msSinceClaim < COOLDOWN_MS) {
        return res.status(400).json({ success: false, error: 'Daily bonus already claimed. Come back later.' });
      }
    }

    const settings = await Settings.getSingleton();
    const rd = settings.rewardEngine;

    // 2. Streak math — break streak if 24h+ have passed since last claim
    let streak = user.dailyBonusStreak || 0;
    if (user.lastDailyBonusClaim) {
      const msSinceClaim = now.getTime() - new Date(user.lastDailyBonusClaim).getTime();
      if (msSinceClaim < STREAK_EXPIRE_MS) {
        // Within 24h = continue streak
        streak += 1;
      } else {
        // Missed the 4h window = streak broken, start fresh
        streak = 1;
      }
    } else {
      streak = 1;
    }

    if (streak > 30) {
      streak = 1;
    }

    // Dynamic reward calculations for 30-day streak
    const getRewardForDay = (streakDay) => {
      if (streakDay === 10) return 500;
      if (streakDay === 20) return 1000;
      if (streakDay === 30) return 2500;
      return 100 + ((streakDay - 1) * 10);
    };

    const getGateForDay = (streakDay) => {
      return 1000; // Flat earn gate
    };

    // 3. EARN GATE — only count REAL earnings (not daily_bonus, promo_code, admin_adjustment)
    // Earnings only count AFTER the cooldown has ended
    const windowStart = user.lastDailyBonusClaim
      ? new Date(new Date(user.lastDailyBonusClaim).getTime() + COOLDOWN_MS)
      : new Date(now.getTime() - STREAK_EXPIRE_MS);

    const earnedResult = await Transaction.aggregate([
      {
        $match: {
          userId: user._id,
          amount: { $gt: 0 },
          transactionType: { $nin: ['daily_bonus', 'promo_code', 'admin_adjustment', 'leaderboard_reward'] },
          status: 'completed',
          createdAt: { $gte: windowStart }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const earnedToday = earnedResult.length > 0 ? earnedResult[0].total : 0;
    const requiredEarn = getGateForDay(streak);

    if (earnedToday < requiredEarn) {
      return res.status(200).json({
        success: false,
        gateRequired: true,
        earned: earnedToday,
        required: requiredEarn
      });
    }

    const rewardAmount = getRewardForDay(streak);

    // 4. ATOMIC update — optimistic lock prevents race-condition double-claims
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, lastDailyBonusClaim: user.lastDailyBonusClaim },
      {
        $inc: { walletBalance: rewardAmount, totalEarned: rewardAmount },
        $set: { lastDailyBonusClaim: now, dailyBonusStreak: streak },
      },
      { returnDocument: 'after' }
    );

    if (!updatedUser) {
      return res.status(409).json({ success: false, error: 'Claim concurrent conflict. Try again.' });
    }

    // 5. Archive Transaction
    await Transaction.create({
      userId: user._id,
      transactionType: 'daily_bonus',
      amount: rewardAmount,
      balanceAfter: updatedUser.walletBalance,
      description: `Daily Bonus Claim (Streak: ${streak} Days)`,
      status: 'completed',
    });

    const nextClaimAt = new Date(now.getTime() + COOLDOWN_MS).toISOString();

    res.status(200).json({
      success: true,
      message: `Claimed +${rewardAmount} Coins!`,
      rewardAmount,
      streak,
      balance: updatedUser.walletBalance,
      nextClaimAt
    });
  } catch (error) {
    console.error('[/api/wallet/daily-bonus] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to process daily claim' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   POST /api/wallet/redeem-promo
   Body: { code: "PROMO25" }
───────────────────────────────────────────────────────────────── */
router.post('/redeem-promo', verifyToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Code is required' });

    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const normalizedCode = code.trim().toUpperCase();

    // Find and check code validity
    const promo = await PromoCode.findOne({ code: normalizedCode, isActive: true });
    if (!promo) {
      return res.status(400).json({ success: false, error: 'Invalid code' });
    }

    if (promo.expiresAt && new Date() > promo.expiresAt) {
      return res.status(400).json({ success: false, error: 'Code expired' });
    }

    if (promo.usedBy.includes(user._id)) {
      return res.status(400).json({ success: false, error: 'Already redeemed' });
    }

    if (promo.maxUses !== 0 && promo.usedCount >= promo.maxUses) {
      return res.status(400).json({ success: false, error: 'Code fully used' });
    }

    // Atomic update
    const updatedPromo = await PromoCode.findOneAndUpdate(
      {
        _id: promo._id,
        isActive: true,
        $or: [
          { maxUses: 0 },
          { usedCount: { $lt: promo.maxUses > 0 ? promo.maxUses : 999999999 } }
        ],
        usedBy: { $ne: user._id }
      },
      {
        $inc: { usedCount: 1 },
        $push: { usedBy: user._id }
      },
      { new: true }
    );

    if (!updatedPromo) {
      return res.status(400).json({ success: false, error: 'Code no longer available or already redeemed' });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id },
      { $inc: { walletBalance: promo.rewardCoins, totalEarned: promo.rewardCoins } },
      { new: true }
    );

    await Transaction.create({
      userId: user._id,
      transactionType: 'promo_code',
      amount: promo.rewardCoins,
      balanceAfter: updatedUser.walletBalance,
      description: `Promo Code: ${normalizedCode}`,
      status: 'completed',
    });

    res.status(200).json({
      success: true,
      coinsEarned: promo.rewardCoins,
      newBalance: updatedUser.walletBalance
    });
  } catch (error) {
    console.error('[/api/wallet/redeem-promo] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to redeem promo code' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/wallet/dashboard-stats
   Fetch lifetime stats for the dashboard (e.g. Total Offers Completed)
───────────────────────────────────────────────────────────────── */
router.get('/dashboard-stats', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // Aggregate to count and sum offer_reward transactions
    const result = await Transaction.aggregate([
      {
        $match: {
          userId: user._id,
          transactionType: { $in: ['offer_reward', 'custom_offer_reward'] },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalEarned: { $sum: '$amount' }
        }
      }
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result30 = await Transaction.aggregate([
      {
        $match: {
          userId: user._id,
          amount: { $gt: 0 },
          status: 'completed',
          createdAt: { $gte: thirtyDaysAgo },
          description: { $not: /^Withdrawal Refund/ }
        }
      },
      {
        $group: {
          _id: null,
          totalEarned: { $sum: '$amount' }
        }
      }
    ]);

    const resultLifetime = await Transaction.aggregate([
      {
        $match: {
          userId: user._id,
          amount: { $gt: 0 },
          status: 'completed',
          description: { $not: /^Withdrawal Refund/ }
        }
      },
      {
        $group: {
          _id: null,
          totalEarned: { $sum: '$amount' }
        }
      }
    ]);

    const stats = result.length > 0 ? result[0] : { count: 0, totalEarned: 0 };
    const stats30 = result30.length > 0 ? result30[0] : { totalEarned: 0 };
    const statsLifetime = resultLifetime.length > 0 ? resultLifetime[0] : { totalEarned: 0 };

    res.status(200).json({
      success: true,
      totalTasksCompleted: stats.count,
      totalCoinsFromOffers: stats.totalEarned,
      earnings30Days: stats30.totalEarned,
      totalEarnedLifetime: statsLifetime.totalEarned
    });
  } catch (error) {
    console.error('[/api/wallet/dashboard-stats] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   POST /api/wallet/history/:id/submit-proof
   Allows user to submit proof (text/image) for a specific transaction
   that is in 'hold' or 'pending' state.
───────────────────────────────────────────────────────────────── */
router.post('/history/:id/submit-proof', verifyToken, async (req, res) => {
  try {
    const { proofText, proofImage } = req.body;
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const transaction = await Transaction.findOne({ _id: req.params.id, userId: user._id });
    if (!transaction) return res.status(404).json({ success: false, error: 'Transaction not found' });

    if (!['hold', 'pending', 'rejected'].includes(transaction.status)) { // added rejected in case admin rejected proof and asked to resubmit
      return res.status(400).json({ success: false, error: 'Proof submission is not allowed for this transaction status.' });
    }

    // Attach proof to metadata
    const metadata = transaction.metadata || {};
    metadata.userProof = {
      text: proofText || '',
      imageUrl: proofImage || '',
      submittedAt: new Date().toISOString()
    };

    transaction.metadata = metadata;
    // If it was hold or rejected, change to pending so admin knows it's ready for review
    if (['hold', 'rejected'].includes(transaction.status)) {
      transaction.status = 'pending';
    }

    // Must mark modified for Mixed types
    transaction.markModified('metadata');
    await transaction.save();

    // Add admin notification
    await notifyAdmins({
      category: 'offerwalls', // or maybe 'users' or 'security'? offerwalls is fine if it's offers
      type: 'proof_submitted',
      message: `User ${user.username} submitted proof for transaction ${transaction.description}.`,
      permissionRequired: 'manage_offerwalls', 
      metadata: { userId: user._id, transactionId: transaction._id }
    });

    res.status(200).json({ success: true, message: 'Proof submitted successfully', transaction });
  } catch (error) {
    console.error('[/api/wallet/history/:id/submit-proof] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit proof' });
  }
});

// ==========================================
// AVATAR SHOP
// ==========================================

// GET /api/wallet/avatars
// Returns all avatars and sets isUnlocked flag for the user
router.get('/avatars', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const avatars = await Avatar.find().sort({ createdAt: -1 });
    const unlockedSet = new Set((user.unlockedAvatars || []).map(id => id.toString()));

    const avatarsWithStatus = avatars.map(av => {
      const isUnlocked = !av.isPremium || unlockedSet.has(av._id.toString());
      return {
        _id: av._id,
        name: av.name,
        url: av.url,
        isPremium: av.isPremium,
        price: av.price,
        isUnlocked
      };
    });

    res.json({ success: true, avatars: avatarsWithStatus });
  } catch (error) {
    console.error('[/api/wallet/avatars] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch avatars' });
  }
});

// POST /api/wallet/avatars/buy/:id
// Purchases a premium avatar
router.post('/avatars/buy/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const avatar = await Avatar.findById(req.params.id);
    if (!avatar) return res.status(404).json({ success: false, error: 'Avatar not found' });

    // Check if already unlocked (uses .toString() for proper ObjectId comparison)
    const alreadyOwned = (user.unlockedAvatars || []).some(
      id => id.toString() === avatar._id.toString()
    );
    if (alreadyOwned) {
      return res.status(400).json({ success: false, error: 'You already own this avatar.' });
    }

    // Only charge coins if the avatar is premium
    if (avatar.isPremium && avatar.price > 0) {
      if (user.walletBalance < avatar.price) {
        return res.status(400).json({ success: false, error: `Insufficient coins. You need ${avatar.price} coins but have ${user.walletBalance}.` });
      }
      user.walletBalance -= avatar.price;

      // Log transaction (avatar_purchase mapped to admin_adjustment type for schema compat)
      await Transaction.create({
        userId: user._id,
        transactionType: 'admin_adjustment',
        amount: -avatar.price,
        status: 'completed',
        description: `Avatar Purchase: ${avatar.name}`,
        balanceAfter: user.walletBalance,
        metadata: { avatarId: avatar._id, avatarName: avatar.name }
      });
    }

    // Add to unlocked list
    user.unlockedAvatars = user.unlockedAvatars || [];
    user.unlockedAvatars.push(avatar._id);
    await user.save();

    res.json({ success: true, message: `Avatar "${avatar.name}" unlocked!`, walletBalance: user.walletBalance });
  } catch (error) {
    console.error('[/api/wallet/avatars/buy/:id] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to purchase avatar' });
  }
});

module.exports = router;
