// Shared authenticated fetch for the Direct Offers admin page.
//
// - Fetches a fresh Firebase ID token at request time (Firebase auto-refreshes
//   an expired token on this call).
// - Preserves caller-supplied headers (e.g. Content-Type) while injecting
//   Authorization.
// - On 401, forces a refresh with getIdToken(true) and retries EXACTLY once.
//   If the retry is still 401 it is returned to the caller to surface.
// - If the forced refresh itself fails, a clear auth error is thrown.
export const createAdminApi = (currentUser, baseUrl, { fetchImpl } = {}) => {
  const doFetch = fetchImpl || ((...args) => fetch(...args));

  return async (path, options = {}) => {
    if (!currentUser || typeof currentUser.getIdToken !== 'function') {
      const error = new Error('Not authenticated. Please sign in again.');
      error.code = 'NOT_AUTHENTICATED';
      throw error;
    }

    const buildInit = (token) => ({
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    const url = `${baseUrl}${path}`;

    // Token fetched at request time (not cached from page load).
    const initialToken = await currentUser.getIdToken();
    let res = await doFetch(url, buildInit(initialToken));

    if (!res || res.status !== 401) return res;

    // Expired/invalid token: force refresh and retry once.
    let refreshedToken;
    try {
      refreshedToken = await currentUser.getIdToken(true);
    } catch (refreshError) {
      const error = new Error('Your session expired. Please sign in again.');
      error.code = 'AUTH_REFRESH_FAILED';
      error.cause = refreshError;
      throw error;
    }

    return doFetch(url, buildInit(refreshedToken));
  };
};

export default createAdminApi;
