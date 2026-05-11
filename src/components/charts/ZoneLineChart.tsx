/**
 * Health Zone Chart Wrapper
 *
 * Wraps react-native-chart-kit with:
 *   - Health zone bands (semi-transparent backgrounds)
 *   - Confidence overlays on data points
 *   - Live indicator with pulse animation
 *   - Medical-grade color system
 *   - RTL-aware labels
 */
import React, { useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../../theme/useTheme';
import { medicalColors } from '../../design/system';
import type { ChartVitalType, HealthZone } from './MedicalChart';

// Re-export types
export type { ChartDataPoint, HealthZone } from './MedicalChart';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 48;

interface ZoneChartProps {
  data: Array<{ labels: string[]; datasets: Array<{ data: number[] }> }>;
  vitalType: ChartVitalType;
  height?: number;
  showZones?: boolean;
  showLiveIndicator?: boolean;
  isRTL?: boolean;
  isAr?: boolean;
  /** Optional custom zones, falls back to vital defaults */
  zones?: HealthZone[];
}

const VITAL_COLORS: Record<ChartVitalType, string> = {
  heart_rate: '#EF4444',
  spo2: '#00C2FF',
  sleep: '#8B5CF6',
  activity: '#F59E0B',
  blood_pressure: '#8B5CF6',
  temperature: '#F97316',
};

const DEFAULT_ZONES: Record<ChartVitalType, Array<{ min: number; max: number; color: string }>> = {
  heart_rate: [
    { min: 0, max: 45, color: 'rgba(239,68,68,0.06)' },
    { min: 50, max: 100, color: 'rgba(16,185,129,0.04)' },
    { min: 100, max: 120, color: 'rgba(245,158,11,0.06)' },
    { min: 120, max: 200, color: 'rgba(239,68,68,0.06)' },
  ],
  spo2: [
    { min: 0, max: 90, color: 'rgba(239,68,68,0.06)' },
    { min: 90, max: 95, color: 'rgba(245,158,11,0.06)' },
    { min: 95, max: 100, color: 'rgba(16,185,129,0.04)' },
  ],
  sleep: [
    { min: 0, max: 6, color: 'rgba(245,158,11,0.06)' },
    { min: 6, max: 9, color: 'rgba(16,185,129,0.04)' },
    { min: 9, max: 24, color: 'rgba(99,102,241,0.06)' },
  ],
  activity: [
    { min: 0, max: 5000, color: 'rgba(245,158,11,0.06)' },
    { min: 5000, max: 10000, color: 'rgba(16,185,129,0.04)' },
    { min: 10000, max: 30000, color: 'rgba(16,185,129,0.06)' },
  ],
  blood_pressure: [
    { min: 0, max: 90, color: 'rgba(99,102,241,0.06)' },
    { min: 90, max: 130, color: 'rgba(16,185,129,0.04)' },
    { min: 130, max: 140, color: 'rgba(245,158,11,0.06)' },
    { min: 140, max: 200, color: 'rgba(239,68,68,0.06)' },
  ],
  temperature: [
    { min: 35, max: 36, color: 'rgba(99,102,241,0.06)' },
    { min: 36, max: 37.2, color: 'rgba(16,185,129,0.04)' },
    { min: 37.2, max: 38, color: 'rgba(245,158,11,0.06)' },
    { min: 38, max: 42, color: 'rgba(239,68,68,0.06)' },
  ],
};

export function ZoneLineChart({
  data,
  vitalType,
  height = 160,
  showZones = true,
  showLiveIndicator = false,
  isRTL = false,
  isAr = false,
  zones,
}: ZoneChartProps): React.JSX.Element {
  const { colors, darkMode } = useTheme();
  const vitalColor = VITAL_COLORS[vitalType];
  const activeZones = zones ?? DEFAULT_ZONES[vitalType];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Pulse animation for live indicator ──
  useEffect(() => {
    if (showLiveIndicator) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [showLiveIndicator]);

  const chartConfig = useMemo(() => ({
    backgroundColor: 'transparent',
    backgroundGradientFrom: darkMode ? '#1C1C1E' : '#FFFFFF',
    backgroundGradientTo: darkMode ? '#1C1C1E' : '#FFFFFF',
    decimalPlaces: vitalType === 'temperature' ? 1 : 0,
    color: () => vitalColor,
    labelColor: () => colors.textSecondary,
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      fill: darkMode ? '#1C1C1E' : '#FFFFFF',
      stroke: vitalColor,
    },
    propsForBackgroundLines: {
      stroke: colors.border + '30',
      strokeDasharray: '3 4',
    },
    fillShadowGradientFrom: vitalColor,
    fillShadowGradientTo: 'transparent',
    fillShadowGradientFromOpacity: 0.15,
    fillShadowGradientToOpacity: 0,
  }), [colors, darkMode, vitalColor, vitalType]);

  const chartData = data[0];
  if (!chartData || chartData.datasets[0].data.length === 0) {
    return <View style={{ height }} />;
  }

  // ── Point decimation (50-max strategy) to keep renders smooth ──
  const decimatedChartData = useMemo(() => {
    if (chartData.datasets[0].data.length <= 50) return chartData;
    const step = Math.ceil(chartData.datasets[0].data.length / 50);
    const decimatedData = chartData.datasets[0].data.filter((_, i) => i % step === 0);
    return {
      labels: chartData.labels.filter((_, i) => i % step === 0),
      datasets: [{ data: decimatedData }],
    };
  }, [chartData.datasets[0].data.length, chartData.labels.length]);

  const graphTop = 40;
  const graphHeight = height - 60;
  const zoneHeight = graphHeight / activeZones.length;

  return (
    <View style={styles.container}>
      {/* Health zone overlay */}
      {showZones && (
        <View style={[StyleSheet.absoluteFill, { height, width: CHART_W }]}>
          {activeZones.map((zone, i) => {
            const minVal = decimatedChartData.datasets[0].data.reduce((a, b) => Math.min(a, b), Infinity);
            const maxVal = decimatedChartData.datasets[0].data.reduce((a, b) => Math.max(a, b), -Infinity);
            const range = maxVal - minVal || 1;
            const zoneMinY = graphTop + graphHeight - ((zone.max - minVal) / range) * graphHeight;
            const zoneMaxY = graphTop + graphHeight - ((zone.min - minVal) / range) * graphHeight;
            return (
              <View key={i} style={{
                position: 'absolute',
                top: zoneMinY,
                height: Math.max(0, zoneMaxY - zoneMinY),
                width: CHART_W,
                backgroundColor: zone.color,
              }} />
            );
          })}
        </View>
      )}

      {/* Chart */}
      <LineChart
        data={decimatedChartData}
        width={CHART_W}
        height={height}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withInnerLines
        withOuterLines={false}
        fromZero={false}
        segments={4}
      />

      {/* Live indicator overlay */}
      {showLiveIndicator && (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[
              styles.liveIndicator,
              {
                backgroundColor: vitalColor,
                transform: [{ scale: pulseAnim }],
                right: 24,
                top: 12,
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  chart: {
    marginLeft: -8,
  },
  liveIndicator: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.6,
  },
});
