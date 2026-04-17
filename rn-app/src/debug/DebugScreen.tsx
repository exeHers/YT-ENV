import React, {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useDebugStore} from '../state/debugStore';
import {useSettingsStore} from '../state/settingsStore';
import {useThemeStore} from '../state/themeStore';
import {useDashboardStore} from '../state/dashboardStore';
import {useMixStore} from '../state/mixStore';

export function DebugScreen(): React.JSX.Element {
  const colors = useThemeStore(state => state.colors);
  const logs = useDebugStore(state => state.logs);
  const instances = useDebugStore(state => state.instances);
  const currentInstance = useDebugStore(state => state.currentInstance);
  const setInstance = useDebugStore(state => state.setInstance);
  const clearLogs = useDebugStore(state => state.clearLogs);
  const wipeMmkv = useDebugStore(state => state.wipeMmkv);
  const resetRuntimeState = useDebugStore(state => state.resetRuntimeState);
  const [runtimeStatus, setRuntimeStatus] = useState('Ready');

  return (
    <ScrollView style={[styles.root, {backgroundColor: colors.background}]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, {color: colors.text}]}>Debug Console</Text>
      <Text style={[styles.subtitle, {color: colors.mutedText}]}>Network logs, state snapshots, instance switcher, and MMKV wipe tools.</Text>

      <View style={[styles.section, {backgroundColor: colors.surface, borderColor: colors.border}]}>
        <Text style={[styles.sectionTitle, {color: colors.accent}]}>Active Piped Instance</Text>
        {instances.map(instance => (
          <Pressable key={instance} style={[styles.row, {borderColor: colors.border}]} onPress={() => setInstance(instance)}>
            <Text style={{color: colors.text, flex: 1}} numberOfLines={1}>{instance}</Text>
            <Text style={{color: instance === currentInstance ? colors.accent : colors.mutedText}}>
              {instance === currentInstance ? 'ACTIVE' : 'set'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.section, {backgroundColor: colors.surface, borderColor: colors.border}]}>
        <Text style={[styles.sectionTitle, {color: colors.accent}]}>Runtime Actions</Text>
        <Pressable
          style={styles.button}
          onPress={() => {
            const status = wipeMmkv();
            setRuntimeStatus(status);
          }}>
          <Text style={styles.buttonText}>Wipe MMKV Cache</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() => {
            const status = resetRuntimeState();
            setRuntimeStatus(status);
          }}>
          <Text style={styles.buttonText}>Reset Runtime State</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() => {
            clearLogs();
            setRuntimeStatus('Debug logs cleared');
          }}>
          <Text style={styles.buttonText}>Clear Logs</Text>
        </Pressable>
        <Text style={[styles.log, {color: colors.mutedText}]}>Status: {runtimeStatus}</Text>
      </View>

      <View style={[styles.section, {backgroundColor: colors.surface, borderColor: colors.border}]}>
        <Text style={[styles.sectionTitle, {color: colors.accent}]}>Zustand Dumps</Text>
        <Text style={[styles.dump, {color: colors.mutedText}]}>
          {JSON.stringify(
            {
              settings: useSettingsStore.getState().values,
              theme: useThemeStore.getState(),
              dashboard: useDashboardStore.getState(),
              mix: useMixStore.getState(),
            },
            null,
            2,
          )}
        </Text>
      </View>

      <View style={[styles.section, {backgroundColor: colors.surface, borderColor: colors.border}]}>
        <Text style={[styles.sectionTitle, {color: colors.accent}]}>Network Logs</Text>
        {logs.slice(0, 80).map(log => (
          <Text key={log.id} style={[styles.log, {color: log.level === 'error' ? '#FF6D7A' : colors.mutedText}]}>
            [{new Date(log.at).toLocaleTimeString()}] {log.message}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  content: {padding: 12, gap: 12},
  title: {fontSize: 20, fontWeight: '800'},
  subtitle: {fontSize: 12},
  section: {borderWidth: 1, borderRadius: 12, padding: 10, gap: 8},
  sectionTitle: {fontWeight: '800'},
  row: {borderWidth: 1, borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8},
  button: {borderRadius: 10, backgroundColor: '#282828', paddingVertical: 9, alignItems: 'center'},
  buttonText: {color: '#FFFFFF', fontWeight: '700'},
  dump: {fontSize: 11, fontFamily: 'monospace'},
  log: {fontSize: 11, marginBottom: 4},
});
