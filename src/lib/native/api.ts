/**
 * Centralized API client for the Redbeard Android Shell.
 * Ensures API requests route to the production backend rather than the local Capacitor origin.
 */

// During static export, this is baked in via build-android-shell.mjs env vars.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redbeard.store';

/**
 * Standard fetch wrapper for native Android requests.
 * Prepends the API_BASE_URL to relative paths.
 */
export async function nativeFetch(endpoint: string, options?: RequestInit) {
  // Ensure endpoint starts with a slash
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // If we're already passing an absolute URL, use it directly
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${path}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...options?.headers,
      },
    });
    
    // We don't throw immediately on !res.ok so the caller can parse the JSON error if needed.
    return response;
  } catch (err) {
    // This catches network failures (e.g. offline, CORS blocked)
    throw new Error('Network failure');
  }
}

/**
 * Convenience method for searching/browsing series.
 * Connects to /api/search
 */
export async function searchSeries(params: URLSearchParams) {
  const res = await nativeFetch(`/api/search?${params.toString()}`);
  return res;
}
