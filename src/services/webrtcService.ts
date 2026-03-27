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
    { urls: 'stun:stun2.l.google.com:19302' },
    // Note: For production or cellular data, you SHOULD add a TURN server here.
    // Example: { urls: 'turn:your-turn-server.com', username: 'user', credential: 'password' }
  ],
  iceCandidatePoolSize: 10,
}

export type StreamState  = 'idle' | 'requesting' | 'streaming' | 'stopping' | 'error'
export type CameraFacing = 'front' | 'back'

type StateListener  = (state: StreamState) => void
type StreamListener = (stream: MediaStream | null) => void

class WebRTCService {
  private pc:             RTCPeerConnection | null = null
  private localStream:    MediaStream | null       = null
  private roomId:         string | null            = null
  private stateListeners  = new Set<StateListener>()
  private streamListeners = new Set<StreamListener>()

  state: StreamState = 'idle'

  constructor() {
    this._setupSocketListeners()
  }

  private _setupSocketListeners(): void {
    // 1. Webapp sent its Answer
    socketService.on(EVENTS.WEBRTC_ANSWER, async (data: any) => {
      if (!this.pc) return
      try {
        console.log('[WebRTC] Setting Remote Description (Answer)...')
        await this.pc.setRemoteDescription(new RTCSessionDescription(data.answer))
        console.log('[WebRTC] Remote description set successfully')
      } catch (err) {
        console.error('[WebRTC] setRemoteDescription failed:', err)
        this._setState('error')
      }
    })

    // 2. Webapp sent an ICE candidate
    socketService.on(EVENTS.WEBRTC_ICE, async (data: any) => {
      if (!this.pc || !data.candidate) return
      try {
        // Add candidate to the peer connection
        await this.pc.addIceCandidate(new RTCIceCandidate(data.candidate))
      } catch (err) {
        console.error('[WebRTC] Failed to add remote ICE candidate:', err)
      }
    })

    // 3. Web app requested a stream remotely
    socketService.on(EVENTS.REQUEST_MOBILE_STREAM, () => {
      if (this.state === 'idle' && this.roomId) {
        console.log('[WebRTC] Remote stream request received')
        this.startStream(this.roomId)
      }
    })

    socketService.on(EVENTS.STREAM_STOPPED, () => {
      console.log('[WebRTC] Stream stopped by remote peer')
      this.stopStream()
    })
  }

  async startStream(roomId: string, facing: CameraFacing = 'back'): Promise<boolean> {
    if (this.state === 'streaming' || this.state === 'requesting') return false

    this.roomId = roomId
    this._setState('requesting')

    try {
      console.log('[WebRTC] Starting media capture...')
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: facing === 'back' ? 'environment' : 'user',
          frameRate: 30,
          width: 1280,
          height: 720,
        },
      }) as MediaStream

      this.localStream = stream
      this._notifyStream(stream)

      console.log('[WebRTC] Initializing Peer Connection...')
      this.pc = new RTCPeerConnection(RTC_CONFIG)

      // Add tracks individually
      stream.getTracks().forEach(track => {
        this.pc?.addTrack(track, stream);
      });

      const pc = this.pc as any; // Cast for event property access

      // ICE Candidate Generation
      pc.onicecandidate = (event: any) => {
        if (event.candidate && this.roomId) {
          console.log('[WebRTC] New local ICE candidate generated')
          socketService.emit(EVENTS.WEBRTC_ICE, {
            roomId: this.roomId,
            candidate: event.candidate.toJSON(),
          })
        }
      };

      // Detailed Connection Diagnostics
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log(`[WebRTC] Connection status changed: ${state}`);
        
        if (state === 'connected') this._setState('streaming');
        if (state === 'failed' || state === 'disconnected') {
          console.warn('[WebRTC] Connection failed. This usually implies a NAT/Firewall issue.');
          this._setState('error');
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`[WebRTC] ICE Connection State: ${pc.iceConnectionState}`);
      };

      console.log('[WebRTC] Creating Offer...')
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      })
      await this.pc.setLocalDescription(offer)

      // Send Offer to Web via Signaling
      socketService.emit(EVENTS.START_STREAM, { roomId })
      socketService.emit(EVENTS.WEBRTC_OFFER, {
        roomId,
        offer: this.pc.localDescription,
      })

      return true

    } catch (err: any) {
      console.error('[WebRTC] startStream fatal error:', err)
      this._setState('error')
      this._cleanup()
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

  async switchCamera(): Promise<void> {
    if (!this.localStream || !this.roomId) return
    const roomId = this.roomId
    const currentFacing = this._currentFacing()
    const nextFacing: CameraFacing = currentFacing === 'back' ? 'front' : 'back'
    this.stopStream()
    await new Promise<void>(resolve => setTimeout(resolve, 300))
    await this.startStream(roomId, nextFacing)
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
    return () => { this.stateListeners.delete(fn) }
  }

  addStreamListener(fn: StreamListener): () => void {
    this.streamListeners.add(fn)
    return () => { this.streamListeners.delete(fn) }
  }

  private _cleanup(): void {
    this.localStream?.getTracks().forEach(t => t.stop())
    this.localStream = null
    this._notifyStream(null)
    if (this.pc) {
      const pc = this.pc as any;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      this.pc.close();
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

  private _currentFacing(): CameraFacing {
    const track = this.localStream?.getVideoTracks()[0]
    if (!track) return 'back'
    const settings = (track as any).getSettings?.()
    return settings?.facingMode === 'user' ? 'front' : 'back'
  }
}

export const webrtcService = new WebRTCService()