// src/services/socket.ts

import { io, Socket } from 'socket.io-client'

// ─── EVENT NAMES ─────────────────────────────────────────────────────────────
export const EVENTS = {
  REGISTER_DEVICE:    'register-device',
  PAIR_WITH_CODE:     'pair-with-code',
  PAIRED:             'paired',
  PAIRED_SUCCESS:     'paired-success',
  PAIRING_ERROR:      'pairing-error',
  PEER_DISCONNECTED:  'peer-disconnected',

  CLIPBOARD_UPDATE:   'clipboard-update',
  CLIPBOARD_SYNC:     'clipboard-sync',
  CLIPBOARD_REQUEST:  'clipboard-request',

  START_STREAM:       'start-stream',
  STOP_STREAM:        'stop-stream',
  STREAM_STARTED:     'stream-started',
  STREAM_STOPPED:     'stream-stopped',
  WEBRTC_OFFER:       'webrtc-offer',
  WEBRTC_ANSWER:      'webrtc-answer',
  WEBRTC_ICE:         'webrtc-ice-candidate',

  NOTIFICATION:           'notification',
  NOTIFICATION_SETTINGS:  'notification-settings',
} as const

export type EventName = typeof EVENTS[keyof typeof EVENTS]

// Shape of what pairingController encodes into the QR
interface QRPayload {
  pairingCode: string  // was "code" in old controller — now fixed
  deviceId:    string  // browser's deviceId
  server:      string  // full server URL — used to connect, no hardcoded IP needed
}

type StatusListener = (connected: boolean) => void
type EventListener  = (data: any) => void

class SocketService {
  private socket:         Socket | null = null
  private statusListeners = new Set<StatusListener>()
  private eventListeners  = new Map<string, Set<EventListener>>()
  private mobileDeviceId: string | null = null

  roomId: string | null = null  // stored after pairing, used in emit payloads

  // ── connect() — called with raw string from QR scanner ───────────────────
  connect(rawQrData: string) {
    let payload: QRPayload

    try {
      payload = JSON.parse(rawQrData)
    } catch {
      console.error('[Socket] QR is not valid JSON:', rawQrData)
      this._fakeError('Invalid QR code — please try again')
      return
    }

    const { pairingCode, deviceId, server } = payload

    if (!pairingCode || !deviceId || !server) {
      console.error('[Socket] QR payload missing fields:', payload)
      this._fakeError('QR code is incomplete — regenerate it on the web app')
      return
    }

    this.mobileDeviceId = `mobile-${deviceId}`
    if (this.socket?.connected) this.socket.disconnect()

    console.log('[Socket] Connecting to server:', server)

    this.socket = io(server, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
      timeout: 15000,
    })

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id)
      this._notifyStatus(true)

      // Step 1 — register as mobile device
      this.socket?.emit(EVENTS.REGISTER_DEVICE, {
        deviceId:   this.mobileDeviceId,
        deviceType: 'mobile',
      })

      // Step 2 — pair with the scanned code
      this.socket?.emit(EVENTS.PAIR_WITH_CODE, {
        pairingCode,
        deviceId: this.mobileDeviceId,
      })
    })

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
      this._notifyStatus(false)
    })

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message)
      this._fakeError(`Cannot reach server: ${err.message}`)
    })

    // Re-register on reconnect — socket.id changes each time
    this.socket.on('reconnect', () => {
      console.log('[Socket] Reconnected — re-registering')
      this.socket?.emit(EVENTS.REGISTER_DEVICE, {
        deviceId:   this.mobileDeviceId,
        deviceType: 'mobile',
      })
    })

    // Cache roomId on successful pairing
    this.socket.on(EVENTS.PAIRED_SUCCESS, ({ roomId }: { roomId: string }) => {
      this.roomId = roomId
      console.log('[Socket] Paired — roomId:', roomId)
    })

    this.socket.on(EVENTS.PAIRED, ({ roomId }: { roomId: string }) => {
      this.roomId = roomId
      console.log('[Socket] Re-joined room:', roomId)
    })

    // Forward all events to registered listeners
    Object.values(EVENTS).forEach((event) => {
      this.socket?.on(event, (data: any) => {
        this.eventListeners.get(event)?.forEach(fn => fn(data))
      })
    })
  }

  disconnect() {
    this.roomId         = null
    this.mobileDeviceId = null
    this.socket?.disconnect()
    this.socket = null
    this._notifyStatus(false)
  }

  emit(event: EventName, data?: any) {
    if (!this.socket?.connected) {
      console.warn('[Socket] Cannot emit — not connected:', event)
      return
    }
    this.socket.emit(event, data)
  }

  on(event: EventName, fn: EventListener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(fn)
    return () => this.eventListeners.get(event)?.delete(fn)
  }

  addStatusListener(fn: StatusListener) {
    this.statusListeners.add(fn)
    return () => this.statusListeners.delete(fn)
  }

  get isConnected() {
    return this.socket?.connected ?? false
  }

  private _notifyStatus(v: boolean) {
    this.statusListeners.forEach(fn => fn(v))
  }

  // Surface errors to QR screen even before socket connects
  private _fakeError(message: string) {
    setTimeout(() => {
      this.eventListeners
        .get(EVENTS.PAIRING_ERROR)
        ?.forEach(fn => fn({ message }))
    }, 100)
  }
}

export const socketService = new SocketService()