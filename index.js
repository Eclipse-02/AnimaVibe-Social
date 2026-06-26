import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import App from './App';

// ── FCM background / quit-state handler ──────────────────────────────────────
// Must be registered here (outside React) so Android can wake the process and
// deliver the message even when the app is fully closed.
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  // The notification is displayed automatically by the system when the app is
  // in the background or quit. This handler is for any additional data work
  // (e.g. caching badge counts). Keep it fast and non-UI.
  console.log('[FCM] Background message:', remoteMessage.messageId);
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App).
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately.
registerRootComponent(App);
