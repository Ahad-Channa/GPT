const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

export const normalizeRequirementLines = (value) =>
  (Array.isArray(value) ? value : String(value ?? '').split('\n'))
    .map((part) => String(part ?? '').trim())
    .filter(Boolean);

const legacyTextField = (form, locale, field) => {
  const suffix = locale === 'en' ? '' : locale.charAt(0).toUpperCase() + locale.slice(1);
  return form[`${field}${suffix}`] || '';
};

const legacyRequirements = (form, locale) =>
  normalizeRequirementLines(legacyTextField(form, locale, 'requirements'));

const legacyFieldsForLocale = (form, locale) => ({
  title: legacyTextField(form, locale, 'title'),
  description: legacyTextField(form, locale, 'description'),
  requirements: legacyRequirements(form, locale),
  proofInstructions: legacyTextField(form, locale, 'proofInstructions'),
});

const pickLocaleField = (raw, field, legacy) => {
  if (!hasOwn(raw, field)) return legacy;

  if (field === 'requirements') return normalizeRequirementLines(raw[field]);
  return String(raw[field] ?? '').trim();
};

// Builds the shared offer-text portion of the admin save payload. Every locale
// keeps its own requirements inside translations; legacy requirements fields are
// then populated deliberately from the English/German entries so no later key
// can overwrite the localized values.
export const buildDirectOfferTextPayload = ({ form = {}, translations = {} } = {}) => {
  const locales = new Set(['en', ...Object.keys(translations)]);
  if (form.titleDe || form.descriptionDe || form.requirementsDe || form.proofInstructionsDe) {
    locales.add('de');
  }

  const normalized = {};
  for (const locale of locales) {
    const raw = translations[locale] && typeof translations[locale] === 'object'
      ? translations[locale]
      : {};
    const legacy = legacyFieldsForLocale(form, locale);
    normalized[locale] = {
      title: pickLocaleField(raw, 'title', legacy.title),
      description: pickLocaleField(raw, 'description', legacy.description),
      requirements: pickLocaleField(raw, 'requirements', legacy.requirements),
      proofInstructions: pickLocaleField(raw, 'proofInstructions', legacy.proofInstructions),
    };
  }

  const en = normalized.en;
  const de = normalized.de || { title: '', description: '', requirements: [], proofInstructions: '' };

  return {
    translations: normalized,
    title: en.title,
    description: en.description,
    proofInstructions: en.proofInstructions,
    titleDe: de.title,
    descriptionDe: de.description,
    proofInstructionsDe: de.proofInstructions,
    requirements: en.requirements,
    requirementsDe: de.requirements,
  };
};

export default buildDirectOfferTextPayload;
