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
    <Svg width={size} height={size * (100 / 220)} viewBox="0 0 220 100">
      {/* Left Piece (C) */}
      <Path 
        d="M 105 15 L 60 15 A 35 35 0 0 0 60 85 L 105 85" 
        fill="none" 
        stroke={iconColor} 
        strokeWidth="30" 
        strokeLinecap="butt" 
      />
      {/* Right Piece (Inverted C) */}
      <Path 
        d="M 115 15 L 160 15 A 35 35 0 0 1 160 85 L 115 85" 
        fill="none" 
        stroke={iconColor} 
        strokeWidth="30" 
        strokeLinecap="butt" 
      />
    </Svg>
  );
};
