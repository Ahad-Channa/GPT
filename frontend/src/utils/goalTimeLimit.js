// Display-only formatting for a Direct Offer goal's optional time label.
// Returns null when there is no valid positive integer so callers render no
// badge. There is NO expiry/deadline/countdown behavior behind this value.
export const formatGoalTimeLimit = (days) => {
  if (days === undefined || days === null || days === '') return null;
  const num = Number(days);
  if (!Number.isInteger(num) || num < 1) return null;
  return `${num}D`;
};

// ── Localized "N days" text ────────────────────────────────────────────────
// The goal time label is shown in the language of the offer text that is
// actually displayed (see getOfferDisplayLocale), so a card never mixes e.g.
// Spanish days with an English offer. Languages without an entry use English.
const russianDays = (n) => {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return 'дней';
  if (mod10 === 1) return 'день';
  if (mod10 >= 2 && mod10 <= 4) return 'дня';
  return 'дней';
};

const DAY_WORDS = {
  en: (n) => (n === 1 ? 'day' : 'days'),
  de: (n) => (n === 1 ? 'Tag' : 'Tage'),
  fr: (n) => (n === 1 ? 'jour' : 'jours'),
  es: (n) => (n === 1 ? 'día' : 'días'),
  it: (n) => (n === 1 ? 'giorno' : 'giorni'),
  pt: (n) => (n === 1 ? 'dia' : 'dias'),
  pl: (n) => (n === 1 ? 'dzień' : 'dni'),
  ru: russianDays,
  tr: () => 'gün',
  ur: () => 'دن',
};

export const formatGoalTimeLimitText = (days, locale = 'en') => {
  if (!formatGoalTimeLimit(days)) return null;
  const num = Number(days);
  const base = String(locale || 'en').toLowerCase().split(/[-_]/)[0];
  const word = (DAY_WORDS[base] || DAY_WORDS.en)(num);
  return `${num} ${word}`;
};
