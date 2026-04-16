import React, {useEffect, useState} from 'react';
import {Pressable, SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import {PipedClient} from '../network/pipedClient';
import {useSessionStore} from '../state/sessionStore';
import {useThemeStore} from '../state/themeStore';

type LibraryItem = {id: string; title: string; artist: string; type: 'liked' | 'playlist'};

export function LibraryScreen({onOpenSync}: {onOpenSync: () => void}): React.JSX.Element {
  const isSynced = useSessionStore(state => state.isSynced);
  const colors = useThemeStore(state => state.colors);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [status, setStatus] = useState('Loading library...');

  useEffect(() => {
    const loadLibrary = async () => {
      if (!isSynced) return;
      try {
        const [likedRaw, playlistsRaw] = await Promise.all([
          PipedClient.search('liked music', 'music_songs'),
          PipedClient.getPlaylists(),
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
        setItems([...liked, ...playlists]);
        setStatus('Synced library');
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Failed to load library');
      }
    };
    void loadLibrary();
  }, [isSynced]);

  if (!isSynced) {
    return (
      <SafeAreaView style={[styles.root, {backgroundColor: colors.background}]}>
        <View style={[styles.syncPrompt, {backgroundColor: colors.surface, borderColor: colors.border}]}>
          <Text style={[styles.title, {color: colors.text}]}>Sync required for Library</Text>
          <Text style={[styles.subtitle, {color: colors.mutedText}]}>
            Liked Music and Playlists are available after account sync.
          </Text>
          <Pressable style={[styles.syncButton, {backgroundColor: colors.accent}]} onPress={onOpenSync}>
            <Text style={styles.syncText}>Sync account</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, {backgroundColor: colors.background}]}>
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
  syncButton: {marginTop: 10, borderRadius: 10, paddingVertical: 10, alignItems: 'center'},
  syncText: {color: '#FFFFFF', fontWeight: '700'},
  status: {fontSize: 12, marginHorizontal: 12, marginTop: 8},
});
