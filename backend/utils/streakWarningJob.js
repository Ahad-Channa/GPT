const cron = require('node-cron');
const User = require('../models/User');
const Notification = require('../models/Notification');
const notify = require('./notify');

// Run every hour at the top of the hour
cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();
    
    // 48 hours to expire, warn at 4 hours left
    const STREAK_EXPIRE_MS = 48 * 60 * 60 * 1000;
    const WARNING_THRESHOLD_MS = 4 * 60 * 60 * 1000;

    // Users whose streak is expiring in 4 hours or less
    // meaning their last claim was exactly between 44 and 48 hours ago
    const cutoffExpired = new Date(now.getTime() - STREAK_EXPIRE_MS);
    const cutoffWarning = new Date(now.getTime() - (STREAK_EXPIRE_MS - WARNING_THRESHOLD_MS));

    const usersAtRisk = await User.find({
      dailyBonusStreak: { $gt: 0 },
      lastDailyBonusClaim: { $gt: cutoffExpired, $lte: cutoffWarning }
    });

    let warnedCount = 0;
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const user of usersAtRisk) {
      // Avoid duplicate streak warnings in the last 24h
      const alreadyWarned = await Notification.exists({
        userId: user._id,
        type: 'streak_warning',
        createdAt: { $gte: last24h }
      });

      if (alreadyWarned) continue;

      const msLeft = STREAK_EXPIRE_MS - (now.getTime() - new Date(user.lastDailyBonusClaim).getTime());
      const hoursLeft = Math.max(1, Math.ceil(msLeft / (1000 * 60 * 60)));

      await notify(
        user._id,
        'streak_warning',
        'Streak Expiring Soon!',
        `Your daily bonus streak will reset in ${hoursLeft} ${hoursLeft === 1 ? 'hour' : 'hours'}. Complete offers and claim your daily reward!`,
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
