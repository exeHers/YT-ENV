import {create} from 'zustand';

export type SettingsMap = Record<string, string | number | boolean>;

const defaults: SettingsMap = {
  'engine.crossfadeSec': 0,
  'engine.silenceSkipping': false,
  'engine.dynamicNormalization': true,
  'engine.forceOpus256': false,
  'engine.eqEnabled': true,
  'canvas.accentHex': '#BD00FF',
  'canvas.cornerRadius': 14,
  'canvas.glassOpacity': 0.22,
  'canvas.font': 'Inter',
  'canvas.pureAmoled': true,
  'canvas.refreshRate': 120,
  'mali.dataSavedMb': 0,
  'mali.cacheSizeMb': 512,
  'mali.proxyRotation': false,
  'mali.instance': 'auto',
  'connect.lastfm': false,
  'connect.genius': false,
  'connect.discordRichPresence': false,
};

type SettingsState = {
  values: SettingsMap;
  setValue: (key: string, value: string | number | boolean) => void;
  incrementDataSaved: (mb: number) => void;
  clearCache: () => void;
  exportEnv: () => string;
  importEnv: (content: string) => void;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  values: defaults,
  setValue: (key, value) =>
    set(state => ({
      values: {
        ...state.values,
        [key]: value,
      },
    })),
  incrementDataSaved: mb =>
    set(state => ({
      values: {
        ...state.values,
        'mali.dataSavedMb': Number(state.values['mali.dataSavedMb']) + mb,
      },
    })),
  clearCache: () =>
    set(state => ({
      values: {
        ...state.values,
        'mali.cacheSizeMb': 0,
      },
    })),
  exportEnv: () => {
    const entries = Object.entries(get().values).map(([key, value]) => `${key}=${String(value)}`);
    return entries.join('\n');
  },
  importEnv: content => {
    const next: SettingsMap = {...get().values};
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const [key, ...rest] = line.split('=');
      const valueRaw = rest.join('=').trim();
      if (valueRaw === 'true' || valueRaw === 'false') {
        next[key.trim()] = valueRaw === 'true';
      } else if (!Number.isNaN(Number(valueRaw))) {
        next[key.trim()] = Number(valueRaw);
      } else {
        next[key.trim()] = valueRaw;
      }
    }
    set({values: next});
  },
}));
