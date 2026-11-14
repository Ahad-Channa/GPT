import { REQUIRED_OFFER_LOCALE, ENABLED_LOCALE_CODES } from '../i18n/localeRegistry.js';

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

// Restores editor state for an existing offer. All stored locale entries are
// preserved (including inactive fr/ur data); enabled locales also inherit their
// legacy columns when the generic translation entry does not define a field.
export const seedOfferTextTranslations = (offer, locales = ENABLED_LOCALE_CODES) => {
  const map = offer?.translations && typeof offer.translations === 'object'
    ? { ...offer.translations }
    : {};

  if (!offer) return map;

  for (const locale of locales) {
    const suffix = locale === REQUIRED_OFFER_LOCALE ? '' : locale.charAt(0).toUpperCase() + locale.slice(1);
    const legacyRequirements = offer[`requirements${suffix}`];
    const existing = map[locale] && typeof map[locale] === 'object' ? map[locale] : {};
    const text = {
      title: existing.title || offer[`title${suffix}`] || '',
      description: existing.description || offer[`description${suffix}`] || '',
      requirements: Array.isArray(existing.requirements) && existing.requirements.length > 0
        ? existing.requirements
        : (Array.isArray(legacyRequirements) ? legacyRequirements : []),
      proofInstructions: existing.proofInstructions || offer[`proofInstructions${suffix}`] || '',
    };
    if (Object.values(text).some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value))) {
      map[locale] = text;
    }
  }

  return map;
};

// Builds the shared offer-text portion of the admin save payload. Every locale
// keeps its own requirements inside translations; legacy requirements fields are
// then populated deliberately from the required English entry and the German
// entry so no later key can overwrite localized values. Inactive locale data
// (e.g. fr/ur) is preserved unchanged in the translations map.
export const buildDirectOfferTextPayload = ({ form = {}, translations = {} } = {}) => {
  const requiredLocale = REQUIRED_OFFER_LOCALE;
  const locales = new Set([requiredLocale, ...Object.keys(translations)]);
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

  const required = normalized[requiredLocale];
  const de = normalized.de || { title: '', description: '', requirements: [], proofInstructions: '' };

  return {
    translations: normalized,
    title: required.title,
    description: required.description,
    proofInstructions: required.proofInstructions,
    titleDe: de.title,
    descriptionDe: de.description,
    proofInstructionsDe: de.proofInstructions,
    requirements: required.requirements,
    requirementsDe: de.requirements,
  };
};

export const createEmptyGoal = () => ({
  goalKey: '',
  label: '',
  labelDe: '',
  description: '',
  descriptionDe: '',
  translations: {},
  externalEventId: '',
  externalEventAliases: '',
  rewardAmount: '',
  payoutAmount: '',
  timeLimitDays: '',
  enabled: true,
});

const goalText = (goal, locale, field) => {
  const value = goal?.translations?.[locale]?.[field];
  return typeof value === 'string' ? value.trim() : '';
};

// Text part of a goal in the save payload. The generic `translations` map is
// sent untouched (any locale). Legacy columns are kept compatible: label and
// description come from the required locale, labelDe/descriptionDe from the
// German translation. A legacy value is only used when that translation is
// empty, so older offers keep their text.
export const buildGoalTextPayload = (goal = {}, requiredLocale = REQUIRED_OFFER_LOCALE) => ({
  label: goalText(goal, requiredLocale, 'label') || String(goal.label || '').trim(),
  description: goalText(goal, requiredLocale, 'description') || String(goal.description || '').trim(),
  labelDe: goalText(goal, 'de', 'label') || String(goal.labelDe || '').trim(),
  descriptionDe: goalText(goal, 'de', 'description') || String(goal.descriptionDe || '').trim(),
  translations: goal.translations && typeof goal.translations === 'object' ? goal.translations : {},
});

export default buildDirectOfferTextPayload;
