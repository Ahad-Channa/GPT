const LANGUAGE_RE = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i;
const OFFER_FIELDS = new Set(['title', 'description', 'requirements', 'proofInstructions']);
const GOAL_FIELDS = new Set(['label', 'description']);

const normalizeTranslations = (input, allowedFields) => {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const result = {};
  for (const [rawLocale, rawText] of Object.entries(source)) {
    const locale = String(rawLocale).trim();
    if (!LANGUAGE_RE.test(locale) || !rawText || typeof rawText !== 'object' || Array.isArray(rawText)) continue;
    const text = {};
    for (const [field, value] of Object.entries(rawText)) {
      if (!allowedFields.has(field)) continue;
      if (field === 'requirements') {
        text[field] = (Array.isArray(value) ? value : String(value || '').split('\n'))
          .map((part) => String(part || '').trim().slice(0, 1000)).filter(Boolean).slice(0, 100);
      } else {
        text[field] = String(value || '').trim().slice(0, field === 'description' ? 5000 : 2000);
      }
    }
    result[locale] = text;
  }
  return result;
};

module.exports = {
  normalizeOfferTranslations: (input) => normalizeTranslations(input, OFFER_FIELDS),
  normalizeGoalTranslations: (input) => normalizeTranslations(input, GOAL_FIELDS),
};
