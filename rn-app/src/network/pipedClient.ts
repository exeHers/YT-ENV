// rn-app/src/network/pipedClient.ts
import { withAuthHeaders } from './authMiddleware';
import {debugLog, useDebugStore} from '../state/debugStore';

const WEB_REQUEST_TIMEOUT_MS = 3500;
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;
const WEB_PROXY_BASE =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_PIPED_PROXY_URL
    ? String(process.env.EXPO_PUBLIC_PIPED_PROXY_URL)
    : 'http://localhost:8787';

const isWebRuntime = (): boolean => typeof window !== 'undefined' && typeof document !== 'undefined';

type ItunesResult = {
  trackName?: string;
  artistName?: string;
  artworkUrl100?: string;
  trackId?: number;
  previewUrl?: string;
};

const toItunesTrack = (item: ItunesResult, idx: number): Record<string, unknown> => {
  const cover = item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : undefined;
  const id = String(item.trackId || `${item.trackName || 'track'}-${idx}`);
  return {
    title: item.trackName || `Track ${idx + 1}`,
    uploaderName: item.artistName || 'Unknown Artist',
    uploaderAvatar: `https://picsum.photos/seed/artist-${encodeURIComponent(item.artistName || 'unknown')}/120/120`,
    thumbnail: cover || `https://picsum.photos/seed/cover-${id}/640/640`,
    url: `/watch?v=itunes-${id}`,
    streamUrl: item.previewUrl,
  };
};

const fetchItunesFallback = async (term: string, limit: number): Promise<Array<Record<string, unknown>>> => {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const body = (await response.json()) as {results?: ItunesResult[]};
    if (!Array.isArray(body.results) || body.results.length === 0) return [];
    return body.results.map(toItunesTrack);
  } catch {
    return [];
  }
};

const webFallbackPayload = async (endpoint: string): Promise<unknown | null> => {
  if (!isWebRuntime()) return null;

  if (endpoint.startsWith('/trending')) {
    return fetchItunesFallback('top global hits', 24);
  }
  if (endpoint.startsWith('/search')) {
    const query = endpoint.split('?')[1] ?? '';
    const params = new URLSearchParams(query);
    const term = params.get('q')?.slice(0, 48) || 'popular music';
    return fetchItunesFallback(term, 20);
  }
  if (endpoint.startsWith('/streams/')) {
    return {duration: 212, audioStreams: [{url: 'mock://audio/1'}, {url: 'mock://audio/2'}]};
  }
  if (endpoint.startsWith('/suggestions/')) {
    return fetchItunesFallback('music recommendations', 12);
  }
  if (endpoint.startsWith('/playlists')) {
    return [];
  }
  return null;
};

const getRequestCandidates = (base: string, endpoint: string): Array<{url: string; label: string}> => {
  const target = `${base}${endpoint}`;
  if (!isWebRuntime()) {
    return [{url: target, label: base}];
  }

  const normalizedProxy = WEB_PROXY_BASE.replace(/\/$/, '');
  const proxied = `${normalizedProxy}/proxy?url=${encodeURIComponent(target)}`;
  return [
    {url: proxied, label: `${base} via local-proxy`},
    {url: target, label: base},
  ];
};

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number): Promise<Response> => {
  if (isWebRuntime()) {
    return fetch(url, init);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {...init, signal: controller.signal});
  } finally {
    clearTimeout(timeout);
  }
};

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
      const requestCandidates = getRequestCandidates(base, endpoint);
      for (const candidate of requestCandidates) {
        try {
          debugLog('info', `REQ ${candidate.url}`);
          const timeoutMs = isWebRuntime() ? WEB_REQUEST_TIMEOUT_MS : DEFAULT_REQUEST_TIMEOUT_MS;
          const response = await fetchWithTimeout(candidate.url, {...options, headers}, timeoutMs);
          if (!response.ok) {
            lastError = `Request failed (${response.status}) on ${endpoint}`;
            debugLog('error', `${lastError} via ${candidate.label}`);
            const isImmediateFailure =
              response.status === 401 ||
              response.status === 403 ||
              response.status === 429 ||
              (response.status >= 400 && response.status < 500 && response.status !== 404);
            if (isImmediateFailure) {
              throw new Error(lastError);
            }
            continue;
          }
          if (base !== currentInstance) {
            useDebugStore.getState().setInstance(base);
            debugLog('info', `Switched active instance -> ${base}`);
          }
          return await parseJsonBody(response, endpoint, candidate.label);
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Request failed';
          debugLog('error', `${lastError} via ${candidate.label}`);
        }
      }
    }
    const fallback = await webFallbackPayload(endpoint);
    if (fallback !== null) {
      debugLog('info', `Using web fallback payload for ${endpoint}`);
      return fallback;
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
    return this.request(`/streams/${encodeURIComponent(videoId)}`);
  },

  // --- AUTHENTICATED ACTIONS (SYNCED TO YT) ---

  async likeVideo(videoId: string) {
    // This will now sync to your actual YT account because of the headers
    return this.request(`/like/${videoId}`, {
      method: 'POST',
    });
  },

  async dislikeVideo(videoId: string) {
    return this.request(`/dislike/${videoId}`, {
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