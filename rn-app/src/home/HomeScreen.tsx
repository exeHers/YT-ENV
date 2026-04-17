import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {PipedClient} from '../network/pipedClient';
import {useSessionStore} from '../state/sessionStore';
import {useDashboardStore} from '../state/dashboardStore';
import {useThemeStore} from '../state/themeStore';
import {MixTrack, useMixStore} from '../state/mixStore';
import {debugLog} from '../state/debugStore';
import {usePlayerStore} from '../state/playerStore';
import {useSettingsStore} from '../state/settingsStore';
import {ensureMicrophonePermission} from '../utils/permissions';

type Section = {id: string; title: string; tracks: MixTrack[]};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryAsync = async <T,>(fn: () => Promise<T>, attempts: number = 2, delayMs: number = 250): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await wait(delayMs);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Request failed');
};

const asList = (payload: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(payload)) return payload as Array<Record<string, unknown>>;
  if (payload && typeof payload === 'object') {
    const maybeItems = (payload as {items?: unknown}).items;
    if (Array.isArray(maybeItems)) return maybeItems as Array<Record<string, unknown>>;
  }
  return [];
};

const fetchItunesTracks = async (term: string, limit: number): Promise<MixTrack[]> => {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const body = (await response.json()) as {
      results?: Array<{trackName?: string; artistName?: string; artworkUrl100?: string; trackId?: number}>;
    };
    if (!Array.isArray(body.results)) return [];
    return body.results.map((item, idx) => {
      const id = String(item.trackId || `${term}-${idx}`);
      const artwork = item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : undefined;
      return {
        id,
        title: item.trackName || `Track ${idx + 1}`,
        artist: item.artistName || 'Unknown Artist',
        thumbnail: artwork || `https://picsum.photos/seed/itunes-thumb-${id}/640/640`,
        avatar: `https://picsum.photos/seed/artist-${encodeURIComponent(item.artistName || 'unknown')}/120/120`,
        url: `/watch?v=itunes-${id}`,
        streamUrl: (item as {previewUrl?: string}).previewUrl,
      };
    });
  } catch {
    return [];
  }
};

const loadWebLegitSections = async (weeklyMix: MixTrack[]): Promise<Section[]> => {
  const trending = await fetchItunesTracks('top global songs', 24);
  const darkVibes = await fetchItunesTracks('dark industrial phonk', 20);
  const moods = await fetchItunesTracks('neon trap mood', 20);
  const nextSections: Section[] = [];
  if (weeklyMix.length) nextSections.push({id: 'weeklyMix', title: 'Weekly Vibe Mix', tracks: weeklyMix});
  if (trending.length) nextSections.push({id: 'trending', title: 'Trending Now', tracks: trending});
  if (darkVibes.length) nextSections.push({id: 'darkIndustrial', title: 'Dark Industrial Vibes', tracks: darkVibes});
  if (moods.length) nextSections.push({id: 'moods', title: 'Mood: Neon Trap', tracks: moods});
  return nextSections;
};

const pickBestHttpAudio = (streams?: Array<{url?: string; bitrate?: number}>, preferLowerBitrate: boolean = false): string | null =>
  streams
    ?.filter(track => typeof track.url === 'string' && String(track.url).startsWith('http'))
    .sort((a, b) =>
      preferLowerBitrate
        ? Number(a.bitrate || 0) - Number(b.bitrate || 0)
        : Number(b.bitrate || 0) - Number(a.bitrate || 0),
    )[0]
    ?.url || null;

const extractVideoId = (rawUrl?: string): string | null => {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();

  const watchMatch = trimmed.match(/[?&]v=([^&]+)/);
  if (watchMatch?.[1]) return decodeURIComponent(watchMatch[1]);

  const shortMatch = trimmed.match(/youtu\.be\/([^?&/]+)/);
  if (shortMatch?.[1]) return decodeURIComponent(shortMatch[1]);

  const plainMatch = trimmed.match(/\/watch\/([^?&/]+)/);
  if (plainMatch?.[1]) return decodeURIComponent(plainMatch[1]);

  return null;
};

export function HomeScreen(): React.JSX.Element {
  const isSynced = useSessionStore(state => state.isSynced);
  const recordStream = useDashboardStore(state => state.recordStream);
  const addHistoryTrack = useMixStore(state => state.addHistoryTrack);
  const refreshMixIfNeeded = useMixStore(state => state.refreshMixIfNeeded);
  const weeklyMix = useMixStore(state => state.weeklyMix);
  const history = useMixStore(state => state.history);
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
  const [artistSheet, setArtistSheet] = useState<{name: string; tracks: MixTrack[]; loading: boolean}>({
    name: '',
    tracks: [],
    loading: false,
  });
  const [showArtistSheet, setShowArtistSheet] = useState(false);
  const setNowPlaying = usePlayerStore(state => state.setNowPlaying);
  const setQueue = usePlayerStore(state => state.setQueue);
  const settingsValues = useSettingsStore(state => state.values);
  const preferLowerBitrate = Boolean(settingsValues['mali.dataSaver']) || Boolean(settingsValues['engine.forceOpus256']);

  const openSongFinder = async () => {
    const micGranted = await ensureMicrophonePermission({
      deniedTitle: 'Microphone required',
      deniedMessage: 'Song Finder needs mic access to identify music around you.',
      blockedTitle: 'Microphone blocked',
      blockedMessage: 'Enable microphone access in phone settings to use Song Finder.',
    });
    if (!micGranted) {
      setStatus('Microphone permission is required for Song Finder');
      return;
    }
    try {
      if (Platform.OS === 'android') {
        await Linking.sendIntent('android.intent.action.VIEW', [{key: 'url', value: 'shazam://'}]);
        return;
      }
      const webUrl = 'https://www.shazam.com/apps';
      await Linking.openURL(webUrl);
    } catch {
      await Linking.openURL('https://www.shazam.com');
    }
  };

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (Platform.OS === 'web') {
        try {
          await refreshMixIfNeeded();
        } catch {
          // Non-fatal for web fallback feed.
        }
        const webSections = await loadWebLegitSections(weeklyMix);
        setSections(webSections);
        setStatus('Guest premium home loaded');
        return;
      }

      // Always try trending first so guest mode has content even if mix/search fail.
      const trendingRaw = await retryAsync(() => PipedClient.getTrending('US'), 2, 250);
      let darkRaw: Array<Record<string, unknown>> = [];
      let moodRaw: Array<Record<string, unknown>> = [];
      let personalRaw: Array<Record<string, unknown>> = [];
      let becauseRaw: Array<Record<string, unknown>> = [];
      try {
        await retryAsync(() => refreshMixIfNeeded(), 2, 250);
        darkRaw = (await retryAsync(() => PipedClient.search('dark industrial phonk', 'music_songs'), 2, 250)) as Array<Record<string, unknown>>;
        moodRaw = (await retryAsync(() => PipedClient.search('dark trap mood', 'music_songs'), 2, 250)) as Array<Record<string, unknown>>;
        if (history[0]?.artist) {
          becauseRaw = (await retryAsync(() => PipedClient.search(`${history[0].artist} essentials`, 'music_songs'), 2, 250)) as Array<Record<string, unknown>>;
        }
        if (isSynced) {
          personalRaw = (await retryAsync(() => PipedClient.search('discover mix official audio', 'music_songs'), 2, 250)) as Array<Record<string, unknown>>;
        }
      } catch {
        // Non-fatal: keep trending + any existing mix.
      }

      const toTrack = (item: Record<string, unknown>, idx: number): MixTrack => ({
        id: String(item.url || item.title || idx),
        title: String(item.title || 'Unknown Track'),
        artist: String(item.uploaderName || 'Unknown Artist'),
        thumbnail: String(item.thumbnail || `https://picsum.photos/seed/thumb-${idx}/640/640`),
        avatar: String(
          item.uploaderAvatar ||
            `https://picsum.photos/seed/artist-${encodeURIComponent(String(item.uploaderName || 'Unknown Artist'))}/120/120`,
        ),
        url: item.url ? String(item.url) : undefined,
        streamUrl: item.streamUrl ? String(item.streamUrl) : undefined,
      });

      const trending = asList(trendingRaw).slice(0, 24).map(toTrack);
      const darkVibes = darkRaw.slice(0, 20).map(toTrack);
      const moods = moodRaw.slice(0, 20).map(toTrack);
      const forYou = personalRaw.slice(0, 20).map(toTrack);
      const becauseYouListened = becauseRaw.slice(0, 20).map(toTrack);
      const recentSpino = [...weeklyMix].slice(0, 20);

      const nextSections: Section[] = [];
      if (weeklyMix.length) nextSections.push({id: 'weeklyMix', title: 'Weekly Vibe Mix', tracks: weeklyMix});
      nextSections.push({id: 'trending', title: 'Trending Now', tracks: trending});
      if (forYou.length) nextSections.push({id: 'forYou', title: 'For You', tracks: forYou});
      if (becauseYouListened.length && history[0]?.artist) {
        nextSections.push({id: 'because', title: `Because you listened to ${history[0].artist}`, tracks: becauseYouListened});
      }
      if (darkVibes.length) nextSections.push({id: 'darkIndustrial', title: 'Dark Industrial Vibes', tracks: darkVibes});
      if (recentSpino.length) nextSections.push({id: 'spino', title: 'Recent Spino', tracks: recentSpino});
      if (moods.length) nextSections.push({id: 'moods', title: 'Mood: Neon Trap', tracks: moods});

      setSections(nextSections);
      setStatus(isSynced ? 'Synced premium home loaded' : 'Guest premium home loaded');
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load. Tap retry.';
      debugLog('error', `Home load failed: ${message}`);
      if (Platform.OS === 'web') {
        const webSections = await loadWebLegitSections(weeklyMix);
        if (webSections.length) {
          setSections(webSections);
          setError(null);
          setStatus('Web backup feed loaded');
          return;
        }
      }
      setError(message);
      setStatus('Failed to load');
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [history, isSynced, refreshMixIfNeeded, weeklyMix]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const onSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const mapped =
        Platform.OS === 'web'
          ? await fetchItunesTracks(query.trim(), 25)
          : asList(await retryAsync(() => PipedClient.search(query.trim(), 'music_songs'), 2, 250)).slice(0, 25).map((item, idx) => ({
              id: String(item.url || item.title || idx),
              title: String(item.title || 'Unknown'),
              artist: String(item.uploaderName || 'Unknown Artist'),
              thumbnail: String(item.thumbnail || `https://picsum.photos/seed/search-${idx}/640/640`),
              avatar: String(
                item.uploaderAvatar ||
                  `https://picsum.photos/seed/artist-${encodeURIComponent(String(item.uploaderName || 'Unknown Artist'))}/120/120`,
              ),
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

  const onPlay = async (item: MixTrack, queueOverride?: MixTrack[], indexOverride?: number) => {
    try {
      let resolvedStreamUrl: string | undefined;
      let durationMs = 180000;
      let adsSkippedEstimate = 1;
      let usingPreviewFallback = false;

      const fetchStreamForVideoId = async (videoId: string): Promise<boolean> => {
        if (!videoId || videoId.startsWith('itunes-')) return false;
        const stream = (await retryAsync(() => PipedClient.getStream(videoId), 2, 250)) as {
          duration?: number;
          audioStreams?: Array<{url?: string; bitrate?: number}>;
        };
        const candidate = pickBestHttpAudio(stream.audioStreams, preferLowerBitrate);
        if (!candidate) return false;
        resolvedStreamUrl = candidate;
        durationMs = Math.round((Number(stream.duration) || 180) * 1000);
        adsSkippedEstimate = Math.max(1, Math.floor((stream.audioStreams?.length || 1) / 2));
        return true;
      };

      const directVideoId = extractVideoId(item.url);
      let hasPlayableStream = directVideoId ? await fetchStreamForVideoId(directVideoId) : false;

      // If this track came from a non-YouTube fallback source, search Piped by title/artist.
      if (!hasPlayableStream) {
        const query = `${item.title} ${item.artist}`.trim();
        const results = asList(await retryAsync(() => PipedClient.search(query, 'music_songs'), 2, 250));
        for (const candidate of results.slice(0, 5)) {
          const candidateUrl = typeof candidate.url === 'string' ? candidate.url : undefined;
          const candidateVideoId = extractVideoId(candidateUrl);
          if (!candidateVideoId) continue;
          hasPlayableStream = await fetchStreamForVideoId(candidateVideoId);
          if (hasPlayableStream) break;
        }
      }

      if (!hasPlayableStream && item.streamUrl?.startsWith('http')) {
        resolvedStreamUrl = item.streamUrl;
        usingPreviewFallback = true;
        durationMs = 30000;
        adsSkippedEstimate = 0;
      }

      if (!resolvedStreamUrl) {
        setStatus('No full stream found for this track yet');
        return;
      }

      const nextQueue = queueOverride && queueOverride.length > 0 ? queueOverride : [item];
      const nextIndex = typeof indexOverride === 'number' ? indexOverride : Math.max(0, nextQueue.findIndex(track => track.id === item.id));
      setQueue(nextQueue, nextIndex);
      setNowPlaying(item, resolvedStreamUrl, {queue: nextQueue, index: nextIndex});
      recordStream({durationMs, adsSkippedEstimate});
      addHistoryTrack(item);
      setStatus(usingPreviewFallback ? `Playing preview clip: ${item.title}` : `Playing: ${item.title}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to start stream');
    }
  };

  const openArtist = async (artistName: string) => {
    setShowArtistSheet(true);
    setArtistSheet({name: artistName, tracks: [], loading: true});
    try {
      const mapped =
        Platform.OS === 'web'
          ? await fetchItunesTracks(`${artistName} songs`, 25)
          : asList(await retryAsync(() => PipedClient.search(`${artistName} songs`, 'music_songs'), 2, 250)).slice(0, 25).map((item, idx) => ({
              id: `${artistName}-${idx}-${String(item.url || item.title || idx)}`,
              title: String(item.title || 'Unknown'),
              artist: String(item.uploaderName || artistName),
              thumbnail: String(item.thumbnail || `https://picsum.photos/seed/artist-cover-${idx}/640/640`),
              avatar: String(item.uploaderAvatar || `https://picsum.photos/seed/artist-${encodeURIComponent(artistName)}/120/120`),
              url: item.url ? String(item.url) : undefined,
            }));
      setArtistSheet({name: artistName, tracks: mapped, loading: false});
    } catch {
      setArtistSheet({name: artistName, tracks: [], loading: false});
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
      <View style={[styles.heroCard, {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius}]}>
        <Text style={[styles.heroTitle, {color: colors.text}]}>Your Listening Space</Text>
        <Text style={[styles.heroBody, {color: colors.mutedText}]}>
          {isSynced
            ? 'Synced mode unlocked. Likes, playlists, and recommendations are available now.'
            : 'Guest mode active. You can still search, queue, and play full streams instantly.'}
        </Text>
        <View style={styles.heroActions}>
          <Pressable style={[styles.heroChip, {borderColor: colors.border}]} onPress={onSearch}>
            <Text style={{color: colors.text, fontWeight: '700'}}>Quick Search</Text>
          </Pressable>
          <Pressable style={[styles.heroChip, {borderColor: colors.border}]} onPress={() => void loadFeed()}>
            <Text style={{color: colors.text, fontWeight: '700'}}>Refresh Feed</Text>
          </Pressable>
        </View>
      </View>
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
      <Pressable style={[styles.songFinderBtn, {borderColor: colors.border, backgroundColor: colors.surface}]} onPress={() => void openSongFinder()}>
        <Text style={{color: colors.text, fontWeight: '700'}}>Song Finder (Shazam-like)</Text>
        <Text style={{color: colors.mutedText, fontSize: 11}}>Identify music around you</Text>
      </Pressable>
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
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, {color: colors.text}]}>{section.title}</Text>
              <Text style={{color: colors.mutedText, fontSize: 11}}>{`${section.tracks.length} tracks`}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              style={Platform.OS === 'web' ? ({scrollbarWidth: 'none', msOverflowStyle: 'none'} as never) : undefined}
            >
              {section.tracks.map((item, index) => (
                <Pressable
                  key={`${section.id}-${item.id}`}
                  onPress={() => onPlay(item, section.tracks, index)}
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
                    <Pressable onPress={() => void openArtist(item.artist)}>
                      <Image source={{uri: item.avatar}} style={styles.avatar} />
                    </Pressable>
                    <View style={{flex: 1}}>
                      <Text style={[styles.track, {color: colors.text}]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Pressable onPress={() => void openArtist(item.artist)}>
                        <Text style={[styles.artist, {color: colors.mutedText}]} numberOfLines={1}>
                          {item.artist}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ))}
      </ScrollView>
      <Modal visible={showArtistSheet} animationType="slide" onRequestClose={() => setShowArtistSheet(false)}>
        <SafeAreaView style={[styles.modalRoot, {backgroundColor: colors.background}]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, {color: colors.text}]} numberOfLines={1}>
              {artistSheet.name}
            </Text>
            <Pressable onPress={() => setShowArtistSheet(false)} style={[styles.modalClose, {borderColor: colors.border}]}>
              <Text style={{color: colors.text}}>Close</Text>
            </Pressable>
          </View>
          <Text style={[styles.modalSubtitle, {color: colors.mutedText}]}>Tap any song to play in mini player</Text>
          <ScrollView contentContainerStyle={styles.modalList}>
            {artistSheet.loading ? (
              <Text style={{color: colors.mutedText}}>Loading artist songs...</Text>
            ) : artistSheet.tracks.length === 0 ? (
              <Text style={{color: colors.mutedText}}>No songs found for this artist yet.</Text>
            ) : (
              artistSheet.tracks.map((track, index) => (
                <Pressable
                  key={track.id}
                  onPress={() => void onPlay(track, artistSheet.tracks, index)}
                  style={[styles.modalTrack, {borderColor: colors.border, backgroundColor: colors.surface}]}>
                  <Image source={{uri: track.thumbnail}} style={styles.modalThumb} />
                  <View style={{flex: 1}}>
                    <Text style={{color: colors.text, fontWeight: '700'}} numberOfLines={1}>
                      {track.title}
                    </Text>
                    <Text style={{color: colors.mutedText, marginTop: 2}} numberOfLines={1}>
                      {track.artist}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, paddingHorizontal: 12},
  title: {fontSize: 20, fontWeight: '800'},
  subtitle: {marginTop: 4, fontSize: 12},
  heroCard: {marginTop: 10, borderWidth: 1, padding: 12},
  heroTitle: {fontSize: 15, fontWeight: '800'},
  heroBody: {marginTop: 4, fontSize: 12, lineHeight: 17},
  heroActions: {marginTop: 10, flexDirection: 'row', gap: 8},
  heroChip: {borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6},
  searchRow: {marginTop: 12, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', padding: 8},
  input: {flex: 1, paddingHorizontal: 8},
  button: {borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8},
  buttonText: {color: '#FFFFFF', fontWeight: '700'},
  songFinderBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  status: {marginTop: 8, fontSize: 12},
  list: {paddingTop: 10, gap: 14},
  sectionWrap: {gap: 8},
  sectionHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  horizontalList: {gap: 10, paddingRight: 10},
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
  modalRoot: {flex: 1, padding: 12},
  modalHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  modalTitle: {fontSize: 22, fontWeight: '900', flex: 1, marginRight: 10},
  modalClose: {borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8},
  modalSubtitle: {marginTop: 4, fontSize: 12},
  modalList: {paddingTop: 10, gap: 10, paddingBottom: 20},
  modalTrack: {borderWidth: 1, borderRadius: 12, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 10},
  modalThumb: {width: 56, height: 56, borderRadius: 10},
});
