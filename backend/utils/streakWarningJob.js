const cron = require('node-cron');
const User = require('../models/User');
const Notification = require('../models/Notification');
const notify = require('./notify');

// Run every hour at the top of the hour
cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();
    
    // Define "today" and "tomorrow" in local server time (which matches toDateString usage in wallet.js)
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const hoursToReset = (tomorrow - now) / (1000 * 60 * 60);

    // Only fire if there's less than or equal to 4 hours left
    if (hoursToReset > 4) return;

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(now);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    startOfYesterday.setHours(0, 0, 0, 0);

    // Users whose last claim was on "yesterday", meaning they have a streak but haven't claimed today yet.
    const usersAtRisk = await User.find({
      dailyBonusStreak: { $gt: 0 },
      lastDailyBonusClaim: { $gte: startOfYesterday, $lt: startOfToday }
    });

    let warnedCount = 0;
    for (const user of usersAtRisk) {
      // Avoid duplicate streak warnings on the same day
      const alreadyWarned = await Notification.exists({
        userId: user._id,
        type: 'streak_warning',
        createdAt: { $gte: startOfToday }
      });

      if (alreadyWarned) continue;

      const hoursLeft = Math.ceil(hoursToReset);
      await notify(
        user._id,
        'streak_warning',
        'Streak Expiring Soon!',
        `Your daily bonus streak will reset in ${hoursLeft} hours. Complete offers and claim your daily reward!`,
        { hoursLeft }
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
