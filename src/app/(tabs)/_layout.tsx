import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../hooks/useThemeColor';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { Layout } from '../../constants/Layout';
import { useAthleteProfile } from '../../hooks/useAthleteProfile';

export default function TabLayout() {
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
          height: Platform.OS === 'ios' ? 90 : 80,
          paddingBottom: Platform.OS === 'ios' ? 28 : 20,
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
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarShowLabel: true,
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: 'Séances',
          tabBarIcon: ({ color }) => <MaterialIcons name="calendar-today" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrition',
          tabBarIcon: ({ color }) => <MaterialIcons name="restaurant" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}
