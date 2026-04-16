import React, {useRef} from 'react';
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
  
  // The spoofed User-Agent: Matches an A73 Chrome browser perfectly but hides the "wv" (WebView) flag.
  const spoofedUserAgent = 'Mozilla/5.0 (Linux; Android 14; SM-A736B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

  const handleNavStateChange = async (navState: any) => {
    // Detects when the login flow finishes and lands on the music domain
    if (navState.url.includes('music.youtube.com') && !navState.url.includes('ServiceLogin')) {
      const cookies = await WebSessionManager.getPersistedCookies();
      if (cookies.includes('SID')) {
        onManualSuccess(); 
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
        // Pointing directly to the Google Service Login URL forces the correct mobile layout
        source={{uri: 'https://accounts.google.com/ServiceLogin?service=youtube&passive=true&continue=https://music.youtube.com/'}}
        userAgent={spoofedUserAgent}
        onNavigationStateChange={handleNavStateChange}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        javaScriptEnabled={true} // CRITICAL FIX: Google login will fail without this
        domStorageEnabled={true} // CRITICAL FIX: Google needs this to store temporary session states
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