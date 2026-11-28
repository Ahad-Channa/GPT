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

// Public Live Feed view of a withdrawal: only the method, the gift card brand
// and, for book orders, the (public) book title. The payout destination (PayPal
// email, Litecoin address, gift card email) and the description that repeats it
// are never sent to other visitors.
function sanitizePublicWithdrawal(tx) {
  const doc = tx._doc || tx;
  const method = doc.method || null;
  const brand = String(doc.metadata?.brand || '').trim();
  const bookTitle = method === 'book' ? String(doc.payoutDestination || '').trim() : '';
  const { payoutDestination, fee, balanceAfter, ...rest } = doc;
  return {
    ...rest,
    description: method === 'book' ? 'Book Order' : 'Withdrawal',
    metadata: {
      ...(brand && { brand }),
      ...(bookTitle && { bookTitle }),
    },
  };
}

const FEED_STATUSES = ['completed', 'hold'];
const FEED_WITHDRAWAL_STATUSES = ['pending', 'completed'];
// Everything the public Live Feed shows besides withdrawals. Shared by the REST
// feed (/api/public/recent-earnings) and the live socket broadcast.
// referral_reward = affiliate earnings.
const FEED_EARNING_TYPES = Object.freeze([
  ...REAL_OFFER_EARNING_TYPES,
  'daily_bonus',
  'admin_adjustment',
  'promo_code',
  'leaderboard_reward',
  'vip_reward',
  'referral_reward',
]);

const isWithdrawal = (tx) => tx?.transactionType === 'withdrawal';

// Same rule as the REST feed query.
const isPublicFeedTransaction = (tx) => {
  if (!tx) return false;
  if (isWithdrawal(tx)) return FEED_WITHDRAWAL_STATUSES.includes(tx.status);
  return FEED_EARNING_TYPES.includes(tx.transactionType)
    && FEED_STATUSES.includes(tx.status)
    && Number(tx.amount) > 0
    && tx.metadata?.testOffer !== true;
};

// Same shape as a populated /recent-earnings row (userId is the public profile).
const buildNewEarningPayload = ({ transaction, user } = {}) => {
  if (!transaction || !user) return null;
  const plain = typeof transaction.toObject === 'function' ? transaction.toObject() : { ...transaction };
  if (!isPublicFeedTransaction(plain)) return null;

  const payload = {
    ...plain,
    userId: {
      _id: user._id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isPrivate: Boolean(user.isPrivate),
    },
  };
  const visible = user.isPrivate ? { ...scrubTransaction(payload), userId: payload.userId } : payload;
  return isWithdrawal(visible) ? sanitizePublicWithdrawal(visible) : visible;
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

module.exports = {
  FEED_EARNING_TYPES,
  FEED_STATUSES,
  FEED_WITHDRAWAL_STATUSES,
  scrubTransaction,
  sanitizePublicWithdrawal,
  isPublicFeedTransaction,
  buildNewEarningPayload,
  broadcastNewEarning,
};
