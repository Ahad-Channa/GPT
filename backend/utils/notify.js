/**
 * notify.js — Central notification helper
 *
 * Usage:
 *   const notify = require('../utils/notify');
 *   notify(userId, 'offer_reward', 'Offer Credited', 'You earned +500 coins from CPX Research', { amount: 500 });
 *
 * Fire-and-forget: does NOT throw. Errors are logged silently so they never
 * interrupt the caller's response flow.
 */

const Notification = require('../models/Notification');

/**
 * @param {string|ObjectId} userId   - The recipient's MongoDB User _id
 * @param {string}          type     - One of the 16 notification types
 * @param {string}          title    - Short heading (max 100 chars)
 * @param {string}          message  - Descriptive body (max 300 chars)
 * @param {object}          metadata - Optional extra data (txId, amount, rank…)
 */
const notify = async (userId, type, title, message, metadata = {}) => {
  try {
    await Notification.create({ userId, type, title, message, metadata });
  } catch (err) {
    // Log but never throw — notification failure must never break core flows
    console.error(`[notify] Failed to create notification (type=${type}, user=${userId}):`, err.message);
  }
};

module.exports = notify;
