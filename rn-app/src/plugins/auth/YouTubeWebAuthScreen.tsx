import React, {useMemo, useRef} from 'react';
import {ActivityIndicator, Pressable, Platform, SafeAreaView, StyleSheet, Text, View} from 'react-native';
import WebView from 'react-native-webview';
import {WebSessionManager} from './WebSessionManager';

type Props = {
  onManualSuccess: () => void;
  onClose: () => void;
};

export function YouTubeWebAuthScreen({
  onManualSuccess,
  onClose,
}: Props): React.JSX.Element {
  // Use a Desktop UA to force Google to set all session cookies
  const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  const handleNavStateChange = async (navState: any) => {
    // If we land on the music home page and we aren't in a login flow, we are in.
    if (navState.url.includes('music.youtube.com') && !navState.url.includes('ServiceLogin')) {
      const cookies = await WebSessionManager.getPersistedCookies();
      if (cookies.includes('SID')) {
        onManualSuccess(); // Triggers the neon success animation
      }
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.title}>YT ENV Sync</Text>
        <Pressable onPress={onClose} style={styles.topButton}>
          <Text style={styles.topButtonText}>Cancel</Text>
        </Pressable>
      </View>
      <WebView
        source={{uri: 'https://music.youtube.com/library'}}
        userAgent={desktopUA}
        onNavigationStateChange={handleNavStateChange}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#BD00FF" />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#000000'},
  topBar: {paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#101010', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  title: {color: '#FFFFFF', fontWeight: '700', fontSize: 16},
  topButton: {paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1A1A1A'},
  topButtonText: {color: '#BD00FF', fontWeight: '700'},
  loaderContainer: {flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center'},
});