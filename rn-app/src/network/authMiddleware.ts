import {AuthPlugin} from '../plugins/auth/AuthPlugin';
import {WebSessionManager} from '../plugins/auth/WebSessionManager';

type RequestOptions = {
  headers?: Record<string, string>;
};

/**
 * Auth middleware for API calls.
 * Injects bearer auth from the legitimate user session.
 */
export async function withAuthHeaders(
  authPlugin: AuthPlugin,
  sessionManager: WebSessionManager,
  options: RequestOptions = {},
): Promise<RequestOptions> {
  const token = await authPlugin.ensureValidAccessToken();
  const cookieHeader = await sessionManager.getValidCookies();

  const headers: Record<string, string> = {
    ...(options.headers ?? {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  return Object.keys(headers).length > 0
    ? {
    ...options,
    headers,
      }
    : options;
}
