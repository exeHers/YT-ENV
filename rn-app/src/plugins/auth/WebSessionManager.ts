// rn-app/src/plugins/auth/WebSessionManager.ts
import CookieManager from '@react-native-cookies/cookies';

export const WebSessionManager = {
  getPersistedCookies: async () => {
    const url = 'https://music.youtube.com';
    const cookies = await CookieManager.get(url, true);
    
    return Object.values(cookies)
      .map(c => `${c.name}=${c.value}`)
      .join('; ');
  },
  
  clearAll: async () => {
    await CookieManager.clearAll();
  }
};