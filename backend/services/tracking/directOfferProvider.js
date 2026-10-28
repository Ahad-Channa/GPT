// Builds the provider configuration the shared conversion engine uses for a
// DirectOffer. Shared by the public direct-offer postback route and the admin
// manual conversion actions so both resolve conversions from one mapping and
// one security definition (no parallel credit paths).
const buildDirectOfferProviderConfig = (offer) => {
  const mapping = (offer && offer.postbackMapping) || {};
  return {
    providerId: 'direct',
    name: 'Direct Offers',
    type: 'direct',
    // Manual offers must never be rewardable through the S2S postback route.
    // Historical documents without trackingMode are treated as postback.
    enabled: Boolean(offer && offer.isActive) && offer.trackingMode !== 'manual',
    parameterMappings: {
      clickId: mapping.clickIdParam || 'click_id',
      transactionId: mapping.transactionIdParam || 'txn_id',
      status: mapping.statusParam || 'status',
      payout: mapping.payoutParam || 'payout',
      eventType: mapping.eventTypeParam || 'event_type',
    },
    statusMappings: {
      pending: [mapping.pendingValue || 'pending'],
      approved: [mapping.approvedValue || 'approved'],
      rejected: [mapping.rejectedValue || 'rejected'],
      reversed: [mapping.reversedValue || mapping.chargebackValue || 'reversed', mapping.chargebackValue].filter(Boolean),
    },
    security: {
      method: 'shared_secret',
      tokenParam: 'secret',
      secretValue: offer && offer.postbackSecretKey,
    },
    responseConfig: {
      successStatus: 200,
      successBody: '1',
      duplicateStatus: 200,
      duplicateBody: '1',
      errorStatus: 200,
      errorBody: '0',
    },
    ipAllowlist: [],
    providerSettings: {
      requiredFields: ['clickId', 'transactionId', 'status'],
    },
  };
};

module.exports = { buildDirectOfferProviderConfig };
