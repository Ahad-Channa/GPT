/**
 * missionUtils.js — Utility helpers for the Mission System
 *
 * Period key formats:
 *   daily:   "2026-05-24"
 *   weekly:  "2026-W21"   (ISO week, Monday-based)
 *   monthly: "2026-05"
 */

const MissionTemplate = require('../models/MissionTemplate');

// ─── Period Key Helpers ─────────────────────────────────────────────────────

/**
 * Returns the period key string for a given period type.
 * All calculations are UTC-based to match cron schedules.
 *
 * @param {string} period - 'daily' | 'weekly' | 'monthly'
 * @param {Date}   date   - reference date (default: now)
 * @param {number} offset - number of periods to add (e.g. +1 = next period, -1 = previous)
 */
function getPeriodKey(period, date = new Date(), offset = 0) {
  let d = new Date(date);

  // Apply offset by shifting the reference date
  if (offset !== 0) {
    if (period === 'daily') {
      d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offset));
    } else if (period === 'weekly') {
      d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offset * 7));
    } else if (period === 'monthly') {
      d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1));
    }
  }

  const year  = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day   = String(d.getUTCDate()).padStart(2, '0');

  if (period === 'daily') {
    return `${year}-${month}-${day}`;
  }

  if (period === 'weekly') {
    // ISO week: week containing Thursday belongs to that year
    const isoWeek = getISOWeek(d);
    const isoYear = getISOYear(d);
    return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
  }

  if (period === 'monthly') {
    return `${year}-${month}`;
  }

  throw new Error(`Unknown period: ${period}`);
}

/**
 * Returns an array of upcoming period keys starting from the current period.
 * Index 0 = current period, index 1 = next period, etc.
 *
 * @param {string} period - 'daily' | 'weekly' | 'monthly'
 * @param {number} count  - how many keys to return (default: 7)
 * @returns {string[]} array of period key strings
 */
function getUpcomingPeriodKeys(period, count = 7) {
  const keys = [];
  for (let i = 0; i < count; i++) {
    keys.push(getPeriodKey(period, new Date(), i));
  }
  return keys;
}

/**
 * Returns { start, end } Date boundaries for the current active period (UTC).
 * "end" is exclusive (i.e. the moment the next period starts).
 */
function getMissionPeriodBounds(period, date = new Date()) {
  const d = new Date(date);
  const year  = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day   = d.getUTCDate();

  if (period === 'daily') {
    const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const end   = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
    return { start, end };
  }

  if (period === 'weekly') {
    // Find Monday of current ISO week
    const dow = d.getUTCDay(); // 0=Sun, 1=Mon … 6=Sat
    const diff = dow === 0 ? -6 : 1 - dow; // days to Monday
    const monday = new Date(Date.UTC(year, month, day + diff, 0, 0, 0, 0));
    const nextMonday = new Date(monday);
    nextMonday.setUTCDate(monday.getUTCDate() + 7);
    return { start: monday, end: nextMonday };
  }

  if (period === 'monthly') {
    const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const end   = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
    return { start, end };
  }

  throw new Error(`Unknown period: ${period}`);
}

/**
 * Returns true if the given periodKey matches today's active period.
 * Used to validate claim requests — prevents claiming expired missions.
 */
function isPeriodActive(periodKey, period) {
  return periodKey === getPeriodKey(period);
}

// ─── ISO Week Helpers ───────────────────────────────────────────────────────

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getISOYear(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return d.getUTCFullYear();
}

// ─── Template Seeding ──────────────────────────────────────────────────────

/** 11 fixed platform-relevant mission templates */
const MISSION_TEMPLATES = [
  {
    key: 'complete_offers',
    label: 'Complete Offerwall',
    descriptionTemplate: 'Complete {X} offerwall offers to earn {Y} coins',
    allowedPeriods: ['daily', 'weekly', 'monthly'],
    trackingField: 'offers_completed',
  },
  {
    key: 'earn_coins',
    label: 'Earn Coins',
    descriptionTemplate: 'Earn {X} coins from any offer to get {Y} bonus coins',
    allowedPeriods: ['daily', 'weekly', 'monthly'],
    trackingField: 'coins_earned',
  },
  {
    key: 'invite_friends',
    label: 'Invite Friends',
    descriptionTemplate: 'Invite {X} friends via your referral link to earn {Y} coins',
    allowedPeriods: ['weekly', 'monthly'],
    trackingField: 'referrals_made',
  },
  {
    key: 'complete_affiliate_offers',
    label: 'Complete Affiliate Offers',
    descriptionTemplate: 'Complete {X} affiliate offers to earn {Y} coins',
    allowedPeriods: ['daily', 'weekly', 'monthly'],
    trackingField: 'affiliate_offers',
  },
  {
    key: 'complete_custom_offers',
    label: 'Complete Featured Offers',
    descriptionTemplate: 'Complete {X} featured offers to earn {Y} coins',
    allowedPeriods: ['daily', 'weekly', 'monthly'],
    trackingField: 'custom_offers_completed',
  },
  {
    key: 'earn_from_referrals',
    label: 'Earn from Referrals',
    descriptionTemplate: 'Earn {X} coins from your referrals to receive {Y} coins',
    allowedPeriods: ['weekly', 'monthly'],
    trackingField: 'referral_earnings',
  },
  {
    key: 'claim_daily_bonus',
    label: 'Claim Daily Bonus',
    descriptionTemplate: 'Claim your daily bonus {X} times to earn {Y} coins',
    allowedPeriods: ['weekly', 'monthly'],
    trackingField: 'daily_bonus_claimed',
    isActive: false,
  },
  {
    key: 'use_promo_codes',
    label: 'Use Promo Codes',
    descriptionTemplate: 'Redeem {X} promo codes to earn {Y} coins',
    allowedPeriods: ['daily', 'weekly', 'monthly'],
    trackingField: 'promo_codes_used',
    isActive: false,
  },
  {
    key: 'earn_from_multiple_walls',
    label: 'Earn from Multiple Offerwalls',
    descriptionTemplate: 'Earn from {X} different offerwalls to receive {Y} coins',
    allowedPeriods: ['weekly', 'monthly'],
    trackingField: 'offerwall_count',
  },
  {
    key: 'make_withdrawals',
    label: 'Make Withdrawals',
    descriptionTemplate: 'Successfully withdraw {X} times to earn {Y} coins',
    allowedPeriods: ['monthly'],
    trackingField: 'withdrawals_made',
  },
  {
    key: 'complete_surveys',
    label: 'Complete Surveys',
    descriptionTemplate: 'Complete {X} surveys to earn {Y} coins',
    allowedPeriods: ['daily', 'weekly', 'monthly'],
    trackingField: 'surveys_completed',
    isActive: true,
  },
];

/**
 * Upserts all 11 mission templates into the DB (idempotent).
 * Called on server startup.
 */
async function seedMissionTemplates() {
  try {
    for (const tmpl of MISSION_TEMPLATES) {
      await MissionTemplate.findOneAndUpdate(
        { key: tmpl.key },
        { $set: tmpl },
        { upsert: true, new: false }
      );
    }
    // Also disable configs using deactivated templates
    const inactiveTemplates = await MissionTemplate.find({ isActive: false });
    const inactiveKeys = inactiveTemplates.map(t => t.key);
    if (inactiveKeys.length > 0) {
      const MissionConfig = require('../models/MissionConfig');
      await MissionConfig.updateMany(
        { templateKey: { $in: inactiveKeys } },
        { $set: { isEnabled: false } }
      );
    }
    console.log('[Missions] Mission templates seeded/verified.');
  } catch (err) {
    console.error('[Missions] Failed to seed mission templates:', err.message);
  }
}

/**
 * Increment a mission tracking field for a user across all active configs.
 * Called from offer/wallet/bonus routes whenever an action completes.
 *
 * @param {string|ObjectId} userId
 * @param {string} trackingField  - e.g. 'offers_completed'
 * @param {number} incrementBy    - default 1
 */
async function incrementMissionProgress(userId, trackingField, incrementBy = 1) {
  try {
    const MissionConfig  = require('../models/MissionConfig');
    const UserMission    = require('../models/UserMission');

    const periods = ['daily', 'weekly', 'monthly'];

    for (const period of periods) {
      const periodKey = getPeriodKey(period);

      // Find all enabled configs for this period whose template tracks this field
      const templates = await MissionTemplate.find({ trackingField, isActive: true });
      if (!templates.length) continue;

      const templateKeys = templates.map(t => t.key);
      const configs = await MissionConfig.find({
        period,
        isEnabled: true,
        templateKey: { $in: templateKeys },
      });

      for (const config of configs) {
        // Upsert UserMission progress
        const um = await UserMission.findOneAndUpdate(
          { userId, configId: config._id, periodKey },
          { $inc: { progress: incrementBy }, period },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Mark completed if threshold crossed (and not already completed)
        if (!um.completed && um.progress >= config.targetValue) {
          await UserMission.updateOne(
            { _id: um._id },
            { $set: { completed: true } }
          );

          // Emit individual mission_completed notification
          const notify = require('./notify');
          const pLabel = period.charAt(0).toUpperCase() + period.slice(1);
          await notify(
            userId,
            'mission_completed',
            `${pLabel} Mission Completed!`,
            `You completed a ${pLabel} Mission! Claim your ${config.rewardAmount} coins reward now.`,
            { link: '/dashboard/missions', linkText: 'Claim now' }
          ).catch(e => console.error('[Missions] Notify error:', e.message));

          // Check if ALL missions for this period are now complete → grant period bonus
          await checkAndGrantPeriodBonus(userId, period).catch(e =>
            console.error('[Missions] Period bonus check error:', e.message)
          );
        }
      }
    }
  } catch (err) {
    // Never break main flow
    console.error('[Missions] incrementMissionProgress error:', err.message);
  }
}

/**
 * Checks if ALL enabled missions for a period are completed by the user.
 * If so, creates a PeriodBonus record (if it doesn't already exist) and notifies the user.
 *
 * @param {string|ObjectId} userId
 * @param {string} period  - 'daily' | 'weekly' | 'monthly'
 */
async function checkAndGrantPeriodBonus(userId, period) {
  const MissionConfig = require('../models/MissionConfig');
  const UserMission   = require('../models/UserMission');
  const PeriodBonus   = require('../models/PeriodBonus');
  const Settings      = require('../models/Settings');
  const notify        = require('./notify');

  const periodKey = getPeriodKey(period);

  // Get admin bonus config
  const settings = await Settings.getSingleton();
  const bonusCfg = settings.missionCompletionBonus?.[period];
  if (!bonusCfg?.enabled || !bonusCfg?.bonusAmount) return; // bonus disabled or 0 coins

  // Get all enabled mission configs for this period
  const allConfigs = await MissionConfig.find({ period, isEnabled: true });
  if (!allConfigs.length) return;

  const configIds = allConfigs.map(c => c._id);

  // Count how many are completed by this user this period
  const completedCount = await UserMission.countDocuments({
    userId,
    configId: { $in: configIds },
    periodKey,
    completed: true,
  });

  // Only proceed if ALL missions are done
  if (completedCount < allConfigs.length) return;

  // Upsert PeriodBonus — only create once per user/period/periodKey
  const existing = await PeriodBonus.findOne({ userId, period, periodKey });
  if (existing) return; // already granted

  await PeriodBonus.create({
    userId,
    period,
    periodKey,
    bonusAmount: bonusCfg.bonusAmount,
    claimed: false,
  });

  // Notify the user
  const pLabel = period.charAt(0).toUpperCase() + period.slice(1);
  await notify(
    userId,
    'mission_bonus',
    `🏆 ${pLabel} Bonus Unlocked!`,
    `You completed all ${pLabel} missions! Claim your bonus of ${bonusCfg.bonusAmount.toLocaleString()} coins now.`,
    { link: '/dashboard/missions', linkText: 'Claim bonus', period, bonusAmount: bonusCfg.bonusAmount }
  );
}

/**
 * Sends a notification to all users active in the last 7 days.
 */
async function notifyNewMissions(period) {
  try {
    const User = require('../models/User');
    const notify = require('./notify');
    
    // Find users updated in the last 7 days
    const activeSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const users = await User.find({ updatedAt: { $gte: activeSince } }).select('_id');
    
    const pLabel = period.charAt(0).toUpperCase() + period.slice(1);
    const title = `New ${pLabel} Missions!`;
    const message = `Your ${pLabel} missions have refreshed! Complete them to earn bonus coins.`;
    
    const batchSize = 100;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      await Promise.all(batch.map(u => notify(u._id, 'mission_new', title, message, { link: '/dashboard/missions', linkText: 'View Missions' })));
    }
  } catch(err) {
    console.error('[Missions] notifyNewMissions error:', err.message);
  }
}

/**
 * Sends a reminder to users with unclaimed completed missions.
 */
async function sendMissionReminders(period) {
  try {
    const UserMission = require('../models/UserMission');
    const notify = require('./notify');
    const periodKey = getPeriodKey(period);
    
    const userMissions = await UserMission.find({
      periodKey,
      completed: true,
      claimed: false
    }).select('userId');
    
    const uniqueUserIds = [...new Set(userMissions.map(um => um.userId.toString()))];
    
    const pLabel = period.charAt(0).toUpperCase() + period.slice(1);
    const title = `${pLabel} Missions Expiring Soon!`;
    const message = `Your completed ${pLabel} missions will expire in a few hours! Claim your rewards now.`;
    
    const batchSize = 100;
    for (let i = 0; i < uniqueUserIds.length; i += batchSize) {
      const batch = uniqueUserIds.slice(i, i + batchSize);
      await Promise.all(batch.map(uid => notify(uid, 'mission_reminder', title, message, { link: '/dashboard/missions', linkText: 'Claim now' })));
    }
  } catch(err) {
    console.error('[Missions] sendMissionReminders error:', err.message);
  }
}

module.exports = {
  getPeriodKey,
  getUpcomingPeriodKeys,
  getMissionPeriodBounds,
  isPeriodActive,
  seedMissionTemplates,
  incrementMissionProgress,
  checkAndGrantPeriodBonus,
  MISSION_TEMPLATES,
  notifyNewMissions,
  sendMissionReminders,
};
