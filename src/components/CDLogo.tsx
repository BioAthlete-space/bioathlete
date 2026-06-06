import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../hooks/useThemeColor';

interface CDLogoProps {
  size?: number;
  color?: string;
}

export const CDLogo: React.FC<CDLogoProps> = ({ size = 150, color }) => {
  const theme = useTheme();
  const iconColor = color || theme.text;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Left Piece (C) */}
      <Path 
        d="M 48 25 L 35 25 A 25 25 0 0 0 35 75 L 48 75" 
        fill="none" 
        stroke={iconColor} 
        strokeWidth="16" 
        strokeLinecap="butt" 
      />
      {/* Right Piece (Inverted C) */}
      <Path 
        d="M 52 25 L 65 25 A 25 25 0 0 1 65 75 L 52 75" 
        fill="none" 
        stroke={iconColor} 
        strokeWidth="16" 
        strokeLinecap="butt" 
      />
    </Svg>
  );
};
