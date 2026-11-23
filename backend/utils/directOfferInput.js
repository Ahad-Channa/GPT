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

// Optional overall total click cap. Blank/absent -> null (unlimited). When
// present it must be a positive integer; otherwise reject with HTTP 400. This is
// the authoritative validation (not the Mongoose `min` rule, which still accepts
// decimals).
const parseMaxTotalClicks = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) {
    const error = new Error('Max total clicks must be a positive integer.');
    error.statusCode = 400;
    throw error;
  }
  return num;
};

// Cover image: empty -> null; an uploaded image data URL (png/jpeg/webp/gif, at
// most ~2 MB of base64) or, for existing offers, an http(s) URL. Anything else
// is rejected with HTTP 400.
const MAX_COVER_DATA_URL_LENGTH = 2.5 * 1024 * 1024;
const parseCoverImageInput = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const text = typeof value === 'string' ? value.trim() : '';
  const isDataUrl = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(text);
  const isHttpUrl = /^https?:\/\/\S+$/i.test(text);
  if ((!isDataUrl && !isHttpUrl) || (isDataUrl && text.length > MAX_COVER_DATA_URL_LENGTH)) {
    const error = new Error('Cover image must be an uploaded PNG, JPG, WebP or GIF image under 2 MB.');
    error.statusCode = 400;
    throw error;
  }
  return text;
};

module.exports = {
  parseCoverImageInput,
  normalizeDisplayPlacements,
  parseAllowedCountriesInput,
  parseMaxTotalClicks,
};
