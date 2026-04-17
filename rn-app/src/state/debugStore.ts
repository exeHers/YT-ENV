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
  wipeMmkv: () => string;
  resetRuntimeState: () => string;
};

const defaultInstances = [
  'https://api.piped.private.coffee',
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
      if (MMKV) {
        const storage = new MMKV();
        storage.clearAll();
      }

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
      return 'MMKV/local storage cleared';
    } catch {
      return 'Storage clear attempted (no MMKV/localStorage available)';
    }
  },
  resetRuntimeState: () => {
    try {
      const settingsModule = require('./settingsStore') as {
        useSettingsStore?: {setState: (partial: unknown) => void};
      };
      const themeModule = require('./themeStore') as {
        useThemeStore?: {setState: (partial: unknown) => void};
      };
      const dashboardModule = require('./dashboardStore') as {
        useDashboardStore?: {setState: (partial: unknown) => void};
      };
      const mixModule = require('./mixStore') as {
        useMixStore?: {setState: (partial: unknown) => void};
      };

      settingsModule.useSettingsStore?.setState({
        values: {
          'engine.crossfadeSec': 0,
          'engine.silenceSkipping': false,
          'engine.dynamicNormalization': true,
          'engine.forceOpus256': false,
          'engine.eqEnabled': true,
          'engine.prefetchAggressiveness': 'medium',
          'engine.ghostMode': false,
          'engine.audioSessionId': 0,
          'canvas.accentHex': '#BD00FF',
          'canvas.cornerRadius': 14,
          'canvas.glassOpacity': 0.22,
          'canvas.font': 'Inter',
          'canvas.pureAmoled': true,
          'canvas.refreshRate': 120,
          'mali.dataSavedMb': 0,
          'mali.cacheSizeMb': 512,
          'mali.proxyRotation': false,
          'mali.dataSaver': false,
          'mali.imageQuality': 'high',
          'mali.cacheLimitMb': 1024,
          'mali.storageUsedMb': 412,
          'mali.instance': 'auto',
          'edgeLight.color': '#BD00FF',
          'edgeLight.speed': 1800,
          'edgeLight.thickness': 3,
          'edgeLight.glowOpacity': 0.45,
          'connect.lastfm': false,
          'connect.genius': false,
          'connect.discordRichPresence': false,
        },
      });

      themeModule.useThemeStore?.setState({
        appName: 'YT ENV',
        fontFamily: 'System',
        textScale: 1,
        radius: 12,
        spacing: 12,
        glassBlur: 14,
        tabBarOpacity: 0.9,
        edgeColor: '#BD00FF',
        edgeSpeedMs: 2600,
        edgeThickness: 3,
        edgeGlowOpacity: 0.4,
        colors: {
          background: '#060606',
          surface: '#141414',
          text: '#F3F3F3',
          mutedText: '#9F9F9F',
          accent: '#BD00FF',
          border: '#262626',
        },
        tabLayout: ['home', 'library', 'dashboard', 'creation', 'settings', 'debug'],
      });

      dashboardModule.useDashboardStore?.setState({
        totalListeningMs: 0,
        totalStreams: 0,
        adsSkipped: 0,
        payoutRatePerStreamUsd: 0.004,
      });

      mixModule.useMixStore?.setState({
        weeklyMix: [],
        lastGenerated: null,
        history: [],
      });

      set({logs: []});
      return 'Runtime stores reset to defaults';
    } catch {
      return 'Runtime reset attempted (some stores may be unavailable)';
    }
  },
}));

export const debugLog = (level: 'info' | 'error', message: string) => {
  useDebugStore.getState().addLog(level, message);
};
