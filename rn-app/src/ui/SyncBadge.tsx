import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useSessionStore} from '../state/sessionStore';

export function SyncBadge(): React.JSX.Element {
  const isSynced = useSessionStore(state => state.isSynced);
  const lastSync = useSessionStore(state => state.lastSyncAtEpochMs);

  return (
    <View style={[styles.badge, isSynced ? styles.synced : styles.unsynced]}>
      <Text style={styles.text}>
        {isSynced ? `Synced${lastSync ? ` • ${new Date(lastSync).toLocaleTimeString()}` : ''}` : 'Not Synced'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999},
  synced: {backgroundColor: '#19331F', borderWidth: 1, borderColor: '#22C55E'},
  unsynced: {backgroundColor: '#34191E', borderWidth: 1, borderColor: '#EF4444'},
  text: {color: '#FFFFFF', fontSize: 12, fontWeight: '700'},
});
