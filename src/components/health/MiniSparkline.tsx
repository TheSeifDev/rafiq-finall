/**
 * MiniSparkline - Lightweight SVG-based sparkline for health trends
 * Production-grade, no infinite animations, RTL-safe
 */
import React, { memo, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";

interface MiniSparklineProps {
  data: number[];
  color: string;
  width: number;
  height?: number;
}

export const MiniSparkline = memo(function MiniSparkline({
  data,
  color,
  width,
  height = 28,
}: MiniSparklineProps): React.JSX.Element {
  if (data.length < 2) {
    return <View style={{ width, height }} />;
  }

  const pathData = useMemo(() => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return { x, y };
    });

    if (points.length < 2) return "";

    let d = `M ${points[0].x} ${points[0].y}`;

    // Use smooth curves (quadratic bezier)
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      d += ` Q ${prev.x + (midX - prev.x) * 0.5} ${prev.y}, ${midX} ${(prev.y + curr.y) / 2}`;
      d += ` Q ${midX + (curr.x - midX) * 0.5} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    return d;
  }, [data, width, height]);

  const lastPoint = useMemo(() => {
    if (data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const lastIndex = data.length - 1;
    return {
      x: (lastIndex / (data.length - 1)) * width,
      y: height - ((data[lastIndex] - min) / range) * (height - 4) - 2,
    };
  }, [data, width, height]);

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        {/* Background glow */}
        <Path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.3}
        />
        {/* Main line */}
        <Path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* End point */}
        {lastPoint && (
          <Circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="2.5"
            fill={color}
          />
        )}
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
});