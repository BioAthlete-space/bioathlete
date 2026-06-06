import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../hooks/useThemeColor';

export function AnimatedLogo({ scale = 1 }) {
  const theme = useTheme();
  
  // Orbs animation values
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;
  const anim4 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createLoop = (anim: Animated.Value, duration: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
        ])
      ).start();
    };
    
    createLoop(anim1, 3000);
    createLoop(anim2, 4500);
    createLoop(anim3, 3500);
    createLoop(anim4, 5000);
  }, []);

  const trans1 = {
    transform: [
      { translateX: anim1.interpolate({ inputRange: [0, 1], outputRange: [-20, 100] }) },
      { translateY: anim1.interpolate({ inputRange: [0, 1], outputRange: [-10, 50] }) },
      { scale: anim1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) },
    ]
  };
  
  const trans2 = {
    transform: [
      { translateX: anim2.interpolate({ inputRange: [0, 1], outputRange: [100, 20] }) },
      { translateY: anim2.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
      { scale: anim2.interpolate({ inputRange: [0, 1], outputRange: [1.2, 0.8] }) },
    ]
  };

  const trans3 = {
    transform: [
      { translateX: anim3.interpolate({ inputRange: [0, 1], outputRange: [50, 150] }) },
      { translateY: anim3.interpolate({ inputRange: [0, 1], outputRange: [80, 20] }) },
      { scale: anim3.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.3] }) },
    ]
  };

  const trans4 = {
    transform: [
      { translateX: anim4.interpolate({ inputRange: [0, 1], outputRange: [160, 60] }) },
      { translateY: anim4.interpolate({ inputRange: [0, 1], outputRange: [-20, 60] }) },
      { scale: anim4.interpolate({ inputRange: [0, 1], outputRange: [1.1, 1.5] }) },
    ]
  };

  const WIDTH = 220;
  const HEIGHT = 125;

  const logoPath = "M 105 0 L 50 0 A 50 50 0 0 0 50 100 L 105 100 L 105 75 L 50 75 A 25 25 0 0 1 50 25 L 105 25 Z M 115 25 L 170 25 A 50 50 0 0 1 170 125 L 115 125 L 115 100 L 170 100 A 25 25 0 0 0 170 50 L 115 50 Z";

  return (
    <View style={{ width: WIDTH, height: HEIGHT, transform: [{ scale }] }}>
      
      {/* 1. LAYER DU DESSOUS : Fond noir strictement limité à la forme du logo */}
      <Svg width="100%" height="100%" viewBox="0 0 220 125" style={{ position: 'absolute' }}>
        <Path d={logoPath} fill="#111" />
      </Svg>

      {/* 2. LAYER DU MILIEU : Les orbes de lumière animées (elles vont dépasser) */}
      <Animated.View style={[styles.orb, { backgroundColor: '#FF1493', top: 0, left: 0 }, trans1]} />
      <Animated.View style={[styles.orb, { backgroundColor: '#FF8C00', top: 20, left: 50 }, trans2]} />
      <Animated.View style={[styles.orb, { backgroundColor: '#FFD700', top: 40, left: 100 }, trans3]} />
      <Animated.View style={[styles.orb, { backgroundColor: '#00BFFF', top: 10, left: 140 }, trans4]} />
      
      {/* 3. LAYER DU DESSUS : Masque de découpe qui recouvre tout CE QUI DEPASSE de la couleur du fond de l'application */}
      <Svg width="100%" height="100%" viewBox="0 0 220 125" style={{ position: 'absolute' }}>
        <Path 
          d={`
            M -500 -500 L 1000 -500 L 1000 1000 L -500 1000 Z
            ${logoPath}
          `} 
          fill={theme.background} 
          fillRule="evenodd" 
        />
      </Svg>

    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.9,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 20,
  }
});
