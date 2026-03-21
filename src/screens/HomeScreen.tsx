// src/screens/HomeScreen.tsx — updated for socket.io

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParams } from '../../App'
import { useSocketStatus } from '../hooks/useSocket'

type Props = NativeStackScreenProps<RootStackParams, 'Home'>

export default function HomeScreen({ navigation }: Props) {
  const isConnected = useSocketStatus()

  return (
    <View style={styles.container}>

      <View style={styles.brand}>
        <Text style={styles.logo}>Synclynk</Text>
        <Text style={styles.tagline}>Connect your phone to your web app</Text>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.dot, isConnected ? styles.dotOn : styles.dotOff]} />
        <Text style={styles.statusText}>
          {isConnected ? 'Connected' : 'Not connected'}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('QRScan')}
      >
        <Text style={styles.buttonText}>Scan QR Code</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>
        Open your Synclynk web app and tap "Connect Device" to get the QR code
      </Text>

    </View>
  )
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F0F7FF', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 24 },
  brand:      { alignItems: 'center', gap: 8 },
  logo:       { fontSize: 36, fontWeight: '700', color: '#0A4A8F', letterSpacing: -0.5 },
  tagline:    { fontSize: 15, color: '#5A7FA8', textAlign: 'center' },
  statusRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#D8E8F8' },
  dot:        { width: 10, height: 10, borderRadius: 5 },
  dotOff:     { backgroundColor: '#C0C0C0' },
  dotOn:      { backgroundColor: '#22C55E' },
  statusText: { fontSize: 14, color: '#4A6A8A', fontWeight: '500' },
  button:     { backgroundColor: '#1A6FD4', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 14, width: '100%', alignItems: 'center', elevation: 6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  hint:       { fontSize: 13, color: '#8AAAC8', textAlign: 'center', lineHeight: 20 },
})