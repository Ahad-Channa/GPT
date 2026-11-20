const replaceMacro = (value, macro, replacement) =>
  String(value || '').replace(macro, encodeURIComponent(String(replacement ?? '')));

export const maskPostbackSecret = (postbackUrl) =>
  String(postbackUrl || '').replace(/([?&]secret=)[^&]*/i, '$1{OFFER_SECRET}');

export const buildConfiguredPostbackExample = (postbackUrl, goal, index = 0) => {
  const goalKey = String(goal?.goalKey || `step_${index + 1}`).trim();
  const eventValue = String(goal?.externalEventId || goalKey).trim();
  const payout = Number(goal?.payoutAmount);

  let configured = maskPostbackSecret(postbackUrl);
  configured = replaceMacro(configured, '{CLICK_ID}', 'FRESH_CLICK_ID');
  configured = replaceMacro(configured, '{TRANSACTION_ID}', `unique-${goalKey}-${index + 1}`);
  configured = replaceMacro(configured, '{PAYOUT}', Number.isFinite(payout) ? payout : 0);
  configured = replaceMacro(configured, '{EVENT_TYPE}', eventValue);
  return configured;
};

export const getEnabledPostbackGoals = (offer) =>
  (Array.isArray(offer?.goals) ? offer.goals : [])
    .filter((goal) => goal && goal.enabled !== false && goal.goalKey);
