import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {SyncBadge} from './SyncBadge';

type Props = {
  onPressSync: () => void;
};

export function ProfileSyncCard({onPressSync}: Props): React.JSX.Element {
  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Primary account session</Text>
      </View>
      <SyncBadge />
      <Pressable style={styles.button} onPress={onPressSync}>
        <Text style={styles.buttonText}>Sync</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {color: '#FFF', fontWeight: '800'},
  subtitle: {color: '#AAA', fontSize: 12},
  button: {backgroundColor: '#BD00FF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8},
  buttonText: {color: '#FFF', fontWeight: '800'},
});
