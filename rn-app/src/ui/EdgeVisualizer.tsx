import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, View} from 'react-native';

type Props = {
  active: boolean;
};

export function EdgeVisualizer({active}: Props): React.JSX.Element {
  const pulse = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {toValue: 0.55, duration: 350, useNativeDriver: false}),
        Animated.timing(pulse, {toValue: 0.15, duration: 450, useNativeDriver: false}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  return (
    <View pointerEvents="none" style={styles.container}>
      <Animated.View style={[styles.edge, styles.top, {opacity: pulse}]} />
      <Animated.View style={[styles.edge, styles.bottom, {opacity: pulse}]} />
      <Animated.View style={[styles.edgeVertical, styles.left, {opacity: pulse}]} />
      <Animated.View style={[styles.edgeVertical, styles.right, {opacity: pulse}]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {...StyleSheet.absoluteFillObject},
  edge: {position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: '#BD00FF'},
  edgeVertical: {position: 'absolute', top: 0, bottom: 0, width: 3, backgroundColor: '#BD00FF'},
  top: {top: 0},
  bottom: {bottom: 0},
  left: {left: 0},
  right: {right: 0},
});
