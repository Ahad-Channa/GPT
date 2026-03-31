const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { verifyToken } = require('../middlewares/authMiddleware');

// GET /api/wallet/history
// Returns the user's transaction history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // Fetch transactions sorted by newest first
    const transactions = await Transaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      balance: user.walletBalance,
      transactions,
    });
  } catch (error) {
    console.error('[/api/wallet/history] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch wallet history' });
  }
});

// POST /api/wallet/daily-bonus
// Securely credits daily progression bonus using Atomic Mongo locks
router.post('/daily-bonus', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const now = new Date();
    
    // 1. Verify availability
    if (user.lastDailyBonusClaim) {
      if (user.lastDailyBonusClaim.toDateString() === now.toDateString()) {
        return res.status(400).json({ success: false, error: 'Daily bonus already claimed today' });
      }
    }

    // 2. Progression streak math
    const rewardBase = 50;
    let streak = user.dailyBonusStreak || 0;
    
    if (user.lastDailyBonusClaim) {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (user.lastDailyBonusClaim.toDateString() === yesterday.toDateString()) {
        streak += 1; // Uninterrupted daily claim
      } else {
        streak = 1; // Streak broken
      }
    } else {
      streak = 1;
    }

    const rewardAmount = rewardBase + (streak * 10); 

    // 3. ATOMIC Update ($inc) + Optimistic locking to prevent spam-click duplicate claims
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, lastDailyBonusClaim: user.lastDailyBonusClaim }, 
      { 
        $inc: { walletBalance: rewardAmount },
        $set: { lastDailyBonusClaim: now, dailyBonusStreak: streak }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(409).json({ success: false, error: 'Claim concurrent conflict. Try again.' });
    }

    // 4. Archive Transaction
    const transaction = new Transaction({
      userId: user._id,
      transactionType: 'daily_bonus',
      amount: rewardAmount,
      balanceAfter: updatedUser.walletBalance,
      description: `Daily Bonus Claim (Streak: ${streak} Days)`
    });
    await transaction.save();

    res.status(200).json({
      success: true,
      message: `Claimed +${rewardAmount} coins!`,
      rewardAmount,
      streak,
      balance: updatedUser.walletBalance
    });

  } catch (error) {
    console.error('[/api/wallet/daily-bonus] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to process daily claim' });
  }
});

module.exports = router;
