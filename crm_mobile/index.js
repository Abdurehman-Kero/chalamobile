/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import notifee from '@notifee/react-native';

// Required by the notification library; tapping an alarm just opens the app.
notifee.onBackgroundEvent(async () => {});

AppRegistry.registerComponent(appName, () => App);
