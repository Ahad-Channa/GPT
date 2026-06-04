const express = require('express');
const router  = express.Router();
const admin   = require('../config/firebase');
const User    = require('../models/User');
const Transaction = require('../models/Transaction');
const VipConfig   = require('../models/VipConfig');
const VipClaim    = require('../models/VipClaim');
const { VIP_LEVELS, getLevelFromEarned, getNextLevel, getLevelLabel, getDynamicVipLevels } = require('../utils/vipUtils');
const { emitWalletUpdate } = require('../utils/walletEvents');
const notify = require('../utils/notify');

/* ── Default reward amounts per level (used to seed VipConfig) ── */
const DEFAULT_REWARDS = {
  bronze_1: 0,    bronze_2: 100,  bronze_3: 250,
  silver_1: 500,  silver_2: 750,  silver_3: 1000,
  gold_1: 2000,   gold_2: 3500,   gold_3: 5000,
  platinum_1: 10000, platinum_2: 15000, platinum_3: 25000,
  diamond_1: 50000,  diamond_2: 75000,  diamond_3: 100000,
  opal: 250000,
};

/* ── Seed missing VipConfig documents on demand ── */
async function ensureConfigs() {
  for (const lvl of VIP_LEVELS) {
    await VipConfig.findOneAndUpdate(
      { levelKey: lvl.key },
      { $setOnInsert: { rewardAmount: DEFAULT_REWARDS[lvl.key] ?? 0, threshold: lvl.threshold } },
      { upsert: true }
    );
  }
}

/* ── Auth middleware ── */
const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const decoded = await admin.auth().verifyIdToken(token);
    const user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const decoded = await admin.auth().verifyIdToken(token);
    const user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

/* ──────────────────────────────────────────────
   GET /api/vip/status
   Returns current level, next level, all levels with reward & claim status
────────────────────────────────────────────── */
router.get('/status', requireAuth, async (req, res) => {
  try {
    await ensureConfigs();
    const dynamicLevels = await getDynamicVipLevels();
    const user = req.user;
    const totalEarned = user.totalEarned || 0;

    const currentLevel = getLevelFromEarned(totalEarned, dynamicLevels); // null if below first threshold
    const nextLevel    = currentLevel
      ? getNextLevel(currentLevel.key, dynamicLevels)
      : (dynamicLevels.length > 0 ? dynamicLevels[0] : null);

    // Fetch all configs & claims for this user
    const [configs, claims] = await Promise.all([
      VipConfig.find(),
      VipClaim.find({ userId: user._id }),
    ]);

    const configMap = {};
    for (const c of configs) configMap[c.levelKey] = c.rewardAmount;

    const claimedKeys = new Set(claims.map(c => c.levelKey));

    // Build levels array with status
    const levels = dynamicLevels.map((lvl, idx) => {
      const reached   = totalEarned >= lvl.threshold;
      const claimed   = claimedKeys.has(lvl.key);
      const claimable = reached && !claimed && configMap[lvl.key] > 0;
      return {
        ...lvl,
        rewardAmount: configMap[lvl.key] ?? 0,
        reached,
        claimed,
        claimable,
        index: idx,
      };
    });

    // Progress to next level
    let progressPct = 0;
    let coinsToNext = 0;
    if (nextLevel) {
      const rangeStart = currentLevel ? currentLevel.threshold : 0;
      const rangeEnd   = nextLevel.threshold;
      coinsToNext  = Math.max(0, rangeEnd - totalEarned);
      progressPct  = rangeEnd > 0
        ? Math.min(100, Math.floor(((totalEarned - rangeStart) / (rangeEnd - rangeStart)) * 100))
        : 100;
    } else {
      // At max level
      progressPct = 100;
    }

    res.json({
      success: true,
      totalEarned,
      currentLevel: currentLevel ? {
        ...currentLevel,
        rewardAmount: configMap[currentLevel.key] ?? 0,
        label: getLevelLabel(currentLevel),
      } : null,
      nextLevel: nextLevel ? {
        ...nextLevel,
        rewardAmount: configMap[nextLevel.key] ?? 0,
        label: getLevelLabel(nextLevel),
      } : null,
      progressPct,
      coinsToNext,
      levels,
    });
  } catch (err) {
    console.error('[VIP] status error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/* ──────────────────────────────────────────────
   POST /api/vip/claim/:levelKey
   Claim bonus for a reached-but-unclaimed VIP level
────────────────────────────────────────────── */
router.post('/claim/:levelKey', requireAuth, async (req, res) => {
  try {
    const { levelKey } = req.params;
    const user = req.user;
    const dynamicLevels = await getDynamicVipLevels();

    const lvl = dynamicLevels.find(l => l.key === levelKey);
    if (!lvl) return res.status(400).json({ success: false, error: 'Invalid level' });

    // Check user has reached this level
    if ((user.totalEarned || 0) < lvl.threshold) {
      return res.status(400).json({ success: false, error: 'Level not yet reached' });
    }

    // Check not already claimed
    const existing = await VipClaim.findOne({ userId: user._id, levelKey });
    if (existing) return res.status(400).json({ success: false, error: 'Already claimed' });

    const config = await VipConfig.findOne({ levelKey });
    const reward = config?.rewardAmount || 0;
    if (reward <= 0) return res.status(400).json({ success: false, error: 'No reward configured for this level' });

    // Credit wallet
    const updated = await User.findByIdAndUpdate(
      user._id,
      { $inc: { walletBalance: reward } },
      { new: true }
    );

    // Record claim
    await VipClaim.create({ userId: user._id, levelKey, amount: reward });

    // Transaction record
    await Transaction.create({
      userId: user._id,
      transactionType: 'vip_reward',
      sourceType: 'system',
      amount: reward,
      balanceAfter: updated.walletBalance,
      description: `VIP Bonus — ${getLevelLabel(lvl)}`,
      status: 'completed',
      metadata: { levelKey, tier: lvl.tier, rank: lvl.rank },
    });

    // Notify user
    await notify(user._id, 'vip_level_up',
      `VIP Bonus Claimed!`,
      `You claimed ${reward.toLocaleString()} coins for reaching ${getLevelLabel(lvl)}.`,
      { levelKey, rewardAmount: reward, tier: lvl.tier, rank: lvl.rank }
    );

    // Push updated wallet balance
    emitWalletUpdate(user.firebaseUid, updated.walletBalance);

    res.json({ success: true, rewardAmount: reward, newBalance: updated.walletBalance });
  } catch (err) {
    console.error('[VIP] claim error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/* ──────────────────────────────────────────────
   ADMIN: GET /api/vip/admin/config
   Returns all level configs (reward amounts)
────────────────────────────────────────────── */
router.get('/admin/config', requireAdmin, async (req, res) => {
  try {
    await ensureConfigs();
    const dynamicLevels = await getDynamicVipLevels();
    const configs = await VipConfig.find();
    
    const configMap = {};
    for (const c of configs) {
      configMap[c.levelKey] = {
        rewardAmount: c.rewardAmount ?? 0,
        threshold: c.threshold
      };
    }

    const levels = dynamicLevels.map(lvl => ({
      ...lvl,
      label: getLevelLabel(lvl),
      rewardAmount: configMap[lvl.key]?.rewardAmount ?? 0,
      threshold: lvl.threshold
    }));

    res.json({ success: true, levels });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/* ──────────────────────────────────────────────
   ADMIN: PUT /api/vip/admin/config
   Bulk-update reward amounts { updates: { bronze_2: 150, gold_1: 3000, ... } }
────────────────────────────────────────────── */
router.put('/admin/config', requireAdmin, async (req, res) => {
  try {
    const { updates } = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid payload' });
    }

    const ops = Object.entries(updates).map(([levelKey, data]) => ({
      updateOne: {
        filter: { levelKey },
        update: { 
          $set: { 
            rewardAmount: Number(data.rewardAmount),
            threshold: Number(data.threshold)
          } 
        },
        upsert: true,
      },
    }));

    if (ops.length) await VipConfig.bulkWrite(ops);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
