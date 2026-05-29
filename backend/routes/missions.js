const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const admin = require('../config/firebase');
const User = require('../models/User');
const MissionTemplate = require('../models/MissionTemplate');
const MissionConfig = require('../models/MissionConfig');
const ScheduledMissionConfig = require('../models/ScheduledMissionConfig');
const UserMission = require('../models/UserMission');
const PeriodBonus = require('../models/PeriodBonus');
const Settings = require('../models/Settings');
const Transaction = require('../models/Transaction');
const notify = require('../utils/notify');
const { emitWalletUpdate } = require('../utils/walletEvents');
const {
  getPeriodKey,
  getUpcomingPeriodKeys,
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
 *
 * Resolution order:
 *   1. ScheduledMissionConfig for this exact periodKey  ← use if any exist
 *   2. MissionConfig (always-live default)              ← fallback
 */
async function buildPeriodMissions(userId, period) {
  const periodKey = getPeriodKey(period);
  const { end } = getMissionPeriodBounds(period);

  // ── Step 1: check for a scheduled override for this exact period ──
  const scheduled = await ScheduledMissionConfig.find({ period, periodKey })
    .sort({ displayOrder: 1 })
    .lean();

  // ── Step 2: fall back to live MissionConfig if no scheduled entries ──
  let configs;
  let isScheduledOverride = false;

  if (scheduled.length > 0) {
    // Map scheduled entries into the same shape as MissionConfig docs
    configs = scheduled
      .filter(s => s.isEnabled && s.templateKey)
      .map(s => ({
        _id: s._id,
        templateKey: s.templateKey,
        period: s.period,
        displayOrder: s.displayOrder,
        targetValue: s.targetValue,
        rewardAmount: s.rewardAmount,
        isEnabled: s.isEnabled,
        _scheduledId: s._id,   // keep reference
      }));
    isScheduledOverride = true;
  } else {
    configs = await MissionConfig.find({ period, isEnabled: true })
      .sort({ displayOrder: 1 })
      .limit(3)
      .lean();
  }

  if (!configs.length) return { missions: [], periodKey, endsAt: end, isScheduledOverride };

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

  return { missions, periodKey, endsAt: end, isScheduledOverride };
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
 * GET /api/missions/period-bonus
 * Returns period completion bonus status for all 3 periods.
 * Also checks real-time mission completion and auto-grants the bonus
 * if all missions are done but no PeriodBonus record exists yet.
 */
router.get('/period-bonus', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const settings = await Settings.getSingleton();
    const bonusCfg = settings.missionCompletionBonus || {};

    const result = {};

    for (const period of ['daily', 'weekly', 'monthly']) {
      const periodKey = getPeriodKey(period);
      const cfg = bonusCfg[period] || {};

      // Get all enabled mission configs for this period
      const allConfigs = await MissionConfig.find({ period, isEnabled: true });
      const totalMissions = allConfigs.length;

      // Count how many the user has completed this period
      let completedMissions = 0;
      if (totalMissions > 0) {
        completedMissions = await UserMission.countDocuments({
          userId,
          configId: { $in: allConfigs.map(c => c._id) },
          periodKey,
          completed: true,
        });
      }

      const allDone = totalMissions > 0 && completedMissions >= totalMissions;

      // Look for existing bonus record
      let record = await PeriodBonus.findOne({ userId, period, periodKey }).lean();

      // Auto-grant if all done, bonus configured, and no record yet
      if (allDone && !record && cfg.enabled && cfg.bonusAmount > 0) {
        record = await PeriodBonus.create({
          userId,
          period,
          periodKey,
          bonusAmount: cfg.bonusAmount,
          claimed: false,
        });
        record = record.toObject();
        // Fire notification (non-blocking)
        const pLabel = period.charAt(0).toUpperCase() + period.slice(1);
        notify(
          userId,
          'mission_bonus',
          `\uD83C\uDFC6 ${pLabel} Bonus Unlocked!`,
          `You completed all ${pLabel} missions! Claim your bonus of ${cfg.bonusAmount.toLocaleString()} coins.`,
          { link: '/dashboard/missions', linkText: 'Claim bonus', period, bonusAmount: cfg.bonusAmount }
        ).catch(() => {});
      }

      result[period] = {
        enabled:             cfg.enabled ?? true,
        bonusAmount:         cfg.bonusAmount ?? 0,
        totalMissions,
        completedMissions,
        allMissionsCompleted: allDone,
        unlocked:            !!record,
        claimed:             record?.claimed ?? false,
        claimable:           !!record && !record?.claimed && isPeriodActive(periodKey, period),
        periodKey,
      };
    }

    res.json({ success: true, periodBonus: result });
  } catch (err) {
    console.error('[Missions] GET /period-bonus error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /api/missions/period-bonus/claim/:period
 * Claim the period completion bonus. Also auto-creates the record on the fly
 * if all missions are done but record doesn't exist yet.
 */
router.post('/period-bonus/claim/:period', requireAuth, async (req, res) => {
  try {
    const { period } = req.params;
    const user = req.user;

    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ success: false, error: 'Invalid period' });
    }

    if (!isPeriodActive(getPeriodKey(period), period)) {
      return res.status(400).json({
        success: false,
        error: 'This period has expired. Bonus can no longer be claimed.',
        expired: true,
      });
    }

    const periodKey = getPeriodKey(period);
    let record = await PeriodBonus.findOne({ userId: user._id, period, periodKey });

    // If no record exists yet, check real-time if all missions are done
    if (!record) {
      const settings = await Settings.getSingleton();
      const cfg = settings.missionCompletionBonus?.[period] || {};
      if (!cfg.enabled || !cfg.bonusAmount) {
        return res.status(400).json({ success: false, error: 'No bonus configured for this period' });
      }

      const allConfigs = await MissionConfig.find({ period, isEnabled: true });
      if (!allConfigs.length) {
        return res.status(400).json({ success: false, error: 'No missions configured for this period' });
      }

      const completedCount = await UserMission.countDocuments({
        userId: user._id,
        configId: { $in: allConfigs.map(c => c._id) },
        periodKey,
        completed: true,
      });

      if (completedCount < allConfigs.length) {
        return res.status(400).json({ success: false, error: 'Complete all missions first to claim the bonus' });
      }

      // All done — create the record now
      record = await PeriodBonus.create({
        userId: user._id,
        period,
        periodKey,
        bonusAmount: cfg.bonusAmount,
        claimed: false,
      });
    }

    if (record.claimed) {
      return res.status(400).json({ success: false, error: 'Bonus already claimed' });
    }

    const reward = record.bonusAmount;
    if (reward <= 0) {
      return res.status(400).json({ success: false, error: 'No bonus amount configured' });
    }

    // Credit wallet
    const updated = await User.findByIdAndUpdate(
      user._id,
      { $inc: { walletBalance: reward } },
      { new: true }
    );

    // Mark claimed
    await PeriodBonus.updateOne(
      { _id: record._id },
      { $set: { claimed: true, claimedAt: new Date() } }
    );

    // Transaction log
    await Transaction.create({
      userId: user._id,
      transactionType: 'mission_reward',
      sourceType: 'mission',
      sourceId: record._id,
      amount: reward,
      balanceAfter: updated.walletBalance,
      description: `Period Completion Bonus — ${period} (all missions completed)`,
      status: 'completed',
      metadata: { period, periodKey, bonusType: 'period_completion' },
    });

    // Notify
    const pLabel = period.charAt(0).toUpperCase() + period.slice(1);
    await notify(
      user._id,
      'mission_reward',
      `🏆 ${pLabel} Bonus Claimed!`,
      `You claimed your ${pLabel} completion bonus of ${reward.toLocaleString()} coins!`,
      { period, rewardAmount: reward }
    );

    emitWalletUpdate(user.firebaseUid, updated.walletBalance);

    res.json({ success: true, rewardAmount: reward, newBalance: updated.walletBalance });
  } catch (err) {
    console.error('[Missions] POST /period-bonus/claim error:', err);
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

// ─── ADMIN SCHEDULED CONFIG ENDPOINTS ────────────────────────────────────────

/**
 * GET /api/missions/admin/upcoming-keys
 * Returns the next 7 period keys for each period type.
 * Used by the admin UI to render the Schedule Ahead grid.
 */
router.get('/admin/upcoming-keys', requireAdmin, async (req, res) => {
  try {
    const keys = {
      daily:   getUpcomingPeriodKeys('daily',   7),
      weekly:  getUpcomingPeriodKeys('weekly',  7),
      monthly: getUpcomingPeriodKeys('monthly', 7),
    };
    res.json({ success: true, keys });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * GET /api/missions/admin/scheduled
 * Returns all scheduled mission configs, enriched with template info.
 * Grouped by period + periodKey for UI convenience.
 */
router.get('/admin/scheduled', requireAdmin, async (req, res) => {
  try {
    const all = await ScheduledMissionConfig.find()
      .sort({ period: 1, periodKey: 1, displayOrder: 1 })
      .lean();

    // Enrich with template data
    const templateKeys = [...new Set(all.map(s => s.templateKey).filter(Boolean))];
    const templates = await MissionTemplate.find({ key: { $in: templateKeys } }).lean();
    const tmplMap = {};
    for (const t of templates) tmplMap[t.key] = t;

    const enriched = all.map(s => ({ ...s, template: tmplMap[s.templateKey] || null }));

    res.json({ success: true, scheduled: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /api/missions/admin/scheduled
 * Create or update a scheduled mission config entry for a specific periodKey.
 * Body: { period, periodKey, displayOrder, templateKey, targetValue, rewardAmount, isEnabled }
 *
 * Also accepts applyMode='next_period' from the main configs endpoint.
 */
router.post('/admin/scheduled', requireAdmin, async (req, res) => {
  try {
    const { period, periodKey, displayOrder, templateKey, targetValue, rewardAmount, isEnabled } = req.body;

    if (!period || !periodKey || !displayOrder) {
      return res.status(400).json({ success: false, error: 'period, periodKey and displayOrder are required' });
    }
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ success: false, error: 'Invalid period' });
    }
    if (displayOrder < 1 || displayOrder > 3) {
      return res.status(400).json({ success: false, error: 'displayOrder must be 1–3' });
    }

    // Validate template if provided
    if (templateKey) {
      const template = await MissionTemplate.findOne({ key: templateKey, isActive: true });
      if (!template) {
        return res.status(400).json({ success: false, error: 'Template not found or inactive' });
      }
      if (!template.allowedPeriods.includes(period)) {
        return res.status(400).json({
          success: false,
          error: `Template not allowed for ${period} missions`,
        });
      }
    }

    // Upsert: one slot per period + periodKey + displayOrder
    const entry = await ScheduledMissionConfig.findOneAndUpdate(
      { period, periodKey, displayOrder: Number(displayOrder) },
      {
        templateKey: templateKey || '',
        targetValue: Number(targetValue) || 0,
        rewardAmount: Number(rewardAmount) || 0,
        isEnabled: isEnabled !== false,
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, entry });
  } catch (err) {
    console.error('[Missions] POST /admin/scheduled error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * DELETE /api/missions/admin/scheduled/:id
 * Remove a single scheduled mission config entry.
 */
router.delete('/admin/scheduled/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID' });
    }
    await ScheduledMissionConfig.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * DELETE /api/missions/admin/scheduled/period/:period/:periodKey
 * Remove ALL scheduled entries for a given period + periodKey (clear entire slot set).
 */
router.delete('/admin/scheduled/period/:period/:periodKey', requireAdmin, async (req, res) => {
  try {
    const { period, periodKey } = req.params;
    await ScheduledMissionConfig.deleteMany({ period, periodKey });
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

/**
 * GET /api/missions/admin/period-bonus-config
 * Returns current period completion bonus config from Settings.
 */
router.get('/admin/period-bonus-config', requireAdmin, async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    res.json({ success: true, config: settings.missionCompletionBonus || {} });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * PUT /api/missions/admin/period-bonus-config
 * Update period completion bonus amounts + enabled flags.
 * Body: { daily: { enabled, bonusAmount }, weekly: {...}, monthly: {...} }
 */
router.put('/admin/period-bonus-config', requireAdmin, async (req, res) => {
  try {
    const { daily, weekly, monthly } = req.body;
    const update = {};

    for (const [period, cfg] of Object.entries({ daily, weekly, monthly })) {
      if (!cfg) continue;
      if (cfg.enabled !== undefined)
        update[`missionCompletionBonus.${period}.enabled`] = Boolean(cfg.enabled);
      if (cfg.bonusAmount !== undefined)
        update[`missionCompletionBonus.${period}.bonusAmount`] = Math.max(0, Number(cfg.bonusAmount));
    }

    const settings = await Settings.getSingleton();
    const updated = await Settings.findByIdAndUpdate(
      settings._id,
      { $set: update },
      { new: true }
    );

    res.json({ success: true, config: updated.missionCompletionBonus });
  } catch (err) {
    console.error('[Missions] PUT /admin/period-bonus-config error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
