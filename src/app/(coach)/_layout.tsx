import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../hooks/useThemeColor';
import { MaterialIcons } from '@expo/vector-icons';
import { BioflowLogo } from '../../components/BioflowLogo';

export default function CoachTabLayout() {
  const theme = useTheme();
  const isDark = theme.background === '#090A0C';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 74,
          paddingBottom: Platform.OS === 'ios' ? 28 : 16,
          paddingTop: 12,
          position: 'absolute',
        },
        tabBarBackground: () => (
          <BlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={90}
            style={[
              StyleSheet.absoluteFill,
              { 
                borderTopLeftRadius: 32, 
                borderTopRightRadius: 32, 
                overflow: 'hidden',
                borderTopWidth: 1,
                borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              }
            ]}
          />
        ),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mon groupe',
          tabBarIcon: ({ color }) => <MaterialIcons name="groups" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          title: 'Planification',
          tabBarIcon: ({ color }) => <MaterialIcons name="event-note" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Mon profil',
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="subgroups"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="planning/create"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
