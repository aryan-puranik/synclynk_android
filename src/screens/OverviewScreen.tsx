// src/screens/OverviewScreen.tsx
import { useCallback, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { DashboardTabParams } from '../../App'
import { useSocket, useSocketEvent } from '../hooks/useSocket'
import { EVENTS } from '../services/socket'
import { useSafeAreaInsets } from 'react-native-safe-area-context' // Import safe area hook

type Props = BottomTabScreenProps<DashboardTabParams, 'Overview'>

const TILES = [
  { emoji: '📋', label: 'Clipboard',     sub: 'Auto-syncing both ways',   tab: 'Clipboard',     bg: '#E8F5E9', accent: '#2E7D32' },
  { emoji: '🔔', label: 'Notifications', sub: 'Mirroring to web app',     tab: 'Notifications', bg: '#FFF3E0', accent: '#E65100' },
  { emoji: '📷', label: 'Camera stream', sub: 'Tap to start streaming',   tab: 'Stream',        bg: '#E3F2FD', accent: '#1565C0' },
  { emoji: '🖥️', label: 'Screen',        sub: 'WebRTC ready',             tab: null,            bg: '#F3E5F5', accent: '#6A1B9A' },
] as const

export default function OverviewScreen({ route, navigation }: Props) {
  const { roomId } = route.params
  const { isConnected } = useSocket()
  const [events, setEvents] = useState<string[]>(['Session started'])
  const insets = useSafeAreaInsets() // Get system insets

  const addEvent = useCallback((msg: string) => {
    setEvents(prev => [msg, ...prev].slice(0, 8))
  }, [])

  useSocketEvent(EVENTS.CLIPBOARD_SYNC, useCallback(() => {
    addEvent('📋 Clipboard synced from web app')
  }, [addEvent]))

  useSocketEvent(EVENTS.CLIPBOARD_UPDATED, useCallback(() => {
    addEvent('📋 Clipboard sent to web app')
  }, [addEvent]))

  useSocketEvent(EVENTS.NOTIFICATION, useCallback((n: any) => {
    addEvent(`🔔 ${n.app}: ${n.title}`)
  }, [addEvent]))

  useSocketEvent(EVENTS.STREAM_STARTED, useCallback(() => {
    addEvent('📷 Stream started')
  }, [addEvent]))

  useSocketEvent(EVENTS.STREAM_STOPPED, useCallback(() => {
    addEvent('📷 Stream stopped')
  }, [addEvent]))

  useSocketEvent(EVENTS.PEER_DISCONNECTED, useCallback(() => {
    addEvent('⚠ Web app disconnected')
  }, [addEvent]))

  return (
    <ScrollView 
      style={{ backgroundColor: '#F0F7FF' }} 
      contentContainerStyle={[
        styles.container, 
        { paddingBottom: insets.bottom + 30 } // Add safe area to bottom padding
      ]}
    >

      {/* Status card */}
      <View style={styles.statusCard}>
        <View style={styles.row}>
          <View style={[styles.dot, isConnected ? styles.dotOn : styles.dotOff]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Session active' : 'Reconnecting…'}
          </Text>
        </View>
        <Text style={styles.roomText}>Room: {roomId}</Text>
      </View>

      {/* Feature tiles — tap to jump to that tab */}
      <View style={styles.grid}>
        {TILES.map(({ emoji, label, sub, tab, bg, accent }) => (
          <TouchableOpacity
            key={label}
            style={[styles.tile, { backgroundColor: bg }]}
            onPress={() => tab && navigation.navigate(tab as any, { roomId })}
            activeOpacity={tab ? 0.7 : 1}
          >
            <Text style={styles.tileEmoji}>{emoji}</Text>
            <Text style={[styles.tileLabel, { color: accent }]}>{label}</Text>
            <Text style={styles.tileSub}>{sub}</Text>
            {tab && <Text style={[styles.tileArrow, { color: accent }]}>→</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {/* Activity feed */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Activity</Text>
        {events.map((e, i) => (
          <View key={i} style={[styles.eventRow, i > 0 && styles.eventBorder]}>
            <Text style={[styles.eventText, i === 0 && styles.eventLatest]}>{e}</Text>
          </View>
        ))}
      </View>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:   { padding: 16, gap: 14, paddingBottom: 30 },
  statusCard:  { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#D8E8F8', gap: 6 },
  row:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:         { width: 10, height: 10, borderRadius: 5 },
  dotOn:       { backgroundColor: '#22C55E' },
  dotOff:      { backgroundColor: '#F59E0B' },
  statusText:  { fontSize: 15, fontWeight: '600', color: '#1A3A5C' },
  roomText:    { fontSize: 11, color: '#8AAAC8', fontFamily: 'monospace' },

  grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile:        { width: '47%', borderRadius: 14, padding: 14, gap: 3 },
  tileEmoji:   { fontSize: 26, marginBottom: 4 },
  tileLabel:   { fontSize: 14, fontWeight: '600' },
  tileSub:     { fontSize: 11, color: '#555', lineHeight: 16 },
  tileArrow:   { fontSize: 13, fontWeight: '600', marginTop: 6 },

  card:        { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#D8E8F8' },
  sectionLabel:{ fontSize: 11, color: '#8AAAC8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  eventRow:    { paddingVertical: 8 },
  eventBorder: { borderTopWidth: 1, borderTopColor: '#F0F7FF' },
  eventText:   { fontSize: 13, color: '#5A7FA8', lineHeight: 20 },
  eventLatest: { color: '#1A3A5C', fontWeight: '500' },
})