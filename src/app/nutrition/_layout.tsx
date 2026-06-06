import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../hooks/useThemeColor';

export default function NutritionLayout() {
  const theme = useTheme();
  
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false, 
        presentation: 'modal',
        contentStyle: { backgroundColor: theme.background }
      }}
    >
      <Stack.Screen name="summary" />
      <Stack.Screen name="add" />
      <Stack.Screen name="chat" />
    </Stack>
  );
}
