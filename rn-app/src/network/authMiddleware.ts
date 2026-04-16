// rn-app/src/network/authMiddleware.ts
import { WebSessionManager } from '../plugins/auth/WebSessionManager';

/**
 * withAuthHeaders
 * This is the heart of YT ENV. It injects the raw session cookies 
 * captured from music.youtube.com into every outgoing request.
 */
export const withAuthHeaders = async (baseHeaders: any = {}) => {
  try {
    // Get the raw cookies sniffed during the WebView login
    const sessionCookies = await WebSessionManager.getPersistedCookies();
    
    return {
      ...baseHeaders,
      'Cookie': sessionCookies, // The magic sync string
      'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-A736B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      'X-Origin': 'https://music.youtube.com',
      'Referer': 'https://music.youtube.com/',
      'Accept': '*/*',
    };
  } catch (error) {
    console.error('Mali Error: Could not inject auth headers', error);
    return baseHeaders;
  }
};