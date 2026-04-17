import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {PipedClient} from '../network/pipedClient';
import {useSessionStore} from '../state/sessionStore';
import {useThemeStore} from '../state/themeStore';
import {useMixStore} from '../state/mixStore';

type LibraryItem = {id: string; title: string; artist: string; type: 'liked' | 'playlist' | 'recent'};

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

export function LibraryScreen({onOpenSync}: {onOpenSync: () => void}): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const isSynced = useSessionStore(state => state.isSynced);
  const colors = useThemeStore(state => state.colors);
  const history = useMixStore(state => state.history);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [status, setStatus] = useState('Loading library...');

  useEffect(() => {
    const loadLibrary = async () => {
      if (!isSynced) return;
      try {
        const [likedRaw, playlistsRaw] = await Promise.all([
          retryAsync(() => PipedClient.search('liked music', 'music_songs'), 2, 250),
          retryAsync(() => PipedClient.getPlaylists(), 2, 250),
        ]);
        const liked = ((likedRaw as Array<{url?: string; title?: string; uploaderName?: string}>).slice(0, 20)).map(item => ({
          id: item.url || item.title || Math.random().toString(36),
          title: item.title || 'Liked track',
          artist: item.uploaderName || 'Unknown artist',
          type: 'liked' as const,
        }));
        const playlists = ((playlistsRaw as Array<{id?: string; name?: string}>).slice(0, 20)).map(item => ({
          id: item.id || item.name || Math.random().toString(36),
          title: item.name || 'Playlist',
          artist: 'Playlist',
          type: 'playlist' as const,
        }));
        const recent = history.slice(0, 20).map(item => ({
          id: `recent-${item.id}`,
          title: item.title,
          artist: item.artist,
          type: 'recent' as const,
        }));
        setItems([...recent, ...liked, ...playlists]);
        setStatus('Synced library');
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Failed to load library');
      }
    };
    void loadLibrary();
  }, [history, isSynced]);

  if (!isSynced) {
    const guestRecent = history.slice(0, 20);
    return (
      <SafeAreaView style={[styles.root, {backgroundColor: colors.background, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 4}]}>
        <View style={[styles.syncPrompt, {backgroundColor: colors.surface, borderColor: colors.border}]}>
          <Text style={[styles.title, {color: colors.text}]}>Sync required for Library</Text>
          <Text style={[styles.subtitle, {color: colors.mutedText}]}>
            Liked Music and Playlists are available after account sync.
          </Text>
          <Pressable style={[styles.syncButton, {backgroundColor: colors.accent}]} onPress={onOpenSync}>
            <Text style={styles.syncText}>Sync account</Text>
          </Pressable>
        </View>
        <View style={[styles.guestRecentWrap, {backgroundColor: colors.surface, borderColor: colors.border}]}>
          <Text style={[styles.title, {color: colors.text}]}>Recent in Guest Mode</Text>
          {guestRecent.length === 0 ? (
            <Text style={[styles.subtitle, {color: colors.mutedText}]}>Play songs from Home to build recent history here.</Text>
          ) : (
            guestRecent.map(track => (
              <View key={track.id} style={[styles.row, {backgroundColor: colors.background, borderColor: colors.border}]}>
                <Text style={[styles.title, {color: colors.text}]} numberOfLines={1}>
                  {track.title}
                </Text>
                <Text style={[styles.subtitle, {color: colors.mutedText}]} numberOfLines={1}>
                  {track.artist}
                </Text>
              </View>
            ))
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, {backgroundColor: colors.background, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 4}]}>
      <Text style={[styles.status, {color: colors.mutedText}]}>{status}</Text>
      <FlashList
        data={items}
        estimatedItemSize={64}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        renderItem={({item}) => (
          <View style={[styles.row, {backgroundColor: colors.surface, borderColor: colors.border}]}>
            <Text style={[styles.title, {color: colors.text}]}>{item.title}</Text>
            <Text style={[styles.subtitle, {color: colors.mutedText}]}>{`${item.artist} - ${item.type.toUpperCase()}`}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  content: {padding: 12},
  row: {padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1},
  title: {fontWeight: '600', fontSize: 14},
  subtitle: {marginTop: 2, fontSize: 12},
  syncPrompt: {margin: 12, borderWidth: 1, borderRadius: 12, padding: 12},
  guestRecentWrap: {marginHorizontal: 12, borderWidth: 1, borderRadius: 12, padding: 12, gap: 8},
  syncButton: {marginTop: 10, borderRadius: 10, paddingVertical: 10, alignItems: 'center'},
  syncText: {color: '#FFFFFF', fontWeight: '700'},
  status: {fontSize: 12, marginHorizontal: 12, marginTop: 8},
});
