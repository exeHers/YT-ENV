import {create} from 'zustand';

export type TabId = 'home' | 'library' | 'dashboard' | 'creation' | 'settings';

type ThemeState = {
  appName: string;
  fontFamily: string;
  textScale: number;
  radius: number;
  spacing: number;
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
  setFontFamily: (font: string) => void;
  setTextScale: (scale: number) => void;
  setRadius: (radius: number) => void;
  setSpacing: (spacing: number) => void;
  setColor: (key: keyof ThemeState['colors'], value: string) => void;
  setTabLayout: (layout: TabId[]) => void;
};

const defaultLayout: TabId[] = ['home', 'library', 'dashboard', 'creation', 'settings'];

export const useThemeStore = create<ThemeState>(set => ({
  appName: 'YT ENV',
  fontFamily: 'System',
  textScale: 1,
  radius: 12,
  spacing: 12,
  colors: {
    background: '#060606',
    surface: '#141414',
    text: '#F3F3F3',
    mutedText: '#9F9F9F',
    accent: '#BD00FF',
    border: '#262626',
  },
  tabLayout: defaultLayout,
  setAppName: appName => set({appName}),
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
}));
