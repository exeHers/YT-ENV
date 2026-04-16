// rn-app/src/network/pipedClient.ts
import { withAuthHeaders } from './authMiddleware';

// You can change this instance in the app settings later
const BASE_URL = 'https://pipedapi.kavin.rocks'; 

export const PipedClient = {
  /**
   * Generic Request Wrapper
   * Injects our custom YT ENV cookies into every call
   */
  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${BASE_URL}${endpoint}`;
    
    // The Magic: This adds your YouTube cookies to the request
    const headers = await withAuthHeaders({
      'Content-Type': 'application/json',
      ...options.headers,
    });

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Mali Error: ${response.status} at ${endpoint}`);
    }

    return response.json();
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