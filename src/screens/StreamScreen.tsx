// src/screens/StreamScreen.tsx
import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { RTCView } from 'react-native-webrtc'
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { useWebRTC } from '../hooks/useWebRTC'

export default function StreamScreen({ route }: any) {
  const { roomId } = route.params
  const {
    streamState, localStream, micEnabled, facing,
    isStreaming, isRequesting, isConnected,
    startStream, stopStream, toggleMic, switchCamera
  } = useWebRTC(roomId)

  const [showControls, setShowControls] = useState(true)

  if (!isStreaming) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.idleContainer}>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>{isRequesting ? '⏳' : '📷'}</Text>
            <Text style={styles.placeholderText}>
              {isRequesting ? 'Connecting to Web App...' : 'Ready to Stream'}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.startBtn, !isConnected && styles.disabled]} 
            onPress={startStream}
            disabled={!isConnected || isRequesting}
          >
            <Text style={styles.startBtnText}>{isRequesting ? 'Connecting...' : 'Start Streaming'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <View style={styles.streamRoot}>
      <StatusBar hidden />
      {localStream && (
        <RTCView
          streamURL={localStream.toURL()}
          style={styles.rtcView}
          objectFit="cover"
          mirror={facing === 'front'}
          onTouchStart={() => setShowControls(!showControls)}
        />
      )}
      {showControls && (
        <SafeAreaView style={styles.bottomBar}>
          <View style={styles.controls}>
            <TouchableOpacity onPress={toggleMic}><Text style={styles.ctrlIcon}>{micEnabled ? '🎙' : '🔇'}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.stopBtn} onPress={stopStream}><View style={styles.stopIcon} /></TouchableOpacity>
            <TouchableOpacity onPress={switchCamera}><Text style={styles.ctrlIcon}>🔄</Text></TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F0F7FF' },
  idleContainer: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
  placeholder: { width: '100%', aspectRatio: 16/9, backgroundColor: '#1A2A3A', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  placeholderIcon: { fontSize: 48 },
  placeholderText: { color: '#7AAAC8', marginTop: 12 },
  startBtn: { width: '100%', backgroundColor: '#1A6FD4', padding: 18, borderRadius: 12, marginTop: 24, alignItems: 'center' },
  startBtnText: { color: '#fff', fontWeight: 'bold' },
  disabled: { opacity: 0.5 },
  streamRoot: { flex: 1, backgroundColor: '#000' },
  rtcView: { flex: 1 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  controls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', padding: 20 },
  ctrlIcon: { fontSize: 24, color: '#fff' },
  stopBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  stopIcon: { width: 24, height: 24, backgroundColor: '#E24B4A', borderRadius: 4 }
})