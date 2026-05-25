const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const admin = require('../config/firebase');
const User = require('../models/User');
const MissionTemplate = require('../models/MissionTemplate');
const MissionConfig = require('../models/MissionConfig');
const UserMission = require('../models/UserMission');
const Transaction = require('../models/Transaction');
const notify = require('../utils/notify');
const { emitWalletUpdate } = require('../utils/walletEvents');
const {
  getPeriodKey,
  getMissionPeriodBounds,
  isPeriodActive,
} = require('../utils/missionUtils');

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build missions data for a given period for a specific user.
 * Returns array of mission objects with progress + claim status.
 */
async function buildPeriodMissions(userId, period) {
  const periodKey = getPeriodKey(period);
  const { end } = getMissionPeriodBounds(period);

  // All enabled configs for this period, sorted by display order
  const configs = await MissionConfig.find({ period, isEnabled: true })
    .sort({ displayOrder: 1 })
    .limit(3)
    .lean();

  if (!configs.length) return { missions: [], periodKey, endsAt: end };

  const configIds = configs.map(c => c._id);

  // Fetch user mission progress for this period
  const userMissions = await UserMission.find({
    userId,
    configId: { $in: configIds },
    periodKey,
  }).lean();

  const umMap = {};
  for (const um of userMissions) {
    umMap[um.configId.toString()] = um;
  }

  // Fetch all templates referenced
  const templateKeys = [...new Set(configs.map(c => c.templateKey))];
  const templates = await MissionTemplate.find({ key: { $in: templateKeys } }).lean();
  const tmplMap = {};
  for (const t of templates) tmplMap[t.key] = t;

  const missions = configs.map(config => {
    const tmpl = tmplMap[config.templateKey] || {};
    const um = umMap[config._id.toString()];
    const progress = um?.progress || 0;
    const completed = um?.completed || false;
    const claimed = um?.claimed || false;

    // Build human-readable description
    const description = (tmpl.descriptionTemplate || '')
      .replace('{X}', config.targetValue)
      .replace('{Y}', config.rewardAmount.toLocaleString());

    return {
      userMissionId: um?._id || null,
      configId: config._id,
      templateKey: config.templateKey,
      period,
      label: tmpl.label || config.templateKey,
      description,
      targetValue: config.targetValue,
      rewardAmount: config.rewardAmount,
      progress,
      completed,
      claimed,
      claimable: completed && !claimed && isPeriodActive(periodKey, period),
      periodKey,
    };
  });

  return { missions, periodKey, endsAt: end };
}

// ─── USER ENDPOINTS ───────────────────────────────────────────────────────────

/**
 * GET /api/missions
 * Returns Daily, Weekly, Monthly missions with user's progress.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;

    const [daily, weekly, monthly] = await Promise.all([
      buildPeriodMissions(userId, 'daily'),
      buildPeriodMissions(userId, 'weekly'),
      buildPeriodMissions(userId, 'monthly'),
    ]);

    res.json({ success: true, daily, weekly, monthly });
  } catch (err) {
    console.error('[Missions] GET / error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /api/missions/claim/:userMissionId
 * Claim reward for a completed mission. Validates period hasn't expired.
 */
router.post('/claim/:userMissionId', requireAuth, async (req, res) => {
  try {
    const { userMissionId } = req.params;
    const user = req.user;

    if (!mongoose.Types.ObjectId.isValid(userMissionId)) {
      return res.status(400).json({ success: false, error: 'Invalid mission ID' });
    }

    const um = await UserMission.findById(userMissionId);
    if (!um) return res.status(404).json({ success: false, error: 'Mission not found' });
    if (um.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    if (!um.completed) {
      return res.status(400).json({ success: false, error: 'Mission not yet completed' });
    }
    if (um.claimed) {
      return res.status(400).json({ success: false, error: 'Already claimed' });
    }

    // ── Expiry check: can only claim within the active period ──
    if (!isPeriodActive(um.periodKey, um.period)) {
      return res.status(400).json({
        success: false,
        error: 'This mission period has expired. Reward can no longer be claimed.',
        expired: true,
      });
    }

    const config = await MissionConfig.findById(um.configId);
    if (!config || !config.isEnabled) {
      return res.status(400).json({ success: false, error: 'Mission is no longer active' });
    }

    const reward = config.rewardAmount;
    if (reward <= 0) {
      return res.status(400).json({ success: false, error: 'No reward configured' });
    }

    // Credit wallet
    const updated = await User.findByIdAndUpdate(
      user._id,
      { $inc: { walletBalance: reward } },
      { new: true }
    );

    // Mark claimed
    await UserMission.updateOne(
      { _id: um._id },
      { $set: { claimed: true, claimedAt: new Date() } }
    );

    // Transaction record
    await Transaction.create({
      userId: user._id,
      transactionType: 'mission_reward',
      sourceType: 'mission',
      sourceId: config._id,
      amount: reward,
      balanceAfter: updated.walletBalance,
      description: `Mission Reward — ${um.period} mission (${config.templateKey})`,
      status: 'completed',
      metadata: {
        period: um.period,
        periodKey: um.periodKey,
        templateKey: config.templateKey,
        targetValue: config.targetValue,
      },
    });

    // Notify user
    await notify(
      user._id,
      'mission_reward',
      'Mission Completed! 🎯',
      `You claimed ${reward.toLocaleString()} coins for completing a ${um.period} mission.`,
      { period: um.period, rewardAmount: reward }
    );

    // Push live wallet balance update
    emitWalletUpdate(user.firebaseUid, updated.walletBalance);

    res.json({ success: true, rewardAmount: reward, newBalance: updated.walletBalance });
  } catch (err) {
    console.error('[Missions] POST /claim error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── ADMIN ENDPOINTS ──────────────────────────────────────────────────────────

/**
 * GET /api/missions/admin/templates
 * Returns all mission templates for admin display.
 */
router.get('/admin/templates', requireAdmin, async (req, res) => {
  try {
    const templates = await MissionTemplate.find().sort({ key: 1 }).lean();
    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * GET /api/missions/admin/configs
 * Returns all mission config slots with template info.
 */
router.get('/admin/configs', requireAdmin, async (req, res) => {
  try {
    const configs = await MissionConfig.find()
      .sort({ period: 1, displayOrder: 1 })
      .lean();

    const templateKeys = [...new Set(configs.map(c => c.templateKey))];
    const templates = await MissionTemplate.find({ key: { $in: templateKeys } }).lean();
    const tmplMap = {};
    for (const t of templates) tmplMap[t.key] = t;

    const enriched = configs.map(c => ({
      ...c,
      template: tmplMap[c.templateKey] || null,
    }));

    res.json({ success: true, configs: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /api/missions/admin/configs
 * Create a new mission config slot.
 * Body: { templateKey, period, displayOrder, targetValue, rewardAmount, isEnabled }
 */
router.post('/admin/configs', requireAdmin, async (req, res) => {
  try {
    const { templateKey, period, displayOrder, targetValue, rewardAmount, isEnabled } = req.body;

    if (!templateKey || !period || !displayOrder || !targetValue || rewardAmount == null) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ success: false, error: 'Invalid period' });
    }
    if (displayOrder < 1 || displayOrder > 3) {
      return res.status(400).json({ success: false, error: 'displayOrder must be 1–3' });
    }

    // Verify template exists and is allowed for this period
    const template = await MissionTemplate.findOne({ key: templateKey, isActive: true });
    if (!template) {
      return res.status(400).json({ success: false, error: 'Template not found or inactive' });
    }
    if (!template.allowedPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        error: `This mission template is not allowed for ${period} missions`,
      });
    }

    // Upsert (replace) the slot — one template per slot per period
    const config = await MissionConfig.findOneAndUpdate(
      { period, displayOrder },
      { templateKey, targetValue: Number(targetValue), rewardAmount: Number(rewardAmount), isEnabled: isEnabled !== false },
      { upsert: true, new: true }
    );

    res.json({ success: true, config });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: 'That display slot is already in use for this period' });
    }
    console.error('[Missions] POST /admin/configs error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * PUT /api/missions/admin/configs/:id
 * Update a mission config slot (target, reward, enabled, template).
 */
router.put('/admin/configs/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }

    const { templateKey, targetValue, rewardAmount, isEnabled, displayOrder, period } = req.body;

    const updates = {};
    if (templateKey !== undefined) {
      // Validate template + period compatibility
      const config = await MissionConfig.findById(id);
      const targetPeriod = period || config?.period;
      const template = await MissionTemplate.findOne({ key: templateKey, isActive: true });
      if (!template) return res.status(400).json({ success: false, error: 'Template not found' });
      if (targetPeriod && !template.allowedPeriods.includes(targetPeriod)) {
        return res.status(400).json({ success: false, error: `Template not allowed for ${targetPeriod}` });
      }
      updates.templateKey = templateKey;
    }
    if (targetValue !== undefined)  updates.targetValue = Number(targetValue);
    if (rewardAmount !== undefined) updates.rewardAmount = Number(rewardAmount);
    if (isEnabled !== undefined)    updates.isEnabled = Boolean(isEnabled);
    if (displayOrder !== undefined) updates.displayOrder = Number(displayOrder);
    if (period !== undefined)       updates.period = period;

    const updated = await MissionConfig.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Config not found' });

    res.json({ success: true, config: updated });
  } catch (err) {
    console.error('[Missions] PUT /admin/configs/:id error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * DELETE /api/missions/admin/configs/:id
 * Remove a mission config slot (clears that display slot).
 */
router.delete('/admin/configs/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }
    await MissionConfig.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * GET /api/missions/admin/stats
 * Returns summary stats: total claims per period today/this week/this month.
 */
router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const stats = {};
    for (const period of ['daily', 'weekly', 'monthly']) {
      const periodKey = getPeriodKey(period);
      const [total, claimed] = await Promise.all([
        UserMission.countDocuments({ period, periodKey }),
        UserMission.countDocuments({ period, periodKey, claimed: true }),
      ]);
      stats[period] = { total, claimed };
    }
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
