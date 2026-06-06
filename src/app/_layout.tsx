import { Stack } from 'expo-router';
import { useColorScheme, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../providers/AuthProvider';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <AuthProvider>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ contentStyle: { backgroundColor: theme.background }, headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(coach)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </View>
    </AuthProvider>
  );
}
