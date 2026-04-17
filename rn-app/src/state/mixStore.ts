import {create} from 'zustand';
import {PipedClient} from '../network/pipedClient';

export type MixTrack = {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  avatar: string;
  url?: string;
  streamUrl?: string;
};

type MixState = {
  weeklyMix: MixTrack[];
  lastGenerated: number | null;
  history: MixTrack[];
  refreshMixIfNeeded: () => Promise<void>;
  addHistoryTrack: (track: MixTrack) => void;
};

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const asList = (payload: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(payload)) return payload as Array<Record<string, unknown>>;
  if (payload && typeof payload === 'object') {
    const maybeItems = (payload as {items?: unknown}).items;
    if (Array.isArray(maybeItems)) return maybeItems as Array<Record<string, unknown>>;
  }
  return [];
};

const toTrack = (item: Record<string, unknown>, idx: number): MixTrack => ({
  id: String(item.url || item.title || idx),
  title: String(item.title || 'Unknown Track'),
  artist: String(item.uploaderName || 'Unknown Artist'),
  thumbnail: String(item.thumbnail || `https://picsum.photos/seed/thumb-${idx}/640/640`),
  avatar: String(item.uploaderAvatar || `https://picsum.photos/seed/avatar-${idx}/120/120`),
  url: item.url ? String(item.url) : undefined,
});

export const useMixStore = create<MixState>((set, get) => ({
  weeklyMix: [],
  lastGenerated: null,
  history: [],
  refreshMixIfNeeded: async () => {
    const now = Date.now();
    const {lastGenerated, history} = get();
    if (lastGenerated && now - lastGenerated < THREE_DAYS_MS && get().weeklyMix.length > 0) {
      return;
    }
    const query = history[0]?.title ? `${history[0].title} dark trap remix` : 'dark trap industrial mix';
    const result = asList(await PipedClient.search(query, 'music_songs'));
    const shuffled = [...result].sort(() => Math.random() - 0.5).slice(0, 30).map(toTrack);
    set({weeklyMix: shuffled, lastGenerated: now});
  },
  addHistoryTrack: track =>
    set(state => ({
      history: [track, ...state.history.filter(item => item.id !== track.id)].slice(0, 120),
    })),
}));
