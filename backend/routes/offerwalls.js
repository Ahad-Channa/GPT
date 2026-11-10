const express = require('express');
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

const OfferwallRewardIdentity = require('../models/OfferwallRewardIdentity');
const OfferwallWebhookReceipt = require('../models/OfferwallWebhookReceipt');
const { LOOTABLY_WEBHOOK_PATH } = require('../services/offerwalls/lootablyWebhook');
const {
  REJECTED_RESPONSE,
  adapterLegacyIdMatchesNew,
  getDisabledResponse,
  resolveEnabledAdapter,
} = require('../services/offerwalls/adapters');
const { recordDisabledRouteHit, recordReplayAlert } = require('../services/offerwalls/notices');

// Every legacy provider route. A route can move money ONLY through an enabled,
// verified adapter (services/offerwalls/adapters.js); otherwise it fails closed.
const LEGACY_PROVIDER_IDS = ['cpx', 'adgem', 'lootably', 'torox', 'primeearn', 'ayet', 'adtowall', 'revu'];

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
  const stepKeys = ['step_name', 'goal_name', 'event_name', 'stepName', 'goalName', 'eventName', 'goalDescription'];
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
const lootablyWebhookRoute = '/api/offerwalls/webhook/lootably';

const sanitizeLegacyQuery = (query = {}) => {
  const safeQuery = { ...query };
  for (const key of ['security_token', 'hash', 'shash', 'signature']) {
    if (Object.prototype.hasOwnProperty.call(safeQuery, key)) safeQuery[key] = '[REDACTED]';
  }
  return sanitizePostbackPayload(safeQuery);
};

const writeLegacyPostbackLog = async ({
  req,
  providerId,
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
      providerId,
      route: req?.__postbackRoute || legacyPostbackRoute(providerId),
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
        method: security.method || '',
        reason: security.reason || '',
      },
      processingResult,
      isDuplicate,
      rejectionReason,
      userId: userId || null,
      transactionId: transaction?._id || transaction || null,
    });
  } catch (error) {
    console.error('[Reward Engine] Failed to write legacy offerwall PostbackLog:', error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Atomic ledger + wallet + identity writes for legacy offerwall callbacks.
//
// The wallet balance, the Transaction ledger row and the completion-identity row
// must change together, and a duplicate or replayed callback must never change the
// wallet. This is enforced by running the writes in ONE MongoDB transaction and
// relying on two unique indexes (Transaction.externalId and the
// OfferwallRewardIdentity {providerId,userId,identityKey} index): if either insert
// loses a race (E11000) the callback throws, the transaction ABORTS and the wallet
// increment rolls back, and only THEN is the duplicate classified (outside the
// transaction, from committed data).
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
// rather than committing; caught by the caller and classified after the abort.
const duplicateCallbackSignal = (cause) =>
  Object.assign(new Error('Duplicate offerwall callback.'), { legacyDuplicate: true, cause });

// Rows written by this handler carry the identity key; rows written by the older
// handler do not. Legacy rows are matched only when legacyIdMatchesNew is true.
const isLegacyLedgerRow = (tx) => !tx?.metadata?.offerwallIdentityKey;

const classifyIdentity = ({ identity, externalId }) => {
  if (identity?.status === 'reversed') return { blocked: true, reason: 'reversed_replay', identity };
  if (identity && identity.firstExternalId && identity.firstExternalId !== externalId) {
    return { blocked: true, reason: 'changed_id_duplicate', identity };
  }
  return null;
};

const creditLegacyOfferReward = async ({
  models = {},
  runInTransaction = runLegacyTransaction,
  userId,
  externalId,
  creditBalance,
  totalEarnedIncrement,
  transactionPayload,
  providerId = null,
  identityKey = null,
  legacyIdMatchesNew = false,
}) => {
  const TransactionModel = models.Transaction || Transaction;
  const UserModel = models.User || User;
  const IdentityModel = models.OfferwallRewardIdentity || OfferwallRewardIdentity;
  const identityFilter = identityKey ? { providerId, userId, identityKey } : null;

  try {
    return await runInTransaction(async (session) => {
      const existingTx = await withSession(TransactionModel.findOne({ externalId }), session);
      const identity = identityFilter
        ? await withSession(IdentityModel.findOne(identityFilter), session)
        : null;

      if (existingTx) {
        if (!identityFilter) return { duplicate: true, reason: 'same_external_id', transaction: existingTx };

        if (isLegacyLedgerRow(existingTx)) {
          // A row from the older handler. Without proof that its stored ID means the
          // same thing as the new ID, we neither match it nor claim any protection.
          if (!legacyIdMatchesNew) {
            return { blocked: true, reason: 'legacy_match_unavailable', transaction: existingTx };
          }
          if (!identity && existingTx.status === 'reversed') {
            await IdentityModel.updateOne(
              identityFilter,
              {
                $setOnInsert: {
                  firstExternalId: externalId,
                  firstTransactionId: existingTx._id || null,
                  status: 'reversed',
                  source: 'lazy',
                  reversedAt: new Date(),
                },
              },
              { upsert: true, session }
            );
            return { blocked: true, reason: 'reversed_replay', transaction: existingTx };
          }
        }
        if (identity?.status === 'reversed') {
          return { blocked: true, reason: 'reversed_replay', identity, transaction: existingTx };
        }
        return { duplicate: true, reason: 'same_external_id', transaction: existingTx };
      }

      if (identity) {
        const verdict = classifyIdentity({ identity, externalId });
        if (verdict) return verdict;
        return { duplicate: true, reason: 'same_external_id', transaction: null };
      }

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
          {
            ...transactionPayload,
            userId,
            externalId,
            balanceAfter: updatedUser.walletBalance,
            metadata: {
              ...(transactionPayload.metadata || {}),
              ...(identityKey ? { offerwallIdentityKey: identityKey } : {}),
            },
          },
          session
        );
        if (identityFilter) {
          await createOne(
            IdentityModel,
            {
              ...identityFilter,
              firstExternalId: externalId,
              firstTransactionId: offerTx._id || null,
              status: 'credited',
              source: 'live',
            },
            session
          );
        }
      } catch (error) {
        if (isDuplicateKeyError(error)) throw duplicateCallbackSignal(error);
        throw error;
      }
      return { duplicate: false, updatedUser, transaction: offerTx };
    });
  } catch (error) {
    if (!error?.legacyDuplicate) throw error;

    // The transaction has aborted (wallet increment rolled back). Classify from
    // committed data.
    const existing = await TransactionModel.findOne({ externalId });
    if (!identityFilter) return { duplicate: true, reason: 'same_external_id', transaction: existing };
    const identity = await IdentityModel.findOne(identityFilter);
    const verdict = classifyIdentity({ identity, externalId });
    if (verdict) return { ...verdict, transaction: existing };
    if (existing || identity) return { duplicate: true, reason: 'same_external_id', transaction: existing };
    throw error.cause || error; // unexplained duplicate key -> 500, provider retries
  }
};

// Claims the original reward (and its linked referral/bonus rows) by flipping
// status to 'reversed' with a conditional update, so exactly one of several
// concurrent chargebacks deducts the wallet. Amounts and targets are unchanged
// from the previous behaviour: the postback user is debited the original amount
// and each linked row is debited from its own user.
//
// When an identityKey is supplied the identity is also tombstoned ('reversed') in
// the SAME transaction, even if the original ledger row is missing or already
// reversed, so a reversal that arrives before its credit still blocks that credit.
const reverseLegacyOfferTransaction = async ({
  models = {},
  runInTransaction = runLegacyTransaction,
  userId,
  originalExternalId,
  providerId = null,
  identityKey = null,
}) => {
  const TransactionModel = models.Transaction || Transaction;
  const UserModel = models.User || User;
  const IdentityModel = models.OfferwallRewardIdentity || OfferwallRewardIdentity;

  return runInTransaction(async (session) => {
    let result;
    const originalTx = await TransactionModel.findOneAndUpdate(
      { externalId: originalExternalId, status: { $ne: 'reversed' } },
      { $set: { status: 'reversed' } },
      { new: true, session }
    );

    if (!originalTx) {
      const existing = await withSession(TransactionModel.findOne({ externalId: originalExternalId }), session);
      result = { reversed: false, originalTx: existing || null, linkedTxs: [] };
    } else {
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
      result = { reversed: true, originalTx, linkedTxs };
    }

    if (identityKey) {
      await IdentityModel.updateOne(
        { providerId, userId, identityKey },
        {
          $set: { status: 'reversed', reversedAt: new Date() },
          $setOnInsert: {
            firstExternalId: originalExternalId,
            firstTransactionId: result.originalTx?._id || null,
            source: 'lazy',
          },
        },
        { upsert: true, session }
      );
    }
    return result;
  });
};

// A route that is disabled / has no verified adapter never touches a wallet or
// ledger. It answers with a status chosen from the provider's documented retry
// behaviour, and keeps bookkeeping bounded: one counter row per provider-hour and
// one admin alert per provider per UTC day.
const respondRouteDisabled = async ({ providerId, res, options = {}, notifyAdmins: notifyAdminsFn = notifyAdmins, disabledResponse = null }) => {
  const { status, body } = disabledResponse || getDisabledResponse(providerId);
  try {
    const hit = await recordDisabledRouteHit({ models: options.models, providerId });
    if (hit.firstHitOfHour) {
      console.warn(`[Reward Engine] ${providerId} callback refused: no verified adapter is enabled for this provider.`);
    }
    if (hit.firstAlertOfDay) {
      await notifyAdminsFn({
        category: 'offerwalls',
        type: 'offerwall_route_disabled',
        message: `Offerwall callbacks from ${providerId} are being refused because no verified adapter is enabled. Completions are not credited until it is verified.`,
        permissionRequired: 'manage_offerwalls',
        metadata: { providerId },
      });
    }
  } catch (error) {
    console.error('[Reward Engine] Failed to record disabled-route hit:', error.message);
  }
  return res.status(status).send(body);
};

const defaultHandlerDeps = {
  Settings,
  User,
  notify,
  notifyAdmins,
  emitWalletUpdate,
  processVipLevelUp,
  writePostbackLog: writeLegacyPostbackLog,
};

const BLOCK_MESSAGES = {
  reversed_replay: 'a callback for an already-reversed completion was blocked',
  changed_id_duplicate: 'a second callback for an already-credited completion arrived under a different transaction ID and was blocked',
  legacy_match_unavailable: 'a callback collided with a pre-existing legacy ledger row; replay protection is NOT available for that row (old and new IDs are not proven to match)',
};

// Legacy offerwall compatibility handler.
//
// These routes do not resolve a stored ClickLog, so a provider-issued completion
// ID (bound to an authenticated callback) is the only identity available. A genuinely
// new provider-signed callback with a NEW base ID for the same task is a new
// completion and is NOT linkable to an earlier one unless the provider supplies a
// stable shared task ID.
const handleLegacyOfferwallPostback = async (providerId, req, res, params = {}, options = {}) => {
  // Side-effect dependencies are injectable so the whole flow can be exercised
  // without a database. Production always uses the module defaults.
  const {
    Settings, User, notify, notifyAdmins, emitWalletUpdate, processVipLevelUp, writePostbackLog,
  } = { ...defaultHandlerDeps, ...(options.deps || {}) };
  const logPostback = (payload) => writePostbackLog({ req, providerId, ...payload });

  try {
    // Lootably must use the authenticated JSON webhook only. Keep the old GET
    // postback endpoint disabled even after the webhook adapter is enabled.
    if (providerId === 'lootably' && req?.path !== LOOTABLY_WEBHOOK_PATH) {
      return await respondRouteDisabled({ providerId, res, options, notifyAdmins });
    }

    // 0. Fail closed: no enabled, verified adapter -> no money movement at all.
    const adapter = resolveEnabledAdapter(providerId, options.adapterOptions);
    if (!adapter) return await respondRouteDisabled({ providerId, res, options, notifyAdmins });

    const adapterEnv = options.adapterOptions?.env;

    // 1. Authenticate with the provider's documented mechanism, then parse.
    const verification = adapter.verify(req, { env: adapterEnv || process.env });
    if (!verification.passed) {
      console.warn(`[Reward Engine] ${providerId} callback rejected: ${verification.reason}`);
      await logPostback({
        mappedFields: { status: 'rejected' },
        processingResult: 'rejected',
        rejectionReason: verification.reason,
        security: { checked: true, passed: false, method: adapter.id, reason: verification.reason },
      });
      return res.status(REJECTED_RESPONSE.status).send(REJECTED_RESPONSE.body);
    }
    const parsed = adapter.parse(req);
    if (!parsed.ok) {
      await logPostback({
        mappedFields: { status: 'rejected' },
        processingResult: 'rejected',
        rejectionReason: parsed.reason,
        security: { checked: true, passed: true, method: adapter.id },
      });
      return res.status(REJECTED_RESPONSE.status).send(REJECTED_RESPONSE.body);
    }

    const providerUnits = parsed.providerUnits;
    const normalizedTransactionId = parsed.transactionId;
    const security = { checked: true, passed: true, method: adapter.id };
    const baseMappedFields = {
      transactionId: normalizedTransactionId,
      payout: typeof providerUnits === 'string' ? providerUnits : null,
      offerTitle: typeof params.offerTitle === 'string' ? params.offerTitle : '',
      stepLabel: typeof params.stepLabel === 'string' ? params.stepLabel : '',
    };

    const settings = await Settings.getSingleton();
    const provider = settings.offerwallProviders.find((p) => p.id === providerId);

    // 2. If provider.enabled === false → return "1" silently (ignores unexpected postbacks)
    if (!provider || !provider.enabled) {
      await logPostback({
        mappedFields: { ...baseMappedFields, status: 'ignored' },
        processingResult: 'ignored',
        rejectionReason: 'Provider disabled or not configured.',
        security,
      });
      return res.status(200).send('1');
    }

    // States that are acknowledged but never credit or reverse (e.g. pending).
    if (parsed.kind === 'ignore') {
      await logPostback({
        mappedFields: { ...baseMappedFields, status: 'ignored' },
        processingResult: 'ignored',
        rejectionReason: 'Callback state does not change the wallet.',
        security,
      });
      return res.status(200).send('1');
    }

    // 7. Build externalId = `${providerId}:${transactionId}`
    const externalId = `${providerId}:${normalizedTransactionId}`;
    const identityKey = parsed.baseId;

    // Find User early to support chargebacks
    const user = mongoose.isValidObjectId(parsed.userId) ? await User.findById(parsed.userId) : null;
    if (!user) {
      await logPostback({
        mappedFields: { ...baseMappedFields, status: 'ignored' },
        processingResult: 'ignored',
        rejectionReason: 'User not found.',
        security,
      });
      return res.status(200).send('1');
    }

    // CHARGEBACK HANDLING: the adapter says this callback reverses a completion.
    if (parsed.kind === 'reversal') {
      const originalTxId = `${providerId}:${parsed.baseId}`;
      // Cascading chargeback (original reward + linked referral/bonus rows) and the
      // identity tombstone in one transaction; only the callback that wins the
      // status flip debits.
      const { reversed, originalTx } = await reverseLegacyOfferTransaction({
        models: options.models,
        runInTransaction: options.runInTransaction,
        userId: user._id,
        originalExternalId: originalTxId,
        providerId,
        identityKey,
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
      await logPostback({
        userId: user._id,
        transaction: originalTx,
        mappedFields: {
          ...baseMappedFields,
          status: 'reversed',
          extra: { originalTransactionId: originalTxId },
        },
        processingResult: 'accepted',
        security,
      });
      return res.status(200).send('1');
    }

    // 6. Convert: platformCoins = Math.floor(providerUnits * provider.conversionRatio)
    const parsedProviderUnits = parseLegacyProviderUnits(providerUnits);
    const explicitPlatformCoins = parsed.platformCoins;
    if (explicitPlatformCoins !== undefined && (!Number.isSafeInteger(explicitPlatformCoins) || explicitPlatformCoins < 1)) {
      await logPostback({
        mappedFields: { ...baseMappedFields, status: 'rejected' },
        processingResult: 'rejected',
        rejectionReason: 'Explicit platform coin reward is malformed.',
        security,
      });
      return res.status(REJECTED_RESPONSE.status).send(REJECTED_RESPONSE.body);
    }
    if (explicitPlatformCoins === undefined && parsedProviderUnits === null) {
      console.warn(`[Reward Engine] ${providerId} postback rejected because provider units are malformed.`);
      await logPostback({
        mappedFields: { ...baseMappedFields, status: 'rejected' },
        processingResult: 'rejected',
        rejectionReason: 'Provider units are malformed.',
        security,
      });
      return res.status(REJECTED_RESPONSE.status).send(REJECTED_RESPONSE.body);
    }

    const platformCoins = explicitPlatformCoins === undefined
      ? Math.floor(parsedProviderUnits * provider.conversionRatio)
      : explicitPlatformCoins;
    if (isNaN(platformCoins) || platformCoins <= 0) {
      await logPostback({
        mappedFields: { ...baseMappedFields, status: 'ignored' },
        processingResult: 'ignored',
        rejectionReason: 'Computed platform coins were zero, negative or invalid.',
        security,
      });
      return res.status(200).send('1'); // bad amount, silently ignore
    }

    // 8-11. Normal Positive Postback: the duplicate/identity checks, wallet credit
    // and ledger + identity inserts run in ONE transaction keyed on the unique
    // externalId and identity indexes, so a duplicate, a replay of a reversed
    // completion, or a changed-ID retry (including concurrent ones) never changes
    // the wallet.
    const holdDecision = getEarningHoldDecision(settings, platformCoins, new Date(), {
      providerConfig: provider,
    });
    const creditBalance = holdDecision.walletCredit;
    const txStatus = holdDecision.status;
    const holdDate = holdDecision.holdUntil;
    const offerTitle = sanitizeOfferTitle(params.offerTitle);
    const stepLabel = sanitizeOfferTitle(params.stepLabel);

    const credit = await creditLegacyOfferReward({
      models: options.models,
      runInTransaction: options.runInTransaction,
      userId: user._id,
      externalId,
      creditBalance,
      totalEarnedIncrement: platformCoins,
      providerId,
      identityKey,
      legacyIdMatchesNew: adapterLegacyIdMatchesNew(adapter),
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
          conversionRatio: explicitPlatformCoins === undefined ? provider.conversionRatio : 1,
          holdApplied: holdDecision.status === 'hold',
          holdDays: holdDecision.holdDays,
        },
      },
    });

    if (credit.blocked) {
      // No credit. One idempotent alert record (T1 + T2) and one admin notification,
      // however many times, or how concurrently, the provider retries this T2.
      const alert = await recordReplayAlert({
        models: options.models,
        providerId,
        userId: user._id,
        identityKey,
        blockedExternalId: externalId,
        reason: credit.reason,
        firstExternalId: credit.identity?.firstExternalId || credit.transaction?.externalId || '',
        firstTransactionId: credit.identity?.firstTransactionId || credit.transaction?._id || null,
      });
      if (alert.firstTime) {
        await notifyAdmins({
          category: 'security',
          type: 'offerwall_replay_blocked',
          message: `${provider.label || providerId}: ${BLOCK_MESSAGES[credit.reason] || 'a callback was blocked'} (user ${user.displayName || user._id}).`,
          permissionRequired: 'manage_offerwalls',
          metadata: {
            providerId,
            userId: user._id,
            identityKey,
            blockedExternalId: externalId,
            firstExternalId: credit.identity?.firstExternalId || credit.transaction?.externalId || '',
            reason: credit.reason,
          },
        });
      }
      await logPostback({
        userId: user._id,
        transaction: credit.transaction,
        mappedFields: { ...baseMappedFields, status: 'duplicate', extra: { blockedReason: credit.reason } },
        processingResult: 'duplicate',
        isDuplicate: true,
        rejectionReason: credit.reason === 'legacy_match_unavailable' ? 'legacy_match_unavailable' : `blocked:${credit.reason}`,
        security,
      });
      return res.status(200).send('1');
    }

    if (credit.duplicate) {
      await logPostback({
        userId: user._id,
        transaction: credit.transaction,
        mappedFields: { ...baseMappedFields, status: 'duplicate' },
        processingResult: 'duplicate',
        isDuplicate: true,
        security,
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

    await logPostback({
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
    await logPostback({
      mappedFields: {
        transactionId: '',
        payout: null,
        status: 'error',
      },
      processingResult: 'error',
      rejectionReason: err.message || 'Unexpected postback error.',
      security: { checked: true, passed: false, reason: err.message || 'Unexpected postback error.' },
    });
    return res.status(500).send('0');
  }
};

// Lootably's Conversion Webhook has provider-issued event IDs and a separate
// webhook secret header. Keep receipts after the financial handler succeeds; the
// conversion identity/ledger indexes remain the authoritative money idempotency
// keys if receipt persistence itself needs a retry.
const handleLootablyWebhook = async (req, res, options = {}) => {
  req.__postbackRoute = lootablyWebhookRoute;
  const adapter = resolveEnabledAdapter('lootably', options.adapterOptions);
  if (!adapter) {
    return respondRouteDisabled({
      providerId: 'lootably',
      res,
      options,
      notifyAdmins: options.deps?.notifyAdmins || notifyAdmins,
      disabledResponse: { status: 503, body: '0' },
    });
  }

  const verification = adapter.verify(req, { env: options.adapterOptions?.env || process.env });
  if (!verification.passed) {
    return handleLegacyOfferwallPostback('lootably', req, res, requestRewardLabels(req), options);
  }

  const ReceiptModel = options.models?.OfferwallWebhookReceipt || OfferwallWebhookReceipt;
  const receiptFilter = { providerId: 'lootably', webhookId: verification.webhookId };
  try {
    const priorReceipt = await ReceiptModel.findOne(receiptFilter);
    if (priorReceipt) return res.status(200).send('1');
  } catch (error) {
    console.error('[Lootably Webhook] Unable to check webhook receipt:', error.message);
    return res.status(503).send('0');
  }

  const captured = {
    statusCode: 500,
    body: '0',
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
  };
  await handleLegacyOfferwallPostback('lootably', req, captured, requestRewardLabels(req), options);

  if (captured.statusCode === 200 && captured.body === '1') {
    try {
      await ReceiptModel.create({
        ...receiptFilter,
        event: verification.event,
        transactionId: String(req.body?.data?.transactionID || '').slice(0, 160),
        receivedAt: new Date(),
      });
    } catch (error) {
      if (error?.code !== 11000) {
        // Provider retries are safe: transaction and identity keys prevent a
        // repeated event from changing the balance a second time.
        console.error('[Lootably Webhook] Unable to save webhook receipt:', error.message);
        return res.status(503).send('0');
      }
    }
  }

  return res.status(captured.statusCode).send(captured.body);
};

// 3b. Provider-Specific Routes
const requestRewardLabels = (req) => ({
  offerTitle: readOfferTitle(req.query, req.body?.data, req.body),
  stepLabel: readStepLabel(req.query, req.body?.data, req.body),
});

router.post('/webhook/lootably', handleLootablyWebhook);

// Every legacy provider route is registered, but money moves only through an
// enabled, verified adapter; otherwise the handler fails closed (see
// services/offerwalls/adapters.js). Provider-specific field mapping and signature
// verification live in the adapters, not here.
for (const providerId of LEGACY_PROVIDER_IDS) {
  const handler = (req, res) => handleLegacyOfferwallPostback(providerId, req, res, requestRewardLabels(req));
  router.get(`/postback/${providerId}`, handler);
  router.post(`/postback/${providerId}`, handler);
}

router.__testInternals = {
  readOfferTitle,
  readStepLabel,
  sanitizeOfferTitle,
  creditLegacyOfferReward,
  reverseLegacyOfferTransaction,
  handleLegacyOfferwallPostback,
  handleLootablyWebhook,
  respondRouteDisabled,
};

module.exports = router;
