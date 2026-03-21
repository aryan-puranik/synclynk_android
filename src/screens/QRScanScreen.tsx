// src/screens/QRScanScreen.tsx

import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParams } from '../../App'
import { socketService, EVENTS } from '../services/socket'
import { useSocketEvent } from '../hooks/useSocket'

// A simple device ID — in production use expo-device or AsyncStorage for persistence
import { Platform } from 'react-native'
const MOBILE_DEVICE_ID = `mobile-${Platform.OS}-${Date.now()}`

type Props = NativeStackScreenProps<RootStackParams, 'QRScan'>

export default function QRScanScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned]           = useState(false)
  const [status, setStatus]             = useState('Point camera at the QR code on your web app')

  // ── Pairing success ── navigate to Dashboard
  useSocketEvent(EVENTS.PAIRED_SUCCESS, useCallback(({ roomId }: { roomId: string }) => {
    navigation.replace('Dashboard', { roomId })
  }, [navigation]))

  // ── Re-paired after reconnect ── also navigate
  useSocketEvent(EVENTS.PAIRED, useCallback(({ roomId }: { roomId: string }) => {
    navigation.replace('Dashboard', { roomId })
  }, [navigation]))

  // ── Pairing failed
  useSocketEvent(EVENTS.PAIRING_ERROR, useCallback(({ message }: { message: string }) => {
    setStatus(`❌ ${message}`)
    setScanned(false)
  }, []))

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return
    setScanned(true)
    setStatus('Connecting…')
    socketService.connect(data)
  }

  const handleRetry = () => {
    setScanned(false)
    setStatus('Point camera at the QR code on your web app')
    socketService.disconnect()
  }

  // ── Permission not determined yet
  if (!permission) return <View />

  // ── Permission denied
  if (!permission.granted) return (
    <View style={styles.center}>
      <Text style={styles.permTitle}>Camera access needed</Text>
      <Text style={styles.permSub}>
        Synclynk needs camera permission to scan the QR code from your web app
      </Text>
      <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
        <Text style={styles.permBtnText}>Grant Permission</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      <View style={styles.overlay}>
        {/* Top dim */}
        <View style={styles.dim} />

        {/* Middle row */}
        <View style={styles.middleRow}>
          <View style={styles.dim} />
          <View style={styles.scanBox}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
          <View style={styles.dim} />
        </View>

        {/* Bottom dim + status */}
        <View style={[styles.dim, styles.bottomArea]}>
          {scanned && <ActivityIndicator color="#fff" size="large" style={{ marginBottom: 16 }} />}
          <Text style={styles.hint}>{status}</Text>
          {scanned && (
            <TouchableOpacity onPress={handleRetry} style={{ marginTop: 12 }}>
              <Text style={styles.retryLink}>Tap to try again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}

const BOX    = 220
const CORNER = 22

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera:    { flex: 1 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16, backgroundColor: '#F0F7FF' },
  permTitle: { fontSize: 18, fontWeight: '600', color: '#0A4A8F', textAlign: 'center' },
  permSub:   { fontSize: 14, color: '#5A7FA8', textAlign: 'center', lineHeight: 22 },
  permBtn:   { backgroundColor: '#1A6FD4', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  permBtnText:{ color: '#fff', fontWeight: '600', fontSize: 15 },

  overlay:    { position: 'absolute', inset: 0 },
  dim:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  middleRow:  { flexDirection: 'row', height: BOX },
  bottomArea: { alignItems: 'center', justifyContent: 'center' },

  scanBox: { width: BOX, height: BOX },
  corner:  { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#fff', borderWidth: 3 },
  tl: { top: 0,    left: 0,    borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  tr: { top: 0,    right: 0,   borderLeftWidth: 0,  borderBottomWidth: 0, borderTopRightRadius: 4 },
  bl: { bottom: 0, left: 0,    borderRightWidth: 0, borderTopWidth: 0,    borderBottomLeftRadius: 4 },
  br: { bottom: 0, right: 0,   borderLeftWidth: 0,  borderTopWidth: 0,    borderBottomRightRadius: 4 },

  hint:       { color: '#fff', fontSize: 14, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
  retryLink:  { color: '#7EB8FF', fontSize: 13, textDecorationLine: 'underline' },
})