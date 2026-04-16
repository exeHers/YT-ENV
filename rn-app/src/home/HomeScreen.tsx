import React, {useEffect, useMemo, useState} from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {PipedClient} from '../network/pipedClient';
import {useSessionStore} from '../state/sessionStore';
import {useDashboardStore} from '../state/dashboardStore';
import {useThemeStore} from '../state/themeStore';
import {MixTrack, useMixStore} from '../state/mixStore';

type Section = {id: string; title: string; tracks: MixTrack[]};

const asList = (payload: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(payload)) return payload as Array<Record<string, unknown>>;
  if (payload && typeof payload === 'object') {
    const maybeItems = (payload as {items?: unknown}).items;
    if (Array.isArray(maybeItems)) return maybeItems as Array<Record<string, unknown>>;
  }
  return [];
};

export function HomeScreen(): React.JSX.Element {
  const isSynced = useSessionStore(state => state.isSynced);
  const recordStream = useDashboardStore(state => state.recordStream);
  const addHistoryTrack = useMixStore(state => state.addHistoryTrack);
  const refreshMixIfNeeded = useMixStore(state => state.refreshMixIfNeeded);
  const weeklyMix = useMixStore(state => state.weeklyMix);
  const appName = useThemeStore(state => state.appName);
  const colors = useThemeStore(state => state.colors);
  const radius = useThemeStore(state => state.radius);
  const spacing = useThemeStore(state => state.spacing);
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('Loading premium feed...');
  const [error, setError] = useState<string | null>(null);

  const loadFeed = async () => {
    setLoading(true);
    setError(null);
    try {
      // Always try trending first so guest mode has content even if mix/search fail.
      const trendingRaw = await PipedClient.getTrending('US');
      let darkRaw: Array<Record<string, unknown>> = [];
      let moodRaw: Array<Record<string, unknown>> = [];
      try {
        await refreshMixIfNeeded();
        darkRaw = (await PipedClient.search('dark industrial phonk', 'music_songs')) as Array<Record<string, unknown>>;
        moodRaw = (await PipedClient.search('dark trap mood', 'music_songs')) as Array<Record<string, unknown>>;
      } catch {
        // Non-fatal: keep trending + any existing mix.
      }

      const toTrack = (item: Record<string, unknown>, idx: number): MixTrack => ({
        id: String(item.url || item.title || idx),
        title: String(item.title || 'Unknown Track'),
        artist: String(item.uploaderName || 'Unknown Artist'),
        thumbnail: String(item.thumbnail || `https://picsum.photos/seed/thumb-${idx}/640/640`),
        avatar: String(item.uploaderAvatar || `https://picsum.photos/seed/avatar-${idx}/120/120`),
        url: item.url ? String(item.url) : undefined,
      });

      const trending = asList(trendingRaw).slice(0, 24).map(toTrack);
      const darkVibes = darkRaw.slice(0, 20).map(toTrack);
      const moods = moodRaw.slice(0, 20).map(toTrack);
      const recentSpino = [...weeklyMix].slice(0, 20);

      const nextSections: Section[] = [];
      if (weeklyMix.length) nextSections.push({id: 'weeklyMix', title: 'Weekly Vibe Mix', tracks: weeklyMix});
      nextSections.push({id: 'trending', title: 'Trending Now', tracks: trending});
      if (darkVibes.length) nextSections.push({id: 'darkIndustrial', title: 'Dark Industrial Vibes', tracks: darkVibes});
      if (recentSpino.length) nextSections.push({id: 'spino', title: 'Recent Spino', tracks: recentSpino});
      if (moods.length) nextSections.push({id: 'moods', title: 'Mood: Neon Trap', tracks: moods});

      setSections(nextSections);
      setStatus(isSynced ? 'Synced premium home loaded' : 'Guest premium home loaded');
    } catch {
      setError('Failed to load. Tap retry.');
      setStatus('Failed to load');
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSynced]);

  const onSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = asList(await PipedClient.search(query.trim(), 'music_songs'));
      const mapped = result.slice(0, 25).map((item, idx) => ({
        id: String(item.url || item.title || idx),
        title: String(item.title || 'Unknown'),
        artist: String(item.uploaderName || 'Unknown Artist'),
        thumbnail: String(item.thumbnail || `https://picsum.photos/seed/search-${idx}/640/640`),
        avatar: String(item.uploaderAvatar || `https://picsum.photos/seed/ava-${idx}/120/120`),
        url: item.url ? String(item.url) : undefined,
      }));
      setSections(current => [{id: 'search', title: `Search: ${query}`, tracks: mapped}, ...current.filter(item => item.id !== 'search')]);
      setStatus('Search loaded');
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const onPlay = async (item: MixTrack) => {
    const videoId = item.url?.split('/').filter(Boolean).pop();
    if (!videoId) return;
    try {
      const stream = (await PipedClient.getStream(videoId)) as {duration?: number; audioStreams?: unknown[]};
      const durationMs = Math.round((Number(stream.duration) || 180) * 1000);
      const adsSkippedEstimate = Math.max(1, Math.floor((stream.audioStreams?.length || 1) / 2));
      recordStream({durationMs, adsSkippedEstimate});
      addHistoryTrack(item);
      setStatus(`Playing: ${item.title}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to start stream');
    }
  };

  const title = useMemo(
    () => (isSynced ? `${appName} Home (Synced)` : `${appName} Home (Guest Mode)`),
    [appName, isSynced],
  );

  return (
    <SafeAreaView style={[styles.root, {backgroundColor: colors.background, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 4}]}>
      <Text style={[styles.title, {color: colors.text}]}>{title}</Text>
      <Text style={[styles.subtitle, {color: colors.mutedText}]}>
        {isSynced ? 'Account-specific feed, recommendations, and recent activity.' : 'Browse and play any song without account sync.'}
      </Text>
      <View style={[styles.searchRow, {borderColor: colors.border, backgroundColor: colors.surface}]}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search any song with Piped"
          placeholderTextColor={colors.mutedText}
          style={[styles.input, {color: colors.text}]}
        />
        <Pressable style={[styles.button, {backgroundColor: colors.accent}]} onPress={onSearch}>
          <Text style={styles.buttonText}>Search</Text>
        </Pressable>
      </View>
      <Text style={[styles.status, {color: colors.mutedText}]}>{loading ? 'Loading...' : status}</Text>
      {error ? (
        <View style={[styles.errorCard, {backgroundColor: colors.surface, borderColor: colors.border}]}>
          <Text style={{color: '#FF7A8D', fontWeight: '800'}}>Failed to Load</Text>
          <Text style={{color: colors.mutedText, marginTop: 4}}>Failed to load, retry?</Text>
          <Pressable onPress={() => void loadFeed()} style={[styles.retryBtn, {backgroundColor: colors.accent}]}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      <ScrollView contentContainerStyle={[styles.list, {paddingBottom: spacing * 3}]}>
        {sections.map(section => (
          <View key={section.id} style={styles.sectionWrap}>
            <Text style={[styles.sectionTitle, {color: colors.text}]}>{section.title}</Text>
            <FlashList
              data={section.tracks}
              horizontal
              estimatedItemSize={170}
              keyExtractor={item => `${section.id}-${item.id}`}
              ItemSeparatorComponent={() => <View style={{width: 10}} />}
              renderItem={({item}) => (
                <Pressable
                  onPress={() => onPlay(item)}
                  style={[
                    styles.card,
                    {
                      backgroundColor: 'rgba(255,255,255,0.09)',
                      borderColor: colors.border,
                      borderRadius: radius,
                    },
                  ]}>
                  <Image source={{uri: item.thumbnail}} style={[styles.thumbnail, {borderRadius: radius - 2}]} />
                  <View style={styles.metaRow}>
                    <Image source={{uri: item.avatar}} style={styles.avatar} />
                    <View style={{flex: 1}}>
                      <Text style={[styles.track, {color: colors.text}]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.artist, {color: colors.mutedText}]} numberOfLines={1}>
                        {item.artist}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              )}
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, paddingHorizontal: 12},
  title: {fontSize: 20, fontWeight: '800'},
  subtitle: {marginTop: 4, fontSize: 12},
  searchRow: {marginTop: 12, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', padding: 8},
  input: {flex: 1, paddingHorizontal: 8},
  button: {borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8},
  buttonText: {color: '#FFFFFF', fontWeight: '700'},
  status: {marginTop: 8, fontSize: 12},
  list: {paddingTop: 10, gap: 14},
  sectionWrap: {gap: 8},
  sectionTitle: {fontWeight: '800', fontSize: 15},
  card: {borderWidth: 1, width: 190, padding: 8},
  thumbnail: {width: '100%', height: 130},
  metaRow: {marginTop: 8, flexDirection: 'row', gap: 8, alignItems: 'center'},
  avatar: {width: 26, height: 26, borderRadius: 13},
  track: {fontWeight: '700'},
  artist: {fontSize: 11, marginTop: 2},
  errorCard: {borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 8},
  retryBtn: {marginTop: 10, alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8},
  retryText: {color: '#FFFFFF', fontWeight: '700'},
});
