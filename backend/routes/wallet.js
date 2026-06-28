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
const { emitWalletUpdate } = require('../utils/walletEvents');
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

    const [thirtyDaysStats, pendingStats] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            userId: user._id,
            transactionType: 'referral_reward',
            status: 'completed',
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      // Also sum all currently held (pending) referral commissions
      Transaction.aggregate([
        {
          $match: {
            userId: user._id,
            transactionType: 'referral_reward',
            status: 'hold',
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const last30DaysEarnings = thirtyDaysStats.length > 0 ? thirtyDaysStats[0].total : 0;
    const pendingCommissions = pendingStats.length > 0 ? pendingStats[0].total : 0;
    const pendingCount = pendingStats.length > 0 ? pendingStats[0].count : 0;

    // Use user's personal override if set, otherwise the global platform setting
    const effectivePct = (user.referralPercentage != null)
      ? user.referralPercentage
      : globalPct;

    res.status(200).json({
      success: true,
      totalAffiliates,
      totalAffiliateEarnings: user.referralEarnings || 0,
      last30DaysEarnings,
      pendingCommissions,
      pendingCount,
      referralPercentage: effectivePct,
      holdDays: settings.referralConfig?.holdDays ?? 30,
    });
  } catch (error) {
    console.error('[/api/wallet/affiliate-stats] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch affiliate stats' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   GET /api/wallet/referred-users
   Returns: List of users referred by this user
───────────────────────────────────────────────────────────────── */
router.get('/referred-users', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    const query = { referredBy: user._id };

    const [referredUsers, total] = await Promise.all([
      User.find(query)
        .select('displayName totalEarned commissionGenerated createdAt updatedAt avatarUrl photoURL')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      referredUsers: referredUsers.map(u => ({
        _id: u._id,
        displayName: u.displayName || 'Anonymous',
        avatarUrl: u.avatarUrl || u.photoURL || null,
        totalEarned: u.totalEarned,
        referralEarnings: u.commissionGenerated || 0,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      }
    });
  } catch (error) {
    console.error('[/api/wallet/referred-users] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch referred users' });
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
        .populate({
          path: 'linkedTransactionId',
          select: 'userId',
          populate: { path: 'userId', select: 'avatarUrl photoURL displayName' }
        })
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
    const { method, amount, payoutDestination, brand } = req.body;

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
        ...(brand && { brand }),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Withdrawal request submitted',
      transaction: {
        _id: transaction._id,
        amount: amountNum,
        fee: feeCoins,
        method,
        payoutDestination,
        status: 'pending',
      },
      newBalance: updatedUser.walletBalance,
    });
  } catch (error) {
    console.error('[/api/wallet/withdraw] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to process withdrawal' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   DAILY BONUS HELPERS — Global UTC calendar-day cycle
   The "day" aligns with UTC midnight, same as the daily leaderboard reset.
   Everyone shares the same day boundary; no personal 24h timers.
────────────────────────────────────────────────────────────────── */

/** Returns the UTC midnight that started the current calendar day */
function utcDayStart(date) {
  const d = date || new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Returns the UTC midnight that will start the NEXT calendar day */
function nextUtcMidnight(date) {
  const d = date || new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
}

/**
 * Returns true if two Date values fall on the same UTC calendar day.
 */
function sameUtcDay(a, b) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth()    === b.getUTCMonth()    &&
    a.getUTCDate()     === b.getUTCDate()
  );
}

/**
 * Derives the live streak & claim-eligibility for a user.
 *
 * Rules:
 *  • Claimed today (same UTC day)  → alreadyClaimed = true, wait until tomorrow midnight
 *  • Claimed yesterday (UTC day-1) → eligible to claim today, streak continues
 *  • Claimed 2+ UTC days ago       → streak broken, reset to 0, eligible now
 *  • Never claimed                 → streak = 0, eligible now
 */
function getDailyBonusState(user, now) {
  const nowDate     = now || new Date();
  const todayStart  = utcDayStart(nowDate);
  const tomorrowMidnight = nextUtcMidnight(nowDate);

  let streak       = user.dailyBonusStreak || 0;
  let alreadyClaimed = false;
  let nextClaimAt  = null;
  let streakBroken = false;

  if (user.lastDailyBonusClaim) {
    const lastClaim = new Date(user.lastDailyBonusClaim);
    const lastClaimDayStart = utcDayStart(lastClaim);

    if (sameUtcDay(lastClaim, nowDate)) {
      // Claimed today — locked until next UTC midnight
      alreadyClaimed = true;
      nextClaimAt    = tomorrowMidnight.toISOString();
    } else {
      // How many full UTC days ago was the last claim?
      const daysDiff = Math.round(
        (todayStart.getTime() - lastClaimDayStart.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (daysDiff === 1) {
        // Claimed exactly yesterday — streak is still alive, eligible now
        // streak stays as-is; will be incremented on actual claim
      } else {
        // Missed at least one day → streak broken
        streak       = 0;
        streakBroken = true;
      }
    }
  }

  // Earnings are always counted from the start of today's UTC day
  const windowStart = todayStart;

  return { streak, alreadyClaimed, nextClaimAt, streakBroken, windowStart, tomorrowMidnight };
}

/* ─────────────────────────────────────────────────────────────────
   GET /api/wallet/daily-bonus-status
   Polling endpoint for daily bonus state.
 ───────────────────────────────────────────────────────────────── */
router.get('/daily-bonus-status', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const settings = await Settings.getSingleton();
    const now = new Date();

    const { streak, alreadyClaimed, nextClaimAt, windowStart } = getDailyBonusState(user, now);

    // The next streak day the user will claim (or is about to claim if not yet claimed)
    // If already claimed today: next claim is tomorrow at streak+1
    // If not yet claimed:       next claim is today at streak+1
    let nextStreakToClaim = streak + 1;
    if (nextStreakToClaim > 30) nextStreakToClaim = 1;

    // Dynamic reward calculations for 30-day streak
    const getRewardForDay = (streakDay) => {
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
      return 1000;
    };

    let earnedToday = 0;
    if (!alreadyClaimed) {
      const earnedResult = await Transaction.aggregate([
        {
          $match: {
            userId: user._id,
            amount: { $gt: 0 },
            transactionType: { $in: ['offer_reward', 'custom_offer_reward'] },
            status: 'completed',
            createdAt: { $gte: windowStart }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      earnedToday = earnedResult.length > 0 ? earnedResult[0].total : 0;
    }

    // When not yet claimed: the reward/gate shown is for the upcoming claim (nextStreakToClaim)
    // When already claimed: reward/gate shown is for tomorrow's claim (nextStreakToClaim)
    const required     = getGateForDay(nextStreakToClaim);
    const gateUnlocked = earnedToday >= required;
    const rewardToday  = getRewardForDay(nextStreakToClaim);

    // Tomorrow's streak day (the one after the next claim)
    let nextDayStreak = nextStreakToClaim + 1;
    if (nextDayStreak > 30) nextDayStreak = 1;
    const rewardTomorrow = getRewardForDay(nextDayStreak);

    const rewardDay10 = getRewardForDay(10);
    const rewardDay20 = getRewardForDay(20);
    const rewardDay30 = getRewardForDay(30);

    res.status(200).json({
      success: true,
      alreadyClaimed,
      gateUnlocked,
      earned: earnedToday,
      required,
      // When already claimed: show the streak the user just earned (current DB value = streak)
      // When not yet claimed: show the streak they currently have (same DB value = streak)
      streak,
      rewardToday,
      rewardTomorrow,
      rewardDay10,
      rewardDay20,
      rewardDay30,
      nextClaimAt,
      // No personal expiry timer — the global UTC midnight is the only deadline
      expiresAt: null,
      cycleResetAt: nextUtcMidnight(now).toISOString(),
    });
  } catch (error) {
    console.error('[/api/wallet/daily-bonus-status] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch status' });
  }
});

/* ─────────────────────────────────────────────────────────────────
   POST /api/wallet/daily-bonus
   Securely credits daily progression bonus using Atomic Mongo locks.
   Day boundary = UTC midnight (same as leaderboard daily reset).
 ───────────────────────────────────────────────────────────────── */
router.post('/daily-bonus', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const now = new Date();

    // 1. Check eligibility using the global UTC day cycle
    const { streak: currentStreak, alreadyClaimed, windowStart } = getDailyBonusState(user, now);

    if (alreadyClaimed) {
      return res.status(400).json({ success: false, error: 'Daily bonus already claimed today. Come back after midnight UTC.' });
    }

    const settings = await Settings.getSingleton();

    // 2. Compute the new streak value this claim will set
    let streak = currentStreak + 1;
    if (streak > 30) streak = 1;

    // Dynamic reward calculations for 30-day streak
    const getRewardForDay = (streakDay) => {
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
      return 1000;
    };

    // 3. EARN GATE — only count real offer earnings within today's UTC day window
    const earnedResult = await Transaction.aggregate([
      {
        $match: {
          userId: user._id,
          amount: { $gt: 0 },
          transactionType: { $in: ['offer_reward', 'custom_offer_reward'] },
          status: 'completed',
          createdAt: { $gte: windowStart }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const earnedToday  = earnedResult.length > 0 ? earnedResult[0].total : 0;
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

    // 4. ATOMIC update — optimistic lock on lastDailyBonusClaim prevents double-claims
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, lastDailyBonusClaim: user.lastDailyBonusClaim },
      {
        // NOTE: totalEarned is intentionally NOT incremented here.
        // Daily bonuses are not real earnings and must not count toward VIP progress.
        $inc: { walletBalance: rewardAmount },
        $set: {
          lastDailyBonusClaim: now,
          dailyBonusStreak: streak,
          dailyBonusTimerStart: null, // legacy field — keep clearing it
        },
      },
      { returnDocument: 'after' }
    );

    if (!updatedUser) {
      return res.status(409).json({ success: false, error: 'Claim concurrent conflict. Try again.' });
    }

    emitWalletUpdate(updatedUser.firebaseUid, updatedUser.walletBalance);

    // 5. Archive Transaction
    await Transaction.create({
      userId: user._id,
      transactionType: 'daily_bonus',
      amount: rewardAmount,
      balanceAfter: updatedUser.walletBalance,
      description: `Daily Bonus Claim (Streak: ${streak} Days)`,
      status: 'completed',
    });

    const nextClaimAt = nextUtcMidnight(now).toISOString();

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
      // NOTE: totalEarned is intentionally NOT incremented here.
      // Promo codes are bonuses and must not count toward VIP progress.
      { $inc: { walletBalance: promo.rewardCoins } },
      { new: true }
    );
    // Push live balance to browser
    emitWalletUpdate(updatedUser.firebaseUid, updatedUser.walletBalance);

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
      // Free avatars no longer auto-unlock; they must be explicitly acquired via the shop
      const isUnlocked = unlockedSet.has(av._id.toString());
      const obtainedAt = isUnlocked && user.avatarObtainedDates 
        ? user.avatarObtainedDates.get(av._id.toString()) 
        : null;

      return {
        _id: av._id,
        name: av.name,
        description: av.description,
        rarity: av.rarity,
        url: av.url,
        isPremium: av.isPremium,
        price: av.price,
        quantity: av.quantity,
        isUnlocked,
        obtainedAt
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

    if (avatar.quantity !== null && avatar.quantity <= 0) {
      return res.status(400).json({ success: false, error: 'This avatar is sold out.' });
    }

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
    
    // Store obtained date
    if (!user.avatarObtainedDates) {
      user.avatarObtainedDates = new Map();
    }
    user.avatarObtainedDates.set(avatar._id.toString(), new Date());
    
    await user.save();

    // Decrement quantity if it's not unlimited
    if (avatar.quantity !== null) {
      avatar.quantity -= 1;
      await avatar.save();
    }

    res.json({ success: true, message: `Avatar "${avatar.name}" unlocked!`, walletBalance: user.walletBalance });
  } catch (error) {
    console.error('[/api/wallet/avatars/buy/:id] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to purchase avatar' });
  }
});

// ── GET /api/wallet/pending-earnings ──────────────────────────────────────────
// Returns all of the current user's 'hold' transactions so they can see
// pending earnings before they're officially credited to their wallet.
const express_pending = require('express');
router.get('/pending-earnings', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const now = new Date();

    const holds = await Transaction.find({
      userId: user._id,
      status: 'hold',
    })
      .populate({
        path: 'linkedTransactionId',
        select: 'userId',
        populate: { path: 'userId', select: 'avatarUrl photoURL displayName' }
      })
      .sort({ createdAt: -1 }).lean();

    // Annotate each hold with computed fields for the frontend
    const annotated = holds.map(tx => {
      const releaseDate = tx.holdUntil ? new Date(tx.holdUntil) : null;
      const msRemaining = releaseDate ? Math.max(0, releaseDate - now) : 0;
      const daysRemaining = releaseDate ? Math.ceil(msRemaining / (1000 * 60 * 60 * 24)) : 0;
      return {
        ...tx,
        releaseDate,
        daysRemaining,
        isReadyToRelease: releaseDate ? releaseDate <= now : false,
      };
    });

    // Split affiliate holds from regular holds
    const affiliateHolds = annotated.filter(tx => tx.transactionType === 'referral_reward');
    const regularHolds   = annotated.filter(tx => tx.transactionType !== 'referral_reward');

    const totalPendingCoins = annotated.reduce((sum, tx) => sum + tx.amount, 0);

    res.json({
      success: true,
      affiliateHolds,
      regularHolds,
      totalPendingCoins,
      totalCount: annotated.length,
    });
  } catch (error) {
    console.error('[/api/wallet/pending-earnings] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pending earnings' });
  }
});

module.exports = router;
