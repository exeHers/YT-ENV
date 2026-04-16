import {Platform} from 'react-native';

// react-native-cookies (and cookie injection) is native-only.
// Expo Web will crash if we import it eagerly, so we lazy-require it.
export const WebSessionManager = {
  getPersistedCookies: async (): Promise<string> => {
    if (Platform.OS === 'web') return '';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-cookies/cookies');
    const CookieManager = (mod?.default ?? mod) as {
      get: (url: string, includeCredentials?: boolean) => Promise<Record<string, any>>;
    };

    const url = 'https://music.youtube.com';
    const cookies = await CookieManager.get(url, true);
    return Object.values(cookies)
      .map((c: any) => `${c.name}=${c.value}`)
      .join('; ');
  },

  clearAll: async (): Promise<void> => {
    if (Platform.OS === 'web') return;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-cookies/cookies');
    const CookieManager = (mod?.default ?? mod) as {
      clearAll: (includeCredentials: boolean) => Promise<void>;
    };

    await CookieManager.clearAll(true);
  },
};