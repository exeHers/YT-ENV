import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming} from 'react-native-reanimated';
import {useSettingsStore} from '../state/settingsStore';

export function EdgeLightWrapper({active}: {active: boolean}): React.JSX.Element {
  const pulse = useSharedValue(0.15);
  const color = String(useSettingsStore(state => state.values['edgeLight.color'] || '#BD00FF'));
  const speed = Number(useSettingsStore(state => state.values['edgeLight.speed'] || 1800));
  const thickness = Number(useSettingsStore(state => state.values['edgeLight.thickness'] || 3));
  const glowOpacity = Number(useSettingsStore(state => state.values['edgeLight.glowOpacity'] || 0.45));

  useEffect(() => {
    if (!active) return;
    pulse.value = withRepeat(
      withTiming(glowOpacity, {
        duration: Math.max(600, speed),
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
      <Animated.View style={[styles.edge, styles.bottom, animated, {height: thickness, backgroundColor: color}]} />
      <Animated.View style={[styles.edgeVertical, styles.left, animated, {width: thickness, backgroundColor: color}]} />
      <Animated.View style={[styles.edgeVertical, styles.right, animated, {width: thickness, backgroundColor: color}]} />
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
