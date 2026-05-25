const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Settings = require('../models/Settings');
const LeaderboardCycle = require('../models/Leaderboard');
const notify = require('../utils/notify');
const { emitWalletUpdate } = require('../utils/walletEvents');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get the UTC start of the current period window.
 * Used as a fallback when no lastResetAt has been stored yet.
 */
function getPeriodStart(period) {
  if (period === 'allTime') return new Date(0); // Epoch

  const now = new Date();
  if (period === 'daily') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  if (period === 'weekly') {
    const day = now.getUTCDay(); // 0=Sun,1=Mon...
    const diff = (day === 0) ? 6 : day - 1; // Monday start
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
    return monday;
  }
  if (period === 'monthly') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
}

/**
 * Get the UTC end of the current period window (exclusive).
 */
function getPeriodEnd(period) {
  if (period === 'allTime') return new Date(8640000000000000); // Max Date

  const start = getPeriodStart(period);
  if (period === 'daily') {
    return new Date(start.getTime() + 24 * 60 * 60 * 1000);
  }
  if (period === 'weekly') {
    return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  if (period === 'monthly') {
    return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  }
}

// ─── Real earning types ───────────────────────────────────────────────────────
// These are the ONLY types that count toward leaderboard rankings.
// Excluded: daily_bonus, promo_code, leaderboard_reward (bonuses, not real work).
// Included: admin_adjustment DOES count — admins use it to credit real completed work.
const REAL_EARNING_TYPES = [
  'offer_reward',
  'custom_offer_reward',
  'referral_reward',
  'admin_adjustment',
];

/**
 * Aggregate live rankings for a single period.
 * Returns only users with real earnings > 0, padded with 0-earners for display.
 * The padding users are clearly marked coinsEarned: 0.
 */
async function getLiveRankings(period, limit = 50) {
  if (period === 'allTime') {
    const users = await User.find({ role: { $ne: 'admin' }, isBanned: false, totalEarned: { $gt: 0 } })
      .sort({ totalEarned: -1 })
      .limit(limit)
      .lean();

    let rankings = users.map((u, i) => ({
      rank: i + 1,
      userId: u._id,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      avatar: u.photoURL,
      coinsEarned: u.totalEarned || 0,
    }));

    if (rankings.length < limit) {
      const needed = limit - rankings.length;
      const paddingUsers = await User.find({
        role: { $ne: 'admin' },
        isBanned: false,
        totalEarned: { $in: [0, null, undefined] },
      }).limit(needed).lean();

      for (const u of paddingUsers) {
        rankings.push({
          rank: rankings.length + 1,
          userId: u._id,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          avatar: u.photoURL,
          coinsEarned: 0,
        });
      }
    }
    return rankings;
  }

  // ── Use stored lastResetAt as cycle start (prevents bleed from previous cycle) ──
  const settings = await Settings.getSingleton();
  const storedReset = settings.leaderboardConfig?.[period]?.lastResetAt;
  const cycleStart = storedReset ? new Date(storedReset) : getPeriodStart(period);

  const results = await Transaction.aggregate([
    {
      $match: {
        transactionType: { $in: REAL_EARNING_TYPES },
        amount: { $gt: 0 },
        status: { $in: ['completed', 'hold'] },
        createdAt: { $gte: cycleStart },
      },
    },
    {
      $group: {
        _id: '$userId',
        coinsEarned: { $sum: '$amount' },
      },
    },
    { $sort: { coinsEarned: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        displayName: '$user.displayName',
        avatarUrl: '$user.avatarUrl',
        avatar: '$user.photoURL',
        coinsEarned: 1,
      },
    },
  ]);

  let rankings = results.map((r, i) => ({ rank: i + 1, ...r }));

  // Pad with 0-earner users for display purposes only (they never receive rewards)
  if (rankings.length < limit) {
    const earnedUserIds = rankings.map(r => r.userId);
    const needed = limit - rankings.length;

    const paddingUsers = await User.find({
      _id: { $nin: earnedUserIds },
      role: { $ne: 'admin' },
      isBanned: false,
    })
      .sort({ totalEarned: -1 })
      .limit(needed)
      .lean();

    for (const u of paddingUsers) {
      rankings.push({
        rank: rankings.length + 1,
        userId: u._id,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        avatar: u.photoURL,
        coinsEarned: 0,
      });
    }
  }

  return rankings;
}

// ─── Shared reset-and-reward function (called by cron + manual endpoint) ──────

async function resetLeaderboard(period) {
  const settings = await Settings.getSingleton();
  const cfg = settings.leaderboardConfig?.[period];
  if (!cfg?.enabled) return { skipped: true, reason: `${period} leaderboard is disabled` };

  // Use the same lastResetAt-based cycle start as getLiveRankings.
  // This ensures the snapshot reflects the REAL cycle window.
  const storedReset = cfg.lastResetAt;
  const cycleStart = storedReset ? new Date(storedReset) : getPeriodStart(period);
  const cycleEnd = new Date(); // the actual moment of reset = end of this cycle

  const rewardedRanks = cfg.rewardedRanks || 3;
  const rewardTiersArr = cfg.rewardTiers || [];

  const fetchLimit = Math.max(rewardedRanks, cfg.visibleSlots || 25);
  const allRankings = await getLiveRankings(period, fetchLimit);

  // ── CRITICAL GUARD: never reward 0-earners ────────────────────────────────
  // Padded 0-earner entries exist only for display; they must never win prizes.
  const earnersOnly = allRankings.filter(e => e.coinsEarned > 0);

  const winners = [];

  for (const entry of earnersOnly) {
    const rankIndex = entry.rank - 1; // 0-based
    const reward = rankIndex < rewardedRanks ? (rewardTiersArr[rankIndex] || 0) : 0;

    if (reward > 0) {
      const user = await User.findById(entry.userId);
      if (user) {
        user.walletBalance += reward;
        // NOTE: totalEarned is intentionally NOT incremented here.
        // Leaderboard prizes are bonuses and must not count toward VIP progress.
        await user.save();
        emitWalletUpdate(user.firebaseUid, user.walletBalance);

        await Transaction.create({
          userId: user._id,
          transactionType: 'leaderboard_reward',
          amount: reward,
          balanceAfter: user.walletBalance,
          description: `${period.charAt(0).toUpperCase() + period.slice(1)} Leaderboard Reward — Rank #${entry.rank}`,
          status: 'completed',
          sourceType: 'leaderboard',
        });

        await notify(
          user._id,
          'leaderboard_reward',
          'Leaderboard Reward!',
          `Congratulations! You placed #${entry.rank} on the ${period} leaderboard and won ${reward} coins.`,
          { period, rank: entry.rank, reward }
        );
      }
    }

    // Only real earners appear in the historical snapshot
    winners.push({
      rank: entry.rank,
      userId: entry.userId,
      displayName: entry.displayName,
      coinsEarned: entry.coinsEarned,
      rewardPaid: reward,
    });
  }

  // Save cycle record with the ACTUAL window timestamps
  await LeaderboardCycle.create({
    period,
    cycleStart,
    cycleEnd,
    status: 'completed',
    winners,
    rewardTiers: rewardTiersArr,
    rewardedRanks,
  });

  // Persist the reset time so the next cycle starts cleanly from NOW
  try {
    await Settings.findOneAndUpdate(
      { _singleton: 'platform_settings' },
      { $set: { [`leaderboardConfig.${period}.lastResetAt`]: cycleEnd } }
    );
  } catch (e) {
    console.warn('[leaderboard] Failed to persist lastResetAt:', e.message);
  }

  return {
    success: true,
    period,
    winnersCount: winners.length,
    rewardedRanks,
    totalPaid: winners.reduce((s, w) => s + w.rewardPaid, 0),
  };
}

module.exports.resetLeaderboard = resetLeaderboard;

// ─── Public route: GET /api/leaderboard ───────────────────────────────────────

router.get('/', verifyToken, async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    const cfg = settings.leaderboardConfig || {};
    const periods = ['daily', 'weekly', 'monthly', 'allTime'];

    const result = {};

    await Promise.all(periods.map(async (period) => {
      const periodCfg = cfg[period];

      if (period !== 'allTime' && !periodCfg?.enabled) {
        result[period] = { enabled: false };
        return;
      }

      const visibleSlots = period === 'allTime' ? 50 : (periodCfg?.visibleSlots || 25);
      const rewardedRanks = period === 'allTime' ? 0 : (periodCfg?.rewardedRanks || 3);
      const rewardTiersArr = period === 'allTime' ? [] : (periodCfg?.rewardTiers || []);
      const cycleEnd = getPeriodEnd(period);
      const rankings = await getLiveRankings(period, visibleSlots);

      result[period] = {
        enabled: true,
        cycleStart: getPeriodStart(period).toISOString(),
        cycleEnd: cycleEnd.toISOString(),
        visibleSlots,
        rewardedRanks,
        rewardTiers: rewardTiersArr,
        rankings,
      };
    }));

    res.json({ success: true, leaderboard: result });
  } catch (err) {
    console.error('Leaderboard fetch error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

module.exports.router = router;
