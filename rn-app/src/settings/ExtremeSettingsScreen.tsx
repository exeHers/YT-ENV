import React, {useState} from 'react';
import {Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {SyncBadge} from '../ui/SyncBadge';
import {useSettingsStore} from '../state/settingsStore';
import {useThemeStore} from '../state/themeStore';

type Props = {
  onOpenSync: () => void;
};

export function ExtremeSettingsScreen({onOpenSync}: Props): React.JSX.Element {
  const colors = useThemeStore(state => state.colors);
  const edgeColor = useThemeStore(state => state.edgeColor);
  const edgeSpeedMs = useThemeStore(state => state.edgeSpeedMs);
  const edgeThickness = useThemeStore(state => state.edgeThickness);
  const edgeGlowOpacity = useThemeStore(state => state.edgeGlowOpacity);
  const setEdgeColor = useThemeStore(state => state.setEdgeColor);
  const setEdgeSpeedMs = useThemeStore(state => state.setEdgeSpeedMs);
  const setEdgeThickness = useThemeStore(state => state.setEdgeThickness);
  const setEdgeGlowOpacity = useThemeStore(state => state.setEdgeGlowOpacity);
  const settingsValues = useSettingsStore(state => state.values);
  const setSettingsValue = useSettingsStore(state => state.setValue);
  const clearCache = useSettingsStore(state => state.clearCache);
  const [eqStatus, setEqStatus] = useState('External EQ idle');
  const [cacheStatus, setCacheStatus] = useState('');
  const insets = useSafeAreaInsets();

  const openExternalEqualizer = async () => {
    if (Platform.OS !== 'android') {
      setEqStatus('External equalizer intent is only supported on Android.');
      return;
    }
    try {
      await Linking.sendIntent('android.media.action.DISPLAY_AUDIO_EFFECT_CONTROL_PANEL', [
        {key: 'android.media.extra.AUDIO_SESSION', value: Number(settingsValues['engine.audioSessionId'] || 0)},
        {key: 'android.media.extra.PACKAGE_NAME', value: 'com.ytenv.app'},
        {key: 'android.media.extra.CONTENT_TYPE', value: 2},
      ]);
      setEqStatus('External equalizer opened.');
    } catch (error) {
      setEqStatus(error instanceof Error ? error.message : 'Unable to open external equalizer.');
    }
  };

  return (
    <SafeAreaView style={[styles.root, {backgroundColor: colors.background, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 4}]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.pageTitle, {color: colors.text}]}>Extreme Settings</Text>
          <SyncBadge />
        </View>
        <Pressable style={[styles.syncButton, {backgroundColor: colors.accent}]} onPress={onOpenSync}>
          <Text style={styles.syncButtonText}>Sync Account</Text>
        </Pressable>
        <View style={[styles.section, {backgroundColor: colors.surface, borderColor: colors.border}]}>
          <Text style={[styles.sectionTitle, {color: colors.accent}]}>API Instance</Text>
          <Text style={[styles.description, {color: colors.mutedText}]}>
            API instance switching is managed in the Debug tab to avoid duplicate controls.
          </Text>
        </View>
        <View style={[styles.section, {backgroundColor: colors.surface, borderColor: colors.border}]}>
          <Text style={[styles.sectionTitle, {color: colors.accent}]}>Audio Quality</Text>
          <SwitchRow label="Force 256kbps Opus" value={Boolean(settingsValues['engine.forceOpus256'])} onToggle={enabled => setSettingsValue('engine.forceOpus256', enabled)} colors={colors} />
          <SwitchRow label="Dynamic Normalization" value={Boolean(settingsValues['engine.dynamicNormalization'])} onToggle={enabled => setSettingsValue('engine.dynamicNormalization', enabled)} colors={colors} />
          <SwitchRow label="Silence Skipping" value={Boolean(settingsValues['engine.silenceSkipping'])} onToggle={enabled => setSettingsValue('engine.silenceSkipping', enabled)} colors={colors} />
          <CycleRow label="Audio Pre-fetch Aggressiveness" value={String(settingsValues['engine.prefetchAggressiveness'] || 'medium')} options={['low', 'medium', 'high']} onCycle={value => setSettingsValue('engine.prefetchAggressiveness', value)} colors={colors} />
        </View>
        <View style={[styles.section, {backgroundColor: colors.surface, borderColor: colors.border}]}>
          <Text style={[styles.sectionTitle, {color: colors.accent}]}>Cache + Proxy Controls</Text>
          <SwitchRow label="Proxy Rotation" value={Boolean(settingsValues['mali.proxyRotation'])} onToggle={enabled => setSettingsValue('mali.proxyRotation', enabled)} colors={colors} />
          <SwitchRow label="Data Saver Mode" value={Boolean(settingsValues['mali.dataSaver'])} onToggle={enabled => setSettingsValue('mali.dataSaver', enabled)} colors={colors} />
          <CycleRow label="Image/Thumbnail Quality" value={String(settingsValues['mali.imageQuality'] || 'high')} options={['low', 'medium', 'high']} onCycle={value => setSettingsValue('mali.imageQuality', value)} colors={colors} />
          <AdjustRow label="Cache Limit (MB)" value={Number(settingsValues['mali.cacheLimitMb'] || 1024)} onMinus={() => setSettingsValue('mali.cacheLimitMb', Math.max(256, Number(settingsValues['mali.cacheLimitMb'] || 1024) - 128))} onPlus={() => setSettingsValue('mali.cacheLimitMb', Math.min(8192, Number(settingsValues['mali.cacheLimitMb'] || 1024) + 128))} colors={colors} />
          <CacheProgress colors={colors} used={Number(settingsValues['mali.storageUsedMb'] || 0)} limit={Number(settingsValues['mali.cacheLimitMb'] || 1024)} />
          <Pressable
            style={styles.utilityButton}
            onPress={() => {
              clearCache();
              setCacheStatus('Cache cleared successfully.');
            }}>
            <Text style={styles.utilityButtonText}>Clear cache now</Text>
          </Pressable>
          {cacheStatus ? <Text style={[styles.description, {color: colors.mutedText}]}>{cacheStatus}</Text> : null}
        </View>
        <View style={[styles.section, {backgroundColor: colors.surface, borderColor: colors.border}]}>
          <Text style={[styles.sectionTitle, {color: colors.accent}]}>UI Behavior</Text>
          <SwitchRow label="Pure AMOLED Mode" value={Boolean(settingsValues['canvas.pureAmoled'])} onToggle={enabled => setSettingsValue('canvas.pureAmoled', enabled)} colors={colors} />
          <SwitchRow label="Aggressive Animations" value={Boolean(settingsValues['canvas.motionBoost'])} onToggle={enabled => setSettingsValue('canvas.motionBoost', enabled)} colors={colors} />
          <SwitchRow label="Sticky Mini Player" value={Boolean(settingsValues['ui.stickyMiniPlayer'])} onToggle={enabled => setSettingsValue('ui.stickyMiniPlayer', enabled)} colors={colors} />
          <SwitchRow label="Ghost Mode (Incognito Listening)" value={Boolean(settingsValues['engine.ghostMode'])} onToggle={enabled => setSettingsValue('engine.ghostMode', enabled)} colors={colors} />
        </View>
        <View style={[styles.section, {backgroundColor: colors.surface, borderColor: colors.border}]}>
          <Text style={[styles.sectionTitle, {color: colors.accent}]}>Edge Light Controller</Text>
          <HexRow label="Color" value={edgeColor} onChange={setEdgeColor} colors={colors} />
          <AdjustRow label="Speed (ms)" value={edgeSpeedMs} onMinus={() => setEdgeSpeedMs(edgeSpeedMs - 150)} onPlus={() => setEdgeSpeedMs(edgeSpeedMs + 150)} colors={colors} />
          <AdjustRow label="Thickness" value={edgeThickness} onMinus={() => setEdgeThickness(edgeThickness - 1)} onPlus={() => setEdgeThickness(edgeThickness + 1)} colors={colors} />
          <AdjustRow label="Pulse x100" value={Math.round(edgeGlowOpacity * 100)} onMinus={() => setEdgeGlowOpacity(edgeGlowOpacity - 0.05)} onPlus={() => setEdgeGlowOpacity(edgeGlowOpacity + 0.05)} colors={colors} />
        </View>
        <View style={[styles.section, {backgroundColor: colors.surface, borderColor: colors.border}]}>
          <Text style={[styles.sectionTitle, {color: colors.accent}]}>External Equalizer</Text>
          <Text style={[styles.description, {color: colors.mutedText}]}>
            Built-in 15-band EQ removed. Opens installed Android system EQ apps (Wavelet, Poweramp EQ, SoundAssistant, etc) via native intent.
          </Text>
          <Pressable style={[styles.syncButton, {backgroundColor: colors.accent}]} onPress={openExternalEqualizer}>
            <Text style={styles.syncButtonText}>Open External Equalizer</Text>
          </Pressable>
          <Text style={[styles.description, {color: colors.mutedText}]}>{eqStatus}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CacheProgress({
  used,
  limit,
  colors,
}: {
  used: number;
  limit: number;
  colors: {border: string; accent: string; mutedText: string};
}): React.JSX.Element {
  const ratio = Math.min(1, used / Math.max(1, limit));
  return (
    <View>
      <Text style={{color: colors.mutedText, fontSize: 12}}>{`${used}MB / ${limit}MB`}</Text>
      <View style={[styles.progressTrack, {borderColor: colors.border}]}>
        <View style={[styles.progressFill, {width: `${ratio * 100}%`, backgroundColor: colors.accent}]} />
      </View>
    </View>
  );
}

function HexRow({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  colors: {text: string; border: string; mutedText: string};
}): React.JSX.Element {
  return (
    <View style={[styles.row, {borderColor: colors.border}]}>
      <View style={styles.textWrap}>
        <Text style={[styles.title, {color: colors.text}]}>{label}</Text>
        <Text style={[styles.description, {color: colors.mutedText}]}>Enter any hex color (e.g. #BD00FF).</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        autoCapitalize="characters"
        style={[styles.hexInput, {color: colors.text, borderColor: colors.border}]}
      />
    </View>
  );
}

function CycleRow({
  label,
  value,
  options,
  onCycle,
  colors,
}: {
  label: string;
  value: string;
  options: string[];
  onCycle: (value: string) => void;
  colors: {text: string; border: string; accent: string; mutedText: string};
}): React.JSX.Element {
  return (
    <Pressable
      style={[styles.row, {borderColor: colors.border}]}
      onPress={() => {
        const index = options.findIndex(item => item === value);
        const next = options[(index + 1) % options.length];
        onCycle(next);
      }}>
      <View style={styles.textWrap}>
        <Text style={[styles.title, {color: colors.text}]}>{label}</Text>
        <Text style={[styles.description, {color: colors.mutedText}]}>Tap to cycle options.</Text>
      </View>
      <Text style={{color: colors.accent}}>{value}</Text>
    </Pressable>
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
  colors: {text: string; mutedText: string; border: string; accent: string};
}): React.JSX.Element {
  return (
    <View style={[styles.row, {borderColor: colors.border}]}>
      <View style={styles.textWrap}>
        <Text style={[styles.title, {color: colors.text}]}>{label}</Text>
        <Text style={[styles.description, {color: colors.mutedText}]}>Adjust value live.</Text>
      </View>
      <View style={styles.adjustRow}>
        <Pressable style={[styles.adjustBtn, {borderColor: colors.border}]} onPress={onMinus}>
          <Text style={{color: colors.text}}>-</Text>
        </Pressable>
        <Text style={{color: colors.accent, minWidth: 56, textAlign: 'center'}}>{value}</Text>
        <Pressable style={[styles.adjustBtn, {borderColor: colors.border}]} onPress={onPlus}>
          <Text style={{color: colors.text}}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SwitchRow({
  label,
  value,
  onToggle,
  colors,
}: {
  label: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  colors: {text: string; mutedText: string; border: string};
}): React.JSX.Element {
  return (
    <View style={[styles.row, {borderColor: colors.border}]}>
      <View style={styles.textWrap}>
        <Text style={[styles.title, {color: colors.text}]}>{label}</Text>
        <Text style={[styles.description, {color: colors.mutedText}]}>Enable or disable this behavior globally.</Text>
      </View>
      <Switch value={value} onValueChange={onToggle} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  content: {padding: 16, gap: 16},
  headerRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  pageTitle: {fontSize: 20, fontWeight: '800'},
  syncButton: {borderRadius: 10, paddingVertical: 10, alignItems: 'center'},
  syncButtonText: {color: '#FFFFFF', fontWeight: '700'},
  section: {borderRadius: 16, padding: 12, gap: 10, borderWidth: 1},
  sectionTitle: {fontSize: 18, fontWeight: '700'},
  row: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  textWrap: {flex: 1},
  title: {fontSize: 15, fontWeight: '600'},
  description: {marginTop: 4, fontSize: 12},
  utilityButton: {backgroundColor: '#262626', borderRadius: 10, paddingVertical: 10, alignItems: 'center'},
  utilityButtonText: {color: '#E7E7E7', fontWeight: '700'},
  progressTrack: {marginTop: 6, height: 9, borderWidth: 1, borderRadius: 999, overflow: 'hidden'},
  progressFill: {height: '100%'},
  adjustRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  adjustBtn: {width: 28, height: 28, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
  hexInput: {
    width: 110,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});
