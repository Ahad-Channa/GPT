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

const isSafePostbackScalar = (value, maxLength = 128) =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;

const parseLegacyProviderUnits = (value) => {
  if (!isSafePostbackScalar(value, 64) || !/^-?\d+(\.\d+)?$/.test(value.trim())) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

// Legacy offerwall compatibility handler.
//
// These existing provider routes do not currently resolve a stored ClickLog, so
// Phase 4 intentionally keeps them isolated instead of treating provider-supplied
// user IDs as the new generic standard. Later phases should migrate offerwall
// traffic only after outbound offerwall clicks are tracked through clickService.
const handleLegacyOfferwallPostback = async (providerId, req, res, params) => {
  try {
    const { userId, providerUnits, transactionId, secretParam } = params;

    const settings = await Settings.getSingleton();
    const provider = settings.offerwallProviders.find((p) => p.id === providerId);

    // 2. If provider.enabled === false → return "1" silently (ignores unexpected postbacks)
    if (!provider || !provider.enabled) {
      return res.status(200).send('1');
    }

    if (
      !isSafePostbackScalar(userId) ||
      !isSafePostbackScalar(transactionId) ||
      !isSafePostbackScalar(secretParam, 256)
    ) {
      console.warn(`[Reward Engine] ${providerId} postback rejected because required values are malformed.`);
      return res.status(401).send('0');
    }
    const normalizedUserId = userId.trim();
    const normalizedTransactionId = transactionId.trim();
    const normalizedSecretParam = secretParam.trim();

    // 3. Validate hash/secret
    const envSecretKey = PROVIDER_SECRET_MAP[providerId];
    const envSecret = process.env[envSecretKey];

    if (!envSecret) {
      console.warn(`[Reward Engine] ${providerId} postback rejected because ${envSecretKey} is not configured.`);
      return res.status(401).send('0');
    } else {
      // Provider specific validation
      if (providerId === 'cpx') {
        // CPX MD5 validation: MD5(trans_id + "-" + secure_hash)
        const expectedHash = crypto.createHash('md5')
          .update(`${normalizedTransactionId}-${envSecret}`)
          .digest('hex');
          
        if (normalizedSecretParam !== expectedHash) {
          console.error(`[Reward Engine] CPX MD5 signature mismatch! Expected: ${expectedHash}, Got: ${normalizedSecretParam}`);
          return res.status(401).send('0');
        }
      } else {
        // Fallback for others that use a direct secret match until implemented individually
        if (normalizedSecretParam !== envSecret) {
          console.warn(`[Reward Engine] ${providerId} invalid secret attempt.`);
          return res.status(401).send('0');
        }
      }
    }

    // 6. Convert: platformCoins = Math.floor(providerUnits * provider.conversionRatio)
    const parsedProviderUnits = parseLegacyProviderUnits(providerUnits);
    if (parsedProviderUnits === null) {
      console.warn(`[Reward Engine] ${providerId} postback rejected because provider units are malformed.`);
      return res.status(401).send('0');
    }

    const platformCoins = Math.floor(parsedProviderUnits * provider.conversionRatio);
    if (isNaN(platformCoins) || platformCoins === 0) {
      return res.status(200).send('1'); // bad amount, silently ignore
    }

    // 7. Build externalId = `${providerId}:${transactionId}`
    const externalId = `${providerId}:${normalizedTransactionId}`;

    // Find User early to support chargebacks
    const user = await User.findById(normalizedUserId);
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
            // Decrement commissionGenerated from the referred user
            await User.findByIdAndUpdate(user._id, { $inc: { commissionGenerated: -linkedTx.amount } });
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
    let creditBalance = platformCoins;
    let txStatus = 'completed';
    let holdDate = null;
    
    // Evaluate Earning Hold Config
    if (settings.earningHoldConfig?.enabled && platformCoins >= settings.earningHoldConfig.threshold) {
        txStatus = 'hold';
        creditBalance = 0; // do not add to wallet yet
        holdDate = new Date();
        holdDate.setDate(holdDate.getDate() + (settings.earningHoldConfig.holdDays || 30));
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id },
      { $inc: { walletBalance: creditBalance, totalEarned: platformCoins } },
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
      status: txStatus,
      holdUntil: holdDate,
      externalId,
      metadata: {
        providerId,
        providerUnits,
        conversionRatio: provider.conversionRatio,
      },
    });

    // 12. Send Offer Reward Notification
    const notifTitle = txStatus === 'hold' ? 'Offer Reward on Hold' : 'Offer Credited';
    const notifMsg = txStatus === 'hold' 
      ? `You completed an offer from ${provider.label} for +${platformCoins} coins. The reward is placed on hold for ${settings.earningHoldConfig.holdDays || 30} days.`
      : `You earned +${platformCoins} coins from ${provider.label}.`;

    await notify(
      user._id,
      'offer_reward',
      notifTitle,
      notifMsg,
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

          // Track how much commission this specific referred user generated
          await User.updateOne(
            { _id: user._id },
            { $inc: { commissionGenerated: refAmount } }
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

            // Track how much commission this specific referred user generated
            await User.updateOne(
              { _id: user._id },
              { $inc: { commissionGenerated: signupBonusCoins } }
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
  handleLegacyOfferwallPostback('cpx', req, res, {
    userId: req.query.user_id,
    providerUnits: req.query.reward,
    transactionId: req.query.trans_id,
    secretParam: req.query.hash,
  });
});

router.get('/postback/adgem', (req, res) => {
  handleLegacyOfferwallPostback('adgem', req, res, {
    userId: req.query.user_id,
    providerUnits: req.query.amount,
    transactionId: req.query.oid,
    secretParam: req.query.verifier,
  });
});

router.get('/postback/lootably', (req, res) => {
  handleLegacyOfferwallPostback('lootably', req, res, {
    userId: req.query.user_id,
    providerUnits: req.query.revenue,
    transactionId: req.query.transaction_id,
    secretParam: req.query.security_token,
  });
});

router.get('/postback/torox', (req, res) => {
  handleLegacyOfferwallPostback('torox', req, res, {
    userId: req.query.user_id,
    providerUnits: req.query.reward,
    transactionId: req.query.txid,
    secretParam: req.query.secret,
  });
});

router.get('/postback/primeearn', (req, res) => {
  handleLegacyOfferwallPostback('primeearn', req, res, {
    userId: req.query.user_id,
    providerUnits: req.query.amount,
    transactionId: req.query.offer_id,
    secretParam: req.query.token,
  });
});

router.get('/postback/ayet', (req, res) => {
  handleLegacyOfferwallPostback('ayet', req, res, {
    userId: req.query.uid,
    providerUnits: req.query.payout,
    transactionId: req.query.sid,
    secretParam: req.query.signature,
  });
});

router.get('/postback/adtowall', (req, res) => {
  handleLegacyOfferwallPostback('adtowall', req, res, {
    userId: req.query.user_id,
    providerUnits: req.query.points,
    transactionId: req.query.transaction_id,
    secretParam: req.query.secret,
  });
});

router.get('/postback/revu', (req, res) => {
  handleLegacyOfferwallPostback('revu', req, res, {
    userId: req.query.pub_user_id,
    providerUnits: req.query.amount,
    transactionId: req.query.ref,
    secretParam: req.query.hash,
  });
});

module.exports = router;
