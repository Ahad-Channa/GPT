const cron = require('node-cron');
const User = require('../models/User');
const Notification = require('../models/Notification');
const notify = require('./notify');

/**
 * Returns the UTC midnight that starts the NEXT calendar day.
 */
function nextUtcMidnight(date) {
  const d = date || new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
}

/**
 * Returns the UTC midnight that started today.
 */
function todayUtcMidnight(date) {
  const d = date || new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// Run every hour at the top of the hour
cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();
    const todayStart     = todayUtcMidnight(now);
    const tomorrowStart  = nextUtcMidnight(now);
    const msUntilReset   = tomorrowStart.getTime() - now.getTime();
    const WARNING_THRESHOLD_MS = 4 * 60 * 60 * 1000; // warn if ≤4 hours left in day

    // Only run the warning within the last 4 hours of the UTC day
    if (msUntilReset > WARNING_THRESHOLD_MS) return;

    // Find users who:
    //   1. Have an active streak (> 0)
    //   2. Last claimed yesterday (so streak is at risk if they don't claim today)
    //   3. Have NOT already claimed today
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    const usersAtRisk = await User.find({
      dailyBonusStreak: { $gt: 0 },
      // lastDailyBonusClaim is within yesterday's UTC day (i.e. from yesterdayStart to todayStart)
      lastDailyBonusClaim: { $gte: yesterdayStart, $lt: todayStart },
    });

    let warnedCount = 0;
    // Avoid duplicate warnings within the current UTC day
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const user of usersAtRisk) {
      const alreadyWarned = await Notification.exists({
        userId: user._id,
        type: 'streak_warning',
        createdAt: { $gte: last24h }
      });

      if (alreadyWarned) continue;

      const totalMinutesLeft = Math.max(1, Math.floor(msUntilReset / (1000 * 60)));
      const hLeft = Math.floor(totalMinutesLeft / 60);
      const mLeft = totalMinutesLeft % 60;

      let timeLeftStr = '';
      if (hLeft > 0 && mLeft > 0) {
        timeLeftStr = `${hLeft} ${hLeft === 1 ? 'hour' : 'hours'} and ${mLeft} ${mLeft === 1 ? 'minute' : 'minutes'}`;
      } else if (hLeft > 0) {
        timeLeftStr = `${hLeft} ${hLeft === 1 ? 'hour' : 'hours'}`;
      } else {
        timeLeftStr = `${mLeft} ${mLeft === 1 ? 'minute' : 'minutes'}`;
      }

      await notify(
        user._id,
        'streak_warning',
        'Claim Your Daily Bonus!',
        `Your ${user.dailyBonusStreak}-day streak will reset in ${timeLeftStr} (midnight UTC). Complete offers and claim your daily reward before the day ends!`,
        { hoursLeft: hLeft, minutesLeft: mLeft, streak: user.dailyBonusStreak }
      );
      warnedCount++;
    }

    if (warnedCount > 0) {
      console.log(`[CRON] Streak warning job sent notifications to ${warnedCount} users.`);
    }
  } catch (err) {
    console.error('[CRON] Error running streak warning job:', err);
  }
});
