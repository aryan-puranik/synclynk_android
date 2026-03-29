// src/screens/NotificationsScreen.tsx

import { useCallback } from 'react'
import {
  View, Text, StyleSheet,
  TouchableOpacity, FlatList, SafeAreaView,
} from 'react-native'
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { DashboardTabParams } from '../../App'
import { useNotifications } from '../hooks/useNotifications'
import { MirroredNotification } from '../services/notificationService'

type Props = BottomTabScreenProps<DashboardTabParams, 'Notifications'>

// ─── Colour per app name ──────────────────────────────────────────────────────
const PALETTE = ['#1A6FD4','#0F6E56','#BA7517','#534AB7','#C62828','#0F5298']
function appColour(name: string): string {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return PALETTE[h % PALETTE.length]
}

// ─── Format timestamp ─────────────────────────────────────────────────────────
function fmt(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000)   return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  const d = new Date(ts)
  if (d.toDateString() === new Date().toDateString())
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// ─── Single row ───────────────────────────────────────────────────────────────
function NotifRow({ item }: { item: MirroredNotification }) {
  const colour = appColour(item.appName)
  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: colour + '18', borderColor: colour + '40' }]}>
        <Text style={[styles.iconText, { color: colour }]}>
          {item.appName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.appName, { color: colour }]} numberOfLines={1}>
            {item.appName}
          </Text>
          <Text style={styles.time}>{fmt(item.timestamp)}</Text>
        </View>
        {Boolean(item.title) && (
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        )}
        {Boolean(item.body) && (
          <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
        )}
      </View>
    </View>
  )
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export default function NotificationsScreen(_: Props) {
  const {
    permission, isListening, notifications,
    isConnected, hasPermission,
    openSettings, recheckPermission,
    toggleListening, clearHistory,
  } = useNotifications()

  // ── NO PERMISSION ──────────────────────────────────────────────────────────
  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permContainer}>

          <View style={styles.permCard}>
            <Text style={styles.permEmoji}>🔔</Text>
            <Text style={styles.permTitle}>Notification access needed</Text>
            <Text style={styles.permSub}>
              Synclynk needs Notification Access to read your phone's notifications
              and mirror them to your web app in real-time.
            </Text>

            <TouchableOpacity style={styles.permBtn} onPress={openSettings}>
              <Text style={styles.permBtnText}>Open Notification Access Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.recheckBtn} onPress={recheckPermission}>
              <Text style={styles.recheckText}>
                {permission === 'unknown'
                  ? "I've granted access — check again"
                  : 'Permission denied — open settings to grant it'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.stepsCard}>
            <Text style={styles.stepsLabel}>How to grant access</Text>
            {[
              'Tap "Open Notification Access Settings"',
              'Find "Synclynk" in the list',
              'Toggle it ON and confirm',
              'Come back and tap "check again"',
            ].map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepBubble}>
                  <Text style={styles.stepNum}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

        </View>
      </SafeAreaView>
    )
  }

  // ── PERMISSION GRANTED ─────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>

      {/* Status bar */}
      <View style={styles.bar}>
        <View style={styles.barLeft}>
          <View style={[
            styles.dot,
            isListening && isConnected ? styles.dotOn :
            !isConnected              ? styles.dotOff : styles.dotPaused,
          ]} />
          <Text style={styles.barText}>
            {!isConnected
              ? 'Not connected to web app'
              : isListening
                ? `Mirroring · ${notifications.length} captured`
                : 'Paused'}
          </Text>
        </View>
        <View style={styles.barRight}>
          <TouchableOpacity
            style={[styles.toggleBtn, isListening && styles.toggleOn]}
            onPress={toggleListening}
            disabled={!isConnected}
          >
            <Text style={[styles.toggleText, isListening && styles.toggleTextOn]}>
              {isListening ? 'Pause' : 'Resume'}
            </Text>
          </TouchableOpacity>
          {notifications.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearHistory}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Feed */}
      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>{isListening ? '👂' : '⏸'}</Text>
          <Text style={styles.emptyTitle}>
            {isListening ? 'Listening…' : 'Mirroring paused'}
          </Text>
          <Text style={styles.emptySub}>
            {isListening
              ? 'Notifications from any app will appear here\nand be sent to your web app instantly'
              : 'Tap Resume to start mirroring notifications'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <NotifRow item={item} />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListHeaderComponent={() => (
            <Text style={styles.feedLabel}>Recent notifications</Text>
          )}
        />
      )}

    </SafeAreaView>
  )
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0F7FF' },

  // Permission screen
  permContainer: { flex: 1, padding: 20, gap: 16 },
  permCard:      { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#D8E8F8' },
  permEmoji:     { fontSize: 48 },
  permTitle:     { fontSize: 17, fontWeight: '600', color: '#1A3A5C', textAlign: 'center' },
  permSub:       { fontSize: 13, color: '#5A7FA8', textAlign: 'center', lineHeight: 21 },
  permBtn:       { width: '100%', backgroundColor: '#1A6FD4', borderRadius: 12, padding: 15, alignItems: 'center' },
  permBtnText:   { color: '#fff', fontWeight: '600', fontSize: 15 },
  recheckBtn:    { paddingVertical: 10 },
  recheckText:   { color: '#1A6FD4', fontSize: 13, fontWeight: '500', textAlign: 'center' },
  stepsCard:     { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#D8E8F8', gap: 12 },
  stepsLabel:    { fontSize: 11, color: '#8AAAC8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  stepRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBubble:    { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E3F2FD', alignItems: 'center', justifyContent: 'center' },
  stepNum:       { fontSize: 12, fontWeight: '700', color: '#1565C0' },
  stepText:      { fontSize: 13, color: '#2A4A6A', flex: 1, lineHeight: 20 },

  // Main screen
  bar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 11, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#D8E8F8' },
  barLeft:       { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  barRight:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:           { width: 8, height: 8, borderRadius: 4 },
  dotOn:         { backgroundColor: '#22C55E' },
  dotOff:        { backgroundColor: '#C0C0C0' },
  dotPaused:     { backgroundColor: '#F59E0B' },
  barText:       { fontSize: 13, color: '#5A7FA8', fontWeight: '500' },
  toggleBtn:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#D8E8F8', backgroundColor: '#fff' },
  toggleOn:      { borderColor: '#22C55E', backgroundColor: '#E8F5E9' },
  toggleText:    { fontSize: 12, color: '#5A7FA8', fontWeight: '500' },
  toggleTextOn:  { color: '#2E7D32' },
  clearBtn:      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' },
  clearText:     { fontSize: 12, color: '#C62828', fontWeight: '500' },

  // Empty
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyIcon:  { fontSize: 52 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#1A3A5C', textAlign: 'center' },
  emptySub:   { fontSize: 13, color: '#8AAAC8', textAlign: 'center', lineHeight: 22 },

  // List
  list:      { paddingHorizontal: 12, paddingBottom: 40 },
  feedLabel: { fontSize: 11, color: '#8AAAC8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, paddingVertical: 12, paddingHorizontal: 4 },
  sep:       { height: 1, backgroundColor: '#EEF5FF', marginLeft: 56 },

  // Row
  row:        { flexDirection: 'row', alignItems: 'flex-start', padding: 12, backgroundColor: '#fff', borderRadius: 12, gap: 12, marginBottom: 2 },
  icon:       { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  iconText:   { fontSize: 18, fontWeight: '700' },
  rowContent: { flex: 1, gap: 2 },
  rowTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appName:    { fontSize: 12, fontWeight: '600', flex: 1 },
  time:       { fontSize: 11, color: '#8AAAC8', marginLeft: 8 },
  title:      { fontSize: 14, fontWeight: '500', color: '#1A3A5C' },
  body:       { fontSize: 13, color: '#5A7FA8', lineHeight: 18 },
})