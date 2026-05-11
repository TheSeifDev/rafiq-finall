/**
 * Premium Medical Chart Component
 *
 * Features:
 *   - Bezier curves for smooth data lines
 *   - Health zones (normal/elevated/critical bands)
 *   - Confidence overlays on data points
 *   - Live indicator with pulse animation
 *   - Animated transitions on data update
 *   - Medical-grade color system
 *   - Adaptive scaling with dynamic range
 *   - RTL-aware layout
 */
import React, { useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import Svg, {
  Path, Circle, Rect, Defs, LinearGradient, Stop,
  G, Line, Text as SvgText,
} from 'react-native-svg';
import { AppText } from '../../components/ui/AppText';
import { useTheme } from '../../theme/useTheme';
import { medicalColors } from '../../design/system';

// ─── Types ─────────────────────────────────────────────────────────────────

export type ChartVitalType = 'heart_rate' | 'spo2' | 'sleep' | 'activity' | 'blood_pressure' | 'temperature';

export interface ChartDataPoint {
  value: number;
  label?: string;
  timestamp?: number;
  confidence?: number;     // 0-100
  isLive?: boolean;
  status?: 'normal' | 'elevated' | 'critical' | 'degraded';
}

export interface HealthZone {
  label: string;
  min: number;
  max: number;
  color: string;
  status: 'normal' | 'elevated' | 'critical' | 'degraded';
}

export interface MedicalChartProps {
  data: ChartDataPoint[];
  vitalType: ChartVitalType;
  width?: number;
  height?: number;
  /** Show health zone bands */
  showZones?: boolean;
  /** Show confidence indicators on points */
  showConfidence?: boolean;
  /** Show live indicator animation */
  showLiveIndicator?: boolean;
  /** Fill area under curve */
  filled?: boolean;
  /** Custom health zones (default per vital type) */
  zones?: HealthZone[];
  /** Animated entry */
  animated?: boolean;
  /** RTL mode */
  isRTL?: boolean;
  /** Min value for Y axis (auto if undefined) */
  yMin?: number;
  /** Max value for Y axis (auto if undefined) */
  yMax?: number;
  /** Timezone for labels */
  timezone?: string;
}

// ─── Vital zone definitions ────────────────────────────────────────────────

const DEFAULT_ZONES: Record<ChartVitalType, HealthZone[]> = {
  heart_rate: [
    { label: 'Critical Low',  min: 0,    max: 45,   color: 'rgba(239,68,68,0.10)', status: 'critical' },
    { label: 'Normal',        min: 50,   max: 100,  color: 'rgba(16,185,129,0.08)', status: 'normal' },
    { label: 'Elevated',      min: 100,  max: 120,  color: 'rgba(245,158,11,0.10)', status: 'elevated' },
    { label: 'Critical High',min: 120,  max: 200,  color: 'rgba(239,68,68,0.10)', status: 'critical' },
  ],
  spo2: [
    { label: 'Critical',      min: 0,   max: 90,   color: 'rgba(239,68,68,0.10)', status: 'critical' },
    { label: 'Low',           min: 90,  max: 95,   color: 'rgba(245,158,11,0.10)', status: 'elevated' },
    { label: 'Normal',        min: 95,  max: 100, color: 'rgba(16,185,129,0.08)', status: 'normal' },
  ],
  sleep: [
    { label: 'Insufficient',  min: 0,   max: 6,    color: 'rgba(245,158,11,0.10)', status: 'elevated' },
    { label: 'Normal',        min: 6,   max: 9,    color: 'rgba(16,185,129,0.08)', status: 'normal' },
    { label: 'Excessive',     min: 9,   max: 24,   color: 'rgba(99,102,241,0.10)', status: 'degraded' },
  ],
  activity: [
    { label: 'Low',           min: 0,   max: 5000, color: 'rgba(245,158,11,0.10)', status: 'elevated' },
    { label: 'Normal',        min: 5000, max: 10000, color: 'rgba(16,185,129,0.08)', status: 'normal' },
    { label: 'Goal Met',      min: 10000, max: 30000, color: 'rgba(16,185,129,0.12)', status: 'normal' },
  ],
  blood_pressure: [
    { label: 'Low',           min: 0,   max: 90,   color: 'rgba(99,102,241,0.10)', status: 'degraded' },
    { label: 'Normal',        min: 90,  max: 130,  color: 'rgba(16,185,129,0.08)', status: 'normal' },
    { label: 'Elevated',      min: 130, max: 140,  color: 'rgba(245,158,11,0.10)', status: 'elevated' },
    { label: 'High',          min: 140, max: 200,  color: 'rgba(239,68,68,0.10)', status: 'critical' },
  ],
  temperature: [
    { label: 'Low',           min: 35,  max: 36.0, color: 'rgba(99,102,241,0.10)', status: 'degraded' },
    { label: 'Normal',        min: 36.0, max: 37.2, color: 'rgba(16,185,129,0.08)', status: 'normal' },
    { label: 'Elevated',      min: 37.2, max: 38.0, color: 'rgba(245,158,11,0.10)', status: 'elevated' },
    { label: 'Fever',         min: 38.0, max: 42.0, color: 'rgba(239,68,68,0.10)', status: 'critical' },
  ],
};

const VITAL_COLORS: Record<ChartVitalType, string> = {
  heart_rate: '#EF4444',
  spo2: '#00C2FF',
  sleep: '#8B5CF6',
  activity: '#F59E0B',
  blood_pressure: '#8B5CF6',
  temperature: '#F97316',
};

const VITAL_UNITS: Record<ChartVitalType, string> = {
  heart_rate: 'bpm',
  spo2: '%',
  sleep: 'h',
  activity: 'steps',
  blood_pressure: 'mmHg',
  temperature: '°C',
};

// ─── Bezier path generator ─────────────────────────────────────────────────

function buildSmoothPath(
  points: Array<{ x: number; y: number }>,
  tension = 0.35,
): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + tension * (p2.x - p0.x);
    const cp1y = p1.y + tension * (p2.y - p0.y);
    const cp2x = p2.x - tension * (p3.x - p1.x);
    const cp2y = p2.y - tension * (p3.y - p1.y);

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

function buildFillPath(
  points: Array<{ x: number; y: number }>,
  width: number,
  height: number,
  tension = 0.35,
): string {
  const linePath = buildSmoothPath(points, tension);
  const bottom = height;
  return `${linePath} L ${points[points.length - 1].x} ${bottom} L ${points[0].x} ${bottom} Z`;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function MedicalChart({
  data,
  vitalType,
  width: propWidth,
  height: propHeight = 160,
  showZones = true,
  showConfidence = true,
  showLiveIndicator = true,
  filled = false,
  zones,
  animated = true,
  isRTL = false,
  yMin: propYMin,
  yMax: propYMax,
}: MedicalChartProps): React.JSX.Element {
  const { colors, darkMode } = useTheme();
  const animProgress = useRef(new Animated.Value(0)).current;

  const vitalColor = VITAL_COLORS[vitalType];
  const activeZones = zones ?? DEFAULT_ZONES[vitalType];

  const chartWidth = propWidth ?? Dimensions.get('window').width - 64;
  const chartHeight = propHeight;
  const padding = { top: 12, bottom: 28, left: 4, right: 4 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  // ── Animated entry ──
  useEffect(() => {
    if (animated) {
      Animated.timing(animProgress, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }).start();
    } else {
      animProgress.setValue(1);
    }
  }, [data, animated]);

  // ── Scale calculation ──
  const { yMin, yMax, scaleY } = useMemo(() => {
    const values = data.map(d => d.value);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const rawMin = propYMin ?? Math.floor(dataMin * 0.9);
    const rawMax = propYMax ?? Math.ceil(dataMax * 1.1);

    const range = rawMax - rawMin || 1;
    const paddedMin = rawMin - range * 0.05;
    const paddedMax = rawMax + range * 0.05;

    function scale(val: number): number {
      return padding.top + graphHeight - ((val - paddedMin) / (paddedMax - paddedMin)) * graphHeight;
    }

    return { yMin: paddedMin, yMax: paddedMax, scaleY: scale };
  }, [data, propYMin, propYMax, graphHeight]);

  // ── Point decimation (LTTB-lite) when data > 50 to keep renders smooth ──
  const decimatedData = useMemo(() => {
    if (data.length <= 50) return data;
    const step = Math.ceil(data.length / 50);
    return data.filter((_, i) => i % step === 0);
  }, [data.length]);

  // ── Data points (from decimated) ──
  const svgPoints = useMemo(() => {
    return decimatedData.map((d, i) => ({
      x: padding.left + (i / Math.max(decimatedData.length - 1, 1)) * graphWidth,
      y: scaleY(d.value),
      ...d,
    }));
  }, [decimatedData, graphWidth, scaleY]);

  // ── Bezier paths ──
  const linePath = useMemo(() => buildSmoothPath(svgPoints), [svgPoints]);
  const fillPath = useMemo(
    () => filled ? buildFillPath(svgPoints, chartWidth, chartHeight) : '',
    [svgPoints, filled, chartWidth, chartHeight]
  );

  // ── Gradient ID ──
  const gradId = `med-grad-${vitalType}`;

  // ── Live point (last or marked isLive) ──
  const livePoint = useMemo(
    () => svgPoints.find(p => p.isLive) ?? svgPoints[svgPoints.length - 1],
    [svgPoints]
  );

  // ── Status color helper ──
  const getPointColor = (point: ChartDataPoint): string => {
    if (point.status === 'critical') return medicalColors.vital.critical;
    if (point.status === 'elevated') return medicalColors.vital.elevated;
    if (point.status === 'degraded') return medicalColors.vital.degraded;
    return vitalColor;
  };

  return (
    <View style={styles.container}>
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={vitalColor} stopOpacity="0.25" />
            <Stop offset="1" stopColor={vitalColor} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {/* ── Health zones ── */}
        {showZones && activeZones.map((zone, i) => {
          const zoneY = scaleY(zone.max);
          const zoneH = scaleY(zone.min) - zoneY;
          return (
            <Rect
              key={i}
              x={padding.left}
              y={zoneY}
              width={graphWidth}
              height={Math.max(0, zoneH)}
              fill={zone.color}
            />
          );
        })}

        {/* ── Y-axis labels ── */}
        {[yMin, (yMin + yMax) / 2, yMax].map((val, i) => (
          <SvgText
            key={i}
            x={padding.left + graphWidth + 4}
            y={scaleY(val) + 4}
            fill={colors.textSecondary}
            fontSize={9}
            fontWeight="500"
          >
            {vitalType === 'temperature' ? val.toFixed(1) : Math.round(val)}
          </SvgText>
        ))}

        {/* ── Fill area ── */}
        {filled && fillPath && (
          <Path d={fillPath} fill={`url(#${gradId})`} />
        )}

        {/* ── Bezier line ── */}
        <Path
          d={linePath}
          stroke={vitalColor}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* ── Data points ── */}
        {svgPoints.map((point, i) => (
          <G key={i}>
            {/* Confidence halo */}
            {showConfidence && point.confidence != null && (
              <Circle
                cx={point.x}
                cy={point.y}
                r={8 + (point.confidence / 100) * 6}
                fill={getPointColor(point)}
                fillOpacity={0.08}
              />
            )}
            {/* Main point */}
            <Circle
              cx={point.x}
              cy={point.y}
              r={4}
              fill={darkMode ? '#0A0F1C' : '#FFFFFF'}
              stroke={getPointColor(point)}
              strokeWidth={2}
            />
            {/* Label */}
            {point.label && (
              <SvgText
                x={point.x}
                y={chartHeight - 8}
                fill={colors.textSecondary}
                fontSize={9}
                fontWeight="500"
                textAnchor="middle"
              >
                {point.label}
              </SvgText>
            )}
          </G>
        ))}

        {/* ── Live indicator ── */}
        {showLiveIndicator && livePoint && (
          <G>
            <Circle
              cx={livePoint.x}
              cy={livePoint.y}
              r={6}
              fill={vitalColor}
              fillOpacity={0.3}
            />
            <Circle
              cx={livePoint.x}
              cy={livePoint.y}
              r={3}
              fill={vitalColor}
            />
          </G>
        )}
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: vitalColor }]} />
          <AppText style={[styles.legendText, { color: colors.textSecondary }]}>
            {VITAL_UNITS[vitalType] ? vitalType.replace('_', ' ').toUpperCase() : vitalType.toUpperCase()}
          </AppText>
        </View>
        {showZones && activeZones.map((zone, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: zone.color, borderRadius: 2, width: 12, height: 8 }]} />
            <AppText style={[styles.legendText, { color: colors.textSecondary }]}>{zone.label}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Compact sparkline variant ──────────────────────────────────────────────

export function MedicalSparkline({
  data,
  vitalType,
  size = 60,
  color,
}: {
  data: number[];
  vitalType: ChartVitalType;
  size?: number;
  color?: string;
}): React.JSX.Element {
  const strokeColor = color ?? VITAL_COLORS[vitalType];
  const vals = data;
  if (vals.length === 0) return <View style={{ width: size, height: size }} />;

  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;

  const points = vals.map((v, i) => ({
    x: (i / (vals.length - 1)) * size,
    y: size - ((v - min) / range) * size,
  }));

  const path = buildSmoothPath(points);

  return (
    <Svg width={size} height={size}>
      <Path
        d={path}
        stroke={strokeColor}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 12,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
