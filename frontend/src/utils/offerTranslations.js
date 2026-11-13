const asObject = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

const normalizeLocale = (locale) => String(locale || 'en').trim().toLowerCase().replace('_', '-') || 'en';

// Never append English here. A selected non-English locale may fall back to its
// own base language (de-DE -> de), but it must not silently borrow English text.
const localeCandidates = (locale = 'en') => {
  const normalized = normalizeLocale(locale);
  const base = normalized.split('-')[0];
  return [...new Set([normalized, base].filter(Boolean))];
};

const normalizedTranslationMap = (translations) => {
  const result = {};
  for (const [key, value] of Object.entries(asObject(translations))) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    result[normalizeLocale(key)] = value;
  }
  return result;
};

const normalizeRequirements = (value) =>
  (Array.isArray(value) ? value : String(value ?? '').split('\n'))
    .map((part) => String(part ?? '').trim())
    .filter(Boolean);

const pickTextField = (map, candidates, field) => {
  for (const candidate of candidates) {
    const text = map[candidate];
    if (!text || !hasOwn(text, field)) continue;

    if (field === 'requirements') {
      const requirements = normalizeRequirements(text[field]);
      if (requirements.length > 0) return requirements;
    } else {
      const value = String(text[field] ?? '').trim();
      if (value) return value;
    }
  }
  return undefined;
};

const legacyOfferFields = (offer, language) => {
  if (language === 'en') {
    return {
      title: offer.title,
      description: offer.description,
      requirements: normalizeRequirements(offer.requirements),
      proofInstructions: offer.proofInstructions,
    };
  }
  if (language === 'de') {
    return {
      title: offer.titleDe,
      description: offer.descriptionDe,
      requirements: normalizeRequirements(offer.requirementsDe),
      proofInstructions: offer.proofInstructionsDe,
    };
  }
  return {};
};

export const getOfferTranslation = (offer = {}, locale = 'en') => {
  const candidates = localeCandidates(locale);
  const language = candidates[candidates.length - 1];
  const map = normalizedTranslationMap(offer.translations);
  const legacy = legacyOfferFields(offer, language);

  return {
    title: pickTextField(map, candidates, 'title') ?? String(legacy.title || '').trim(),
    description: pickTextField(map, candidates, 'description') ?? String(legacy.description || '').trim(),
    requirements: pickTextField(map, candidates, 'requirements') ?? legacy.requirements ?? [],
    proofInstructions: pickTextField(map, candidates, 'proofInstructions') ?? String(legacy.proofInstructions || '').trim(),
  };
};

const legacyGoalFields = (goal, language) => {
  if (language === 'en') return { label: goal.label, description: goal.description };
  if (language === 'de') return { label: goal.labelDe, description: goal.descriptionDe };
  return {};
};

export const getGoalTranslation = (goal = {}, locale = 'en') => {
  const candidates = localeCandidates(locale);
  const language = candidates[candidates.length - 1];
  const map = normalizedTranslationMap(goal.translations);
  const legacy = legacyGoalFields(goal, language);

  return {
    label: pickTextField(map, candidates, 'label') ?? String(legacy.label || '').trim(),
    description: pickTextField(map, candidates, 'description') ?? String(legacy.description || '').trim(),
  };
};
