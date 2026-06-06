import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing, withDelay } from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SemiCircleProgressProps {
  value: number;
  max: number;
  radius?: number;
  strokeWidth?: number;
  colorStart?: string;
  colorEnd?: string;
  backgroundColor?: string;
  children?: React.ReactNode;
}

export const SemiCircleProgress: React.FC<SemiCircleProgressProps> = ({
  value,
  max,
  radius = 100,
  strokeWidth = 16,
  colorStart = '#3B82F6',
  colorEnd = '#8B5CF6',
  backgroundColor = 'rgba(150, 150, 150, 0.2)',
  children,
}) => {
  const safeMax = max > 0 ? max : 1;
  const percentage = Math.min(Math.max(value / safeMax, 0), 1);
  
  const width = radius * 2 + strokeWidth * 2;
  const height = radius + strokeWidth * 2; // Semi-circle is half height + padding
  
  const cx = width / 2;
  const cy = height - strokeWidth; // Base of the semi-circle

  // Calculate arc length (PI * R)
  const arcLength = Math.PI * radius;
  
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withDelay(300, withTiming(percentage, { 
      duration: 1000,
      easing: Easing.out(Easing.cubic)
    }));
  }, [percentage]);

  const animatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: arcLength - (arcLength * animatedValue.value),
    };
  });

  // SVG Path for a semi-circle: 
  // Move to left edge (cx - radius, cy)
  // Arc to right edge (cx + radius, cy)
  const pathD = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  return (
    <View style={[{ width, height }, styles.container]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={colorStart} />
            <Stop offset="100%" stopColor={colorEnd} />
          </LinearGradient>
        </Defs>

        {/* Background Track */}
        <Path
          d={pathD}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />

        {/* Foreground Progress */}
        <AnimatedPath
          d={pathD}
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={arcLength}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.contentContainer]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
});
