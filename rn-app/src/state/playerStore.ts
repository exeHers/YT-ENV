import {create} from 'zustand';
import {MixTrack} from './mixStore';

export type RepeatMode = 'off' | 'all' | 'one';

type PlayerState = {
  currentTrack: MixTrack | null;
  streamUrl: string | null;
  queue: MixTrack[];
  currentIndex: number;
  shuffleEnabled: boolean;
  repeatMode: RepeatMode;
  autoplayRecommendations: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  setNowPlaying: (track: MixTrack, streamUrl: string, options?: {queue?: MixTrack[]; index?: number}) => void;
  setQueue: (tracks: MixTrack[], startIndex: number) => void;
  setCurrentIndex: (index: number) => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  toggleAutoplayRecommendations: () => void;
  setPlaying: (value: boolean) => void;
  setBuffering: (value: boolean) => void;
  stop: () => void;
};

export const usePlayerStore = create<PlayerState>(set => ({
  currentTrack: null,
  streamUrl: null,
  queue: [],
  currentIndex: -1,
  shuffleEnabled: false,
  repeatMode: 'off',
  autoplayRecommendations: true,
  isPlaying: false,
  isBuffering: false,
  setNowPlaying: (track, streamUrl, options) =>
    set(state => ({
      currentTrack: track,
      streamUrl,
      queue: options?.queue ?? state.queue,
      currentIndex: typeof options?.index === 'number' ? options.index : state.currentIndex,
      isPlaying: true,
      isBuffering: true,
    })),
  setQueue: (queue, currentIndex) => set({queue, currentIndex}),
  setCurrentIndex: currentIndex => set({currentIndex}),
  toggleShuffle: () => set(state => ({shuffleEnabled: !state.shuffleEnabled})),
  cycleRepeatMode: () =>
    set(state => ({
      repeatMode: state.repeatMode === 'off' ? 'all' : state.repeatMode === 'all' ? 'one' : 'off',
    })),
  toggleAutoplayRecommendations: () =>
    set(state => ({
      autoplayRecommendations: !state.autoplayRecommendations,
    })),
  setPlaying: isPlaying => set({isPlaying}),
  setBuffering: isBuffering => set({isBuffering}),
  stop: () =>
    set({
      currentTrack: null,
      streamUrl: null,
      queue: [],
      currentIndex: -1,
      isPlaying: false,
      isBuffering: false,
    }),
}));
