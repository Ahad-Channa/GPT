const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Settings = require('../models/Settings');
const LeaderboardCycle = require('../models/Leaderboard');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get the UTC start of the current period window.
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

/**
 * Aggregate live rankings for a single period.
 * Sums positive transactions (earnings) per user since cycleStart.
 */
async function getLiveRankings(period, limit = 50) {
  const cycleStart = getPeriodStart(period);

  const results = await Transaction.aggregate([
    {
      $match: {
        transactionType: { $in: ['offer_reward', 'daily_bonus', 'referral_reward', 'promo_code', 'leaderboard_reward', 'admin_adjustment'] },
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

  // Pad the leaderboard with active users who haven't earned anything this period
  if (rankings.length < limit) {
    const earnedUserIds = rankings.map(r => r.userId);
    const needed = limit - rankings.length;

    const User = require('../models/User'); // ensure it's loaded if not at top-level
    const paddingUsers = await User.find({
      _id: { $nin: earnedUserIds },
      role: { $ne: 'admin' }, // don't show admins on leaderboard by default
      isBanned: false
    })
      .sort({ totalEarned: -1 }) // Sort 0-earners by who has overall more lifetime earnings, to keep best users on top of bottom lists
      .limit(needed)
      .lean();

    for (const u of paddingUsers) {
      rankings.push({
        rank: rankings.length + 1,
        userId: u._id,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        avatar: u.photoURL,
        coinsEarned: 0
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

  const cycleStart = getPeriodStart(period);
  const cycleEnd = getPeriodEnd(period);

  // How many ranks get rewarded
  const rewardedRanks = cfg.rewardedRanks || 3;
  // Reward tiers array — index 0 = rank 1
  const rewardTiersArr = cfg.rewardTiers || [];

  // Get top N users (at least rewardedRanks, but also visible slots for the snapshot)
  const fetchLimit = Math.max(rewardedRanks, cfg.visibleSlots || 25);
  const top = await getLiveRankings(period, fetchLimit);

  const winners = [];

  for (const entry of top) {
    const rankIndex = entry.rank - 1; // 0-based
    const reward = rankIndex < rewardedRanks ? (rewardTiersArr[rankIndex] || 0) : 0;

    if (reward > 0) {
      const user = await User.findById(entry.userId);
      if (user) {
        user.walletBalance += reward;
        user.totalEarned = (user.totalEarned || 0) + reward;
        await user.save();

        await Transaction.create({
          userId: user._id,
          transactionType: 'leaderboard_reward',
          amount: reward,
          balanceAfter: user.walletBalance,
          description: `${period.charAt(0).toUpperCase() + period.slice(1)} Leaderboard Reward — Rank #${entry.rank}`,
          status: 'completed',
          sourceType: 'leaderboard',
        });
      }
    }
    winners.push({
      rank: entry.rank,
      userId: entry.userId,
      displayName: entry.displayName,
      coinsEarned: entry.coinsEarned,
      rewardPaid: reward,
    });
  }

  // Save completed cycle record
  await LeaderboardCycle.create({
    period,
    cycleStart,
    cycleEnd,
    status: 'completed',
    winners,
    rewardTiers: rewardTiersArr,
    rewardedRanks,
  });

  return { success: true, period, winnersCount: winners.length, rewardedRanks, totalPaid: winners.reduce((s, w) => s + w.rewardPaid, 0) };
}

module.exports.resetLeaderboard = resetLeaderboard;

// ─── Public route: GET /api/leaderboard ───────────────────────────────────────

router.get('/', verifyToken, async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    const cfg = settings.leaderboardConfig || {};
    const periods = ['daily', 'weekly', 'monthly', 'allTime'];

    const result = {};

    for (const period of periods) {
      const periodCfg = cfg[period];

      // allTime doesn't need to be strictly enabled via settings, but let's allow it or force true
      if (period !== 'allTime' && !periodCfg?.enabled) {
        result[period] = { enabled: false };
        continue;
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
    }

    res.json({ success: true, leaderboard: result });
  } catch (err) {
    console.error('Leaderboard fetch error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

module.exports.router = router;
