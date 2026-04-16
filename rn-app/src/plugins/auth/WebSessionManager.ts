import {Platform} from 'react-native';

export const WebSessionManager = {
  getPersistedCookies: async (): Promise<string> => {
    if (Platform.OS === 'web') return '';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-cookies/cookies');
    const CookieManager = (mod?.default ?? mod) as any;

    // Target the root domain to get the full session stack (SID, HSID, etc.)
    const url = 'https://music.youtube.com';
    const cookies = await CookieManager.get(url, true);
    
    if (!cookies || Object.keys(cookies).length === 0) return '';

    return Object.values(cookies)
      .map((c: any) => `${c.name}=${c.value}`)
      .join('; ');
  },

  clearAll: async (): Promise<void> => {
    if (Platform.OS === 'web') return;
    const mod = require('@react-native-cookies/cookies');
    const CookieManager = (mod?.default ?? mod) as any;
    await CookieManager.clearAll(true);
  },
};