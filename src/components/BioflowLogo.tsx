import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, Image } from 'react-native';
import { createElement } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '../hooks/useThemeColor';
import { useBioflowState } from '../stores/BioflowStore';
import * as Haptics from 'expo-haptics';
import MaskedView from '@react-native-masked-view/masked-view';

interface BioflowLogoProps {
  size?: number;
  plain?: boolean;
  color?: string;
}

export function BioflowLogo({ size = 28, plain = false, color }: BioflowLogoProps) {
  const theme = useTheme();
  const bioflowState = useBioflowState();
  const logoUri = 'https://nmmqkaljsjualnjlzyfw.supabase.co/storage/v1/object/public/Logo-s/PhotoRoom-20260504_162240.png';

  if (plain) {
    if (Platform.OS === 'web') {
      return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          {createElement('img', { 
            src: logoUri, 
            style: { 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain',
              filter: color ? 'grayscale(100%) opacity(0.6)' : 'none'
            } 
          })}
        </View>
      );
    }
    return (
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <Image 
          source={{ uri: logoUri }}
          style={[{ width: '100%', height: '100%' }, color ? { tintColor: color } : {}]}
          resizeMode="contain"
        />
      </View>
    );
  }

  const scale = useSharedValue(1);
  const innerColor = useSharedValue(theme.primary);
  const outerColor = useSharedValue(theme.secondary);
  const fogScale = useSharedValue(1);

  useEffect(() => {
    // Le brouillard respire doucement en continu à l'intérieur du masque
    fogScale.value = withRepeat(
      withTiming(1.2, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    
    if (bioflowState !== 'idle' && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (bioflowState === 'idle') {
      innerColor.value = withTiming(theme.primary, { duration: 800 });
      outerColor.value = withTiming(theme.secondary, { duration: 800 });
    } else if (bioflowState === 'success') {
      innerColor.value = withTiming('#10B981', { duration: 300 });
      outerColor.value = withTiming('#34D399', { duration: 300 });
    } else if (bioflowState === 'delete' || bioflowState === 'error') {
      innerColor.value = withTiming('#EF4444', { duration: 300 });
      outerColor.value = withTiming('#F87171', { duration: 300 });
    } else if (bioflowState === 'thinking') {
      innerColor.value = withRepeat(
        withSequence(
          withTiming('#8B5CF6', { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(theme.primary, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      outerColor.value = withRepeat(
        withSequence(
          withTiming('#A78BFA', { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(theme.secondary, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [bioflowState, theme.primary, theme.secondary]);

  const innerFogStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: fogScale.value }],
      backgroundColor: innerColor.value,
      opacity: 0.9,
    };
  });

  const outerFogStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: fogScale.value * 1.3 }],
      backgroundColor: outerColor.value,
      opacity: 0.5,
    };
  });

  if (Platform.OS === 'web') {
    const webFogStyle = useAnimatedStyle(() => {
      return {
        backgroundColor: innerColor.value,
        width: '100%',
        height: '100%',
        opacity: 0.9,
        transform: [{ scale: fogScale.value }],
      };
    });

    return (
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        {createElement('div', {
          style: {
            width: '100%',
            height: '100%',
            WebkitMaskImage: `url(${logoUri})`,
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskImage: `url(${logoUri})`,
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
            filter: color ? 'grayscale(100%) opacity(0.6)' : 'none',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }
        }, 
        <Animated.View style={webFogStyle} />
        )}
      </View>
    );
  }

  // Pour le mobile, on utilise MaskedView pour que le "brouillard" vive à l'intérieur du logo !
  return (
    <View style={{ width: size, height: size }}>
      <MaskedView
        style={{ flex: 1 }}
        maskElement={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Image 
              source={{ uri: logoUri }}
              style={{ width: size, height: size }}
              resizeMode="contain"
            />
          </View>
        }
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' }}>
          <Animated.View
            style={[
              styles.fog,
              outerFogStyle,
              { width: size * 1.5, height: size * 1.5, borderRadius: size },
            ]}
          />
          <Animated.View
            style={[
              styles.fog,
              innerFogStyle,
              { width: size, height: size, borderRadius: size },
            ]}
          />
        </View>
      </MaskedView>
    </View>
  );
}

const styles = StyleSheet.create({
  fog: {
    position: 'absolute',
  },
});
