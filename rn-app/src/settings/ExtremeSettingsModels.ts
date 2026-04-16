export type SettingsCategoryId = 'engine' | 'canvas' | 'mali' | 'connect';

export type SettingItem =
  | {
      type: 'switch';
      key: string;
      title: string;
      description: string;
      enabled: boolean;
    }
  | {
      type: 'range';
      key: string;
      title: string;
      description: string;
      min: number;
      max: number;
      step: number;
      value: number;
      unit?: string;
    }
  | {
      type: 'select';
      key: string;
      title: string;
      description: string;
      value: string;
      options: Array<{label: string; value: string}>;
    }
  | {
      type: 'action';
      key: string;
      title: string;
      description: string;
    }
  | {
      type: 'color';
      key: string;
      title: string;
      description: string;
      value: string;
    };

export type SettingsCategory = {
  id: SettingsCategoryId;
  title: string;
  items: SettingItem[];
};

export function createDefaultExtremeSettings(): SettingsCategory[] {
  return [
    {
      id: 'engine',
      title: 'Engine',
      items: [
        {
          type: 'action',
          key: 'engine.openEqModule',
          title: '15-Band Parametric EQ',
          description: 'Open modular EQ plugin and manage presets.',
        },
        {type: 'range', key: 'engine.crossfadeSec', title: 'Crossfade', description: 'Blend tracks during transitions.', min: 0, max: 10, step: 1, value: 0, unit: 's'},
        {type: 'switch', key: 'engine.silenceSkipping', title: 'Silence Skipping', description: 'Skip detected silent sections.', enabled: false},
        {type: 'switch', key: 'engine.dynamicNormalization', title: 'Dynamic Normalization', description: 'Adaptive loudness balancing.', enabled: true},
        {type: 'switch', key: 'engine.forceOpus256', title: 'Force 256kbps Opus', description: 'Prefer high-quality audio-only streams.', enabled: false},
      ],
    },
    {
      id: 'canvas',
      title: 'Canvas',
      items: [
        {type: 'color', key: 'canvas.accentHex', title: 'Accent Color', description: 'Primary neon accent in hex.', value: '#BD00FF'},
        {type: 'range', key: 'canvas.cornerRadius', title: 'Corner Radius', description: 'Global UI corner softness.', min: 0, max: 28, step: 1, value: 14, unit: 'px'},
        {type: 'range', key: 'canvas.glassOpacity', title: 'Glass Opacity', description: 'Glassmorphism translucency strength.', min: 0, max: 100, step: 1, value: 22, unit: '%'},
        {type: 'select', key: 'canvas.font', title: 'Font Selection', description: 'Switch interface typeface.', value: 'Inter', options: [{label: 'Inter', value: 'Inter'}, {label: 'Mono', value: 'Mono'}]},
        {
          type: 'switch',
          key: 'canvas.pureAmoled',
          title: 'Pure Amoled',
          description: 'True black base with neon accent palette.',
          enabled: true,
        },
        {
          type: 'select',
          key: 'canvas.refreshRate',
          title: 'UI Refresh Rate',
          description: 'Lock UI frame pacing for A73 smoothness.',
          value: '120',
          options: [
            {label: '60Hz', value: '60'},
            {label: '120Hz', value: '120'},
          ],
        },
      ],
    },
    {
      id: 'mali',
      title: 'Mali',
      items: [
        {type: 'action', key: 'mali.dataSavedCounter', title: 'Data Saved Counter', description: 'Tracks MB saved by stripping video streams.'},
        {
          type: 'action',
          key: 'mali.clearCache',
          title: 'Clear Cache',
          description: 'Purge local artwork, media chunks, and temp data.',
        },
        {type: 'switch', key: 'mali.proxyRotation', title: 'Proxy/Instance Rotation', description: 'Rotate through healthy instances.', enabled: false},
        {type: 'select', key: 'mali.instance', title: 'Preferred Instance', description: 'Pin a primary sync endpoint.', value: 'auto', options: [{label: 'Auto', value: 'auto'}, {label: 'Primary', value: 'primary'}, {label: 'Fallback', value: 'fallback'}]},
      ],
    },
    {
      id: 'connect',
      title: 'Connect',
      items: [
        {type: 'switch', key: 'connect.lastfm', title: 'Last.fm Hook', description: 'Enable scrobble integration.', enabled: false},
        {type: 'switch', key: 'connect.genius', title: 'Genius/Musixmatch Hook', description: 'Enable external lyrics provider hooks.', enabled: false},
        {type: 'switch', key: 'connect.discordRichPresence', title: 'Discord Rich Presence', description: 'Broadcast playback status.', enabled: false},
      ],
    },
  ];
}
