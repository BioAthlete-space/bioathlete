import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../hooks/useThemeColor';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RingData {
  value: number; // Current value (e.g. 3)
  max: number;   // Max value (e.g. 5)
  color: string; // Hex color
}

interface ActivityRingsProps {
  rings: RingData[];
  size?: number;
  strokeWidth?: number;
}

export const ActivityRings: React.FC<ActivityRingsProps> = ({
  rings,
  size = 120,
  strokeWidth = 12,
}) => {
  const theme = useTheme();
  const center = size / 2;
  const gap = strokeWidth + 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Rotation via style pour éviter l'erreur transform-origin sur le web */}
        <G>
          {rings.map((ring, index) => {
            const radius = center - strokeWidth / 2 - index * gap;
            if (radius <= 0) return null; // Sécurité si trop d'anneaux
            const circumference = 2 * Math.PI * radius;
            
            // Animation value
            const progress = useSharedValue(0);
            
            useEffect(() => {
              const targetProgress = Math.min(Math.max(ring.value / ring.max, 0), 1);
              progress.value = withDelay(
                index * 200, // Décalage pour chaque anneau
                withTiming(targetProgress, {
                  duration: 1200,
                  easing: Easing.out(Easing.cubic),
                })
              );
            }, [ring.value, ring.max]);

            const animatedProps = useAnimatedProps(() => {
              const strokeDashoffset = circumference * (1 - progress.value);
              return {
                strokeDashoffset,
              };
            });

            return (
              <G key={`ring-${index}`}>
                {/* Anneau de fond (Track) */}
                <Circle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={ring.color}
                  strokeWidth={strokeWidth}
                  strokeOpacity={0.2}
                  fill="none"
                />
                {/* Anneau animé (Progress) */}
                <AnimatedCircle
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={ring.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  animatedProps={animatedProps}
                  fill="none"
                />
              </G>
            );
          })}
        </G>
      </Svg>
      {/* Le centre est laissé vide intentionnellement selon la demande de l'utilisateur */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none" />
    </View>
  );
};
