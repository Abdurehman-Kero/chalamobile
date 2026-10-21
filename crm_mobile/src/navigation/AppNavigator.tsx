import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';

import { useAuthStore } from '../store/authStore';
import { useConnectivityStore } from '../store/connectivityStore';
import { BrandLoader } from '../components/BrandLoader';
import { useSyncTriggers } from '../offline/engine';
import { pingServer } from '../api/axios';

import LoginScreen from '../screens/LoginScreen';
import MainTabs from './MainTabs';
import ReportScreen from '../screens/ReportScreen';
import TeamScreen from '../screens/TeamScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isLoading = useAuthStore(s => s.isLoading);
  const restoreSession = useAuthStore(s => s.restoreSession);
  const startMonitoring = useConnectivityStore(s => s.startMonitoring);

  // Sends changes made offline whenever the connection is back.
  useSyncTriggers();

  useEffect(() => {
    restoreSession();
    pingServer();   // starts waking a sleeping server straight away, before anyone taps anything
    return startMonitoring();
  }, [restoreSession, startMonitoring]);

  if (isLoading) return <BrandLoader />;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          // New pages slide in from the right and can be swiped back.
          ...TransitionPresets.SlideFromRightIOS,
          gestureEnabled: true,
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={TransitionPresets.FadeFromBottomAndroid} />
            {/* Owner-only pages, opened from Home and the Account menu */}
            <Stack.Screen name="Report" component={ReportScreen} />
            <Stack.Screen name="Team" component={TeamScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={TransitionPresets.FadeFromBottomAndroid} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
