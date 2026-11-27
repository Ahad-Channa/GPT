const { REAL_OFFER_EARNING_TYPES } = require('./earningTypes');

// Live Feed support: privacy scrubbing + real-time broadcast of new earnings.
// The REST feed (GET /api/public/recent-earnings) and the socket event
// 'newEarning' must expose exactly the same data, so both use scrubTransaction.

// Sanitizes transaction descriptions for private profiles.
function scrubTransaction(tx) {
  let doc = tx._doc || tx; // Handle both mongoose docs and lean docs

  // Create a copy to avoid modifying the original if it's cached
  let scrubbed = { ...doc };

  // Obfuscate the description (hide precise offer title)
  if (scrubbed.transactionType === 'withdrawal') {
    scrubbed.description = 'Requested a Withdrawal';
  } else if (scrubbed.transactionType === 'leaderboard_reward') {
    scrubbed.description = 'Earned a Leaderboard Prize';
  } else if (scrubbed.transactionType === 'vip_reward') {
    scrubbed.description = 'Earned a VIP Reward';
  } else if (scrubbed.transactionType === 'daily_bonus') {
    scrubbed.description = 'Claimed Daily Bonus';
  } else if (scrubbed.transactionType === 'promo_code') {
    scrubbed.description = 'Redeemed a Promo Code';
  } else if (scrubbed.transactionType === 'referral_reward') {
    scrubbed.description = 'Affiliate Earnings';
  } else if (scrubbed.method && scrubbed.method !== 'none' && scrubbed.transactionType !== 'withdrawal') {
    scrubbed.description = `Earned from ${scrubbed.method}`;
  } else if (scrubbed.metadata?.offerwall) {
    scrubbed.description = `Earned from ${scrubbed.metadata.offerwall}`;
  } else {
    scrubbed.description = `Completed an Offer`;
  }

  // Remove sensitive metadata that might contain tracking IDs or names
  if (scrubbed.metadata) {
    scrubbed.metadata = { offerwall: scrubbed.metadata.offerwall };
  }

  return scrubbed;
}

const FEED_STATUSES = ['completed', 'hold'];

// Same shape as a populated /recent-earnings row (userId is the public profile).
const buildNewEarningPayload = ({ transaction, user } = {}) => {
  if (!transaction || !user) return null;
  const plain = typeof transaction.toObject === 'function' ? transaction.toObject() : { ...transaction };
  if (!REAL_OFFER_EARNING_TYPES.includes(plain.transactionType)) return null;
  if (!FEED_STATUSES.includes(plain.status)) return null;
  if (!(Number(plain.amount) > 0)) return null;
  if (plain.metadata?.testOffer === true) return null;

  const payload = {
    ...plain,
    userId: {
      _id: user._id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isPrivate: Boolean(user.isPrivate),
    },
  };
  return user.isPrivate ? { ...scrubTransaction(payload), userId: payload.userId } : payload;
};

// Fire-and-forget: a socket problem must never affect crediting.
const broadcastNewEarning = ({ transaction, user, io = global.__io } = {}) => {
  try {
    if (!io || typeof io.emit !== 'function') return false;
    const payload = buildNewEarningPayload({ transaction, user });
    if (!payload) return false;
    io.emit('newEarning', payload);
    return true;
  } catch (error) {
    console.warn('[earningFeed] newEarning broadcast failed:', error.message);
    return false;
  }
};

module.exports = { scrubTransaction, buildNewEarningPayload, broadcastNewEarning };
