const net = require('net');

const COUNTRY_HEADER_NAMES = [
  'cf-ipcountry',
  'x-vercel-ip-country',
  'x-country-code',
];

const normalizeCountryCode = (value) => {
  if (!value) return '';
  const normalized = String(value).trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : '';
};

const normalizeCountryList = (countries) => {
  if (!Array.isArray(countries)) return [];
  return [...new Set(countries.map(normalizeCountryCode).filter(Boolean))];
};

const isTrustProxyEnabled = (req) => {
  const setting = req?.app?.get?.('trust proxy');
  return Boolean(setting);
};

const getClientIp = (req) => {
  if (!req) return '';

  if (isTrustProxyEnabled(req) && req.ip) {
    return req.ip;
  }

  const socketAddress = req.socket?.remoteAddress || req.connection?.remoteAddress || '';
  if (socketAddress.startsWith('::ffff:')) return socketAddress.slice(7);
  return net.isIP(socketAddress) ? socketAddress : '';
};

const getHeaderCountry = (req) => {
  if (!isTrustProxyEnabled(req)) return '';

  for (const name of COUNTRY_HEADER_NAMES) {
    const value = req.headers?.[name];
    const normalized = normalizeCountryCode(Array.isArray(value) ? value[0] : value);
    if (normalized && normalized !== 'XX') return normalized;
  }

  return '';
};

const resolveRequestGeo = (req) => ({
  ip: getClientIp(req),
  country: getHeaderCountry(req),
});

const isCountryAllowed = (allowedCountries, country) => {
  const normalizedCountries = normalizeCountryList(allowedCountries);
  if (normalizedCountries.length === 0) return true;
  const normalizedCountry = normalizeCountryCode(country);
  return Boolean(normalizedCountry) && normalizedCountries.includes(normalizedCountry);
};

module.exports = {
  getClientIp,
  isCountryAllowed,
  normalizeCountryCode,
  normalizeCountryList,
  resolveRequestGeo,
};
