import {create} from 'zustand';

export type TabId = 'home' | 'library' | 'dashboard' | 'creation' | 'settings' | 'debug';

type ThemeState = {
  appName: string;
  appLogoUri: string;
  fontFamily: string;
  textScale: number;
  radius: number;
  spacing: number;
  glassBlur: number;
  tabBarOpacity: number;
  edgeColor: string;
  edgeSpeedMs: number;
  edgeThickness: number;
  edgeGlowOpacity: number;
  colors: {
    background: string;
    surface: string;
    text: string;
    mutedText: string;
    accent: string;
    border: string;
  };
  tabLayout: TabId[];
  setAppName: (name: string) => void;
  setAppLogoUri: (uri: string) => void;
  setFontFamily: (font: string) => void;
  setTextScale: (scale: number) => void;
  setRadius: (radius: number) => void;
  setSpacing: (spacing: number) => void;
  setColor: (key: keyof ThemeState['colors'], value: string) => void;
  setTabLayout: (layout: TabId[]) => void;
  setGlassBlur: (value: number) => void;
  setTabBarOpacity: (value: number) => void;
  setEdgeColor: (value: string) => void;
  setEdgeSpeedMs: (value: number) => void;
  setEdgeThickness: (value: number) => void;
  setEdgeGlowOpacity: (value: number) => void;
  resetTheme: () => void;
  uiRevision: number;
  bumpUiRevision: () => void;
};

const defaultLayout: TabId[] = ['home', 'library', 'dashboard', 'creation', 'settings', 'debug'];
const defaultColors = {
  background: '#05070D',
  surface: '#101726',
  text: '#F6FAFF',
  mutedText: '#9CB4D4',
  accent: '#00D1FF',
  border: '#204772',
} as const;

export const useThemeStore = create<ThemeState>(set => ({
  appName: 'YT ENV Music',
  appLogoUri: 'https://picsum.photos/seed/ytenv-logo/128/128',
  fontFamily: 'System',
  textScale: 1,
  radius: 14,
  spacing: 12,
  glassBlur: 14,
  tabBarOpacity: 0.94,
  edgeColor: '#00D1FF',
  edgeSpeedMs: 2600,
  edgeThickness: 3,
  edgeGlowOpacity: 0.4,
  uiRevision: 0,
  colors: defaultColors,
  tabLayout: defaultLayout,
  setAppName: appName => set({appName}),
  setAppLogoUri: appLogoUri => set({appLogoUri}),
  setFontFamily: fontFamily => set({fontFamily}),
  setTextScale: textScale => set({textScale}),
  setRadius: radius => set({radius}),
  setSpacing: spacing => set({spacing}),
  setColor: (key, value) =>
    set(state => ({
      colors: {
        ...state.colors,
        [key]: value,
      },
    })),
  setTabLayout: tabLayout =>
    set({
      tabLayout: tabLayout.length === defaultLayout.length ? tabLayout : defaultLayout,
    }),
  setGlassBlur: glassBlur => set({glassBlur}),
  setTabBarOpacity: tabBarOpacity => set({tabBarOpacity}),
  setEdgeColor: edgeColor => set({edgeColor}),
  setEdgeSpeedMs: edgeSpeedMs => set({edgeSpeedMs: Math.max(1200, edgeSpeedMs)}),
  setEdgeThickness: edgeThickness => set({edgeThickness: Math.max(1, edgeThickness)}),
  setEdgeGlowOpacity: edgeGlowOpacity => set({edgeGlowOpacity: Math.min(1, Math.max(0.1, edgeGlowOpacity))}),
  resetTheme: () =>
    set({
      appName: 'YT ENV Music',
      appLogoUri: 'https://picsum.photos/seed/ytenv-logo/128/128',
      fontFamily: 'System',
      textScale: 1,
      radius: 14,
      spacing: 12,
      glassBlur: 14,
      tabBarOpacity: 0.94,
      edgeColor: '#00D1FF',
      edgeSpeedMs: 2600,
      edgeThickness: 3,
      edgeGlowOpacity: 0.4,
      colors: defaultColors,
      tabLayout: defaultLayout,
      uiRevision: 0,
    }),
  bumpUiRevision: () => set(state => ({uiRevision: state.uiRevision + 1})),
}));
