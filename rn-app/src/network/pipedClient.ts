// rn-app/src/network/pipedClient.ts
import { withAuthHeaders } from './authMiddleware';
import {debugLog, useDebugStore} from '../state/debugStore';

export const PipedClient = {
  /**
   * Generic Request Wrapper
   * Injects our custom YT ENV cookies into every call
   */
  async request(endpoint: string, options: RequestInit = {}) {
    const {instances, currentInstance} = useDebugStore.getState();
    const orderedInstances = [currentInstance, ...instances.filter(item => item !== currentInstance)];
    const headers = await withAuthHeaders({'Content-Type': 'application/json', ...options.headers});
    let lastError = 'Unknown request failure';

    for (const base of orderedInstances) {
      const url = `${base}${endpoint}`;
      try {
        debugLog('info', `REQ ${url}`);
        const response = await fetch(url, {...options, headers});
        if (!response.ok) {
          lastError = `Mali Error: ${response.status} at ${endpoint}`;
          debugLog('error', `${lastError} via ${base}`);
          if (response.status === 404 || response.status >= 500) {
            continue;
          }
          throw new Error(lastError);
        }
        if (base !== currentInstance) {
          useDebugStore.getState().setInstance(base);
          debugLog('info', `Switched active instance -> ${base}`);
        }
        return response.json();
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Request failed';
        debugLog('error', `${lastError} via ${base}`);
      }
    }
    throw new Error(lastError);
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