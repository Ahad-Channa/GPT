// Staging and taskmint.me share one MongoDB: scheduled jobs must be switchable
// off per server (DISABLE_CRON_JOBS=true on staging) so midnight payouts never
// run twice.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

test('scheduleCron does not register jobs when DISABLE_CRON_JOBS=true', () => {
  const prev = process.env.DISABLE_CRON_JOBS;
  try {
    process.env.DISABLE_CRON_JOBS = 'true';
    delete require.cache[require.resolve('../utils/cronSchedule')];
    const { scheduleCron, cronJobsDisabled } = require('../utils/cronSchedule');
    assert.equal(cronJobsDisabled(), true);
    let ran = false;
    assert.equal(scheduleCron('* * * * *', () => { ran = true; }), null);
    assert.equal(ran, false);

    process.env.DISABLE_CRON_JOBS = 'false';
    assert.equal(cronJobsDisabled(), false);
    const task = scheduleCron('0 0 1 1 *', () => {});
    assert.ok(task, 'a job is registered when the flag is off');
    task.stop();
  } finally {
    if (prev === undefined) delete process.env.DISABLE_CRON_JOBS; else process.env.DISABLE_CRON_JOBS = prev;
  }
});

test('every scheduled job goes through scheduleCron', () => {
  for (const file of ['server.js', 'utils/referralHoldJob.js', 'utils/streakWarningJob.js', 'utils/earningHoldJob.js']) {
    const src = read(file);
    assert.doesNotMatch(src, /\bcron\.schedule\(/, file);
    assert.match(src, /scheduleCron\(/, file);
  }
  assert.equal((read('server.js').match(/scheduleCron\('/g) || []).length, 3, 'daily, weekly, monthly leaderboard resets');
});
