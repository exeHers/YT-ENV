import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';

type Props = {
  visible: boolean;
};

export function SyncSuccessOverlay({visible}: Props): React.JSX.Element | null {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.spring(scale, {toValue: 1, useNativeDriver: true, friction: 6}),
      Animated.sequence([
        Animated.timing(opacity, {toValue: 1, duration: 220, useNativeDriver: true}),
        Animated.delay(900),
        Animated.timing(opacity, {toValue: 0, duration: 300, useNativeDriver: true}),
      ]),
    ]).start();
  }, [opacity, scale, visible]);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Animated.View style={[styles.card, {opacity, transform: [{scale}]}]}>
        <Text style={styles.title}>Sync Successful</Text>
        <Text style={styles.subtitle}>Library session is now active.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#130A19',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BD00FF',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  title: {color: '#E7B6FF', fontSize: 18, fontWeight: '800', textAlign: 'center'},
  subtitle: {marginTop: 4, color: '#D9D9D9', fontSize: 12, textAlign: 'center'},
});
