const Conversion = require('../../models/Conversion');
const CustomOfferSubmission = require('../../models/CustomOfferSubmission');

const MANUAL_PROOF_EVENT_TYPE = 'manual_proof';
const MANUAL_PROOF_STATUS = 'manual_proof_pending';

const manualTransactionId = (submissionId) => `manual:${submissionId}`;

const buildManualProofConversionPayload = ({ submission, clickLog, offer }) => {
  const rewardAmount = Number(clickLog?.rewardAmount);
  if (!Number.isSafeInteger(rewardAmount) || rewardAmount <= 0) {
    const error = new Error('Trusted click reward amount is missing for manual proof.');
    error.statusCode = 400;
    throw error;
  }

  const offerId = offer?._id || clickLog?.offerId || submission?.directOfferId || null;

  return {
    providerId: 'direct',
    providerTransactionId: manualTransactionId(submission._id),
    clickId: clickLog?.clickId || submission?.clickId || null,
    clickLogId: clickLog?._id || null,
    userId: submission?.userId || clickLog?.userId || null,
    campaignType: 'direct_offer',
    campaignId: clickLog?.campaignId || offerId,
    offerId,
    incomingStatus: MANUAL_PROOF_STATUS,
    internalStatus: 'pending',
    eventType: MANUAL_PROOF_EVENT_TYPE,
    goalKey: null,
    payout: { amount: 0, currency: 'USD' },
    rewardAmount,
    processingState: 'pending',
    security: {
      method: 'admin_manual',
      checked: false,
      passed: false,
      reason: 'Manual proof submitted',
    },
    metadata: {
      manualProof: true,
      proofSubmissionId: submission?._id || null,
      providerUserId: '',
      mappedExtra: {},
    },
  };
};

// Creates (or resets, after a rejection) the single Conversion that represents a
// manual proof submission. The existing admin conversion actions are then used
// for approve/reject/chargeback, keeping one central reward/reversal path.
const upsertManualProofConversion = async ({
  submission,
  clickLog,
  offer,
  conversionModel = Conversion,
}) => {
  if (!submission?._id) throw new Error('Submission is required for manual proof conversion.');
  if (!clickLog?._id) throw new Error('Tracked click is required for manual proof conversion.');

  const payload = buildManualProofConversionPayload({ submission, clickLog, offer });
  const identity = {
    providerId: payload.providerId,
    providerTransactionId: payload.providerTransactionId,
    goalKey: null,
  };

  const existing = await conversionModel.findOne(identity);
  if (existing) {
    if (
      existing.processingState === 'processed' ||
      existing.rewardTransactionId ||
      existing.internalStatus === 'reversed'
    ) {
      const error = new Error('This manual proof has already been credited.');
      error.code = 'MANUAL_PROOF_ALREADY_CREDITED';
      error.statusCode = 400;
      throw error;
    }

    const update = {
      $set: {
        clickId: payload.clickId,
        clickLogId: payload.clickLogId,
        userId: payload.userId,
        campaignType: payload.campaignType,
        campaignId: payload.campaignId,
        offerId: payload.offerId,
        incomingStatus: payload.incomingStatus,
        internalStatus: 'pending',
        eventType: payload.eventType,
        payout: payload.payout,
        rewardAmount: payload.rewardAmount,
        processingState: 'pending',
        rejectionReason: '',
        errorReason: '',
        'metadata.manualProof': true,
        'metadata.proofSubmissionId': payload.metadata.proofSubmissionId,
      },
    };

    if (typeof conversionModel.findOneAndUpdate === 'function') {
      return conversionModel.findOneAndUpdate(identity, update, { new: true });
    }

    Object.assign(existing, update.$set);
    if (typeof existing.save === 'function') await existing.save();
    return existing;
  }

  return conversionModel.create(payload);
};

// Keeps the proof submission status aligned with the central Conversion action.
const syncManualProofSubmissionStatus = async ({
  conversion,
  status,
  adminNote,
  submissionModel = CustomOfferSubmission,
}) => {
  const submissionId = conversion?.metadata?.proofSubmissionId;
  if (!submissionId) return null;

  const update = { status };
  if (adminNote !== undefined) update.adminNote = adminNote;

  return submissionModel.findByIdAndUpdate(submissionId, { $set: update }, { new: true });
};

module.exports = {
  MANUAL_PROOF_EVENT_TYPE,
  MANUAL_PROOF_STATUS,
  buildManualProofConversionPayload,
  manualTransactionId,
  syncManualProofSubmissionStatus,
  upsertManualProofConversion,
};
