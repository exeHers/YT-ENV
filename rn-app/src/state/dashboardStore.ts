import {create} from 'zustand';

type DashboardState = {
  totalListeningMs: number;
  totalStreams: number;
  adsSkipped: number;
  payoutRatePerStreamUsd: number;
  recordStream: (payload: {durationMs: number; adsSkippedEstimate: number}) => void;
  setPayoutRate: (rate: number) => void;
};

const STORAGE_KEY = 'yt-env-dashboard-v1';

type PersistedDashboard = Pick<
  DashboardState,
  'totalListeningMs' | 'totalStreams' | 'adsSkipped' | 'payoutRatePerStreamUsd'
>;

let mmkvStorage:
  | {
      getString: (key: string) => string | undefined;
      set: (key: string, value: string) => void;
    }
  | null = null;

try {
  const MMKV = (require('react-native-mmkv') as {MMKV?: new () => unknown}).MMKV;
  if (MMKV) {
    mmkvStorage = new MMKV() as {
      getString: (key: string) => string | undefined;
      set: (key: string, value: string) => void;
    };
  }
} catch {
  mmkvStorage = null;
}

const loadInitial = (): PersistedDashboard => {
  const fallback: PersistedDashboard = {
    totalListeningMs: 0,
    totalStreams: 0,
    adsSkipped: 0,
    payoutRatePerStreamUsd: 0.0035,
  };

  const raw = mmkvStorage?.getString(STORAGE_KEY);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as PersistedDashboard;
    return {
      totalListeningMs: Number(parsed.totalListeningMs) || 0,
      totalStreams: Number(parsed.totalStreams) || 0,
      adsSkipped: Number(parsed.adsSkipped) || 0,
      payoutRatePerStreamUsd: Number(parsed.payoutRatePerStreamUsd) || 0.0035,
    };
  } catch {
    return fallback;
  }
};

const persist = (state: PersistedDashboard) => {
  mmkvStorage?.set(STORAGE_KEY, JSON.stringify(state));
};

const initial = loadInitial();

export const useDashboardStore = create<DashboardState>(set => ({
  ...initial,
  recordStream: ({durationMs, adsSkippedEstimate}) =>
    set(state => {
      const next: PersistedDashboard = {
        totalListeningMs: state.totalListeningMs + Math.max(0, durationMs),
        totalStreams: state.totalStreams + 1,
        adsSkipped: state.adsSkipped + Math.max(0, Math.round(adsSkippedEstimate)),
        payoutRatePerStreamUsd: state.payoutRatePerStreamUsd,
      };
      persist(next);
      return next;
    }),
  setPayoutRate: rate =>
    set(state => {
      const next: PersistedDashboard = {
        totalListeningMs: state.totalListeningMs,
        totalStreams: state.totalStreams,
        adsSkipped: state.adsSkipped,
        payoutRatePerStreamUsd: Math.max(0, rate),
      };
      persist(next);
      return next;
    }),
}));
