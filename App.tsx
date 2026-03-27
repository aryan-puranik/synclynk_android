// App.tsx

import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'

import HomeScreen         from './src/screens/HomeScreen'
import QRScanScreen       from './src/screens/QRScanScreen'
import OverviewScreen     from './src/screens/OverviewScreen'
import ClipboardScreen    from './src/screens/ClipboardScreen'
import NotificationsScreen from './src/screens/NotificationsScreen'
import StreamScreen       from './src/screens/StreamScreen'
import { socketService }  from './src/services/socket'

// ─── TYPES ────────────────────────────────────────────────────────────────────
export type RootStackParams = {
  Home:      undefined
  QRScan:    undefined
  Dashboard: { roomId: string }
}

export type DashboardTabParams = {
  Overview:      { roomId: string }
  Clipboard:     { roomId: string }
  Notifications: { roomId: string }
  Stream:        { roomId: string }
}

const Stack = createNativeStackNavigator<RootStackParams>()
const Tab   = createBottomTabNavigator<DashboardTabParams>()

// ─── TAB ICON helper ──────────────────────────────────────────────────────────
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
}

// ─── DASHBOARD — tab container ────────────────────────────────────────────────
function DashboardTabs({ route, navigation }: any) {
  const { roomId } = route.params

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle:             styles.tabBar,
        tabBarActiveTintColor:   '#1A6FD4',
        tabBarInactiveTintColor: '#8AAAC8',
        tabBarLabelStyle:        styles.tabLabel,
        headerStyle:             { backgroundColor: '#F0F7FF' },
        headerTintColor:         '#0A4A8F',
        headerTitleStyle:        { fontWeight: '600' } as any,
        // Disconnect button in every tab header
        headerRight: () => (
          <TouchableOpacity
            style={styles.disconnectBtn}
            onPress={() => {
              socketService.disconnect()
              navigation.replace('Home')
            }}
          >
            <Text style={styles.disconnectText}>Disconnect</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Tab.Screen
        name="Overview"
        component={OverviewScreen}
        initialParams={{ roomId }}
        options={{
          headerTitle: 'Synclynk',
          tabBarLabel: 'Overview',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Clipboard"
        component={ClipboardScreen}
        initialParams={{ roomId }}
        options={{
          headerTitle: 'Clipboard Sync',
          tabBarLabel: 'Clipboard',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        initialParams={{ roomId }}
        options={{
          headerTitle: 'Notification Mirror',
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔔" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Stream"
        component={StreamScreen}
        initialParams={{ roomId }}
        options={{
          headerTitle: 'Camera Stream',
          tabBarLabel: 'Stream',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📷" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  )
}

// ─── ROOT STACK ───────────────────────────────────────────────────────────────
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle:      { backgroundColor: '#F0F7FF' },
          headerTintColor:  '#0A4A8F',
          headerTitleStyle: { fontWeight: '600' } as any,
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
        {/* headerShown:false — each tab manages its own header */}
        <Stack.Screen
          name="Dashboard"
          component={DashboardTabs}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopColor:  '#D8E8F8',
    borderTopWidth:  1,
    paddingTop:      6,
    paddingBottom:   8,
    height:          62,
  },
  tabLabel: {
    fontSize:   11,
    fontWeight: '500',
    marginTop:  2,
  },
  disconnectBtn: {
    marginRight:       16,
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderRadius:      8,
    borderWidth:       1,
    borderColor:       '#E24B4A',
  },
  disconnectText: {
    color:      '#E24B4A',
    fontSize:   13,
    fontWeight: '600',
  },
})