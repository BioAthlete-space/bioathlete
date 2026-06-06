import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function AuthLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <Stack screenOptions={{ 
      headerShown: false,
      contentStyle: { backgroundColor: theme.background }
    }} />
  );
}
