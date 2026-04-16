import {Plugin} from '../Plugin';
import {Platform} from 'react-native';
import {useSessionStore} from '../../state/sessionStore';

export type AuthSession = {
  accessToken: string;
  refreshToken?: string;
  expiresAtEpochSec: number;
  tokenType: 'Bearer';
};

export interface AuthProvider {
  startSignIn(): Promise<AuthSession>;
  refresh?(refreshToken: string): Promise<AuthSession>;
  signOut(): Promise<void>;
}

export type ManualSessionData = {
  accessToken?: string;
  refreshToken?: string;
  expiresAtEpochSec?: number;
  metadata?: Record<string, string>;
};

export class AuthPlugin implements Plugin {
  id = 'auth';
  displayName = 'Account Auth';

  // react-native-mmkv is native-only; Expo Web will crash if we import it eagerly.
  private storage: {
    getString: (key: string) => string;
    getNumber: (key: string) => number;
    set: (key: string, value: string | number) => void;
    delete: (key: string) => void;
  };

  constructor(private provider: AuthProvider) {}

  private getStorage(): typeof this.storage {
    if (this.storage) return this.storage;

    if (Platform.OS === 'web') {
      const mem = new Map<string, string | number>();
      this.storage = {
        getString: (key: string) => {
          const v = mem.get(key);
          return typeof v === 'string' ? v : '';
        },
        getNumber: (key: string) => {
          const v = mem.get(key);
          return typeof v === 'number' ? v : 0;
        },
        set: (key: string, value: string | number) => {
          mem.set(key, value);
        },
        delete: (key: string) => {
          mem.delete(key);
        },
      };
      return this.storage;
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-mmkv');
    const MMKV = (mod?.MMKV ?? mod?.default ?? mod) as any;
    this.storage = new MMKV({
      id: 'ytenv-auth',
      encryptionKey: 'replace-with-device-derived-key',
    });
    return this.storage;
  }

  async initialize(): Promise<void> {
    const s = this.getStorage();
    const token = s.getString('access_token');
    const expires = s.getNumber('expires_at') ?? 0;
    const now = Math.floor(Date.now() / 1000);
    const isActive = Boolean(token) && expires > now;
    useSessionStore.getState().setSynced(isActive);
  }

  async shutdown(): Promise<void> {
    // No-op for now.
  }

  async syncAccount(): Promise<void> {
    const session = await this.provider.startSignIn();
    this.saveSession(session);
    useSessionStore.getState().setSynced(true);
  }

  manualSync(sessionData: ManualSessionData): void {
    const s = this.getStorage();
    if (sessionData.accessToken) {
      s.set('access_token', sessionData.accessToken);
    }
    if (sessionData.refreshToken) {
      s.set('refresh_token', sessionData.refreshToken);
    }
    if (sessionData.expiresAtEpochSec) {
      s.set('expires_at', sessionData.expiresAtEpochSec);
    } else {
      s.set('expires_at', Math.floor(Date.now() / 1000) + 3600);
    }
    if (sessionData.metadata) {
      s.set('manual_sync_metadata', JSON.stringify(sessionData.metadata));
    }
    useSessionStore.getState().setSynced(true);
  }

  async signOut(): Promise<void> {
    await this.provider.signOut();
    const s = this.getStorage();
    s.delete('access_token');
    s.delete('refresh_token');
    s.delete('expires_at');
    s.delete('token_type');
    useSessionStore.getState().setSynced(false);
  }

  async ensureValidAccessToken(): Promise<string | null> {
    const s = this.getStorage();
    const accessToken = s.getString('access_token');
    const expiresAt = s.getNumber('expires_at') ?? 0;
    const refreshToken = s.getString('refresh_token');
    const now = Math.floor(Date.now() / 1000);

    if (accessToken && expiresAt > now + 30) {
      return accessToken;
    }
    if (!refreshToken || !this.provider.refresh) {
      useSessionStore.getState().setSynced(false);
      return null;
    }

    const newSession = await this.provider.refresh(refreshToken);
    this.saveSession(newSession);
    useSessionStore.getState().setSynced(true);
    return newSession.accessToken;
  }

  getAuthHeader(): string | null {
    const s = this.getStorage();
    const token = s.getString('access_token');
    if (!token) return null;
    return `Bearer ${token}`;
  }

  private saveSession(session: AuthSession): void {
    const s = this.getStorage();
    s.set('access_token', session.accessToken);
    s.set('refresh_token', session.refreshToken ?? '');
    s.set('expires_at', session.expiresAtEpochSec);
    s.set('token_type', session.tokenType);
  }
}
