const mongoose = require('mongoose');

// Bounded counters for legacy offerwall routes that are disabled or rejecting
// callbacks. One row per (provider, kind, time bucket) so a provider retry storm
// cannot flood the logs or the admin notifications:
//   kind 'disabled_hit'   bucket 'YYYY-MM-DDTHH'  -> counts hits per hour
//   kind 'disabled_alert' bucket 'YYYY-MM-DD'     -> one admin alert per day
const offerwallRouteNoticeSchema = new mongoose.Schema(
  {
    providerId: { type: String, required: true, trim: true, lowercase: true },
    kind: { type: String, required: true, trim: true },
    bucket: { type: String, required: true, trim: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

offerwallRouteNoticeSchema.index({ providerId: 1, kind: 1, bucket: 1 }, { unique: true });

module.exports =
  mongoose.models.OfferwallRouteNotice ||
  mongoose.model('OfferwallRouteNotice', offerwallRouteNoticeSchema);
