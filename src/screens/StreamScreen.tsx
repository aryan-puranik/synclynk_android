// src/screens/StreamScreen.tsx
// Camera streaming tab — placeholder for WebRTC build

import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { DashboardTabParams } from '../../App'
import { useSocket } from '../hooks/useSocket'
import { EVENTS } from '../services/socket'

type Props = BottomTabScreenProps<DashboardTabParams, 'Stream'>

export default function StreamScreen({ route }: Props) {
  const { roomId } = route.params
  const { isConnected, emit } = useSocket()

  const handleStartStream = () => {
    emit(EVENTS.START_STREAM, { roomId })
  }

  const handleStopStream = () => {
    emit(EVENTS.STOP_STREAM, { roomId })
  }

  return (
    <ScrollView style={{ backgroundColor: '#F0F7FF' }} contentContainerStyle={styles.container}>

      <View style={styles.card}>
        <Text style={styles.emoji}>📷</Text>
        <Text style={styles.title}>Camera stream</Text>
        <Text style={styles.sub}>
          Stream your phone camera live to the web app using WebRTC peer-to-peer connection.
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Coming next</Text>
        </View>
      </View>

      {/* Signal-only buttons — work now, video UI added in next phase */}
      <View style={styles.actionCard}>
        <Text style={styles.infoLabel}>Signal controls (active)</Text>
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btn, styles.btnStart, !isConnected && styles.disabled]}
            onPress={handleStartStream}
            disabled={!isConnected}
          >
            <Text style={styles.btnStartText}>▶ Start stream</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnStop, !isConnected && styles.disabled]}
            onPress={handleStopStream}
            disabled={!isConnected}
          >
            <Text style={styles.btnStopText}>■ Stop stream</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>
          These signals notify the web app — the camera feed is added in the next build phase with react-native-webrtc.
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>WebRTC setup plan</Text>
        <Text style={styles.infoText}>
          • Install react-native-webrtc{'\n'}
          • Build a custom Expo dev client (required){'\n'}
          • Phone opens camera → creates WebRTC offer{'\n'}
          • Server relays offer/answer/ICE via existing socket{'\n'}
          • Web app displays peer video stream
        </Text>
      </View>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:  { padding: 20, gap: 16, paddingBottom: 40, alignItems: 'center' },
  card:       { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#D8E8F8', width: '100%' },
  emoji:      { fontSize: 48 },
  title:      { fontSize: 18, fontWeight: '600', color: '#1A3A5C' },
  sub:        { fontSize: 14, color: '#5A7FA8', textAlign: 'center', lineHeight: 22 },
  badge:      { backgroundColor: '#E3F2FD', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 5, marginTop: 4 },
  badgeText:  { fontSize: 12, color: '#1565C0', fontWeight: '600' },

  actionCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#D8E8F8', width: '100%', gap: 12 },
  infoLabel:  { fontSize: 11, color: '#8AAAC8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  btnRow:     { flexDirection: 'row', gap: 10 },
  btn:        { flex: 1, borderRadius: 10, padding: 13, alignItems: 'center' },
  btnStart:   { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7' },
  btnStop:    { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#FFCDD2' },
  btnStartText:{ color: '#2E7D32', fontWeight: '600', fontSize: 14 },
  btnStopText: { color: '#C62828', fontWeight: '600', fontSize: 14 },
  disabled:   { opacity: 0.4 },
  hint:       { fontSize: 12, color: '#8AAAC8', lineHeight: 18 },

  infoCard:   { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#D8E8F8', width: '100%' },
  infoText:   { fontSize: 13, color: '#2A4A6A', lineHeight: 24, marginTop: 8 },
})