import { Redirect } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../hooks/useThemeColor';

export default function Index() {
  const { session, role, isLoading } = useAuth();
  const theme = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href={"/auth" as any} />;
  }

  if (role === 'coach') {
    return <Redirect href={"/(coach)" as any} />;
  }

  return <Redirect href={"/(tabs)" as any} />;
}
