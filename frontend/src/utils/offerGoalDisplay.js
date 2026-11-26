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

// Display-only cleanup of admin-typed step text: underscores become spaces and
// "50 euro" / "50 EUR" / "50 euros" become "50 €". Nothing is stored or changed.
export const cleanGoalLabelText = (value) =>
  String(value || '')
    .replace(/_+/g, ' ')
    .replace(/(\d+(?:[.,]\d+)?)\s*(?:euros?|eur)\b/gi, '$1 €')
    .replace(/\s{2,}/g, ' ')
    .trim();

export const formatGoalLabel = (goal, language = 'en', fallbackLabel = '') => {
  const key = String(goal?.goalKey || goal?.key || '').trim();
  const isEnglish = String(language || 'en').toLowerCase().split(/[-_]/)[0] === 'en';
  // Selected language first, then the required English label (stored or translated).
  const localizedLabel = String(getGoalDisplayText(goal, language).label || '').trim();
  const label = localizedLabel || String(goal?.label || '').trim();

  if (label) {
    // A label that is literally the machine key ("fight_20_battles") is made readable.
    // Any other admin-typed label is shown in every language, even when the Goal Key
    // was generated from it ("Register" -> register).
    return label === key && /[_-]/.test(label) ? humanizeGoalKey(label) : cleanGoalLabelText(label);
  }
  if (isEnglish) return humanizeGoalKey(key) || fallbackLabel || 'Complete step';
  // No label in any language: non-English callers pass the localized missing-label text.
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
