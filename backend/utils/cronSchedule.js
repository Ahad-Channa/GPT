const cron = require('node-cron');

// Scheduled jobs (leaderboard resets, hold releases, streak warnings) must run
// on ONE server per database. Staging and taskmint.me currently share the same
// MongoDB, so two servers running the midnight jobs could pay leaderboard
// prizes or release referral holds twice. Set DISABLE_CRON_JOBS=true in the
// staging backend .env; without the flag everything runs as before.
const cronJobsDisabled = () => String(process.env.DISABLE_CRON_JOBS || '').trim().toLowerCase() === 'true';

let warned = false;

const scheduleCron = (expression, task, options) => {
  if (cronJobsDisabled()) {
    if (!warned) {
      console.log('[CRON] DISABLE_CRON_JOBS=true: scheduled jobs are not started on this server.');
      warned = true;
    }
    return null;
  }
  return cron.schedule(expression, task, options);
};

module.exports = { scheduleCron, cronJobsDisabled };
