const cron = require('node-cron');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const notify = require('./notify');

/**
 * Runs daily at midnight UTC
 * Sweeps 'offer_reward' and 'custom_offer_reward' transactions with status 'hold'
 * where 'holdUntil' <= now, and credits the user.
 */
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Running daily earning hold release...');
  try {
    const now = new Date();
    
    // Find all 'hold' transactions for real earnings that are ready to be released
    const eligibleHolds = await Transaction.find({
      transactionType: { $in: ['offer_reward', 'custom_offer_reward'] },
      status: 'hold',
      holdUntil: { $lte: now }
    });

    if (eligibleHolds.length === 0) {
      console.log('[CRON] No earning holds to release today.');
      return;
    }

    console.log(`[CRON] Found ${eligibleHolds.length} earning hold(s) ready for release.`);

    let releasedCount = 0;
    for (const tx of eligibleHolds) {
      // Find the user who owns this transaction
      const user = await User.findById(tx.userId);
      if (!user) {
        console.log(`[CRON] User ${tx.userId} not found for hold tx ${tx._id}. Skipping.`);
        continue;
      }

      // 1. Credit wallet
      // NOTE: walletBalance is credited. totalEarned was already credited when the hold was created.
      user.walletBalance = Math.max(0, user.walletBalance + tx.amount);
      await user.save();

      // 2. Update transaction status
      tx.status = 'completed';
      tx.balanceAfter = user.walletBalance; // Now accurately reflects new balance
      tx.metadata = {
        ...tx.metadata,
        releasedAt: new Date().toISOString()
      };
      await tx.save();

      // 3. Notify the user that their held earning is now available
      await notify(
        user._id,
        'offer_reward',
        'Earning Hold Released!',
        `Your held reward of +${tx.amount} coins is now available in your wallet!`,
        { amount: tx.amount, txId: tx._id }
      );
      
      releasedCount++;
    }

    console.log(`[CRON] Successfully released ${releasedCount} earning holds.`);
  } catch (error) {
    console.error('[CRON] Error during earning hold release:', error);
  }
}, { timezone: 'UTC' });
