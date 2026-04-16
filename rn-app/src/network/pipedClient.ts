// rn-app/src/network/pipedClient.ts
import { withAuthHeaders } from './authMiddleware';
import {debugLog, useDebugStore} from '../state/debugStore';

const parseJsonBody = async (
  response: Response,
  endpoint: string,
  base: string,
): Promise<unknown> => {
  const raw = await response.text();
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const preview = raw.slice(0, 100).replace(/\s+/g, ' ');
    throw new Error(`Invalid JSON from ${base}${endpoint}. Body starts with: "${preview}"`);
  }
};

export const PipedClient = {
  /**
   * Generic Request Wrapper
   * Injects our custom YT ENV cookies into every call
   */
  async request(endpoint: string, options: RequestInit = {}) {
    const {instances, currentInstance} = useDebugStore.getState();
    const orderedInstances = [currentInstance, ...instances.filter(item => item !== currentInstance)];
    const headers = await withAuthHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
      ...options.headers,
    });
    let lastError = 'Failed to load music data. Please retry.';

    for (const base of orderedInstances) {
      const url = `${base}${endpoint}`;
      try {
        debugLog('info', `REQ ${url}`);
        const response = await fetch(url, {...options, headers});
        if (!response.ok) {
          lastError = `Request failed (${response.status}) on ${endpoint}`;
          debugLog('error', `${lastError} via ${base}`);
          continue;
        }
        if (base !== currentInstance) {
          useDebugStore.getState().setInstance(base);
          debugLog('info', `Switched active instance -> ${base}`);
        }
        return await parseJsonBody(response, endpoint, base);
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Request failed';
        debugLog('error', `${lastError} via ${base}`);
      }
    }
    throw new Error('Failed to load music data. Please retry.');
  },

  // --- PUBLIC SEARCH & TRENDING ---
  
  async search(query: string, filter: string = 'music_songs') {
    return this.request(`/search?q=${encodeURIComponent(query)}&filter=${filter}`);
  },

  async getTrending(region: string = 'ZA') {
    return this.request(`/trending?region=${region}`);
  },

  async getStream(videoId: string) {
    return this.request(`/streams/${videoId}`);
  },

  // --- AUTHENTICATED ACTIONS (SYNCED TO YT) ---

  async likeVideo(videoId: string) {
    // This will now sync to your actual YT account because of the headers
    return this.request(`/like/${videoId}`, {
      method: 'POST',
    });
  },

  async getPlaylists() {
    return this.request('/playlists');
  },

  async addToPlaylist(playlistId: string, videoId: string) {
    return this.request(`/playlists/${playlistId}/add`, {
      method: 'POST',
      body: JSON.stringify({ videoId }),
    });
  },

  async getSuggestions(videoId: string) {
    return this.request(`/suggestions/${videoId}`);
  }
};