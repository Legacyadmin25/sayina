import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

// Main App Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import EnvelopeListScreen from '../screens/envelopes/EnvelopeListScreen';
import EnvelopeDetailsScreen from '../screens/envelopes/EnvelopeDetailsScreen';
import EnvelopeWizardScreen from '../screens/envelopes/EnvelopeWizardScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import DocumentScreen from '../screens/documents/DocumentScreen';

// Define the main stack navigator params
export type MainStackParamList = {
  MainTabs: undefined;
  EnvelopeDetails: { envelopeId: string };
  EnvelopeWizard: undefined;
  Document: { documentId: string };
};

// Define the bottom tabs navigator params
export type MainTabsParamList = {
  Dashboard: undefined;
  Envelopes: undefined;
  Profile: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<MainTabsParamList>();

// Bottom Tabs Navigator
const MainTabs = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Envelopes') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.secondary,
        headerShown: false,
        tabBarStyle: {
          elevation: 5,
          shadowOpacity: 0.1,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: -2 },
          borderTopWidth: 0,
          paddingTop: 5,
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: 5,
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Envelopes" component={EnvelopeListScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

// Main Stack Navigator
const MainStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerBackTitleVisible: false,
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EnvelopeDetails"
        component={EnvelopeDetailsScreen}
        options={{ title: 'Envelope Details' }}
      />
      <Stack.Screen
        name="EnvelopeWizard"
        component={EnvelopeWizardScreen}
        options={{ title: 'Create Envelope' }}
      />
      <Stack.Screen
        name="Document"
        component={DocumentScreen}
        options={{ title: 'Document' }}
      />
    </Stack.Navigator>
  );
};

export default MainStack;
