import React, {useMemo} from 'react';
import {ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View} from 'react-native';
import WebView from 'react-native-webview';

type Props = {
  onManualSuccess: () => void;
  onClose: () => void;
};

export function YouTubeWebAuthScreen({
  onManualSuccess,
  onClose,
}: Props): React.JSX.Element {
  const mobileUA = useMemo(
    () =>
      'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-A736B) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    [],
  );

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Account Sync</Text>
        <Pressable onPress={onClose} style={styles.topButton}>
          <Text style={styles.topButtonText}>Close</Text>
        </Pressable>
      </View>
      <WebView
        source={{uri: 'https://accounts.google.com'}}
        startInLoadingState
        userAgent={mobileUA}
        renderLoading={() => (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#BD00FF" />
          </View>
        )}
      />
      <View style={styles.bottomPanel}>
        <Pressable onPress={onManualSuccess} style={styles.syncButton}>
          <Text style={styles.syncButtonText}>I Logged In - Sync Now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#000000'},
  topBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#101010',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {color: '#FFFFFF', fontWeight: '700', fontSize: 16},
  topButton: {paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1A1A1A'},
  topButtonText: {color: '#BD00FF', fontWeight: '700'},
  loaderContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  bottomPanel: {padding: 12, backgroundColor: '#101010'},
  syncButton: {backgroundColor: '#BD00FF', borderRadius: 10, paddingVertical: 12, alignItems: 'center'},
  syncButtonText: {color: '#FFFFFF', fontWeight: '800'},
});
