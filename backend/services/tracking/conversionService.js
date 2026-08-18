const ClickLog = require('../../models/ClickLog');
const Conversion = require('../../models/Conversion');
const PostbackLog = require('../../models/PostbackLog');
const ProviderConfig = require('../../models/ProviderConfig');
const { getClientIp } = require('../../utils/geo');
const { mapPostbackParameters, parsePayout } = require('./parameterMapper');
const { sanitizePostbackPayload } = require('./postbackSanitizer');
const { normalizeProviderStatus } = require('./statusMapper');
const { validateProviderSecurity } = require('./providerSecurity');

const createResult = (overrides = {}) => ({
  ok: false,
  processingResult: 'rejected',
  isDuplicate: false,
  providerId: '',
  mapped: {},
  sanitizedMapped: {},
  security: { checked: false, passed: false, method: '', reason: '' },
  response: null,
  rejectionReason: '',
  clickLog: null,
  conversion: null,
  ...overrides,
});

const ALLOWED_STATUS_TRANSITIONS = {
  pending: ['pending', 'approved', 'rejected', 'reversed'],
  approved: ['approved', 'reversed'],
  rejected: ['rejected'],
  reversed: ['reversed'],
};

const isSameStatusDuplicate = (fromStatus, toStatus) => fromStatus === toStatus;

const canTransitionStatus = (fromStatus, toStatus) =>
  (ALLOWED_STATUS_TRANSITIONS[fromStatus] || []).includes(toStatus);

const sanitizeLogText = (value) =>
  sanitizePostbackPayload({ value: String(value || '').slice(0, 500) }).value;

const buildTransitionUpdate = ({ mapped, internalStatus, payoutAmount, providerConfig, security }) => ({
  $set: {
    incomingStatus: mapped.status,
    internalStatus,
    eventType: mapped.eventType || 'conversion',
    payout: {
      amount: payoutAmount,
      currency: providerConfig.providerSettings?.payoutCurrency || 'USD',
    },
    security: {
      method: security.method || '',
      checked: Boolean(security.checked),
      passed: Boolean(security.passed),
      reason: security.reason || '',
    },
    'metadata.providerUserId': mapped.providerUserId || '',
    'metadata.mappedExtra': mapped.extra || {},
  },
});

const providerResponse = (providerConfig = {}, result) => {
  const responseConfig = providerConfig.responseConfig || {};
  if (result.isDuplicate) {
    return {
      status: responseConfig.duplicateStatus || responseConfig.successStatus || 200,
      body: responseConfig.duplicateBody || responseConfig.successBody || '1',
    };
  }
  if (result.ok) {
    return {
      status: responseConfig.successStatus || 200,
      body: responseConfig.successBody || '1',
    };
  }
  return {
    status: responseConfig.errorStatus || 200,
    body: responseConfig.errorBody || '0',
  };
};

const writePostbackLog = async ({
  req,
  providerConfig,
  route,
  result,
  mappedFields,
  security,
  clickLog,
  conversion,
  postbackLogModel = PostbackLog,
}) => {
  try {
    await postbackLogModel.create({
      providerId: providerConfig?.providerId || result.providerId || '',
      route,
      method: req?.method || 'GET',
      sanitizedQuery: sanitizePostbackPayload(req?.query || {}),
      sanitizedBody: sanitizePostbackPayload(req?.body || {}),
      sanitizedHeaders: sanitizePostbackPayload(req?.headers || {}),
      mappedFields: mappedFields || {},
      sourceIp: getClientIp(req),
      userAgent: req?.headers?.['user-agent'] || '',
      security: {
        checked: Boolean(security?.checked),
        passed: Boolean(security?.passed),
        method: security?.method || '',
        reason: security?.reason || '',
      },
      processingResult: result.processingResult,
      isDuplicate: Boolean(result.isDuplicate),
      rejectionReason: sanitizeLogText(result.rejectionReason || ''),
      clickLogId: clickLog?._id || null,
      conversionId: conversion?._id || null,
      userId: clickLog?.userId || null,
    });
  } catch (error) {
    console.error('[conversionService] Failed to write PostbackLog:', error);
  }
};

const findProviderConfig = async (providerId) => ProviderConfig.findOne({ providerId: String(providerId || '').toLowerCase() });

const findProviderConfigWithCredentials = async (providerId) =>
  ProviderConfig.findOne({ providerId: String(providerId || '').toLowerCase() }).select('+security.credentials');

const normalizeProviderConfig = (providerConfig) => {
  if (!providerConfig) return null;
  const plain = providerConfig.toObject ? providerConfig.toObject() : providerConfig;
  return {
    ...plain,
    providerId: String(plain.providerId || '').toLowerCase(),
  };
};

const createOrResolveConversion = async ({
  providerConfig,
  mapped,
  internalStatus,
  clickLog,
  payoutAmount,
  security,
  conversionModel = Conversion,
}) => {
  const payload = {
    providerId: providerConfig.providerId,
    providerTransactionId: mapped.transactionId || null,
    clickId: mapped.clickId,
    clickLogId: clickLog._id,
    userId: clickLog.userId,
    campaignType: clickLog.campaignType,
    campaignId: clickLog.campaignId,
    offerId: clickLog.offerId || null,
    incomingStatus: mapped.status,
    internalStatus,
    eventType: mapped.eventType || 'conversion',
    payout: {
      amount: payoutAmount,
      currency: providerConfig.providerSettings?.payoutCurrency || 'USD',
    },
    rewardAmount: clickLog.rewardAmount || 0,
    processingState: 'claimed',
    security: {
      method: security.method || '',
      checked: Boolean(security.checked),
      passed: Boolean(security.passed),
      reason: security.reason || '',
    },
    metadata: {
      providerUserId: mapped.providerUserId || '',
      mappedExtra: mapped.extra || {},
    },
  };

  try {
    const conversion = await conversionModel.create(payload);
    return {
      conversion,
      isDuplicate: false,
      shouldProcess: true,
      transition: 'created',
    };
  } catch (error) {
    if (error?.code === 11000 && mapped.transactionId) {
      const existing = await conversionModel.findOne({
        providerId: providerConfig.providerId,
        providerTransactionId: mapped.transactionId,
      });
      if (existing) {
        if (isSameStatusDuplicate(existing.internalStatus, internalStatus)) {
          if (internalStatus === 'approved' && ['claimed', 'failed'].includes(existing.processingState)) {
            return { conversion: existing, isDuplicate: false, shouldProcess: true, transition: 'retry_financial_processing' };
          }
          return { conversion: existing, isDuplicate: true, shouldProcess: false, transition: 'duplicate' };
        }

        if (!canTransitionStatus(existing.internalStatus, internalStatus)) {
          const transitionError = new Error(`Invalid conversion status transition: ${existing.internalStatus} -> ${internalStatus}`);
          transitionError.code = 'INVALID_STATUS_TRANSITION';
          transitionError.existingConversion = existing;
          throw transitionError;
        }

        if (existing.processingState === 'processed' && internalStatus === 'approved') {
          return { conversion: existing, isDuplicate: true, shouldProcess: false, transition: 'duplicate_processed' };
        }
        const transitionUpdate = buildTransitionUpdate({ mapped, internalStatus, payoutAmount, providerConfig, security });
        if (typeof conversionModel.findOneAndUpdate === 'function') {
          const transitioned = await conversionModel.findOneAndUpdate(
            {
              providerId: providerConfig.providerId,
              providerTransactionId: mapped.transactionId,
              internalStatus: existing.internalStatus,
            },
            transitionUpdate,
            { new: true }
          );
          if (transitioned) {
            return { conversion: transitioned, isDuplicate: false, shouldProcess: true, transition: 'updated' };
          }
          const current = await conversionModel.findOne({
            providerId: providerConfig.providerId,
            providerTransactionId: mapped.transactionId,
          });
          if (current && isSameStatusDuplicate(current.internalStatus, internalStatus)) {
            return { conversion: current, isDuplicate: true, shouldProcess: false, transition: 'duplicate' };
          }
          const transitionError = new Error(`Invalid conversion status transition: ${current?.internalStatus || existing.internalStatus} -> ${internalStatus}`);
          transitionError.code = 'INVALID_STATUS_TRANSITION';
          transitionError.existingConversion = current || existing;
          throw transitionError;
        }
        existing.incomingStatus = transitionUpdate.$set.incomingStatus;
        existing.internalStatus = transitionUpdate.$set.internalStatus;
        existing.eventType = transitionUpdate.$set.eventType;
        existing.payout = transitionUpdate.$set.payout;
        existing.security = transitionUpdate.$set.security;
        existing.metadata = {
          ...(existing.metadata || {}),
          providerUserId: transitionUpdate.$set['metadata.providerUserId'],
          mappedExtra: transitionUpdate.$set['metadata.mappedExtra'],
        };
        if (typeof existing.save === 'function') await existing.save();
        return { conversion: existing, isDuplicate: false, shouldProcess: true, transition: 'updated' };
      }
    }
    throw error;
  }

};

const processPostback = async ({
  providerId,
  providerConfig,
  req,
  route = '',
  requiredFields,
  expectedOfferId = null,
  expectedCampaignId = null,
  clickLogModel = ClickLog,
  conversionModel = Conversion,
  postbackLogModel = PostbackLog,
}) => {
  let config = normalizeProviderConfig(providerConfig);
  if (!config && providerId) config = normalizeProviderConfig(await findProviderConfigWithCredentials(providerId));

  const baseResult = createResult({ providerId: config?.providerId || providerId || '' });

  if (!config) {
    const result = createResult({ ...baseResult, rejectionReason: 'Provider config not found.' });
    result.response = providerResponse({}, result);
    return result;
  }

  const effectiveRequiredFields = requiredFields || config.providerSettings?.requiredFields || ['clickId', 'transactionId', 'status'];
  let mappedResult;
  let security = { checked: false, passed: false, method: config.security?.method || '', reason: '' };
  let clickLog = null;
  let conversion = null;

  try {
    if (config.enabled === false) {
      const result = createResult({ ...baseResult, rejectionReason: 'Provider is disabled.' });
      result.response = providerResponse(config, result);
      await writePostbackLog({ req, providerConfig: config, route, result, security, postbackLogModel });
      return result;
    }

    mappedResult = mapPostbackParameters({
      query: req?.query || {},
      body: req?.body || {},
      mappings: config.parameterMappings || {},
      requiredFields: effectiveRequiredFields,
    });

    if (!mappedResult.isValid) {
      const validationReason = [
        mappedResult.missingFields.length ? `Missing required mapped field(s): ${mappedResult.missingFields.join(', ')}` : '',
        mappedResult.invalidFields.length ? `Invalid mapped field(s): ${mappedResult.invalidFields.join(', ')}` : '',
      ].filter(Boolean).join('; ');
      const result = createResult({
        ...baseResult,
        mapped: mappedResult.mapped,
        sanitizedMapped: mappedResult.sanitizedMapped,
        rejectionReason: validationReason,
      });
      result.response = providerResponse(config, result);
      await writePostbackLog({
        req,
        providerConfig: config,
        route,
        result,
        mappedFields: mappedResult.sanitizedMapped,
        security,
        postbackLogModel,
      });
      return result;
    }

    security = validateProviderSecurity({ providerConfig: config, req, mapped: mappedResult.mapped });
    if (!security.passed) {
      const result = createResult({
        ...baseResult,
        mapped: mappedResult.mapped,
        sanitizedMapped: mappedResult.sanitizedMapped,
        security,
        rejectionReason: security.reason || 'Provider security validation failed.',
      });
      result.response = providerResponse(config, result);
      await writePostbackLog({
        req,
        providerConfig: config,
        route,
        result,
        mappedFields: mappedResult.sanitizedMapped,
        security,
        postbackLogModel,
      });
      return result;
    }

    clickLog = await clickLogModel.findOne({ clickId: mappedResult.mapped.clickId });
    if (!clickLog) {
      const result = createResult({
        ...baseResult,
        mapped: mappedResult.mapped,
        sanitizedMapped: mappedResult.sanitizedMapped,
        security,
        rejectionReason: 'ClickLog not found.',
      });
      result.response = providerResponse(config, result);
      await writePostbackLog({
        req,
        providerConfig: config,
        route,
        result,
        mappedFields: mappedResult.sanitizedMapped,
        security,
        postbackLogModel,
      });
      return result;
    }

    if (clickLog.providerId && clickLog.providerId !== config.providerId) {
      const result = createResult({
        ...baseResult,
        mapped: mappedResult.mapped,
        sanitizedMapped: mappedResult.sanitizedMapped,
        security,
        clickLog,
        rejectionReason: 'Provider does not match tracked click.',
      });
      result.response = providerResponse(config, result);
      await writePostbackLog({ req, providerConfig: config, route, result, mappedFields: mappedResult.sanitizedMapped, security, clickLog, postbackLogModel });
      return result;
    }

    if (expectedOfferId && String(clickLog.offerId || '') !== String(expectedOfferId)) {
      const result = createResult({
        ...baseResult,
        mapped: mappedResult.mapped,
        sanitizedMapped: mappedResult.sanitizedMapped,
        security,
        clickLog,
        rejectionReason: 'Offer does not match tracked click.',
      });
      result.response = providerResponse(config, result);
      await writePostbackLog({ req, providerConfig: config, route, result, mappedFields: mappedResult.sanitizedMapped, security, clickLog, postbackLogModel });
      return result;
    }

    if (expectedCampaignId && String(clickLog.campaignId || '') !== String(expectedCampaignId)) {
      const result = createResult({
        ...baseResult,
        mapped: mappedResult.mapped,
        sanitizedMapped: mappedResult.sanitizedMapped,
        security,
        clickLog,
        rejectionReason: 'Campaign does not match tracked click.',
      });
      result.response = providerResponse(config, result);
      await writePostbackLog({ req, providerConfig: config, route, result, mappedFields: mappedResult.sanitizedMapped, security, clickLog, postbackLogModel });
      return result;
    }

    let internalStatus;
    let payoutAmount;
    try {
      internalStatus = normalizeProviderStatus(mappedResult.mapped.status, config.statusMappings || {});
      payoutAmount = mappedResult.mapped.payout === null && !mappedResult.suppliedFields?.payout
        ? 0
        : parsePayout(mappedResult.mapped.payout);
    } catch (error) {
      const result = createResult({
        ...baseResult,
        mapped: mappedResult.mapped,
        sanitizedMapped: mappedResult.sanitizedMapped,
        security,
        clickLog,
        rejectionReason: error.message || 'Invalid mapped postback value.',
      });
      result.response = providerResponse(config, result);
      await writePostbackLog({
        req,
        providerConfig: config,
        route,
        result,
        mappedFields: mappedResult.sanitizedMapped,
        security,
        clickLog,
        postbackLogModel,
      });
      return result;
    }

    let conversionResult;
    try {
      conversionResult = await createOrResolveConversion({
        providerConfig: config,
        mapped: mappedResult.mapped,
        internalStatus,
        clickLog,
        payoutAmount,
        security,
        conversionModel,
      });
    } catch (error) {
      if (error?.code === 'INVALID_STATUS_TRANSITION') {
        const result = createResult({
          ...baseResult,
          mapped: mappedResult.mapped,
          sanitizedMapped: mappedResult.sanitizedMapped,
          security,
          clickLog,
          conversion: error.existingConversion || null,
          rejectionReason: error.message,
        });
        result.response = providerResponse(config, result);
        await writePostbackLog({
          req,
          providerConfig: config,
          route,
          result,
          mappedFields: mappedResult.sanitizedMapped,
          security,
          clickLog,
          conversion: error.existingConversion || null,
          postbackLogModel,
        });
        return result;
      }
      throw error;
    }
    conversion = conversionResult.conversion;

    const result = createResult({
      ok: true,
      processingResult: conversionResult.isDuplicate ? 'duplicate' : 'accepted',
      isDuplicate: conversionResult.isDuplicate,
      shouldProcessFinancial: Boolean(conversionResult.shouldProcess),
      lifecycleTransition: conversionResult.transition || 'created',
      providerId: config.providerId,
      mapped: mappedResult.mapped,
      sanitizedMapped: mappedResult.sanitizedMapped,
      security,
      clickLog,
      conversion,
      internalStatus,
    });
    result.response = providerResponse(config, result);
    await writePostbackLog({
      req,
      providerConfig: config,
      route,
      result,
      mappedFields: mappedResult.sanitizedMapped,
      security,
      clickLog,
      conversion,
      postbackLogModel,
    });
    return result;
  } catch (error) {
    const result = createResult({
      ...baseResult,
      mapped: mappedResult?.mapped || {},
      sanitizedMapped: mappedResult?.sanitizedMapped || {},
      security,
      clickLog,
      conversion,
      processingResult: 'error',
      rejectionReason: error.message || 'Postback processing failed.',
    });
    result.response = providerResponse(config, result);
    await writePostbackLog({
      req,
      providerConfig: config,
      route,
      result,
      mappedFields: mappedResult?.sanitizedMapped || {},
      security,
      clickLog,
      conversion,
      postbackLogModel,
    });
    return result;
  }
};

module.exports = {
  ALLOWED_STATUS_TRANSITIONS,
  canTransitionStatus,
  createOrResolveConversion,
  findProviderConfig,
  findProviderConfigWithCredentials,
  processPostback,
  providerResponse,
};
