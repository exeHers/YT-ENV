import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

export function DNVNSplashScreen(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.logoWrap}>
        <Text style={styles.logo}>YT ENV</Text>
        <Text style={styles.subtitle}>Booting your environment</Text>
      </View>
      <ActivityIndicator size="large" color="#BD00FF" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', gap: 18},
  logoWrap: {alignItems: 'center'},
  logo: {color: '#F8F8F8', fontSize: 28, fontWeight: '900', letterSpacing: 2},
  subtitle: {marginTop: 10, color: '#A8A8A8', fontSize: 12},
});
