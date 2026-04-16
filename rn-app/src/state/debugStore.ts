import {create} from 'zustand';

type NetworkLog = {
  id: string;
  at: number;
  level: 'info' | 'error';
  message: string;
};

type DebugState = {
  instances: string[];
  currentInstance: string;
  logs: NetworkLog[];
  setInstance: (instance: string) => void;
  addLog: (level: NetworkLog['level'], message: string) => void;
  clearLogs: () => void;
  wipeMmkv: () => void;
};

const defaultInstances = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.tokhmi.xyz',
  'https://pipedapi.smnz.de',
];

export const useDebugStore = create<DebugState>(set => ({
  instances: defaultInstances,
  currentInstance: defaultInstances[0],
  logs: [],
  setInstance: currentInstance => set({currentInstance}),
  addLog: (level, message) =>
    set(state => ({
      logs: [
        {id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, at: Date.now(), level, message},
        ...state.logs,
      ].slice(0, 300),
    })),
  clearLogs: () => set({logs: []}),
  wipeMmkv: () => {
    try {
      const MMKV = (require('react-native-mmkv') as {MMKV?: new () => {clearAll: () => void}}).MMKV;
      if (!MMKV) return;
      const storage = new MMKV();
      storage.clearAll();
    } catch {
      // noop: optional dependency
    }
  },
}));

export const debugLog = (level: 'info' | 'error', message: string) => {
  useDebugStore.getState().addLog(level, message);
};
