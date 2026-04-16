import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {TabId, useThemeStore} from '../state/themeStore';

const tabs: TabId[] = ['home', 'library', 'dashboard', 'creation', 'settings'];

export function CreationScreen(): React.JSX.Element {
  const appName = useThemeStore(state => state.appName);
  const fontFamily = useThemeStore(state => state.fontFamily);
  const textScale = useThemeStore(state => state.textScale);
  const radius = useThemeStore(state => state.radius);
  const spacing = useThemeStore(state => state.spacing);
  const colors = useThemeStore(state => state.colors);
  const tabLayout = useThemeStore(state => state.tabLayout);
  const setAppName = useThemeStore(state => state.setAppName);
  const setFontFamily = useThemeStore(state => state.setFontFamily);
  const setTextScale = useThemeStore(state => state.setTextScale);
  const setRadius = useThemeStore(state => state.setRadius);
  const setSpacing = useThemeStore(state => state.setSpacing);
  const setColor = useThemeStore(state => state.setColor);
  const setTabLayout = useThemeStore(state => state.setTabLayout);

  const rotateTab = (index: number) => {
    const next = [...tabLayout];
    const swap = (index + 1) % next.length;
    const current = next[index];
    next[index] = next[swap];
    next[swap] = current;
    setTabLayout(next);
  };

  return (
    <ScrollView style={[styles.root, {backgroundColor: colors.background}]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, {color: colors.text}]}>Creation Engine</Text>
      <Text style={[styles.description, {color: colors.mutedText}]}>
        Live editor for global app colors, tab layout, typography, spacing, and style tokens.
      </Text>

      <EditorCard title="Identity & Branding" colors={colors}>
        <TextInput value={appName} onChangeText={setAppName} style={[styles.input, cardInputStyle(colors)]} />
        <Text style={[styles.help, {color: colors.mutedText}]}>
          App name reflects instantly. App icon/app-name package changes can be implemented via Expo config plugins in `app.json`.
        </Text>
      </EditorCard>

      <EditorCard title="Typography" colors={colors}>
        <TextInput value={fontFamily} onChangeText={setFontFamily} style={[styles.input, cardInputStyle(colors)]} />
        <AdjustRow label="Text Scale" value={textScale} onMinus={() => setTextScale(Math.max(0.8, textScale - 0.1))} onPlus={() => setTextScale(Math.min(1.8, textScale + 0.1))} colors={colors} />
      </EditorCard>

      <EditorCard title="Layout Controls" colors={colors}>
        <AdjustRow label="Global Radius" value={radius} onMinus={() => setRadius(Math.max(0, radius - 1))} onPlus={() => setRadius(Math.min(28, radius + 1))} colors={colors} />
        <AdjustRow label="Global Spacing" value={spacing} onMinus={() => setSpacing(Math.max(4, spacing - 1))} onPlus={() => setSpacing(Math.min(32, spacing + 1))} colors={colors} />
      </EditorCard>

      <EditorCard title="Color Tokens" colors={colors}>
        {(Object.keys(colors) as Array<keyof typeof colors>).map(key => (
          <View key={key} style={styles.colorRow}>
            <Text style={[styles.tokenLabel, {color: colors.text}]}>{key}</Text>
            <TextInput value={colors[key]} onChangeText={value => setColor(key, value)} style={[styles.input, styles.tokenInput, cardInputStyle(colors)]} />
          </View>
        ))}
      </EditorCard>

      <EditorCard title="Tab Layout Designer" colors={colors}>
        {tabLayout.map((tab, index) => (
          <Pressable key={tab} style={[styles.tabDesignerRow, {backgroundColor: colors.surface, borderColor: colors.border}]} onPress={() => rotateTab(index)}>
            <Text style={{color: colors.text, fontWeight: '700'}}>{`${index + 1}. ${tab.toUpperCase()}`}</Text>
            <Text style={{color: colors.accent}}>Tap to move</Text>
          </Pressable>
        ))}
        <Text style={[styles.help, {color: colors.mutedText}]}>
          All major UI controls are intentionally editable here so users can craft custom layouts and design systems.
        </Text>
      </EditorCard>

      <EditorCard title="Available Edit Domains" colors={colors}>
        <Text style={[styles.help, {color: colors.mutedText}]}>Color, text styles, font family, spacing, corner radius, tab arrangement, title branding, and more can be extended in this tab.</Text>
        <View style={styles.chipRow}>
          {tabs.map(tab => (
            <View key={tab} style={[styles.chip, {borderColor: colors.border}]}>
              <Text style={{color: colors.accent}}>{tab}</Text>
            </View>
          ))}
        </View>
      </EditorCard>
    </ScrollView>
  );
}

function EditorCard({
  title,
  colors,
  children,
}: {
  title: string;
  colors: {surface: string; border: string; accent: string};
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={[styles.card, {backgroundColor: colors.surface, borderColor: colors.border}]}>
      <Text style={[styles.cardTitle, {color: colors.accent}]}>{title}</Text>
      {children}
    </View>
  );
}

function AdjustRow({
  label,
  value,
  onMinus,
  onPlus,
  colors,
}: {
  label: string;
  value: number;
  onMinus: () => void;
  onPlus: () => void;
  colors: {text: string; border: string; accent: string};
}): React.JSX.Element {
  return (
    <View style={styles.adjustRow}>
      <Text style={{color: colors.text, flex: 1}}>{label}</Text>
      <Pressable style={[styles.adjustButton, {borderColor: colors.border}]} onPress={onMinus}>
        <Text style={{color: colors.text}}>-</Text>
      </Pressable>
      <Text style={{color: colors.accent, minWidth: 40, textAlign: 'center'}}>{value}</Text>
      <Pressable style={[styles.adjustButton, {borderColor: colors.border}]} onPress={onPlus}>
        <Text style={{color: colors.text}}>+</Text>
      </Pressable>
    </View>
  );
}

const cardInputStyle = (colors: {text: string; border: string; surface: string}) => ({
  color: colors.text,
  borderColor: colors.border,
  backgroundColor: colors.surface,
});

const styles = StyleSheet.create({
  root: {flex: 1},
  content: {padding: 12, gap: 12},
  title: {fontSize: 20, fontWeight: '800'},
  description: {marginTop: 4, fontSize: 12, marginBottom: 8},
  card: {borderWidth: 1, borderRadius: 12, padding: 12, gap: 10},
  cardTitle: {fontWeight: '800'},
  input: {borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8},
  help: {fontSize: 12, lineHeight: 18},
  adjustRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  adjustButton: {width: 30, height: 30, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
  colorRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  tokenLabel: {width: 90, fontSize: 12},
  tokenInput: {flex: 1},
  tabDesignerRow: {borderWidth: 1, borderRadius: 10, padding: 10, flexDirection: 'row', justifyContent: 'space-between'},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4},
});
