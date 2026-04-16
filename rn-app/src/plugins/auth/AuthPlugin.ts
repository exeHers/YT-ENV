import {Plugin} from '../Plugin';
import {MMKV} from 'react-native-mmkv';
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

  private storage = new MMKV({
    id: 'ytenv-auth',
    encryptionKey: 'replace-with-device-derived-key',
  });

  constructor(private provider: AuthProvider) {}

  async initialize(): Promise<void> {
    const token = this.storage.getString('access_token');
    const expires = this.storage.getNumber('expires_at') ?? 0;
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
    if (sessionData.accessToken) {
      this.storage.set('access_token', sessionData.accessToken);
    }
    if (sessionData.refreshToken) {
      this.storage.set('refresh_token', sessionData.refreshToken);
    }
    if (sessionData.expiresAtEpochSec) {
      this.storage.set('expires_at', sessionData.expiresAtEpochSec);
    } else {
      this.storage.set('expires_at', Math.floor(Date.now() / 1000) + 3600);
    }
    if (sessionData.metadata) {
      this.storage.set('manual_sync_metadata', JSON.stringify(sessionData.metadata));
    }
    useSessionStore.getState().setSynced(true);
  }

  async signOut(): Promise<void> {
    await this.provider.signOut();
    this.storage.delete('access_token');
    this.storage.delete('refresh_token');
    this.storage.delete('expires_at');
    this.storage.delete('token_type');
    useSessionStore.getState().setSynced(false);
  }

  async ensureValidAccessToken(): Promise<string | null> {
    const accessToken = this.storage.getString('access_token');
    const expiresAt = this.storage.getNumber('expires_at') ?? 0;
    const refreshToken = this.storage.getString('refresh_token');
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
    const token = this.storage.getString('access_token');
    if (!token) return null;
    return `Bearer ${token}`;
  }

  private saveSession(session: AuthSession): void {
    this.storage.set('access_token', session.accessToken);
    this.storage.set('refresh_token', session.refreshToken ?? '');
    this.storage.set('expires_at', session.expiresAtEpochSec);
    this.storage.set('token_type', session.tokenType);
  }
}
