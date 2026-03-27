// src/hooks/useWebRTC.ts

import { useEffect, useState, useCallback } from 'react'
import { MediaStream } from 'react-native-webrtc'
import { webrtcService, StreamState, CameraFacing } from '../services/webrtcService'
import { useSocketStatus } from './useSocket'

export function useWebRTC(roomId: string) {
  const isConnected                     = useSocketStatus()
  const [streamState, setStreamState]   = useState<StreamState>(webrtcService.state)
  const [localStream, setLocalStream]   = useState<MediaStream | null>(webrtcService.getLocalStream())
  const [micEnabled,  setMicEnabled]    = useState(true)
  const [facing,      setFacing]        = useState<CameraFacing>('back')

  // Sync state and stream from service
  useEffect(() => {
    const removeState  = webrtcService.addStateListener(setStreamState)
    const removeStream = webrtcService.addStreamListener(setLocalStream)
    return () => { removeState(); removeStream() }
  }, [])

  const startStream = useCallback(async () => {
    if (!isConnected || !roomId) return
    await webrtcService.startStream(roomId, facing)
  }, [isConnected, roomId, facing])

  const stopStream = useCallback(() => {
    webrtcService.stopStream()
  }, [])

  const switchCamera = useCallback(async () => {
    const next: CameraFacing = facing === 'back' ? 'front' : 'back'
    setFacing(next)
    await webrtcService.switchCamera()
  }, [facing])

  const toggleMic = useCallback(() => {
    const enabled = webrtcService.toggleMic()
    setMicEnabled(enabled)
  }, [])

  const isStreaming  = streamState === 'streaming'
  const isRequesting = streamState === 'requesting'
  const hasError     = streamState === 'error'

  return {
    streamState,
    localStream,
    micEnabled,
    facing,
    isStreaming,
    isRequesting,
    hasError,
    isConnected,
    startStream,
    stopStream,
    switchCamera,
    toggleMic,
  }
}