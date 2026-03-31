// src/screens/ClipboardScreen.tsx
import { useState, useCallback } from 'react'
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert
} from 'react-native'
import { useClipboard } from '../hooks/useClipboard'
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { DashboardTabParams } from '../../App'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type Props = BottomTabScreenProps<DashboardTabParams, 'Clipboard'>

export default function ClipboardScreen(_: Props) {
  const insets = useSafeAreaInsets()
  const {
    clipboard, clipboardHistory, isConnected, lastEvent,
    requestClipboard, clearClipboard, copyToPhone, getClipboardHistory,
  } = useClipboard()

  const handleClearHistory = useCallback(() => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to clear all clipboard history from the server?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear All", style: "destructive", onPress: () => clearClipboard() }
      ]
    );
  }, [clearClipboard]);

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const truncate = (text: string, len = 80) =>
    text.length > len ? text.slice(0, len) + '…' : text

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F0F7FF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Connection Status */}
        <View style={styles.statusRow}>
          <View style={[styles.dot, isConnected ? styles.dotOn : styles.dotOff]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Clipboard sync active' : 'Not connected'}
          </Text>
        </View>

        {/* Activity Log */}
        <View style={styles.eventCard}>
          <Text style={styles.sectionLabel}>Last activity</Text>
          <Text style={styles.eventText}>{lastEvent}</Text>
        </View>

        {/* Current Clipboard Item */}
        {clipboard && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionLabel}>Current clipboard</Text>
              <Text style={styles.timestamp}>{formatTime(clipboard.timestamp)}</Text>
            </View>
            <Text style={styles.clipContent}>
              {truncate(clipboard.fullContent || clipboard.content)}
            </Text>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.chipBtn}
                onPress={() => copyToPhone(clipboard.fullContent || clipboard.content)}
              >
                <Text style={styles.chipBtnText}>Copy to phone</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick Sync Controls */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickBtn, !isConnected && styles.disabled]}
            onPress={requestClipboard}
            disabled={!isConnected}
          >
            <Text style={styles.quickBtnText}>↓ Pull from web app</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, !isConnected && styles.disabled]}
            onPress={() => getClipboardHistory(20)}
            disabled={!isConnected}
          >
            <Text style={styles.quickBtnText}>📜 Load history</Text>
          </TouchableOpacity>
        </View>

        {/* History List */}
        {clipboardHistory.length > 0 && (
          <View style={styles.card}>
            <View style={styles.historyHeader}>
              <Text style={styles.sectionLabel}>History ({clipboardHistory.length})</Text>
              <TouchableOpacity onPress={handleClearHistory}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </View>
            
            {clipboardHistory.map((item, i) => (
              <TouchableOpacity
                key={`hist-${item.id}-${i}`}
                style={styles.historyItem}
                onPress={() => copyToPhone(item.fullContent || item.content)}
              >
                <View style={styles.historyLeft}>
                  <Text style={styles.historyText}>
                    {truncate(item.fullContent || item.content, 60)}
                  </Text>
                  <Text style={styles.historyMeta}>
                    {item.type} · {formatTime(item.timestamp)} · {item.deviceId?.includes('mobile') ? '📱' : '💻'}
                  </Text>
                </View>
                <Text style={styles.historyCopy}>Copy</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container:    { padding: 16, gap: 12 },
  statusRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  dot:          { width: 8, height: 8, borderRadius: 4 },
  dotOn:        { backgroundColor: '#22C55E' },
  dotOff:       { backgroundColor: '#C0C0C0' },
  statusText:   { fontSize: 13, color: '#5A7FA8', fontWeight: '500' },
  eventCard:    { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#D8E8F8' },
  sectionLabel: { fontSize: 11, color: '#8AAAC8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  eventText:    { fontSize: 13, color: '#2A4A6A', lineHeight: 20 },
  card:         { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#D8E8F8', gap: 10 },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timestamp:    { fontSize: 11, color: '#8AAAC8' },
  clipContent:  { fontSize: 14, color: '#1A3A5C', lineHeight: 22 },
  cardActions:  { flexDirection: 'row', gap: 8 },
  chipBtn:      { borderWidth: 1, borderColor: '#90CAF9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  chipBtnText:  { fontSize: 12, color: '#1565C0', fontWeight: '500' },
  quickRow:     { flexDirection: 'row', gap: 10 },
  quickBtn:     { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#D8E8F8' },
  quickBtnText: { fontSize: 13, color: '#1A6FD4', fontWeight: '500' },
  disabled:     { opacity: 0.4 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  clearAllText:  { fontSize: 11, color: '#E24B4A', fontWeight: '600', textTransform: 'uppercase' },
  historyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F0F7FF', gap: 8 },
  historyLeft: { flex: 1 },
  historyText: { fontSize: 13, color: '#2A4A6A' },
  historyMeta: { fontSize: 11, color: '#8AAAC8', marginTop: 2 },
  historyCopy: { fontSize: 12, color: '#1A6FD4', fontWeight: '500' },
})