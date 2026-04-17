import React, {useEffect, useMemo, useState} from 'react';
import {Image, Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {PluginRegistry} from './src/plugins/Plugin';
import {AuthPlugin, AuthProvider, AuthSession} from './src/plugins/auth/AuthPlugin';
import {PipedClient} from './src/network/pipedClient';
import {ExtremeSettingsScreen} from './src/settings/ExtremeSettingsScreen';
import {YouTubeWebAuthScreen} from './src/plugins/auth/YouTubeWebAuthScreen';
import {SyncSuccessOverlay} from './src/ui/SyncSuccessOverlay';
import {DNVNSplashScreen} from './src/ui/DNVNSplashScreen';
import {ProfileSyncCard} from './src/ui/ProfileSyncCard';
import {LibraryScreen} from './src/library/LibraryScreen';
import {HomeScreen} from './src/home/HomeScreen';
import {DashboardScreen} from './src/dashboard/DashboardScreen';
import {CreationScreen} from './src/creation/CreationScreen';
import {EdgeLightWrapper} from './src/ui/EdgeLightWrapper';
import {useSettingsStore} from './src/state/settingsStore';
import {TabId, useThemeStore} from './src/state/themeStore';
import {DebugScreen} from './src/debug/DebugScreen';
import {ScreenErrorBoundary} from './src/ui/ScreenErrorBoundary';
import {MiniPlayer} from './src/ui/MiniPlayer';

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
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const insets = useSafeAreaInsets();
  const tabLayout = useThemeStore(state => state.tabLayout);
  const colors = useThemeStore(state => state.colors);
  const appName = useThemeStore(state => state.appName);
  const appLogoUri = useThemeStore(state => state.appLogoUri);
  const textScale = useThemeStore(state => state.textScale);
  const radius = useThemeStore(state => state.radius);
  const tabBarOpacity = useThemeStore(state => state.tabBarOpacity);
  const uiRevision = useThemeStore(state => state.uiRevision);
  const refreshRate = Number(useSettingsStore(state => state.values['canvas.refreshRate']) || 120);

  const services = useMemo(() => {
    const provider = new PlaceholderAuthProvider();
    const authPlugin = new AuthPlugin(provider);
    // Network client is a singleton object; cookie/session plumbing is handled inside it.
    const pipedClient = PipedClient;
    const plugins = new PluginRegistry();
    plugins.register(authPlugin);
    return {plugins, pipedClient, authPlugin};
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

  return (
      <SafeAreaView
        key={`ui-${uiRevision}`}
        style={[
          styles.root,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}>
      <ProfileSyncCard onPressSync={() => setShowAuth(true)} />
      <View style={[styles.tabRow, {opacity: tabBarOpacity}]}>
        {tabLayout.map(tab => (
          <Tab key={tab} id={tab} activeTab={activeTab} onPress={setActiveTab} />
        ))}
      </View>
      <View style={styles.body}>
        {activeTab === 'home' ? (
          <ScreenErrorBoundary name="Home">
            <HomeScreen />
          </ScreenErrorBoundary>
        ) : null}
        {activeTab === 'library' ? (
          <ScreenErrorBoundary name="Library">
            <LibraryScreen onOpenSync={() => setShowAuth(true)} />
          </ScreenErrorBoundary>
        ) : null}
        {activeTab === 'dashboard' ? (
          <ScreenErrorBoundary name="Dashboard">
            <DashboardScreen />
          </ScreenErrorBoundary>
        ) : null}
        {activeTab === 'creation' ? (
          <ScreenErrorBoundary name="Creation">
            <CreationScreen />
          </ScreenErrorBoundary>
        ) : null}
        {activeTab === 'settings' ? (
          <ScreenErrorBoundary name="Settings">
            <ExtremeSettingsScreen onOpenSync={() => setShowAuth(true)} />
          </ScreenErrorBoundary>
        ) : null}
        {activeTab === 'debug' ? (
          <ScreenErrorBoundary name="Debug">
            <DebugScreen />
          </ScreenErrorBoundary>
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
      <EdgeLightWrapper active />
      <MiniPlayer />
      <View style={styles.appBadge}>
        <Image source={{uri: appLogoUri}} style={styles.appBadgeIcon} />
        <Text style={[styles.appBadgeText, {fontSize: 11 * textScale}]} numberOfLines={1}>
          {appName}
        </Text>
      </View>
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
  id: TabId;
  activeTab: TabId;
  onPress: (id: TabId) => void;
}): React.JSX.Element {
  const active = activeTab === id;
  const colors = useThemeStore(state => state.colors);
  const textScale = useThemeStore(state => state.textScale);
  return (
    <Pressable
      style={[
        styles.tab,
        {borderRadius: useThemeStore.getState().radius, borderColor: colors.border},
        active && [styles.tabActive, {backgroundColor: `${colors.accent}44`, borderColor: colors.accent}],
      ]}
      onPress={() => onPress(id)}>
      <Text style={[styles.tabText, {fontSize: 12 * textScale}, active && [styles.tabTextActive, {color: colors.text}]}>{id.toUpperCase()}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  body: {flex: 1},
  tabRow: {flexDirection: 'row', gap: 6, paddingHorizontal: 8, paddingBottom: 8},
  tab: {flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', paddingVertical: 9, alignItems: 'center', borderWidth: 1},
  tabActive: {backgroundColor: 'rgba(255,255,255,0.14)'},
  tabText: {color: '#AFAFAF', fontWeight: '700', fontSize: 12},
  tabTextActive: {color: '#FFFFFF'},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20},
  loadingText: {marginTop: 12, color: '#BBBBBB', fontSize: 13},
  errorTitle: {color: '#FF4D67', fontWeight: '700', fontSize: 18},
  errorBody: {marginTop: 8, color: '#CCCCCC', textAlign: 'center'},
  appBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 170,
  },
  appBadgeIcon: {width: 16, height: 16, borderRadius: 8},
  appBadgeText: {color: '#FFFFFF', fontWeight: '700'},
  hzBadge: {position: 'absolute', right: 10, bottom: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4},
  hzText: {color: '#BD00FF', fontSize: 11, fontWeight: '800'},
});
