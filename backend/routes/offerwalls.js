const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const router = express.Router();
const Settings = require('../models/Settings');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const PostbackLog = require('../models/PostbackLog');
const notify = require('../utils/notify');
const { notifyAdmins } = require('../utils/adminNotify');
const { emitWalletUpdate, emitToUser } = require('../utils/walletEvents');
const { processVipLevelUp } = require('../utils/vipUtils');
const { getEarningHoldDecision } = require('../utils/earningTypes');
const { sanitizePostbackPayload } = require('../services/tracking/postbackSanitizer');
const { createOne, withSession } = require('../services/rewards/atomicRunner');

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

const sanitizeOfferTitle = (value) => (
  isSafePostbackScalar(value, 160) && !/[\u0000-\u001f\u007f]/.test(value)
    ? value.trim()
    : ''
);

const readOfferTitle = (...sources) => {
  const titleKeys = ['offer_name', 'offer_title', 'campaign_name', 'campaign_title', 'offerName', 'offerTitle', 'campaignName', 'campaignTitle'];
  for (const source of sources) {
    for (const key of titleKeys) {
      const value = sanitizeOfferTitle(source?.[key]);
      if (value) return value;
    }
  }
  return '';
};

const readStepLabel = (...sources) => {
  const stepKeys = ['step_name', 'goal_name', 'event_name', 'stepName', 'goalName', 'eventName'];
  for (const source of sources) {
    for (const key of stepKeys) {
      const value = sanitizeOfferTitle(source?.[key]);
      if (value) return value;
    }
  }
  return '';
};

const parseLegacyProviderUnits = (value) => {
  if (!isSafePostbackScalar(value, 64) || !/^-?\d+(\.\d+)?$/.test(value.trim())) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const legacyPostbackRoute = (providerId) => `/api/offerwalls/postback/${providerId}`;

const sanitizeLegacyQuery = (query = {}) => {
  const safeQuery = { ...query };
  if (Object.prototype.hasOwnProperty.call(safeQuery, 'security_token')) {
    safeQuery.security_token = '[REDACTED]';
  }
  return sanitizePostbackPayload(safeQuery);
};

const writeLegacyLootablyPostbackLog = async ({
  req,
  userId,
  transaction,
  mappedFields = {},
  processingResult,
  isDuplicate = false,
  rejectionReason = '',
  security = {},
}) => {
  try {
    await PostbackLog.create({
      providerId: 'lootably',
      route: legacyPostbackRoute('lootably'),
      method: req.method || 'GET',
      sanitizedQuery: sanitizeLegacyQuery(req.query || {}),
      sanitizedBody: sanitizePostbackPayload(req.body || {}),
      sanitizedHeaders: {},
      mappedFields: {
        transactionId: mappedFields.transactionId || '',
        status: mappedFields.status || '',
        payout: mappedFields.payout ?? null,
        offerTitle: mappedFields.offerTitle || '',
        stepLabel: mappedFields.stepLabel || '',
        extra: mappedFields.extra || {},
      },
      sourceIp: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.get ? (req.get('user-agent') || '') : '',
      security: {
        checked: security.checked !== false,
        passed: Boolean(security.passed),
        method: 'shared_secret',
        reason: security.reason || '',
      },
      processingResult,
      isDuplicate,
      rejectionReason,
      userId: userId || null,
      transactionId: transaction?._id || transaction || null,
    });
  } catch (error) {
    console.error('[Reward Engine] Failed to write Lootably PostbackLog:', error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Atomic ledger + wallet writes for legacy offerwall callbacks.
//
// The wallet balance and the Transaction ledger row must change together, and a
// duplicate provider callback must never change the wallet. Both are enforced by
// running the writes in ONE MongoDB transaction and relying on the unique
// Transaction.externalId index: if the ledger insert loses a race (E11000) the
// transaction aborts and the wallet increment rolls back.
//
// There is deliberately NO non-transactional fallback here (unlike runAtomic):
// two separate writes could leave the ledger and balance inconsistent. If the
// deployment does not support transactions the callback fails with a 500 and the
// provider retries, instead of silently half-applying.
// ─────────────────────────────────────────────────────────────────────────────
const runLegacyTransaction = async (operation) => {
  if (mongoose.connection.readyState !== 1) throw new Error('MongoDB is not connected.');
  const session = await mongoose.startSession();
  try {
    let value;
    await session.withTransaction(async () => {
      value = await operation(session);
    });
    return value;
  } finally {
    await session.endSession();
  }
};

const isDuplicateKeyError = (error) => error?.code === 11000;

// Thrown inside a transaction so it aborts (rolling back the wallet change)
// rather than committing; caught by the caller and reported as a duplicate.
const duplicateCallbackSignal = (cause) =>
  Object.assign(new Error('Duplicate offerwall callback.'), { legacyDuplicate: true, cause });

const creditLegacyOfferReward = async ({
  models = {},
  runInTransaction = runLegacyTransaction,
  userId,
  externalId,
  creditBalance,
  totalEarnedIncrement,
  transactionPayload,
}) => {
  const TransactionModel = models.Transaction || Transaction;
  const UserModel = models.User || User;

  try {
    return await runInTransaction(async (session) => {
      const existingTx = await withSession(TransactionModel.findOne({ externalId }), session);
      if (existingTx) return { duplicate: true, transaction: existingTx };

      const updatedUser = await UserModel.findOneAndUpdate(
        { _id: userId },
        { $inc: { walletBalance: creditBalance, totalEarned: totalEarnedIncrement } },
        { new: true, session }
      );
      if (!updatedUser) throw new Error('User not found for offerwall credit.');

      let offerTx;
      try {
        offerTx = await createOne(
          TransactionModel,
          { ...transactionPayload, userId, externalId, balanceAfter: updatedUser.walletBalance },
          session
        );
      } catch (error) {
        if (isDuplicateKeyError(error)) throw duplicateCallbackSignal(error);
        throw error;
      }
      return { duplicate: false, updatedUser, transaction: offerTx };
    });
  } catch (error) {
    if (error?.legacyDuplicate) {
      const existing = await TransactionModel.findOne({ externalId });
      return { duplicate: true, transaction: existing };
    }
    throw error;
  }
};

// Claims the original reward (and its linked referral/bonus rows) by flipping
// status to 'reversed' with a conditional update, so exactly one of several
// concurrent chargebacks deducts the wallet. Amounts and targets are unchanged
// from the previous behaviour: the postback user is debited the original amount
// and each linked row is debited from its own user.
const reverseLegacyOfferTransaction = async ({
  models = {},
  runInTransaction = runLegacyTransaction,
  userId,
  originalExternalId,
}) => {
  const TransactionModel = models.Transaction || Transaction;
  const UserModel = models.User || User;

  return runInTransaction(async (session) => {
    const originalTx = await TransactionModel.findOneAndUpdate(
      { externalId: originalExternalId, status: { $ne: 'reversed' } },
      { $set: { status: 'reversed' } },
      { new: true, session }
    );
    if (!originalTx) {
      const existing = await withSession(TransactionModel.findOne({ externalId: originalExternalId }), session);
      return { reversed: false, originalTx: existing || null, linkedTxs: [] };
    }

    await UserModel.findByIdAndUpdate(
      userId,
      { $inc: { walletBalance: -Math.abs(originalTx.amount) } },
      { session }
    );

    const linkedCandidates = await withSession(
      TransactionModel.find({ linkedTransactionId: originalTx._id, status: { $ne: 'reversed' } }),
      session
    );
    const linkedTxs = [];
    for (const candidate of linkedCandidates) {
      // new:false returns the pre-update row so we know whether it was on hold.
      const linkedTx = await TransactionModel.findOneAndUpdate(
        { _id: candidate._id, status: { $ne: 'reversed' } },
        { $set: { status: 'reversed' } },
        { new: false, session }
      );
      if (!linkedTx) continue;
      if (linkedTx.transactionType === 'referral_reward') {
        if (linkedTx.status === 'hold') {
          await UserModel.findByIdAndUpdate(linkedTx.userId, { $inc: { referralEarnings: -linkedTx.amount } }, { session });
        } else {
          await UserModel.findByIdAndUpdate(linkedTx.userId, { $inc: { walletBalance: -linkedTx.amount, referralEarnings: -linkedTx.amount } }, { session });
        }
        // Decrement commissionGenerated from the referred user
        await UserModel.findByIdAndUpdate(userId, { $inc: { commissionGenerated: -linkedTx.amount } }, { session });
      } else {
        await UserModel.findByIdAndUpdate(linkedTx.userId, { $inc: { walletBalance: -linkedTx.amount } }, { session });
      }
      linkedTxs.push(linkedTx);
    }
    return { reversed: true, originalTx, linkedTxs };
  });
};

// Legacy offerwall compatibility handler.
//
// These existing provider routes do not currently resolve a stored ClickLog, so
// Phase 4 intentionally keeps them isolated instead of treating provider-supplied
// user IDs as the new generic standard. Later phases should migrate offerwall
// traffic only after outbound offerwall clicks are tracked through clickService.
// Phase 6 reward/reversal services require exact Conversion linkage, which these
// legacy routes do not have yet; Phase 10 should migrate them once tracked clicks
// exist for each provider.
const handleLegacyOfferwallPostback = async (providerId, req, res, params) => {
  const shouldLogLootably = providerId === 'lootably';
  const logLootably = (payload) => shouldLogLootably
    ? writeLegacyLootablyPostbackLog({ req, ...payload })
    : Promise.resolve();

  try {
    const { userId, providerUnits, transactionId, secretParam } = params;
    const baseMappedFields = {
      transactionId: typeof transactionId === 'string' ? transactionId : '',
      payout: typeof providerUnits === 'string' ? providerUnits : null,
      offerTitle: typeof params.offerTitle === 'string' ? params.offerTitle : '',
      stepLabel: typeof params.stepLabel === 'string' ? params.stepLabel : '',
    };

    const settings = await Settings.getSingleton();
    const provider = settings.offerwallProviders.find((p) => p.id === providerId);

    // 2. If provider.enabled === false → return "1" silently (ignores unexpected postbacks)
    if (!provider || !provider.enabled) {
      await logLootably({
        mappedFields: { ...baseMappedFields, status: 'ignored' },
        processingResult: 'ignored',
        rejectionReason: 'Provider disabled or not configured.',
        security: { checked: false, passed: false, reason: 'Provider disabled or not configured.' },
      });
      return res.status(200).send('1');
    }

    if (
      !isSafePostbackScalar(userId) ||
      !isSafePostbackScalar(transactionId) ||
      !isSafePostbackScalar(secretParam, 256)
    ) {
      console.warn(`[Reward Engine] ${providerId} postback rejected because required values are malformed.`);
      await logLootably({
        mappedFields: { ...baseMappedFields, status: 'rejected' },
        processingResult: 'rejected',
        rejectionReason: 'Required values are malformed.',
        security: { checked: true, passed: false, reason: 'Required values are malformed.' },
      });
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
      await logLootably({
        mappedFields: { ...baseMappedFields, transactionId: normalizedTransactionId, payout: providerUnits, status: 'rejected' },
        processingResult: 'rejected',
        rejectionReason: `${envSecretKey} is not configured.`,
        security: { checked: true, passed: false, reason: `${envSecretKey} is not configured.` },
      });
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
          await logLootably({
            mappedFields: { ...baseMappedFields, transactionId: normalizedTransactionId, payout: providerUnits, status: 'rejected' },
            processingResult: 'rejected',
            rejectionReason: 'Invalid security token.',
            security: { checked: true, passed: false, reason: 'Invalid security token.' },
          });
          return res.status(401).send('0');
        }
      }
    }

    // 6. Convert: platformCoins = Math.floor(providerUnits * provider.conversionRatio)
    const parsedProviderUnits = parseLegacyProviderUnits(providerUnits);
    if (parsedProviderUnits === null) {
      console.warn(`[Reward Engine] ${providerId} postback rejected because provider units are malformed.`);
      await logLootably({
        mappedFields: { ...baseMappedFields, transactionId: normalizedTransactionId, payout: providerUnits, status: 'rejected' },
        processingResult: 'rejected',
        rejectionReason: 'Provider units are malformed.',
        security: { checked: true, passed: true },
      });
      return res.status(401).send('0');
    }

    const platformCoins = Math.floor(parsedProviderUnits * provider.conversionRatio);
    if (isNaN(platformCoins) || platformCoins === 0) {
      await logLootably({
        mappedFields: { ...baseMappedFields, transactionId: normalizedTransactionId, payout: providerUnits, status: 'ignored' },
        processingResult: 'ignored',
        rejectionReason: 'Computed platform coins were zero or invalid.',
        security: { checked: true, passed: true },
      });
      return res.status(200).send('1'); // bad amount, silently ignore
    }

    // 7. Build externalId = `${providerId}:${transactionId}`
    const externalId = `${providerId}:${normalizedTransactionId}`;

    // Find User early to support chargebacks
    const user = await User.findById(normalizedUserId);
    if (!user) {
      await logLootably({
        mappedFields: { ...baseMappedFields, transactionId: normalizedTransactionId, payout: providerUnits, status: 'ignored' },
        processingResult: 'ignored',
        rejectionReason: 'User not found.',
        security: { checked: true, passed: true },
      });
      return res.status(200).send('1');
    }

    // CHARGEBACK HANDLING: If the offerwall returns negative, it's reversing an offer.
    if (platformCoins < 0) {
      const originalTxId = req.query.original_transaction_id || externalId;
      // Cascading chargeback (original reward + linked referral/bonus rows) in
      // one transaction; only the callback that wins the status flip debits.
      const { reversed, originalTx } = await reverseLegacyOfferTransaction({
        userId: user._id,
        originalExternalId: originalTxId,
      });

      if (reversed) {
        // Send notifications (once, only for the winning callback)
        await notify(user._id, 'chargeback', 'Offer Chargebacked', `An offer was automatically reversed: -${Math.abs(originalTx.amount)} coins`, { amount: -Math.abs(originalTx.amount) });
        await notifyAdmins({
          category: 'security',
          type: 'chargeback_processed',
          message: `Auto-chargeback triggered by ${provider.label} for user ${user.displayName || user._id}`,
          permissionRequired: 'manage_offerwalls'
        });
      }
      await logLootably({
        userId: user._id,
        transaction: originalTx,
        mappedFields: {
          ...baseMappedFields,
          transactionId: normalizedTransactionId,
          payout: providerUnits,
          status: 'reversed',
          extra: { originalTransactionId: originalTxId },
        },
        processingResult: 'accepted',
        security: { checked: true, passed: true },
      });
      return res.status(200).send('1');
    }

    // 8-11. Normal Positive Postback: the duplicate check, wallet credit and
    // ledger insert run in ONE transaction keyed on the unique externalId, so a
    // duplicate (including a concurrent one) never changes the wallet.
    const holdDecision = getEarningHoldDecision(settings, platformCoins, new Date(), {
      providerConfig: provider,
    });
    const creditBalance = holdDecision.walletCredit;
    const txStatus = holdDecision.status;
    const holdDate = holdDecision.holdUntil;
    const offerTitle = sanitizeOfferTitle(params.offerTitle);
    const stepLabel = sanitizeOfferTitle(params.stepLabel);

    const credit = await creditLegacyOfferReward({
      userId: user._id,
      externalId,
      creditBalance,
      totalEarnedIncrement: platformCoins,
      transactionPayload: {
        transactionType: 'offer_reward',
        sourceType: 'offer',
        amount: platformCoins,
        description: stepLabel || offerTitle || provider.label || 'Offer Reward',
        status: txStatus,
        holdUntil: holdDate,
        metadata: {
          providerId,
          providerName: provider.label || providerId,
          offerTitle: offerTitle || null,
          campaignTitle: offerTitle || null,
          stepLabel: stepLabel || null,
          providerUnits,
          conversionRatio: provider.conversionRatio,
          holdApplied: holdDecision.status === 'hold',
          holdDays: holdDecision.holdDays,
        },
      },
    });

    if (credit.duplicate) {
      await logLootably({
        userId: user._id,
        transaction: credit.transaction,
        mappedFields: { ...baseMappedFields, transactionId: normalizedTransactionId, payout: providerUnits, status: 'duplicate' },
        processingResult: 'duplicate',
        isDuplicate: true,
        security: { checked: true, passed: true },
      });
      return res.status(200).send('1');
    }

    const { updatedUser, transaction: offerTx } = credit;
    // Push live balance to user's browser
    emitWalletUpdate(user.firebaseUid, updatedUser.walletBalance);
    // Check VIP level-up (fire-and-forget) — pass updatedUser so totalEarned is the new value
    processVipLevelUp(updatedUser, platformCoins, emitToUser);

    // 12. Send Offer Reward Notification
    const notifTitle = txStatus === 'hold' ? 'Offer Reward on Hold' : 'Offer Credited';
    const holdDaysRemaining = holdDate
      ? Math.max(1, Math.ceil((new Date(holdDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;
    const providerName = provider.label || providerId;
    const rewardLabel = stepLabel || offerTitle;
    const notifMsg = txStatus === 'hold'
      ? rewardLabel
        ? `You earned +${platformCoins} coins for "${rewardLabel}" via ${providerName}. It is on hold for ${holdDaysRemaining} days.`
        : `You earned +${platformCoins} coins from ${providerName}. The reward is on hold for ${holdDaysRemaining} days.`
      : rewardLabel
        ? `You earned +${platformCoins} coins for "${rewardLabel}" via ${providerName}. The reward is available now.`
        : `You earned +${platformCoins} coins from ${providerName}. The reward is available now.`;

    await notify(
      user._id,
      'offer_reward',
      notifTitle,
      notifMsg,
      {
        amount: platformCoins,
        txId: offerTx._id,
        providerId,
        providerName,
        offerTitle: offerTitle || null,
        stepLabel: stepLabel || null,
        holdDays: holdDaysRemaining,
        holdUntil: holdDate || null,
      }
    );

    // Add Admin Notification
    await notifyAdmins({
      category: 'offerwalls',
      type: 'offer_completed',
      message: `User ${user.displayName || user._id} completed ${rewardLabel ? `"${rewardLabel}" on ` : 'an offer on '}${provider.label} for ${platformCoins} Coins.`,
      permissionRequired: 'manage_offerwalls',
      metadata: { userId: user._id, transactionId: offerTx._id, providerId }
    });

    await logLootably({
      userId: user._id,
      transaction: offerTx,
      mappedFields: { ...baseMappedFields, transactionId: normalizedTransactionId, payout: providerUnits, offerTitle, status: 'approved' },
      processingResult: 'accepted',
      security: { checked: true, passed: true },
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
    await logLootably({
      mappedFields: {
        transactionId: typeof params?.transactionId === 'string' ? params.transactionId : '',
        payout: typeof params?.providerUnits === 'string' ? params.providerUnits : null,
        status: 'error',
      },
      processingResult: 'error',
      rejectionReason: err.message || 'Unexpected postback error.',
      security: { checked: true, passed: false, reason: err.message || 'Unexpected postback error.' },
    });
    return res.status(500).send('0');
  }
};

// 3b. Provider-Specific Routes
const requestRewardLabels = (req) => ({
  offerTitle: readOfferTitle(req.query, req.body),
  stepLabel: readStepLabel(req.query, req.body),
});

const providerRouteParams = {
  cpx: (req) => ({ userId: req.query.user_id ?? req.body?.user_id, providerUnits: req.query.reward ?? req.body?.reward, transactionId: req.query.trans_id ?? req.body?.trans_id, secretParam: req.query.hash ?? req.body?.hash }),
  adgem: (req) => ({ userId: req.query.user_id ?? req.body?.user_id, providerUnits: req.query.amount ?? req.body?.amount, transactionId: req.query.oid ?? req.body?.oid, secretParam: req.query.verifier ?? req.body?.verifier }),
  lootably: (req) => ({ userId: req.query.user_id ?? req.body?.user_id, providerUnits: req.query.revenue ?? req.body?.revenue, transactionId: req.query.transaction_id ?? req.body?.transaction_id, secretParam: req.query.security_token ?? req.body?.security_token }),
  torox: (req) => ({ userId: req.query.user_id ?? req.body?.user_id, providerUnits: req.query.reward ?? req.body?.reward, transactionId: req.query.txid ?? req.body?.txid, secretParam: req.query.secret ?? req.body?.secret }),
  primeearn: (req) => ({ userId: req.query.user_id ?? req.body?.user_id, providerUnits: req.query.amount ?? req.body?.amount, transactionId: req.query.offer_id ?? req.body?.offer_id, secretParam: req.query.token ?? req.body?.token }),
  ayet: (req) => ({ userId: req.query.uid ?? req.body?.uid, providerUnits: req.query.payout ?? req.body?.payout, transactionId: req.query.sid ?? req.body?.sid, secretParam: req.query.signature ?? req.body?.signature }),
  adtowall: (req) => ({ userId: req.query.user_id ?? req.body?.user_id, providerUnits: req.query.points ?? req.body?.points, transactionId: req.query.transaction_id ?? req.body?.transaction_id, secretParam: req.query.secret ?? req.body?.secret }),
  revu: (req) => ({ userId: req.query.pub_user_id ?? req.body?.pub_user_id, providerUnits: req.query.amount ?? req.body?.amount, transactionId: req.query.ref ?? req.body?.ref, secretParam: req.query.hash ?? req.body?.hash }),
};

for (const [providerId, getParams] of Object.entries(providerRouteParams)) {
  const handler = (req, res) => handleLegacyOfferwallPostback(providerId, req, res, {
    ...getParams(req),
    ...requestRewardLabels(req),
  });
  router.get(`/postback/${providerId}`, handler);
  router.post(`/postback/${providerId}`, handler);
}

router.__testInternals = {
  readOfferTitle,
  readStepLabel,
  sanitizeOfferTitle,
  creditLegacyOfferReward,
  reverseLegacyOfferTransaction,
};

module.exports = router;
