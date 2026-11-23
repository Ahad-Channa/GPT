const compactKey = (value) => String(value || '').toLowerCase().replace(/[\s_-]+/g, '');
import { getGoalDisplayText } from './offerTranslations.js';
import { formatOfferAmount } from './offerNumberFormat.js';

export const humanizeGoalKey = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const words = raw
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return words.replace(/\b([a-z])/g, (match) => match.toUpperCase());
};

export const formatGoalLabel = (goal, language = 'en', fallbackLabel = '') => {
  const key = String(goal?.goalKey || goal?.key || '').trim();
  const isEnglish = String(language || 'en').toLowerCase().split(/[-_]/)[0] === 'en';
  // Selected language first, then the required English label (stored or translated).
  const localizedLabel = String(getGoalDisplayText(goal, language).label || '').trim();
  const label = localizedLabel || String(goal?.label || '').trim();

  if (label && (!key || compactKey(label) !== compactKey(key))) return label;
  if (isEnglish) return humanizeGoalKey(key || label) || fallbackLabel || 'Complete step';
  // Non-English callers pass the localized missing-label text from i18n.
  return fallbackLabel || '';
};

export const getEnabledGoalRewardTotal = (goals) =>
  (Array.isArray(goals) ? goals : []).reduce((total, goal) => {
    if (!goal || goal.enabled === false) return total;
    const amount = Number(goal.rewardAmount);
    return Number.isSafeInteger(amount) && amount > 0 ? total + amount : total;
  }, 0);

// "<label> → receive N coins" in the selected language (text from i18n so every
// enabled language, and its English fallback, reads correctly).
export const formatGoalRewardInstruction = (goal, language, t) => {
  const label = formatGoalLabel(goal, language, t('offers.missingGoalLabel'));
  return t('offers.goalRewardInstruction', { label, coins: formatOfferAmount(goal?.rewardAmount, language) });
};
