import React, {useMemo, useState} from 'react';
import {Pressable, SafeAreaView, StyleSheet, Text, TextInput, View} from 'react-native';
import {FlashList} from '@shopify/flash-list';

type SourceType = 'piped' | 'local' | 'playlist';
type ResultItem = {id: string; title: string; source: SourceType};

type Props = {
  onIdentifyPress: () => void;
};

const sample: ResultItem[] = [
  {id: 'p-1', title: 'Dark Energy - Live', source: 'piped'},
  {id: 'l-1', title: 'Offline Mix 01', source: 'local'},
  {id: 's-1', title: 'Liked: Night Drive', source: 'playlist'},
];

export function UnifiedSearchScreen({onIdentifyPress}: Props): React.JSX.Element {
  const [query, setQuery] = useState('');
  const results = useMemo(
    () => sample.filter(item => item.title.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.searchBar}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search Piped, Local, and Playlists..."
          placeholderTextColor="#777"
          style={styles.input}
        />
        <Pressable style={styles.identifyButton} onPress={onIdentifyPress}>
          <Text style={styles.identifyText}>Identify</Text>
        </Pressable>
      </View>
      <FlashList
        data={results}
        estimatedItemSize={58}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <View style={styles.row}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.source}>{item.source.toUpperCase()}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#000'},
  searchBar: {flexDirection: 'row', gap: 8, padding: 12},
  input: {flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 12, color: '#fff'},
  identifyButton: {backgroundColor: '#BD00FF', borderRadius: 12, paddingHorizontal: 12, justifyContent: 'center'},
  identifyText: {color: '#fff', fontWeight: '800'},
  row: {marginHorizontal: 12, marginBottom: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', padding: 12},
  title: {color: '#fff', fontWeight: '600'},
  source: {color: '#BD00FF', marginTop: 4, fontSize: 11, fontWeight: '700'},
});
