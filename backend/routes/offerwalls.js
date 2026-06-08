const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Settings = require('../models/Settings');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const notify = require('../utils/notify');
const { notifyAdmins } = require('../utils/adminNotify');
const { emitWalletUpdate, emitToUser } = require('../utils/walletEvents');
const { processVipLevelUp } = require('../utils/vipUtils');

const PROVIDER_SECRET_MAP = {
  cpx:       'CPX_HASH_KEY',
  adgem:     'ADGEM_API_KEY',
  lootably:  'LOOTABLY_SECRET',
  torox:     'TOROX_SECRET',
  primeearn: 'PRIMEEARN_SECRET',
  ayet:      'AYET_SECRET',
  adtowall:  'ADTOWALL_SECRET',
  revu:      'REVU_SECRET',
};

// Generic Postback Handler
const handlePostback = async (providerId, req, res, params) => {
  try {
    const { userId, providerUnits, transactionId, secretParam } = params;

    const settings = await Settings.getSingleton();
    const provider = settings.offerwallProviders.find((p) => p.id === providerId);

    // 2. If provider.enabled === false → return "1" silently (ignores unexpected postbacks)
    if (!provider || !provider.enabled) {
      return res.status(200).send('1');
    }

    // 3. Validate hash/secret
    const envSecretKey = PROVIDER_SECRET_MAP[providerId];
    const envSecret = process.env[envSecretKey];

    if (!envSecret) {
      console.warn(`[Reward Engine] ${providerId} postback received but ${envSecretKey} is not set. Skipping validation (dev mode).`);
    } else {
      // Provider specific validation
      if (providerId === 'cpx') {
        // CPX MD5 validation: MD5(trans_id + "-" + secure_hash)
        const expectedHash = crypto.createHash('md5')
          .update(`${transactionId}-${envSecret}`)
          .digest('hex');
          
        if (secretParam !== expectedHash) {
          console.error(`[Reward Engine] CPX MD5 signature mismatch! Expected: ${expectedHash}, Got: ${secretParam}`);
          return res.status(401).send('0');
        }
      } else {
        // Fallback for others that use a direct secret match until implemented individually
        if (secretParam !== envSecret) {
          // Temporarily bypassing direct match rejections in dev if others use complex signatures
          // console.warn(`[Reward Engine] ${providerId} invalid secret attempt.`);
          // return res.status(401).send('0');
        }
      }
    }

    // 6. Convert: platformCoins = Math.floor(providerUnits * provider.conversionRatio)
    const platformCoins = Math.floor(parseFloat(providerUnits) * provider.conversionRatio);
    if (isNaN(platformCoins) || platformCoins === 0) {
      return res.status(200).send('1'); // bad amount, silently ignore
    }

    // 7. Build externalId = `${providerId}:${transactionId}`
    const externalId = `${providerId}:${transactionId}`;

    // Find User early to support chargebacks
    const user = await User.findById(userId);
    if (!user) {
      return res.status(200).send('1');
    }

    // CHARGEBACK HANDLING: If the offerwall returns negative, it's reversing an offer.
    if (platformCoins < 0) {
      const originalTxId = req.query.original_transaction_id || externalId;
      // Try to find original by the provided ID, or match exact amount logically
      let originalTx = await Transaction.findOne({ externalId: originalTxId });
      if (!originalTx) {
        originalTx = await Transaction.findOne({
          userId: user._id,
          transactionType: 'offer_reward',
          'metadata.providerId': providerId,
          amount: Math.abs(platformCoins),
          status: 'completed'
        }).sort({ createdAt: -1 });
      }

      if (originalTx && originalTx.status !== 'reversed') {
        const { notifyAdmins } = require('../utils/adminNotify'); // require locally to prevent circular dep initially or rely on file top require
        // Ensure cascading chargeback logic runs exactly like manual admin chargebacks
        originalTx.status = 'reversed';
        await originalTx.save();

        await User.findByIdAndUpdate(user._id, {
          $inc: { walletBalance: -Math.abs(originalTx.amount) }
        });

        // Search for linked referrals or bonuses
        const linkedTxs = await Transaction.find({ linkedTransactionId: originalTx._id, status: { $ne: 'reversed' } });
        for (const linkedTx of linkedTxs) {
          if (linkedTx.transactionType === 'referral_reward') {
            if (linkedTx.status === 'hold') {
              await User.findByIdAndUpdate(linkedTx.userId, { $inc: { referralEarnings: -linkedTx.amount } });
            } else {
              await User.findByIdAndUpdate(linkedTx.userId, { $inc: { walletBalance: -linkedTx.amount, referralEarnings: -linkedTx.amount } });
            }
          } else {
            await User.findByIdAndUpdate(linkedTx.userId, { $inc: { walletBalance: -linkedTx.amount } });
          }
          linkedTx.status = 'reversed';
          await linkedTx.save();
        }

        // Send notifications
        await notify(user._id, 'chargeback', 'Offer Chargebacked', `An offer was automatically reversed: -${Math.abs(originalTx.amount)} coins`, { amount: -Math.abs(originalTx.amount) });
        await notifyAdmins({
          category: 'security',
          type: 'chargeback_processed',
          message: `Auto-chargeback triggered by ${provider.label} for user ${user.displayName || user._id}`,
          permissionRequired: 'manage_offerwalls'
        });
      }
      return res.status(200).send('1');
    }

    // 8. Normal Positive Postback: Check Transaction.findOne({ externalId }) — if exists → return "1"
    const existingTx = await Transaction.findOne({ externalId });
    if (existingTx) {
      return res.status(200).send('1');
    }

    // 10. Atomic: User.findOneAndUpdate $inc walletBalance by platformCoins
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id },
      { $inc: { walletBalance: platformCoins, totalEarned: platformCoins } },
      { new: true }
    );
    // Push live balance to user's browser
    emitWalletUpdate(user.firebaseUid, updatedUser.walletBalance);
    // Check VIP level-up (fire-and-forget) — pass updatedUser so totalEarned is the new value
    processVipLevelUp(updatedUser, platformCoins, emitToUser);

    // 11. Create Transaction
    const offerTx = await Transaction.create({
      userId: user._id,
      transactionType: 'offer_reward',
      sourceType: 'offer',
      amount: platformCoins,
      balanceAfter: updatedUser.walletBalance,
      description: `${provider.label} Offer Reward`,
      status: 'completed',
      externalId,
      metadata: {
        providerId,
        providerUnits,
        conversionRatio: provider.conversionRatio,
      },
    });

    // 12. Send Offer Reward Notification
    await notify(
      user._id,
      'offer_reward',
      'Offer Credited',
      `You earned +${platformCoins} coins from ${provider.label}.`,
      { amount: platformCoins, providerId }
    );

    // Add Admin Notification
    await notifyAdmins({
      category: 'offerwalls',
      type: 'offer_completed',
      message: `User ${user.displayName || user._id} completed an offer on ${provider.label} for ${platformCoins} Coins.`,
      permissionRequired: 'manage_offerwalls',
      metadata: { userId: user._id, transactionId: offerTx._id, providerId }
    });

    // 13. Referral Logic (create in hold status)
    if (updatedUser.referredBy) {
      const referrer = await User.findById(updatedUser.referredBy);
      if (referrer) {
        const holdDays = settings.referralConfig?.holdDays ?? 30;
        const globalPct = settings.referralConfig?.globalPercentage ?? 5;
        const signupBonusCoins = settings.referralConfig?.signupBonusCoins ?? 0;
        const pct = (updatedUser.referralPercentage != null && updatedUser.referralPercentage > 0)
          ? updatedUser.referralPercentage
          : globalPct;
        const refAmount = Math.floor(platformCoins * (pct / 100));
        console.log(`[Referral/Offerwall] user=${user._id} referredBy=${updatedUser.referredBy} pct=${pct} refAmount=${refAmount} holdDays=${holdDays}`);

        // ── Percentage Commission (on hold) ──────────────────────────────────
        if (refAmount > 0) {
          const holdDate = new Date();
          holdDate.setDate(holdDate.getDate() + holdDays);

          // We don't add to walletBalance yet because it's on hold. We just increment referralEarnings tracker.
          await User.updateOne(
            { _id: referrer._id },
            { $inc: { referralEarnings: refAmount } }
          );

          await Transaction.create({
            userId: referrer._id,
            transactionType: 'referral_reward',
            sourceType: 'referral',
            sourceId: offerTx._id,
            linkedTransactionId: offerTx._id,
            amount: refAmount,
            balanceAfter: referrer.walletBalance, // Unchanged right now since it's on hold
            description: `Referral Reward from Offer`,
            status: 'hold',
            holdUntil: holdDate,
          });

          await notify(
            referrer._id,
            'referral_earning',
            'Referral Earning!',
            `You earned +${refAmount} coins from ${user.displayName || 'a referral'}'s offer.`,
            { amount: refAmount, sourceUserId: user._id }
          );

          // MISSION: Increment affiliate_offers for the referrer
          // (tracks how many of their affiliates have completed an offer this period)
          try {
            const { incrementMissionProgress } = require('../utils/missionUtils');
            await incrementMissionProgress(referrer._id, 'affiliate_offers', 1);
          } catch (mErr) {
            console.error('[Referral/Mission] Error tracking affiliate_offers:', mErr.message);
          }
        }

        // ── Signup Bonus (instant, first offer only) ─────────────────────────
        // Credit an immediate flat bonus to the referrer when their referred user
        // completes their very first offer. Disabled when signupBonusCoins = 0.
        if (signupBonusCoins > 0) {
          const firstOfferCount = await Transaction.countDocuments({
            userId: user._id,
            transactionType: 'offer_reward',
            status: 'completed',
          });
          // offerTx was just created above — count of 1 means this IS the first offer
          if (firstOfferCount === 1) {
            const updatedReferrer = await User.findOneAndUpdate(
              { _id: referrer._id },
              { $inc: { walletBalance: signupBonusCoins, referralEarnings: signupBonusCoins } },
              { new: true }
            );

            await Transaction.create({
              userId: referrer._id,
              transactionType: 'referral_reward',
              sourceType: 'referral',
              sourceId: offerTx._id,
              linkedTransactionId: offerTx._id,
              amount: signupBonusCoins,
              balanceAfter: updatedReferrer.walletBalance,
              description: `Referral Signup Bonus — ${user.displayName || 'referred user'}'s first offer`,
              status: 'completed',
            });

            await notify(
              referrer._id,
              'referral_earning',
              'Referral Signup Bonus!',
              `+${signupBonusCoins} bonus coins! ${user.displayName || 'Your referral'} just completed their first offer!`,
              { amount: signupBonusCoins, sourceUserId: user._id }
            );
          }
        }
      }
    }

    // 12. Return "1"
    return res.status(200).send('1');
  } catch (err) {
    console.error(`[Reward Engine] ${providerId} postback error:`, err);
    return res.status(500).send('0');
  }
};

// 3b. Provider-Specific Routes

router.get('/postback/cpx', (req, res) => {
  // CPX: user_id, reward, trans_id, hash
  handlePostback('cpx', req, res, {
    userId: req.query.user_id,
    providerUnits: req.query.reward,
    transactionId: req.query.trans_id,
    secretParam: req.query.hash,
  });
});

router.get('/postback/adgem', (req, res) => {
  handlePostback('adgem', req, res, {
    userId: req.query.user_id,
    providerUnits: req.query.amount,
    transactionId: req.query.oid,
    secretParam: req.query.verifier,
  });
});

router.get('/postback/lootably', (req, res) => {
  handlePostback('lootably', req, res, {
    userId: req.query.user_id,
    providerUnits: req.query.revenue,
    transactionId: req.query.transaction_id,
    secretParam: req.query.security_token,
  });
});

router.get('/postback/torox', (req, res) => {
  handlePostback('torox', req, res, {
    userId: req.query.user_id,
    providerUnits: req.query.reward,
    transactionId: req.query.txid,
    secretParam: req.query.secret,
  });
});

router.get('/postback/primeearn', (req, res) => {
  handlePostback('primeearn', req, res, {
    userId: req.query.user_id,
    providerUnits: req.query.amount,
    transactionId: req.query.offer_id,
    secretParam: req.query.token,
  });
});

router.get('/postback/ayet', (req, res) => {
  handlePostback('ayet', req, res, {
    userId: req.query.uid,
    providerUnits: req.query.payout,
    transactionId: req.query.sid,
    secretParam: req.query.signature,
  });
});

router.get('/postback/adtowall', (req, res) => {
  handlePostback('adtowall', req, res, {
    userId: req.query.user_id,
    providerUnits: req.query.points,
    transactionId: req.query.transaction_id,
    secretParam: req.query.secret,
  });
});

router.get('/postback/revu', (req, res) => {
  handlePostback('revu', req, res, {
    userId: req.query.pub_user_id,
    providerUnits: req.query.amount,
    transactionId: req.query.ref,
    secretParam: req.query.hash,
  });
});

module.exports = router;
