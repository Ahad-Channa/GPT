/**
 * Shared VIP level definitions and utilities.
 * Used by backend routes to compute VIP status and detect level-ups.
 */

const VIP_LEVELS = [
  { key: 'bronze_1',   tier: 'Bronze',   rank: 'I',   threshold: 0,         tierOrder: 1 },
  { key: 'bronze_2',   tier: 'Bronze',   rank: 'II',  threshold: 5000,      tierOrder: 1 },
  { key: 'bronze_3',   tier: 'Bronze',   rank: 'III', threshold: 15000,     tierOrder: 1 },
  { key: 'silver_1',   tier: 'Silver',   rank: 'I',   threshold: 30000,     tierOrder: 2 },
  { key: 'silver_2',   tier: 'Silver',   rank: 'II',  threshold: 60000,     tierOrder: 2 },
  { key: 'silver_3',   tier: 'Silver',   rank: 'III', threshold: 100000,    tierOrder: 2 },
  { key: 'gold_1',     tier: 'Gold',     rank: 'I',   threshold: 200000,    tierOrder: 3 },
  { key: 'gold_2',     tier: 'Gold',     rank: 'II',  threshold: 400000,    tierOrder: 3 },
  { key: 'gold_3',     tier: 'Gold',     rank: 'III', threshold: 700000,    tierOrder: 3 },
  { key: 'platinum_1', tier: 'Platinum', rank: 'I',   threshold: 1000000,   tierOrder: 4 },
  { key: 'platinum_2', tier: 'Platinum', rank: 'II',  threshold: 1500000,   tierOrder: 4 },
  { key: 'platinum_3', tier: 'Platinum', rank: 'III', threshold: 2500000,   tierOrder: 4 },
  { key: 'diamond_1',  tier: 'Diamond',  rank: 'I',   threshold: 4000000,   tierOrder: 5 },
  { key: 'diamond_2',  tier: 'Diamond',  rank: 'II',  threshold: 6000000,   tierOrder: 5 },
  { key: 'diamond_3',  tier: 'Diamond',  rank: 'III', threshold: 8000000,   tierOrder: 5 },
  { key: 'opal',       tier: 'Opal',     rank: '',    threshold: 10000000,  tierOrder: 6 },
];

function getLevelFromEarned(totalEarned = 0, levels = VIP_LEVELS) {
  let current = null;
  for (const lvl of levels) {
    if (totalEarned >= lvl.threshold) current = lvl;
    else break;
  }
  return current;
}

function getNextLevel(currentKey, levels = VIP_LEVELS) {
  const idx = levels.findIndex(l => l.key === currentKey);
  return idx >= 0 && idx < levels.length - 1 ? levels[idx + 1] : null;
}

function checkLevelUp(oldEarned = 0, newEarned = 0, levels = VIP_LEVELS) {
  if (newEarned <= oldEarned) return [];
  return levels.filter(
    lvl => lvl.threshold > 0 && oldEarned < lvl.threshold && newEarned >= lvl.threshold
  );
}

function getLevelLabel(level) {
  if (!level) return 'Unranked';
  return level.rank ? `${level.tier} ${level.rank}` : level.tier;
}

/**
 * Fetches dynamic thresholds from VipConfig and merges them with defaults.
 */
async function getDynamicVipLevels() {
  const VipConfig = require('../models/VipConfig');
  const configs = await VipConfig.find();
  const thresholdMap = {};
  for (const c of configs) {
    if (c.threshold !== undefined && c.threshold !== null) {
      thresholdMap[c.levelKey] = c.threshold;
    }
  }
  return VIP_LEVELS.map(lvl => ({
    ...lvl,
    threshold: thresholdMap[lvl.key] !== undefined ? thresholdMap[lvl.key] : lvl.threshold
  }));
}

/**
 * After crediting coins to a user, call this to detect level-ups.
 */
async function processVipLevelUp(user, added, emitToUser) {
  try {
    const oldEarned = user.totalEarned || 0;
    const newEarned = oldEarned + added;
    
    // Fetch dynamic levels from DB
    const dynamicLevels = await getDynamicVipLevels();
    
    const newLevels = checkLevelUp(oldEarned, newEarned, dynamicLevels);
    if (!newLevels.length) return;

    const Notification = require('../models/Notification');
    const VipConfig    = require('../models/VipConfig');

    for (const lvl of newLevels) {
      const config = await VipConfig.findOne({ levelKey: lvl.key });
      const reward = config?.rewardAmount || 0;
      const label  = getLevelLabel(lvl);

      await Notification.create({
        userId:  user._id,
        type:    'vip_level_up',
        title:   `🎉 You reached ${label}!`,
        message: reward > 0
          ? `Congratulations! You've reached ${label}. Claim your ${reward.toLocaleString()} coin bonus now.`
          : `Congratulations! You've reached ${label} VIP status!`,
        metadata: { levelKey: lvl.key, tier: lvl.tier, rank: lvl.rank, rewardAmount: reward, link: '/dashboard/vip' },
      });

      emitToUser(user.firebaseUid, 'vipLevelUp', {
        levelKey:     lvl.key,
        tier:         lvl.tier,
        rank:         lvl.rank,
        label,
        rewardAmount: reward,
      });
    }
  } catch (err) {
    console.error('[VIP] processVipLevelUp error:', err);
  }
}

module.exports = { VIP_LEVELS, getLevelFromEarned, getNextLevel, checkLevelUp, getLevelLabel, getDynamicVipLevels, processVipLevelUp };

