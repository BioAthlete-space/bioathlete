import React, { useEffect, useState } from 'react';
import { Text, TextProps } from 'react-native';

interface AnimatedNumberProps extends TextProps {
  value: number;
  duration?: number;
  format?: (val: number) => string;
}

export function AnimatedNumber({ 
  value, 
  duration = 1200, 
  format = (val) => Math.round(val).toString(),
  ...props 
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      setDisplayValue(easeProgress * value);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [value, duration]);

  return <Text {...props}>{format(displayValue)}</Text>;
}
