// Provider offerwall URL construction. Pure (no React) so it can be unit tested.
//
// Preserves current output for normal valid configs. For malformed/duplicate
// query-parameter edge cases it normalizes so only one effective `sid` (and one
// effective `placementID`) remains.
const CPX_APP_ID = '32283';
const LOOTABLY_WALL_URL = 'https://desktop-wall.lootably.com/';

const fillUserMacros = (url, userId) => {
  if (!url || !userId) return url || null;
  return String(url)
    .replaceAll('{USER_ID}', encodeURIComponent(userId))
    .replaceAll('{userId}', encodeURIComponent(userId))
    .replaceAll('{user_id}', encodeURIComponent(userId))
    .replaceAll('[USER_ID]', encodeURIComponent(userId))
    .replaceAll('[user_id]', encodeURIComponent(userId));
};

// Ensure a query param appears at most once.
// - 0 occurrences and a value is provided -> append it
// - 1 occurrence -> leave unchanged (preserve existing config)
// - >1 occurrences -> collapse to the first value
// - value omitted -> only dedupe an existing param, never add it
// Malformed URLs fall back to best-effort string handling (append only if absent).
const ensureSingleParam = (url, paramName, value) => {
  if (!url) return url || null;
  try {
    const parsed = new URL(url);
    const values = parsed.searchParams.getAll(paramName);
    if (values.length > 1) {
      parsed.searchParams.delete(paramName);
      parsed.searchParams.append(paramName, values[0]);
    } else if (values.length === 0 && value !== undefined && value !== null) {
      parsed.searchParams.append(paramName, value);
    }
    return parsed.toString();
  } catch {
    const str = String(url);
    if (value === undefined || value === null) return str;
    const alreadyPresent = new RegExp(`[?&]${paramName}=`).test(str);
    if (alreadyPresent) return str;
    const separator = str.includes('?') ? '&' : '?';
    return `${str}${separator}${encodeURIComponent(paramName)}=${encodeURIComponent(value)}`;
  }
};

export const buildProviderUrl = (provider, userId) => {
  switch (provider && provider.id) {
    case 'cpx':
      return userId
        ? `https://offers.cpx-research.com/index.php?app_id=${CPX_APP_ID}&ext_user_id=${userId}`
        : null;
    case 'lootably': {
      const configuredUrl = fillUserMacros(
        provider.iframeUrl || provider.offerwallUrl || provider.placementUrl || provider.url,
        userId
      );
      if (configuredUrl) {
        // Keep any admin-configured URL, ensure a single effective sid, and
        // collapse duplicate placementID params without inventing one.
        const withSid = ensureSingleParam(configuredUrl, 'sid', userId);
        return ensureSingleParam(withSid, 'placementID', undefined);
      }
      const placementId = provider.placementId || provider.placementID || provider.lootablyPlacementId;
      return placementId && userId
        ? `${LOOTABLY_WALL_URL}?placementID=${encodeURIComponent(placementId)}&sid=${encodeURIComponent(userId)}`
        : null;
    }
    default:
      return fillUserMacros(provider && provider.iframeUrl, userId) || null;
  }
};

export default buildProviderUrl;
