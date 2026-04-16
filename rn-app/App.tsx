import React, {useEffect, useMemo, useState} from 'react';
import {Modal, Pressable, SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {PluginRegistry} from './src/plugins/Plugin';
import {AuthPlugin, AuthProvider, AuthSession} from './src/plugins/auth/AuthPlugin';
import {PipedClient} from './src/network/pipedClient';
import {ExtremeSettingsScreen} from './src/settings/ExtremeSettingsScreen';
import {YouTubeWebAuthScreen} from './src/plugins/auth/YouTubeWebAuthScreen';
import {SyncSuccessOverlay} from './src/ui/SyncSuccessOverlay';
import {EqualizerPlugin} from './src/plugins/eq/EqualizerPlugin';
import {DNVNSplashScreen} from './src/ui/DNVNSplashScreen';
import {ProfileSyncCard} from './src/ui/ProfileSyncCard';
import {LibraryScreen} from './src/library/LibraryScreen';
import {UnifiedSearchScreen} from './src/search/UnifiedSearchScreen';
import {identifyExternalAudio} from './src/search/IdentifyService';
import {EdgeVisualizer} from './src/ui/EdgeVisualizer';
import {useSettingsStore} from './src/state/settingsStore';

class PlaceholderAuthProvider implements AuthProvider {
  async startSignIn(): Promise<AuthSession> {
    throw new Error('Wire startSignIn() to your OAuth/PKCE exchange flow.');
  }

  async refresh(_refreshToken: string): Promise<AuthSession> {
    throw new Error('Wire refresh() to your token endpoint.');
  }

  async signOut(): Promise<void> {
    return;
  }
}

export default function App(): React.JSX.Element {
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'library' | 'settings'>('settings');
  const [identifyBanner, setIdentifyBanner] = useState<string | null>(null);
  const refreshRate = Number(useSettingsStore(state => state.values['canvas.refreshRate']) || 120);

  const services = useMemo(() => {
    const provider = new PlaceholderAuthProvider();
    const authPlugin = new AuthPlugin(provider);
    const equalizerPlugin = new EqualizerPlugin();
    // Network client is a singleton object; cookie/session plumbing is handled inside it.
    const pipedClient = PipedClient;
    const plugins = new PluginRegistry();
    plugins.register(authPlugin);
    plugins.register(equalizerPlugin);

    return {plugins, pipedClient, authPlugin, equalizerPlugin};
  }, []);

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      try {
        await services.plugins.initializeAll();
        if (mounted) setReady(true);
      } catch (error) {
        if (mounted) {
          setBootError(error instanceof Error ? error.message : 'Unknown bootstrap error');
        }
      }
    };
    void boot();

    return () => {
      mounted = false;
      void services.plugins.shutdownAll();
    };
  }, [services.plugins]);

  if (bootError) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Startup Failed</Text>
          <Text style={styles.errorBody}>{bootError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!ready) {
    return <DNVNSplashScreen />;
  }

  void services.pipedClient;
  const onIdentify = async () => {
    const result = await identifyExternalAudio();
    setIdentifyBanner(`Identified: ${result.track} • ${result.artist} (${Math.round(result.confidence * 100)}%)`);
    setTimeout(() => setIdentifyBanner(null), 2200);
  };

  return (
    <SafeAreaView style={styles.root}>
      <ProfileSyncCard onPressSync={() => setShowAuth(true)} />
      {identifyBanner ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{identifyBanner}</Text>
        </View>
      ) : null}
      <View style={styles.tabRow}>
        <Tab id="search" activeTab={activeTab} onPress={setActiveTab} />
        <Tab id="library" activeTab={activeTab} onPress={setActiveTab} />
        <Tab id="settings" activeTab={activeTab} onPress={setActiveTab} />
      </View>
      <View style={styles.body}>
        {activeTab === 'search' ? <UnifiedSearchScreen onIdentifyPress={onIdentify} /> : null}
        {activeTab === 'library' ? <LibraryScreen /> : null}
        {activeTab === 'settings' ? (
          <ExtremeSettingsScreen equalizerPlugin={services.equalizerPlugin} onOpenSync={() => setShowAuth(true)} />
        ) : null}
      </View>
      <Modal visible={showAuth} animationType="slide">
        <YouTubeWebAuthScreen
          onClose={() => setShowAuth(false)}
          onManualSuccess={() => {
            services.authPlugin.manualSync({
              metadata: {source: 'manual-webview', provider: 'youtube'},
            });
            setShowAuth(false);
            setShowSyncSuccess(true);
            setTimeout(() => setShowSyncSuccess(false), 1500);
          }}
        />
      </Modal>
      <SyncSuccessOverlay visible={showSyncSuccess} />
      <EdgeVisualizer active />
      <View style={styles.hzBadge}>
        <Text style={styles.hzText}>{`${refreshRate}Hz`}</Text>
      </View>
    </SafeAreaView>
  );
}

function Tab({
  id,
  activeTab,
  onPress,
}: {
  id: 'search' | 'library' | 'settings';
  activeTab: 'search' | 'library' | 'settings';
  onPress: (id: 'search' | 'library' | 'settings') => void;
}): React.JSX.Element {
  const active = activeTab === id;
  return (
    <Pressable style={[styles.tab, active && styles.tabActive]} onPress={() => onPress(id)}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{id.toUpperCase()}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#000000'},
  body: {flex: 1},
  tabRow: {flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 8},
  tab: {flex: 1, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 9, alignItems: 'center'},
  tabActive: {backgroundColor: 'rgba(189,0,255,0.34)'},
  tabText: {color: '#AFAFAF', fontWeight: '700', fontSize: 12},
  tabTextActive: {color: '#FFFFFF'},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20},
  loadingText: {marginTop: 12, color: '#BBBBBB', fontSize: 13},
  errorTitle: {color: '#FF4D67', fontWeight: '700', fontSize: 18},
  errorBody: {marginTop: 8, color: '#CCCCCC', textAlign: 'center'},
  banner: {marginHorizontal: 12, marginBottom: 8, backgroundColor: 'rgba(34,197,94,0.2)', borderWidth: 1, borderColor: '#22C55E', borderRadius: 10, padding: 8},
  bannerText: {color: '#D8FEE4', fontWeight: '700', fontSize: 12},
  hzBadge: {position: 'absolute', right: 10, bottom: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4},
  hzText: {color: '#BD00FF', fontSize: 11, fontWeight: '800'},
});
