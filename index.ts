// import { registerRootComponent } from 'expo';

// import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
// registerRootComponent(App);
import { AppRegistry } from 'react-native'
import App from './App'
import RNAndroidNotificationListener, {
  RNAndroidNotificationListenerHeadlessJsName
} from 'react-native-notification-listener'
import notificationHandler from './src/services/notificationHandler'

// Register the main app
AppRegistry.registerComponent('main', () => App)

// Register notification headless task — MUST be here, not inside App
AppRegistry.registerHeadlessTask(
  RNAndroidNotificationListenerHeadlessJsName,
  () => notificationHandler
)