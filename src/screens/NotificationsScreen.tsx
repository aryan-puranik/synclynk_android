// src/screens/NotificationsScreen.tsx
// Notification mirroring tab — placeholder for next feature build

import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { DashboardTabParams } from '../../App'
import { useSocketStatus } from '../hooks/useSocket'

type Props = BottomTabScreenProps<DashboardTabParams, 'Notifications'>

export default function NotificationsScreen({ route }: Props) {
  const isConnected = useSocketStatus()

  return (
    <ScrollView style={{ backgroundColor: '#F0F7FF' }} contentContainerStyle={styles.container}>

      <View style={styles.statusRow}>
        <View style={[styles.dot, isConnected ? styles.dotOn : styles.dotOff]} />
        <Text style={styles.statusText}>
          {isConnected ? 'Connected' : 'Not connected'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.emoji}>🔔</Text>
        <Text style={styles.title}>Notification mirroring</Text>
        <Text style={styles.sub}>
          Phone notifications will appear here in real-time and be relayed to your web app.
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Coming next</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>How it works</Text>
        <Text style={styles.infoText}>
          • Phone grants Notification Listener permission{'\n'}
          • App reads incoming notifications{'\n'}
          • Forwards them to web app over the active session{'\n'}
          • Web app displays them in a notification panel
        </Text>
      </View>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:  { padding: 20, gap: 16, paddingBottom: 40, alignItems: 'center' },
  statusRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  dotOn:      { backgroundColor: '#22C55E' },
  dotOff:     { backgroundColor: '#C0C0C0' },
  statusText: { fontSize: 13, color: '#5A7FA8' },

  card:       { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#D8E8F8', width: '100%' },
  emoji:      { fontSize: 48 },
  title:      { fontSize: 18, fontWeight: '600', color: '#1A3A5C' },
  sub:        { fontSize: 14, color: '#5A7FA8', textAlign: 'center', lineHeight: 22 },
  badge:      { backgroundColor: '#FFF3E0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 5, marginTop: 4 },
  badgeText:  { fontSize: 12, color: '#E65100', fontWeight: '600' },

  infoCard:   { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#D8E8F8', width: '100%' },
  infoLabel:  { fontSize: 11, color: '#8AAAC8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  infoText:   { fontSize: 13, color: '#2A4A6A', lineHeight: 24 },
})