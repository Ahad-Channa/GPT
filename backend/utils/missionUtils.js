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
 * Returns the current period key string for a given period type.
 * All calculations are UTC-based to match cron schedules.
 */
function getPeriodKey(period, date = new Date()) {
  const d = new Date(date);
  const year = d.getUTCFullYear();
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

/** 10 fixed platform-relevant mission templates */
const MISSION_TEMPLATES = [
  {
    key: 'complete_offers',
    label: 'Complete Offers',
    descriptionTemplate: 'Complete {X} offers to earn {Y} coins',
    allowedPeriods: ['daily', 'weekly', 'monthly'],
    trackingField: 'offers_completed',
  },
  {
    key: 'earn_coins',
    label: 'Earn Coins',
    descriptionTemplate: 'Earn {X} coins from any source to get {Y} bonus coins',
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
  },
  {
    key: 'use_promo_codes',
    label: 'Use Promo Codes',
    descriptionTemplate: 'Redeem {X} promo codes to earn {Y} coins',
    allowedPeriods: ['daily', 'weekly', 'monthly'],
    trackingField: 'promo_codes_used',
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
];

/**
 * Upserts all 10 mission templates into the DB (idempotent).
 * Called on server startup.
 */
async function seedMissionTemplates() {
  try {
    for (const tmpl of MISSION_TEMPLATES) {
      await MissionTemplate.findOneAndUpdate(
        { key: tmpl.key },
        { $setOnInsert: tmpl },
        { upsert: true, new: false }
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
        }
      }
    }
  } catch (err) {
    // Never break main flow
    console.error('[Missions] incrementMissionProgress error:', err.message);
  }
}

module.exports = {
  getPeriodKey,
  getMissionPeriodBounds,
  isPeriodActive,
  seedMissionTemplates,
  incrementMissionProgress,
  MISSION_TEMPLATES,
};
