import React, {useMemo, useState} from 'react';
import {Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {TabId, useThemeStore} from '../state/themeStore';
import {useSettingsStore} from '../state/settingsStore';

const tabs: TabId[] = ['home', 'library', 'dashboard', 'creation', 'settings', 'debug'];
type ToolboxBlock = 'hero' | 'cards' | 'miniPlayer' | 'stats';
type EditorPanel = 'quick' | 'colors' | 'layout' | 'typography' | 'edge';

const panelLabels: Array<{id: EditorPanel; label: string}> = [
  {id: 'quick', label: 'Quick'},
  {id: 'colors', label: 'Colors'},
  {id: 'layout', label: 'Layout'},
  {id: 'typography', label: 'Type'},
  {id: 'edge', label: 'Edge'},
];

export function CreationScreen(): React.JSX.Element {
  const appName = useThemeStore(state => state.appName);
  const appLogoUri = useThemeStore(state => state.appLogoUri);
  const fontFamily = useThemeStore(state => state.fontFamily);
  const textScale = useThemeStore(state => state.textScale);
  const radius = useThemeStore(state => state.radius);
  const spacing = useThemeStore(state => state.spacing);
  const colors = useThemeStore(state => state.colors);
  const tabLayout = useThemeStore(state => state.tabLayout);
  const glassBlur = useThemeStore(state => state.glassBlur);
  const tabBarOpacity = useThemeStore(state => state.tabBarOpacity);
  const setAppName = useThemeStore(state => state.setAppName);
  const setAppLogoUri = useThemeStore(state => state.setAppLogoUri);
  const setFontFamily = useThemeStore(state => state.setFontFamily);
  const setTextScale = useThemeStore(state => state.setTextScale);
  const setRadius = useThemeStore(state => state.setRadius);
  const setSpacing = useThemeStore(state => state.setSpacing);
  const setColor = useThemeStore(state => state.setColor);
  const setTabLayout = useThemeStore(state => state.setTabLayout);
  const setGlassBlur = useThemeStore(state => state.setGlassBlur);
  const setTabBarOpacity = useThemeStore(state => state.setTabBarOpacity);
  const edgeColor = useThemeStore(state => state.edgeColor);
  const edgeSpeedMs = useThemeStore(state => state.edgeSpeedMs);
  const edgeThickness = useThemeStore(state => state.edgeThickness);
  const edgeGlowOpacity = useThemeStore(state => state.edgeGlowOpacity);
  const setEdgeColor = useThemeStore(state => state.setEdgeColor);
  const setEdgeSpeedMs = useThemeStore(state => state.setEdgeSpeedMs);
  const setEdgeThickness = useThemeStore(state => state.setEdgeThickness);
  const setEdgeGlowOpacity = useThemeStore(state => state.setEdgeGlowOpacity);
  const resetTheme = useThemeStore(state => state.resetTheme);
  const bumpUiRevision = useThemeStore(state => state.bumpUiRevision);
  const settingsValues = useSettingsStore(state => state.values);
  const setSettingsValue = useSettingsStore(state => state.setValue);
  const [activePanel, setActivePanel] = useState<EditorPanel>('quick');
  const [previewBlocks, setPreviewBlocks] = useState<Record<ToolboxBlock, boolean>>({
    hero: true,
    cards: true,
    miniPlayer: true,
    stats: true,
  });
  const [blockOrder, setBlockOrder] = useState<ToolboxBlock[]>(['hero', 'cards', 'stats', 'miniPlayer']);
  const [previewRotateX, setPreviewRotateX] = useState(0);
  const [previewRotateY, setPreviewRotateY] = useState(0);
  const [previewScale, setPreviewScale] = useState(1);

  const rotateTab = (index: number) => {
    const next = [...tabLayout];
    const swap = (index + 1) % next.length;
    const current = next[index];
    next[index] = next[swap];
    next[swap] = current;
    setTabLayout(next);
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= blockOrder.length) return;
    const next = [...blockOrder];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setBlockOrder(next);
  };

  const previewAccentSoft = useMemo(() => `${colors.accent}33`, [colors.accent]);

  const applyQuickPreset = (preset: 'midnight' | 'neon' | 'slate') => {
    if (preset === 'midnight') {
      setColor('background', '#060606');
      setColor('surface', '#141414');
      setColor('text', '#F3F3F3');
      setColor('mutedText', '#9F9F9F');
      setColor('accent', '#BD00FF');
      setColor('border', '#262626');
      return;
    }
    if (preset === 'neon') {
      setColor('background', '#03050A');
      setColor('surface', '#101726');
      setColor('text', '#F6FAFF');
      setColor('mutedText', '#9CB4D4');
      setColor('accent', '#00D1FF');
      setColor('border', '#204772');
      return;
    }
    setColor('background', '#111315');
    setColor('surface', '#1A1D20');
    setColor('text', '#ECEEEF');
    setColor('mutedText', '#9AA0A6');
    setColor('accent', '#7C8CFF');
    setColor('border', '#2A3038');
  };

  const saveAndApply = () => {
    bumpUiRevision();
    Alert.alert('Design applied', 'Theme is live now. No app restart required.');
  };

  return (
    <ScrollView style={[styles.root, {backgroundColor: colors.background}]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, {color: colors.text}]}>Creation Engine</Text>
      <Text style={[styles.description, {color: colors.mutedText}]}>
        Live 3D editor + toolbox. Tune the interface visually, then apply across the app instantly.
      </Text>

      <View style={styles.panelTabs}>
        {panelLabels.map(panel => (
          <Pressable
            key={panel.id}
            onPress={() => setActivePanel(panel.id)}
            style={[
              styles.panelTab,
              {
                borderColor: colors.border,
                backgroundColor: activePanel === panel.id ? previewAccentSoft : colors.surface,
              },
            ]}>
            <Text style={{color: activePanel === panel.id ? colors.accent : colors.mutedText, fontWeight: '700'}}>
              {panel.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <EditorCard title="Live Preview Stage" colors={colors}>
        <View
          style={[
            styles.previewShell,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius + 8,
              transform: [
                {perspective: 900},
                {rotateX: `${previewRotateX}deg`},
                {rotateY: `${previewRotateY}deg`},
                {scale: previewScale},
              ],
            },
          ]}>
          <View
            style={[
              styles.previewCanvas,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                borderRadius: radius,
              },
            ]}>
            <View style={styles.previewTop}>
              <Text style={[styles.previewTitle, {color: colors.text}]}>{appName}</Text>
              <Text style={[styles.previewBadge, {color: colors.accent}]}>Live</Text>
            </View>
            <View style={[styles.previewProfileRow, {borderColor: colors.border, borderRadius: Math.max(8, radius - 2)}]}>
              <Text style={{color: colors.text, fontWeight: '700'}}>Profile</Text>
              <Text style={{color: colors.mutedText, fontSize: 11}}>Primary account session</Text>
            </View>
            <View style={[styles.previewSearch, {borderColor: colors.border, borderRadius: Math.max(8, radius - 2)}]}>
              <Text style={{color: colors.mutedText, fontSize: 11}}>Search any song with Piped</Text>
            </View>
            {blockOrder.map(block => {
              if (!previewBlocks[block]) return null;
              if (block === 'hero') {
                return (
                  <View
                    key={block}
                    style={[
                      styles.previewHero,
                      {
                        borderColor: colors.border,
                        backgroundColor: previewAccentSoft,
                        borderRadius: radius,
                        marginBottom: spacing / 2,
                      },
                    ]}>
                    <Text style={{color: colors.text, fontWeight: '800'}}>Weekly Vibe Mix</Text>
                    <Text style={{color: colors.mutedText, marginTop: 2, fontSize: 12}}>Drag style tools, see result instantly</Text>
                  </View>
                );
              }
              if (block === 'cards') {
                return (
                  <View key={block} style={[styles.previewRow, {marginBottom: spacing / 2}]}>
                    {[0, 1, 2].map(card => (
                      <View
                        key={`${block}-${card}`}
                        style={[
                          styles.previewCard,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            borderRadius: Math.max(8, radius - 2),
                          },
                        ]}
                      />
                    ))}
                  </View>
                );
              }
              if (block === 'stats') {
                return (
                  <View
                    key={block}
                    style={[
                      styles.previewStat,
                      {
                        borderColor: colors.border,
                        borderRadius: radius,
                        marginBottom: spacing / 2,
                      },
                    ]}>
                    <Text style={{color: colors.mutedText, fontSize: 12}}>Money Owed to Artists</Text>
                    <Text style={{color: colors.text, fontWeight: '800', marginTop: 4}}>$12.48</Text>
                  </View>
                );
              }
              return (
                <View
                  key={block}
                  style={[
                    styles.previewMini,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radius,
                      marginBottom: spacing / 2,
                    },
                  ]}>
                  <View style={[styles.previewDot, {backgroundColor: colors.accent}]} />
                  <Text style={{color: colors.text, fontWeight: '700'}}>Now Playing</Text>
                </View>
              );
            })}
            <View style={[styles.previewTabs, {borderTopColor: colors.border, opacity: tabBarOpacity}]}>
              {tabLayout.slice(0, 4).map(tab => (
                <Text key={tab} style={{color: colors.mutedText, fontSize: 11}}>
                  {tab.toUpperCase()}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </EditorCard>

      <EditorCard title="Live 3D Studio Controls" colors={colors}>
        <AdjustRow
          label="Rotate X"
          value={previewRotateX}
          onMinus={() => setPreviewRotateX(Math.max(-45, previewRotateX - 2))}
          onPlus={() => setPreviewRotateX(Math.min(45, previewRotateX + 2))}
          colors={colors}
        />
        <AdjustRow
          label="Rotate Y"
          value={previewRotateY}
          onMinus={() => setPreviewRotateY(Math.max(-45, previewRotateY - 2))}
          onPlus={() => setPreviewRotateY(Math.min(45, previewRotateY + 2))}
          colors={colors}
        />
        <AdjustRow
          label="Preview Scale x100"
          value={Math.round(previewScale * 100)}
          onMinus={() => setPreviewScale(Math.max(0.7, Number((previewScale - 0.05).toFixed(2))))}
          onPlus={() => setPreviewScale(Math.min(1.3, Number((previewScale + 0.05).toFixed(2))))}
          colors={colors}
        />
      </EditorCard>

      <EditorCard title="Customization Toolbox" colors={colors}>
        <Text style={[styles.help, {color: colors.mutedText}]}>
          Toggle preview blocks and move them up/down to simulate drag-and-drop layout edits.
        </Text>
        {blockOrder.map((block, index) => (
          <View key={block} style={[styles.toolboxRow, {borderColor: colors.border, borderRadius: radius}]}>
            <Pressable
              onPress={() => setPreviewBlocks(state => ({...state, [block]: !state[block]}))}
              style={[styles.toolboxToggle, {borderColor: colors.border}]}>
              <Text style={{color: previewBlocks[block] ? colors.accent : colors.mutedText, fontWeight: '700'}}>
                {previewBlocks[block] ? 'ON' : 'OFF'}
              </Text>
            </Pressable>
            <Text style={{color: colors.text, flex: 1, textTransform: 'capitalize'}}>
              {block === 'miniPlayer' ? 'Mini Player' : block}
            </Text>
            <View style={styles.toolboxMove}>
              <Pressable onPress={() => moveBlock(index, -1)} style={[styles.moveBtn, {borderColor: colors.border}]}>
                <Text style={{color: colors.text}}>^</Text>
              </Pressable>
              <Pressable onPress={() => moveBlock(index, 1)} style={[styles.moveBtn, {borderColor: colors.border}]}>
                <Text style={{color: colors.text}}>v</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </EditorCard>

      {activePanel === 'quick' ? (
        <EditorCard title="Quick Actions" colors={colors}>
          <TextInput value={appName} onChangeText={setAppName} style={[styles.input, cardInputStyle(colors)]} placeholder="App Name" placeholderTextColor={colors.mutedText} />
          <TextInput
            value={appLogoUri}
            onChangeText={setAppLogoUri}
            style={[styles.input, cardInputStyle(colors)]}
            placeholder="Live app logo URL"
            placeholderTextColor={colors.mutedText}
          />
          <TextInput
            value={String(settingsValues['branding.buildAppName'] || 'YT ENV')}
            onChangeText={value => setSettingsValue('branding.buildAppName', value)}
            style={[styles.input, cardInputStyle(colors)]}
            placeholder="Build launcher/app store name"
            placeholderTextColor={colors.mutedText}
          />
          <TextInput
            value={String(settingsValues['branding.buildIconPath'] || './assets/image_4.png')}
            onChangeText={value => setSettingsValue('branding.buildIconPath', value)}
            style={[styles.input, cardInputStyle(colors)]}
            placeholder="Build icon path (expo app.json)"
            placeholderTextColor={colors.mutedText}
          />
          <View style={styles.presetRow}>
            <Pressable style={[styles.presetBtn, {borderColor: colors.border}]} onPress={() => applyQuickPreset('midnight')}>
              <Text style={{color: colors.text}}>Midnight</Text>
            </Pressable>
            <Pressable style={[styles.presetBtn, {borderColor: colors.border}]} onPress={() => applyQuickPreset('neon')}>
              <Text style={{color: colors.text}}>Neon</Text>
            </Pressable>
            <Pressable style={[styles.presetBtn, {borderColor: colors.border}]} onPress={() => applyQuickPreset('slate')}>
              <Text style={{color: colors.text}}>Slate</Text>
            </Pressable>
          </View>
          <Text style={[styles.help, {color: colors.mutedText}]}>
            Build name/icon values are editable here. Launcher icon/name still apply when you rebuild from Expo config (`app.json`).
          </Text>
        </EditorCard>
      ) : null}

      {activePanel === 'colors' ? (
        <EditorCard title="Color Studio" colors={colors}>
          {(Object.keys(colors) as Array<keyof typeof colors>).map(key => (
            <View key={key} style={styles.colorRow}>
              <Text style={[styles.tokenLabel, {color: colors.text}]}>{key}</Text>
              <TextInput value={colors[key]} onChangeText={value => setColor(key, value)} style={[styles.input, styles.tokenInput, cardInputStyle(colors)]} />
            </View>
          ))}
        </EditorCard>
      ) : null}

      {activePanel === 'layout' ? (
        <EditorCard title="Layout Controls" colors={colors}>
          <AdjustRow label="Global Radius" value={radius} onMinus={() => setRadius(Math.max(0, radius - 1))} onPlus={() => setRadius(Math.min(28, radius + 1))} colors={colors} />
          <AdjustRow label="Global Spacing" value={spacing} onMinus={() => setSpacing(Math.max(4, spacing - 1))} onPlus={() => setSpacing(Math.min(32, spacing + 1))} colors={colors} />
          <AdjustRow label="Glass Blur Intensity" value={glassBlur} onMinus={() => setGlassBlur(Math.max(0, glassBlur - 1))} onPlus={() => setGlassBlur(Math.min(40, glassBlur + 1))} colors={colors} />
          <AdjustRow label="Tab Transparency" value={Number(tabBarOpacity.toFixed(2))} onMinus={() => setTabBarOpacity(Math.max(0.2, Number((tabBarOpacity - 0.05).toFixed(2))))} onPlus={() => setTabBarOpacity(Math.min(1, Number((tabBarOpacity + 0.05).toFixed(2))))} colors={colors} />
          {tabLayout.map((tab, index) => (
            <Pressable key={tab} style={[styles.tabDesignerRow, {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius}]} onPress={() => rotateTab(index)}>
              <Text style={{color: colors.text, fontWeight: '700'}}>{`${index + 1}. ${tab.toUpperCase()}`}</Text>
              <Text style={{color: colors.accent}}>Move</Text>
            </Pressable>
          ))}
        </EditorCard>
      ) : null}

      {activePanel === 'typography' ? (
        <EditorCard title="Typography Controls" colors={colors}>
          <TextInput value={fontFamily} onChangeText={setFontFamily} style={[styles.input, cardInputStyle(colors)]} />
          <AdjustRow label="Text Scale" value={textScale} onMinus={() => setTextScale(Math.max(0.8, textScale - 0.1))} onPlus={() => setTextScale(Math.min(1.8, textScale + 0.1))} colors={colors} />
        </EditorCard>
      ) : null}

      {activePanel === 'edge' ? (
        <EditorCard title="Edge Lighting Controls" colors={colors}>
          <View style={styles.colorRow}>
            <Text style={[styles.tokenLabel, {color: colors.text}]}>edgeColor</Text>
            <TextInput value={edgeColor} onChangeText={setEdgeColor} style={[styles.input, styles.tokenInput, cardInputStyle(colors)]} />
          </View>
          <AdjustRow label="Edge Speed (ms)" value={edgeSpeedMs} onMinus={() => setEdgeSpeedMs(edgeSpeedMs - 150)} onPlus={() => setEdgeSpeedMs(edgeSpeedMs + 150)} colors={colors} />
          <AdjustRow label="Edge Thickness" value={edgeThickness} onMinus={() => setEdgeThickness(edgeThickness - 1)} onPlus={() => setEdgeThickness(edgeThickness + 1)} colors={colors} />
          <AdjustRow label="Edge Glow x100" value={Math.round(edgeGlowOpacity * 100)} onMinus={() => setEdgeGlowOpacity(edgeGlowOpacity - 0.05)} onPlus={() => setEdgeGlowOpacity(edgeGlowOpacity + 0.05)} colors={colors} />
        </EditorCard>
      ) : null}

      <EditorCard title="Domains Enabled" colors={colors}>
        <Text style={[styles.help, {color: colors.mutedText}]}>Home, Library, Dashboard, Creation, Settings, and Debug are all included in the active theme graph.</Text>
        <View style={styles.chipRow}>
          {tabs.map(tab => (
            <View key={tab} style={[styles.chip, {borderColor: colors.border}]}>
              <Text style={{color: colors.accent}}>{tab}</Text>
            </View>
          ))}
        </View>
        <Pressable style={[styles.saveButton, {backgroundColor: colors.accent, borderRadius: radius}]} onPress={saveAndApply}>
          <Text style={styles.saveButtonText}>Apply Live Theme</Text>
        </Pressable>
        <Pressable
          style={[styles.resetButton, {borderColor: colors.border, borderRadius: radius}]}
          onPress={() => {
            resetTheme();
            Alert.alert('Theme reset', 'Default design restored.');
          }}>
          <Text style={[styles.resetButtonText, {color: colors.text}]}>Reset to Default Theme</Text>
        </Pressable>
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
  panelTabs: {flexDirection: 'row', gap: 8, flexWrap: 'wrap'},
  panelTab: {borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6},
  card: {borderWidth: 1, borderRadius: 12, padding: 12, gap: 10},
  cardTitle: {fontWeight: '800'},
  input: {borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8},
  help: {fontSize: 12, lineHeight: 18},
  previewShell: {
    borderWidth: 1,
    padding: 10,
  },
  previewCanvas: {borderWidth: 1, padding: 10},
  previewTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10},
  previewProfileRow: {borderWidth: 1, padding: 8, marginBottom: 8},
  previewSearch: {borderWidth: 1, padding: 8, marginBottom: 8},
  previewTitle: {fontWeight: '800'},
  previewBadge: {fontWeight: '700', fontSize: 12},
  previewHero: {borderWidth: 1, padding: 10},
  previewRow: {flexDirection: 'row', gap: 8},
  previewCard: {height: 60, flex: 1, borderWidth: 1},
  previewStat: {borderWidth: 1, padding: 10},
  previewMini: {borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8},
  previewDot: {width: 8, height: 8, borderRadius: 999},
  previewTabs: {borderTopWidth: 1, marginTop: 8, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between'},
  toolboxRow: {borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10},
  toolboxToggle: {borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6},
  toolboxMove: {flexDirection: 'row', gap: 6},
  moveBtn: {borderWidth: 1, borderRadius: 8, width: 28, height: 28, alignItems: 'center', justifyContent: 'center'},
  presetRow: {flexDirection: 'row', gap: 8},
  presetBtn: {borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8},
  adjustRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  adjustButton: {width: 30, height: 30, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
  colorRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  tokenLabel: {width: 90, fontSize: 12},
  tokenInput: {flex: 1},
  tabDesignerRow: {borderWidth: 1, borderRadius: 10, padding: 10, flexDirection: 'row', justifyContent: 'space-between'},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4},
  saveButton: {marginTop: 8, paddingVertical: 12, alignItems: 'center'},
  saveButtonText: {color: '#FFFFFF', fontWeight: '800'},
  resetButton: {marginTop: 8, borderWidth: 1, paddingVertical: 12, alignItems: 'center'},
  resetButtonText: {fontWeight: '700'},
});
