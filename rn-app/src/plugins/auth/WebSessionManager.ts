import CookieManager from '@react-native-cookies/cookies';

/**
 * Manages WebView cookie jar lifecycle without extracting raw auth cookies.
 * Used for session continuity and safe sign-out cleanup.
 */
export class WebSessionManager {
  constructor(private readonly trustedSessionDomain: string) {}

  async hasSessionFor(url: string): Promise<boolean> {
    const cookies = await CookieManager.get(url);
    return Object.keys(cookies).length > 0;
  }

  /**
   * Returns a cookie header for trusted first-party session cookies only.
   * Deliberately excludes third-party auth cookies.
   */
  async getValidCookies(): Promise<string | null> {
    const cookies = await CookieManager.get(this.trustedSessionDomain);
    const allowed = ['piped_session', 'sync_session', 'library_session'];

    const pairs = allowed
      .map(name => {
        const cookie = cookies[name];
        return cookie?.value ? `${name}=${cookie.value}` : null;
      })
      .filter((value): value is string => value !== null);

    if (pairs.length === 0) return null;
    return pairs.join('; ');
  }

  async clearAll(): Promise<void> {
    await CookieManager.clearAll(true);
  }
}
