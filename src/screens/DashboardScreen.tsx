// src/screens/DashboardScreen.tsx

import { useCallback, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParams } from '../../App'
import { useSocket, useSocketEvent } from '../hooks/useSocket'
import { socketService, EVENTS } from '../services/socket'

type Props = NativeStackScreenProps<RootStackParams, 'Dashboard'>

export default function DashboardScreen({ navigation, route }: Props) {
  const { roomId } = route.params
  const { isConnected, emit } = useSocket()
  const [lastEvent, setLastEvent] = useState('Waiting for activity…')

  // ── Incoming events ───────────────────────────────────────────────────────

  useSocketEvent(EVENTS.CLIPBOARD_SYNC, useCallback(({ type, content }: any) => {
    setLastEvent(`📋 Clipboard (${type}): "${String(content).slice(0, 50)}"`)
  }, []))

  useSocketEvent(EVENTS.NOTIFICATION, useCallback((notif: any) => {
    setLastEvent(`🔔 ${notif.app}: ${notif.title}`)
  }, []))

  useSocketEvent(EVENTS.STREAM_STARTED, useCallback(() => {
    setLastEvent('📷 Web app started streaming')
  }, []))

  useSocketEvent(EVENTS.STREAM_STOPPED, useCallback(() => {
    setLastEvent('📷 Stream stopped')
  }, []))

  useSocketEvent(EVENTS.PEER_DISCONNECTED, useCallback(() => {
    setLastEvent('⚠ Web app disconnected — waiting to reconnect…')
  }, []))

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleDisconnect = () => {
    socketService.disconnect()
    navigation.replace('Home')
  }

  const sendTestClipboard = () => {
    emit(EVENTS.CLIPBOARD_UPDATE, {
      roomId,
      type: 'text',
      content: 'Hello from Synclynk mobile! 👋',
    })
    setLastEvent('📋 Sent test clipboard to web app')
  }

  const requestClipboard = () => {
    emit(EVENTS.CLIPBOARD_REQUEST, { roomId })
    setLastEvent('📋 Requested clipboard from web app…')
  }

  return (
    <ScrollView
      style={{ backgroundColor: '#F0F7FF' }}
      contentContainerStyle={styles.container}
    >
      {/* Status card */}
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.dot, isConnected ? styles.dotOn : styles.dotOff]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Session active' : 'Reconnecting…'}
          </Text>
        </View>
        <Text style={styles.roomText}>Room: {roomId}</Text>
      </View>

      {/* Feature tiles */}
      <View style={styles.grid}>
        {[
          { icon: '📋', label: 'Clipboard',     sub: 'Syncing both ways',  bg: '#E8F5E9', accent: '#2E7D32' },
          { icon: '🔔', label: 'Notifications', sub: 'Mirroring active',   bg: '#FFF3E0', accent: '#E65100' },
          { icon: '📷', label: 'Camera',        sub: 'Ready to stream',    bg: '#E3F2FD', accent: '#1565C0' },
          { icon: '🖥️', label: 'Screen',        sub: 'WebRTC ready',       bg: '#F3E5F5', accent: '#6A1B9A' },
        ].map(({ icon, label, sub, bg, accent }) => (
          <View key={label} style={[styles.tile, { backgroundColor: bg }]}>
            <Text style={styles.tileIcon}>{icon}</Text>
            <Text style={[styles.tileLabel, { color: accent }]}>{label}</Text>
            <Text style={styles.tileSub}>{sub}</Text>
          </View>
        ))}
      </View>

      {/* Last event */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Last event</Text>
        <Text style={styles.eventText}>{lastEvent}</Text>
      </View>

      {/* Test actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={sendTestClipboard}>
          <Text style={styles.actionBtnText}>Send clipboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={requestClipboard}>
          <Text style={styles.actionBtnText}>Fetch clipboard</Text>
        </TouchableOpacity>
      </View>

      {/* Disconnect */}
      <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
        <Text style={styles.disconnectText}>Disconnect</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:     { padding: 20, gap: 16, paddingBottom: 40 },
  card:          { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#D8E8F8' },
  row:           { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:           { width: 10, height: 10, borderRadius: 5 },
  dotOn:         { backgroundColor: '#22C55E' },
  dotOff:        { backgroundColor: '#F59E0B' },
  statusText:    { fontSize: 15, fontWeight: '600', color: '#1A3A5C' },
  roomText:      { fontSize: 11, color: '#8AAAC8', marginTop: 4, fontFamily: 'monospace' },
  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile:          { width: '47%', borderRadius: 12, padding: 14, gap: 4 },
  tileIcon:      { fontSize: 24 },
  tileLabel:     { fontSize: 14, fontWeight: '600' },
  tileSub:       { fontSize: 11, color: '#666' },
  sectionLabel:  { fontSize: 11, color: '#8AAAC8', fontWeight: '500', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  eventText:     { fontSize: 13, color: '#2A4A6A', lineHeight: 20 },
  actionsRow:    { flexDirection: 'row', gap: 10 },
  actionBtn:     { backgroundColor: '#E3F2FD', borderRadius: 12, padding: 13, alignItems: 'center', borderWidth: 1, borderColor: '#90CAF9' },
  actionBtnText: { color: '#1565C0', fontWeight: '500', fontSize: 13 },
  disconnectBtn: { borderWidth: 1, borderColor: '#E24B4A', borderRadius: 12, padding: 14, alignItems: 'center' },
  disconnectText:{ color: '#E24B4A', fontWeight: '600', fontSize: 15 },
})