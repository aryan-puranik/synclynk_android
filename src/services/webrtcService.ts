// src/services/webrtcService.ts
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc'
import { socketService, EVENTS } from './socket'

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
}

export type StreamState = 'idle' | 'requesting' | 'streaming' | 'stopping' | 'error'
export type CameraFacing = 'front' | 'back'

type StateListener = (state: StreamState) => void
type StreamListener = (stream: MediaStream | null) => void

class WebRTCService {
  private pc: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private roomId: string | null = null

  private stateListeners = new Set<StateListener>()
  private streamListeners = new Set<StreamListener>()

  state: StreamState = 'idle'

  constructor() {
    this._setupSocketListeners()
  }

  // ---------------- SOCKET ----------------
  private _setupSocketListeners(): void {
    socketService.on(EVENTS.WEBRTC_ANSWER, async (data: any) => {
      if (!this.pc) return
      try {
        await this.pc.setRemoteDescription(new RTCSessionDescription(data.answer))
      } catch (err) {
        console.error('[WebRTC] setRemoteDescription failed:', err)
        this._setState('error')
      }
    })

    socketService.on(EVENTS.WEBRTC_ICE, async (data: any) => {
      if (!this.pc || !data.candidate) return
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(data.candidate))
      } catch (err) {
        console.error('[WebRTC] ICE error:', err)
      }
    })

    socketService.on(EVENTS.REQUEST_MOBILE_STREAM, () => {
      if (this.state === 'idle' && this.roomId) {
        this.startStream(this.roomId)
      }
    })

    socketService.on(EVENTS.STREAM_STOPPED, () => {
      this.stopStream()
    })
  }

  // ---------------- STREAM ----------------
  async startStream(roomId: string, facing: CameraFacing = 'back'): Promise<boolean> {
    if (this.state === 'streaming' || this.state === 'requesting') return false

    this.roomId = roomId
    this._setState('requesting')

    try {
      console.log('[WebRTC] Getting media...')

      // ✅ SAFE constraints (FIXED)
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: facing === 'back' ? 'environment' : 'user',
          width: { min: 320, ideal: 640, max: 1280 },
          height: { min: 240, ideal: 480, max: 720 },
          frameRate: { ideal: 24 },
        },
      }) as MediaStream

      this.localStream = stream
      this._notifyStream(stream)

      this.pc = new RTCPeerConnection(RTC_CONFIG)

      stream.getTracks().forEach(track => {
        this.pc?.addTrack(track, stream)
      })

      const pc = this.pc as any

      pc.onicecandidate = (event: any) => {
        if (event.candidate && this.roomId) {
          socketService.emit(EVENTS.WEBRTC_ICE, {
            roomId: this.roomId,
            candidate: event.candidate.toJSON(),
          })
        }
      }

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState
        console.log('[WebRTC] Connection:', state)

        if (state === 'connected') this._setState('streaming')
        if (state === 'failed' || state === 'disconnected') this._setState('error')
      }

      const offer = await this.pc.createOffer()
      await this.pc.setLocalDescription(offer)

      socketService.emit(EVENTS.START_STREAM, { roomId })
      socketService.emit(EVENTS.WEBRTC_OFFER, {
        roomId,
        offer: this.pc.localDescription,
      })

      return true
    } catch (err) {
      console.error('[WebRTC] startStream error:', err)
      this._cleanup()
      this._setState('error')
      return false
    }
  }

  stopStream(): void {
    if (this.state === 'idle') return

    if (this.roomId) {
      socketService.emit(EVENTS.STOP_STREAM, { roomId: this.roomId })
    }

    this._cleanup()
    this._setState('idle')
  }

  // ✅ FIXED CAMERA SWITCH (NO RESTART)
  async switchCamera(): Promise<void> {
    if (!this.localStream) return

    const videoTrack = this.localStream.getVideoTracks()[0] as any

    if (videoTrack && videoTrack._switchCamera) {
      videoTrack._switchCamera()
    } else {
      console.warn('[WebRTC] Camera switch not supported on this device')
    }
  }

  toggleMic(): boolean {
    if (!this.localStream) return false
    const track = this.localStream.getAudioTracks()[0]
    if (!track) return false
    track.enabled = !track.enabled
    return track.enabled
  }

  getLocalStream(): MediaStream | null {
    return this.localStream
  }

  addStateListener(fn: StateListener): () => void {
    this.stateListeners.add(fn)
    return () => this.stateListeners.delete(fn)
  }

  addStreamListener(fn: StreamListener): () => void {
    this.streamListeners.add(fn)
    return () => this.streamListeners.delete(fn)
  }

  private _cleanup(): void {
    this.localStream?.getTracks().forEach(t => t.stop())
    this.localStream = null
    this._notifyStream(null)

    if (this.pc) {
      this.pc.close()
    }

    this.pc = null
    this.roomId = null
  }

  private _setState(newState: StreamState): void {
    this.state = newState
    this.stateListeners.forEach(fn => fn(newState))
  }

  private _notifyStream(stream: MediaStream | null): void {
    this.streamListeners.forEach(fn => fn(stream))
  }
}

export const webrtcService = new WebRTCService()