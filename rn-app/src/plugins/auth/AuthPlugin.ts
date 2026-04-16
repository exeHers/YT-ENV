import {Plugin} from '../Plugin';
import {Platform} from 'react-native';
import {useSessionStore} from '../../state/sessionStore';
import {WebSessionManager} from './WebSessionManager';

export class AuthPlugin implements Plugin {
  id = 'auth';
  displayName = 'Account Auth';
  private storage: any;

  constructor(private provider: any) {}

  private getStorage() {
    if (this.storage) return this.storage;
    if (Platform.OS === 'web') return { getString: () => '', set: () => {}, delete: () => {} };
    
    const mod = require('react-native-mmkv');
    const MMKV = (mod?.MMKV ?? mod?.default ?? mod) as any;
    this.storage = new MMKV({ id: 'ytenv-auth' });
    return this.storage;
  }

  async initialize(): Promise<void> {
    const cookies = await WebSessionManager.getPersistedCookies();
    // If SID exists, the session is likely valid
    useSessionStore.getState().setSynced(cookies.includes('SID'));
  }

  async shutdown(): Promise<void> {
    // Required by the Plugin interface, but we don't need it to do anything on close.
  }

  async manualSync(): Promise<void> {
    const cookies = await WebSessionManager.getPersistedCookies();
    if (cookies.includes('SID')) {
      useSessionStore.getState().setSynced(true);
    }
  }

  async signOut(): Promise<void> {
    await WebSessionManager.clearAll();
    useSessionStore.getState().setSynced(false);
  }

  // This is what the authMiddleware will call
  async getAuthCookie(): Promise<string> {
    return await WebSessionManager.getPersistedCookies();
  }
}