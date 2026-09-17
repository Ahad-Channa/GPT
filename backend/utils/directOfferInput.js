const { normalizeCountryCode } = require('./geo');

const normalizeDisplayPlacements = (displayPlacements) => {
  const source = displayPlacements && typeof displayPlacements === 'object' && !Array.isArray(displayPlacements)
    ? displayPlacements
    : {};

  const normalized = {
    featured: source.featured !== undefined ? source.featured === true : true,
    brandedOfferwall: source.brandedOfferwall === true,
  };

  if (!normalized.featured && !normalized.brandedOfferwall) {
    const error = new Error('At least one direct-offer placement must be selected.');
    error.statusCode = 400;
    throw error;
  }

  return normalized;
};

const parseAllowedCountriesInput = (allowedCountries) => {
  if (allowedCountries === undefined || allowedCountries === null || allowedCountries === '') return [];
  if (!Array.isArray(allowedCountries)) {
    const error = new Error('allowedCountries must be an array of ISO alpha-2 country codes.');
    error.statusCode = 400;
    throw error;
  }

  const normalized = [];
  const invalid = [];

  for (const rawCountry of allowedCountries) {
    const rawValue = String(rawCountry || '').trim();
    const country = normalizeCountryCode(rawValue);
    if (!country) {
      invalid.push(rawValue);
      continue;
    }
    if (!normalized.includes(country)) normalized.push(country);
  }

  if (invalid.length > 0) {
    const error = new Error(`Invalid country code(s): ${invalid.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  return normalized;
};

module.exports = {
  normalizeDisplayPlacements,
  parseAllowedCountriesInput,
};
