/**
 * Helper functions for making authenticated API calls
 */

/**
 * Makes an authenticated fetch request with proper headers
 */
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  // Get token from localStorage if available
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

/**
 * Makes an authenticated API call and returns JSON response
 */
export async function authenticatedApiCall<T>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  const response = await authenticatedFetch(url, options);
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return response.json();
}