import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming} from 'react-native-reanimated';
import {useThemeStore} from '../state/themeStore';

export function EdgeLightWrapper({active}: {active: boolean}): React.JSX.Element {
  const pulse = useSharedValue(0.15);
  const edgeColor = useThemeStore(state => state.edgeColor);
  const edgeSpeedMs = useThemeStore(state => state.edgeSpeedMs);
  const edgeThickness = useThemeStore(state => state.edgeThickness);
  const edgeGlowOpacity = useThemeStore(state => state.edgeGlowOpacity);

  useEffect(() => {
    if (!active) return;
    pulse.value = withRepeat(
      withTiming(edgeGlowOpacity, {
        duration: Math.max(1800, edgeSpeedMs),
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
  }, [active, glowOpacity, pulse, speed]);

  const animated = useAnimatedStyle(() => ({opacity: pulse.value}));

  return (
    <View pointerEvents="none" style={styles.container}>
      <Animated.View style={[styles.edge, styles.top, animated, {height: thickness, backgroundColor: color}]} />
      <Animated.View style={[styles.edge, styles.bottom, animated, {height: edgeThickness, backgroundColor: edgeColor}]} />
      <Animated.View style={[styles.edgeVertical, styles.left, animated, {width: edgeThickness, backgroundColor: edgeColor}]} />
      <Animated.View style={[styles.edgeVertical, styles.right, animated, {width: edgeThickness, backgroundColor: edgeColor}]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {...StyleSheet.absoluteFillObject},
  edge: {position: 'absolute', left: 0, right: 0},
  edgeVertical: {position: 'absolute', top: 0, bottom: 0},
  top: {top: 0},
  bottom: {bottom: 0},
  left: {left: 0},
  right: {right: 0},
});
