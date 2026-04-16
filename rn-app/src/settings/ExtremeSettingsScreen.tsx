import React, {useState} from 'react';
import {Linking, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View} from 'react-native';
import {SyncBadge} from '../ui/SyncBadge';
import {useSettingsStore} from '../state/settingsStore';
import {useThemeStore} from '../state/themeStore';

type Props = {
  onOpenSync: () => void;
};

export function ExtremeSettingsScreen({onOpenSync}: Props): React.JSX.Element {
  const colors = useThemeStore(state => state.colors);
  const settingsValues = useSettingsStore(state => state.values);
  const setSettingsValue = useSettingsStore(state => state.setValue);
  const clearCache = useSettingsStore(state => state.clearCache);
  const [eqStatus, setEqStatus] = useState('External EQ idle');

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
    <SafeAreaView style={[styles.root, {backgroundColor: colors.background}]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.pageTitle, {color: colors.text}]}>Extreme Settings</Text>
          <SyncBadge />
        </View>
        <Pressable style={[styles.syncButton, {backgroundColor: colors.accent}]} onPress={onOpenSync}>
          <Text style={styles.syncButtonText}>Sync Account</Text>
        </Pressable>
        <View style={[styles.section, {backgroundColor: colors.surface, borderColor: colors.border}]}>
          <Text style={[styles.sectionTitle, {color: colors.accent}]}>Audio Quality</Text>
          <SwitchRow label="Force 256kbps Opus" value={Boolean(settingsValues['engine.forceOpus256'])} onToggle={enabled => setSettingsValue('engine.forceOpus256', enabled)} colors={colors} />
          <SwitchRow label="Dynamic Normalization" value={Boolean(settingsValues['engine.dynamicNormalization'])} onToggle={enabled => setSettingsValue('engine.dynamicNormalization', enabled)} colors={colors} />
          <SwitchRow label="Silence Skipping" value={Boolean(settingsValues['engine.silenceSkipping'])} onToggle={enabled => setSettingsValue('engine.silenceSkipping', enabled)} colors={colors} />
        </View>
        <View style={[styles.section, {backgroundColor: colors.surface, borderColor: colors.border}]}>
          <Text style={[styles.sectionTitle, {color: colors.accent}]}>Cache + Proxy Controls</Text>
          <SwitchRow label="Proxy Rotation" value={Boolean(settingsValues['mali.proxyRotation'])} onToggle={enabled => setSettingsValue('mali.proxyRotation', enabled)} colors={colors} />
          <SwitchRow label="Data Saver Mode" value={Boolean(settingsValues['mali.dataSaver'])} onToggle={enabled => setSettingsValue('mali.dataSaver', enabled)} colors={colors} />
          <Pressable style={styles.utilityButton} onPress={clearCache}>
            <Text style={styles.utilityButtonText}>Clear cache now</Text>
          </Pressable>
        </View>
        <View style={[styles.section, {backgroundColor: colors.surface, borderColor: colors.border}]}>
          <Text style={[styles.sectionTitle, {color: colors.accent}]}>UI Behavior</Text>
          <SwitchRow label="Pure AMOLED Mode" value={Boolean(settingsValues['canvas.pureAmoled'])} onToggle={enabled => setSettingsValue('canvas.pureAmoled', enabled)} colors={colors} />
          <SwitchRow label="Aggressive Animations" value={Boolean(settingsValues['canvas.motionBoost'])} onToggle={enabled => setSettingsValue('canvas.motionBoost', enabled)} colors={colors} />
          <SwitchRow label="Sticky Mini Player" value={Boolean(settingsValues['ui.stickyMiniPlayer'])} onToggle={enabled => setSettingsValue('ui.stickyMiniPlayer', enabled)} colors={colors} />
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
});
