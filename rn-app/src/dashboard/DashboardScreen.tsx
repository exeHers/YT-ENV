import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useDashboardStore} from '../state/dashboardStore';
import {useThemeStore} from '../state/themeStore';

const formatMs = (ms: number) => {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

export function DashboardScreen(): React.JSX.Element {
  const colors = useThemeStore(state => state.colors);
  const textScale = useThemeStore(state => state.textScale);
  const totalListeningMs = useDashboardStore(state => state.totalListeningMs);
  const totalStreams = useDashboardStore(state => state.totalStreams);
  const adsSkipped = useDashboardStore(state => state.adsSkipped);
  const payoutRate = useDashboardStore(state => state.payoutRatePerStreamUsd);

  const moneyOwed = totalStreams * payoutRate;

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>
      <Text style={[styles.title, {color: colors.text, fontSize: 21 * textScale}]}>Listening Intelligence</Text>
      <Text style={[styles.subtitle, {color: colors.mutedText}]}>Local stats persisted with Zustand + MMKV (when available).</Text>
      <View style={styles.grid}>
        <MetricCard label="Total Listening Time" value={formatMs(totalListeningMs)} colors={colors} />
        <MetricCard label="Streams Pulled from Piped" value={String(totalStreams)} colors={colors} />
        <MetricCard label="Overall Ads Skipped" value={String(adsSkipped)} colors={colors} />
        <MetricCard label="Money Owed to Artists" value={`$${moneyOwed.toFixed(2)}`} colors={colors} />
      </View>
      <View style={[styles.panel, {backgroundColor: colors.surface, borderColor: colors.border}]}>
        <Text style={[styles.panelTitle, {color: colors.accent}]}>Methodology</Text>
        <Text style={[styles.panelText, {color: colors.mutedText}]}>
          Ads skipped is estimated from pulled stream sessions. Artist debt uses average payout rates x stream count.
        </Text>
      </View>
    </View>
  );
}

function MetricCard({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: {surface: string; border: string; text: string; accent: string};
}): React.JSX.Element {
  return (
    <View style={[styles.card, {backgroundColor: colors.surface, borderColor: colors.border}]}>
      <Text style={[styles.cardLabel, {color: colors.accent}]}>{label}</Text>
      <Text style={[styles.cardValue, {color: colors.text}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, padding: 12},
  title: {fontWeight: '800'},
  subtitle: {marginTop: 4, marginBottom: 12, fontSize: 12},
  grid: {gap: 10},
  card: {borderWidth: 1, borderRadius: 12, padding: 12},
  cardLabel: {fontSize: 12, fontWeight: '700'},
  cardValue: {marginTop: 8, fontSize: 24, fontWeight: '800'},
  panel: {marginTop: 12, borderWidth: 1, borderRadius: 12, padding: 12},
  panelTitle: {fontWeight: '700', marginBottom: 6},
  panelText: {fontSize: 12, lineHeight: 18},
});
