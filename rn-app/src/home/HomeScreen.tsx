import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {PipedClient} from '../network/pipedClient';
import {useSessionStore} from '../state/sessionStore';
import {useDashboardStore} from '../state/dashboardStore';
import {useThemeStore} from '../state/themeStore';

type PipedItem = {
  url?: string;
  title?: string;
  uploaderName?: string;
};

export function HomeScreen(): React.JSX.Element {
  const isSynced = useSessionStore(state => state.isSynced);
  const recordStream = useDashboardStore(state => state.recordStream);
  const appName = useThemeStore(state => state.appName);
  const colors = useThemeStore(state => state.colors);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<PipedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('Loading feed...');

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      if (isSynced) {
        const recs = (await PipedClient.search('your mix radio', 'music_songs')) as PipedItem[];
        setItems(recs.slice(0, 20));
        setStatus('Synced feed + recommendations');
      } else {
        const trending = (await PipedClient.getTrending('US')) as PipedItem[];
        setItems(trending.slice(0, 20));
        setStatus('Guest mode: trending + search');
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to load feed');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isSynced]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const onSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const result = (await PipedClient.search(query.trim(), 'music_songs')) as PipedItem[];
      setItems(result.slice(0, 25));
      setStatus(isSynced ? 'Synced search results' : 'Guest search results');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const onPlay = async (item: PipedItem) => {
    const videoId = item.url?.split('/').pop();
    if (!videoId) return;
    try {
      const stream = (await PipedClient.getStream(videoId)) as {duration?: number; audioStreams?: unknown[]};
      const durationMs = Math.round((Number(stream.duration) || 180) * 1000);
      const adsSkippedEstimate = Math.max(1, Math.floor((stream.audioStreams?.length || 1) / 2));
      recordStream({durationMs, adsSkippedEstimate});
      setStatus(`Playing: ${item.title || 'Unknown track'}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to start stream');
    }
  };

  const title = useMemo(
    () => (isSynced ? `${appName} Home (Synced)` : `${appName} Home (Guest Mode)`),
    [appName, isSynced],
  );

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
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
      <ScrollView contentContainerStyle={styles.list}>
        {items.map(item => (
          <View key={item.url || item.title} style={[styles.card, {backgroundColor: colors.surface, borderColor: colors.border}]}>
            <Text style={[styles.track, {color: colors.text}]} numberOfLines={1}>
              {item.title || 'Untitled'}
            </Text>
            <Text style={[styles.artist, {color: colors.mutedText}]} numberOfLines={1}>
              {item.uploaderName || 'Unknown artist'}
            </Text>
            <Pressable style={[styles.playButton, {borderColor: colors.accent}]} onPress={() => onPlay(item)}>
              <Text style={[styles.playText, {color: colors.accent}]}>Play</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, padding: 12},
  title: {fontSize: 20, fontWeight: '800'},
  subtitle: {marginTop: 4, fontSize: 12},
  searchRow: {marginTop: 12, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', padding: 8},
  input: {flex: 1, paddingHorizontal: 8},
  button: {borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8},
  buttonText: {color: '#FFFFFF', fontWeight: '700'},
  status: {marginTop: 8, fontSize: 12},
  list: {paddingTop: 10, paddingBottom: 30, gap: 10},
  card: {borderWidth: 1, borderRadius: 12, padding: 12},
  track: {fontWeight: '700'},
  artist: {fontSize: 12, marginTop: 4},
  playButton: {marginTop: 10, borderWidth: 1, borderRadius: 8, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6},
  playText: {fontWeight: '700'},
});
