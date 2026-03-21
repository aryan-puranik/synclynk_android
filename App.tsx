// App.tsx

import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import HomeScreen from './src/screens/HomeScreen'
import QRScanScreen from './src/screens/QRScanScreen'
import DashboardScreen from './src/screens/DashboardScreen'

// Route params — Dashboard now receives roomId (from your server's store)
// instead of a raw sessionToken
export type RootStackParams = {
  Home:      undefined
  QRScan:    undefined
  Dashboard: { roomId: string }
}

const Stack = createNativeStackNavigator<RootStackParams>()

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle:      { backgroundColor: '#F0F7FF' },
          headerTintColor:  '#0A4A8F',
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Synclynk' }}
        />
        <Stack.Screen
          name="QRScan"
          component={QRScanScreen}
          options={{ title: 'Scan QR Code' }}
        />
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: 'Connected', headerBackVisible: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}