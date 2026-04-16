import React from 'react';
import {SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {FlashList} from '@shopify/flash-list';

type LibraryItem = {
  id: string;
  title: string;
  artist: string;
};

const MOCK_DATA: LibraryItem[] = Array.from({length: 2000}, (_, index) => ({
  id: `track-${index}`,
  title: `Track ${index + 1}`,
  artist: 'YT ENV',
}));

export function LibraryScreen(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.root}>
      <FlashList
        data={MOCK_DATA}
        estimatedItemSize={64}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        renderItem={({item}) => (
          <View style={styles.row}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.artist}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#000000'},
  content: {padding: 12},
  row: {padding: 12, borderRadius: 10, marginBottom: 8, backgroundColor: '#151515'},
  title: {color: '#FFFFFF', fontWeight: '600', fontSize: 14},
  subtitle: {color: '#888888', marginTop: 2, fontSize: 12},
});
