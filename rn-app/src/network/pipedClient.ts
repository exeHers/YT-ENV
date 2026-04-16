import {AuthPlugin} from '../plugins/auth/AuthPlugin';
import {WebSessionManager} from '../plugins/auth/WebSessionManager';
import {withAuthHeaders} from './authMiddleware';

export class PipedClient {
  constructor(
    private readonly baseUrl: string,
    private readonly authPlugin: AuthPlugin,
    private readonly sessionManager: WebSessionManager,
  ) {}

  async getPlaylists(): Promise<unknown> {
    const options = await withAuthHeaders(this.authPlugin, this.sessionManager);
    const response = await fetch(`${this.baseUrl}/playlists`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    });
    return response.json();
  }

  async like(videoId: string): Promise<boolean> {
    const options = await withAuthHeaders(this.authPlugin, this.sessionManager);
    const response = await fetch(`${this.baseUrl}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      body: JSON.stringify({videoId}),
    });
    return response.ok;
  }
}
