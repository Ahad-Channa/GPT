const OfferwallReplayAlert = require('../../models/OfferwallReplayAlert');
const OfferwallRouteNotice = require('../../models/OfferwallRouteNotice');

// Idempotent bookkeeping for the legacy offerwall routes. Every helper is a single
// upsert, and "should I notify?" is answered by whether THAT upsert inserted the
// row, so concurrent retries cannot produce more than one notification.

const hourBucket = (now = new Date()) => now.toISOString().slice(0, 13);
const dayBucket = (now = new Date()) => now.toISOString().slice(0, 10);

const wasInserted = (result) => Number(result?.upsertedCount || 0) > 0;

const bumpNotice = async ({ models = {}, providerId, kind, bucket }) => {
  const Notice = models.OfferwallRouteNotice || OfferwallRouteNotice;
  const result = await Notice.updateOne(
    { providerId, kind, bucket },
    { $inc: { attempts: 1 } },
    { upsert: true }
  );
  return { inserted: wasInserted(result) };
};

// Counts a hit on a disabled route (one row per provider-hour) and reports whether
// this is the first hit of the UTC day (-> the single admin alert for that day).
const recordDisabledRouteHit = async ({ models = {}, providerId, now = new Date() }) => {
  const hit = await bumpNotice({ models, providerId, kind: 'disabled_hit', bucket: hourBucket(now) });
  const alert = await bumpNotice({ models, providerId, kind: 'disabled_alert', bucket: dayBucket(now) });
  return { firstHitOfHour: hit.inserted, firstAlertOfDay: alert.inserted };
};

// Records a blocked replay (T1 = first*, T2 = blockedExternalId). Returns
// { firstTime } where firstTime is true for exactly one of any number of
// concurrent/ repeated deliveries of the same T2, so the admin alert fires once.
const recordReplayAlert = async ({
  models = {},
  providerId,
  userId,
  identityKey,
  blockedExternalId,
  reason = '',
  firstExternalId = '',
  firstTransactionId = null,
}) => {
  const Alert = models.OfferwallReplayAlert || OfferwallReplayAlert;
  const result = await Alert.updateOne(
    { providerId, userId, identityKey, blockedExternalId },
    {
      $setOnInsert: { reason, firstExternalId, firstTransactionId },
      $inc: { attempts: 1 },
    },
    { upsert: true }
  );
  return { firstTime: wasInserted(result) };
};

module.exports = {
  dayBucket,
  hourBucket,
  recordDisabledRouteHit,
  recordReplayAlert,
};
