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
import OrdersScreen from '../screens/OrdersScreen';
import ProfileScreen from '../screens/ProfileScreen';

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
            {/* Pages opened from Home: reports, team and orders for the owner, the profile for everyone */}
            <Stack.Screen name="Report" component={ReportScreen} />
            <Stack.Screen name="Team" component={TeamScreen} />
            <Stack.Screen name="Orders" component={OrdersScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={TransitionPresets.FadeFromBottomAndroid} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
