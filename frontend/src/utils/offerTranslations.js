const asObject = (value) => value && typeof value === 'object' ? value : {};
const localeCandidates = (locale = 'en') => {
  const normalized = String(locale || 'en').replace('_', '-');
  const base = normalized.split('-')[0];
  return [...new Set([normalized, base, 'en'])];
};

export const getOfferTranslation = (offer = {}, locale = 'en') => {
  const map = asObject(offer.translations);
  for (const candidate of localeCandidates(locale)) {
    const value = map[candidate];
    if (value && typeof value === 'object') return value;
  }
  // Migrate old documents at read time; English remains the final fallback.
  const base = String(locale || 'en').split(/[-_]/)[0];
  if (base === 'de') return {
    title: offer.titleDe || offer.title,
    description: offer.descriptionDe || offer.description,
    requirements: offer.requirementsDe?.length ? offer.requirementsDe : offer.requirements,
    proofInstructions: offer.proofInstructionsDe || offer.proofInstructions,
  };
  return {
    title: offer.title,
    description: offer.description,
    requirements: offer.requirements,
    proofInstructions: offer.proofInstructions,
  };
};

export const getGoalTranslation = (goal = {}, locale = 'en') => {
  const map = asObject(goal.translations);
  for (const candidate of localeCandidates(locale)) {
    if (map[candidate] && typeof map[candidate] === 'object') return map[candidate];
  }
  return String(locale || 'en').startsWith('de')
    ? { label: goal.labelDe || goal.label, description: goal.descriptionDe || goal.description }
    : { label: goal.label, description: goal.description };
};
