const express = require('express');
const router = express.Router();
const https = require('https');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const { verifyToken } = require('../middlewares/authMiddleware');

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
      coinsPerUSD: settings.coinsPerUSD,
      exchangeRates: { ltcUSD: ltcRateUSD },
    });
  } catch (error) {
    console.error('[/api/wallet/settings] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch wallet settings' });
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
      query.transactionType = type;
    }

    const [transactions, total, earnedResult, withdrawnResult, pendingCount] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Transaction.countDocuments(query),
      Transaction.aggregate([
        { $match: { 
            userId: user._id, 
            amount: { $gt: 0 },
            description: { $not: /^Withdrawal Refund/ }
        } },
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
    const { coinsPerUSD, withdrawalFeePercent } = settings;
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
    const feeCoins = Math.ceil(amountNum * (withdrawalFeePercent / 100));
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
        feePercent: withdrawalFeePercent,
        coinsPerUSD,
        exchangeRateSnapshot,
        ...(ltcRateUSD && {
          estimatedUSD: (amountNum / coinsPerUSD).toFixed(4),
          estimatedLTC: (amountNum / coinsPerUSD / ltcRateUSD).toFixed(8),
        }),
      },
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
   POST /api/wallet/daily-bonus
   Securely credits daily progression bonus using Atomic Mongo locks
───────────────────────────────────────────────────────────────── */
router.post('/daily-bonus', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const now = new Date();

    // 1. Verify availability
    if (user.lastDailyBonusClaim) {
      if (user.lastDailyBonusClaim.toDateString() === now.toDateString()) {
        return res.status(400).json({ success: false, error: 'Daily bonus already claimed today' });
      }
    }

    // 2. Progression streak math
    const rewardBase = 50;
    let streak = user.dailyBonusStreak || 0;

    if (user.lastDailyBonusClaim) {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (user.lastDailyBonusClaim.toDateString() === yesterday.toDateString()) {
        streak += 1;
      } else {
        streak = 1;
      }
    } else {
      streak = 1;
    }

    const rewardAmount = rewardBase + streak * 10;

    // 3. ATOMIC Update ($inc) + Optimistic locking to prevent spam-click duplicate claims
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, lastDailyBonusClaim: user.lastDailyBonusClaim },
      {
        $inc: { walletBalance: rewardAmount },
        $set: { lastDailyBonusClaim: now, dailyBonusStreak: streak },
      },
      { returnDocument: 'after' }
    );

    if (!updatedUser) {
      return res.status(409).json({ success: false, error: 'Claim concurrent conflict. Try again.' });
    }

    // 4. Archive Transaction
    await Transaction.create({
      userId: user._id,
      transactionType: 'daily_bonus',
      amount: rewardAmount,
      balanceAfter: updatedUser.walletBalance,
      description: `Daily Bonus Claim (Streak: ${streak} Days)`,
      status: 'completed',
    });

    res.status(200).json({
      success: true,
      message: `Claimed +${rewardAmount} Coins!`,
      rewardAmount,
      streak,
      balance: updatedUser.walletBalance,
    });
  } catch (error) {
    console.error('[/api/wallet/daily-bonus] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to process daily claim' });
  }
});

module.exports = router;
