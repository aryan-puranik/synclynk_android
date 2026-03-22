// src/services/socket.ts

import { io, Socket } from 'socket.io-client'

export const EVENTS = {
  // Registration & pairing
  REGISTER_DEVICE:    'register-device',
  PAIR_WITH_CODE:     'pair-with-code',
  PAIRED:             'paired',
  PAIRED_SUCCESS:     'paired-success',
  PAIRING_ERROR:      'pairing-error',
  PEER_DISCONNECTED:  'peer-disconnected',

  // Clipboard — matches clipboardHandler.js exactly
  CLIPBOARD_UPDATE:           'clipboard-update',
  CLIPBOARD_SYNC:             'clipboard-sync',
  CLIPBOARD_UPDATED:          'clipboard-updated',
  CLIPBOARD_REQUEST:          'clipboard-request',
  CLIPBOARD_HISTORY:          'clipboard-history',
  CLIPBOARD_HISTORY_RESPONSE: 'clipboard-history-response',
  CLIPBOARD_CLEAR:            'clipboard-clear',
  CLIPBOARD_CLEARED:          'clipboard-cleared',
  CLIPBOARD_EMPTY:            'clipboard-empty',
  CLIPBOARD_ERROR:            'clipboard-error',
  CLIPBOARD_STATUS:           'clipboard-status',
  CLIPBOARD_STATUS_RESPONSE:  'clipboard-status-response',

  // WebRTC
  START_STREAM:   'start-stream',
  STOP_STREAM:    'stop-stream',
  STREAM_STARTED: 'stream-started',
  STREAM_STOPPED: 'stream-stopped',
  WEBRTC_OFFER:   'webrtc-offer',
  WEBRTC_ANSWER:  'webrtc-answer',
  WEBRTC_ICE:     'webrtc-ice-candidate',

  // Notifications
  NOTIFICATION:          'notification',
  NOTIFICATION_SETTINGS: 'notification-settings',
} as const

export type EventName = typeof EVENTS[keyof typeof EVENTS]

interface QRPayload {
  pairingCode: string
  deviceId:    string
  server:      string
}

type StatusListener = (connected: boolean) => void
type EventListener  = (data: any) => void

class SocketService {
  private socket:         Socket | null = null
  private statusListeners = new Set<StatusListener>()
  private eventListeners  = new Map<string, Set<EventListener>>()
  private mobileDeviceId: string | null = null

  roomId: string | null = null

  connect(rawQrData: string) {
    let payload: QRPayload
    try {
      payload = JSON.parse(rawQrData)
    } catch {
      this._fakeError('Invalid QR code — please try again')
      return
    }

    const { pairingCode, deviceId, server } = payload
    if (!pairingCode || !deviceId || !server) {
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
      this.socket?.emit(EVENTS.REGISTER_DEVICE, { deviceId: this.mobileDeviceId, deviceType: 'mobile' })
      this.socket?.emit(EVENTS.PAIR_WITH_CODE,   { pairingCode, deviceId: this.mobileDeviceId })
    })

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
      this._notifyStatus(false)
    })

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] connect_error:', err.message)
      this._fakeError(`Cannot reach server: ${err.message}`)
    })

    this.socket.on('reconnect', () => {
      this.socket?.emit(EVENTS.REGISTER_DEVICE, { deviceId: this.mobileDeviceId, deviceType: 'mobile' })
    })

    this.socket.on(EVENTS.PAIRED_SUCCESS, ({ roomId }: { roomId: string }) => {
      this.roomId = roomId
      console.log('[Socket] Paired — roomId:', roomId)
    })

    this.socket.on(EVENTS.PAIRED, ({ roomId }: { roomId: string }) => {
      this.roomId = roomId
    })

    Object.values(EVENTS).forEach((event) => {
      this.socket?.on(event, (data: any) => {
        this.eventListeners.get(event)?.forEach(fn => fn(data))
      })
    })
  }

  disconnect() {
    this.roomId = null
    this.mobileDeviceId = null
    this.socket?.disconnect()
    this.socket = null
    this._notifyStatus(false)
  }

  emit(event: EventName, data?: any) {
    if (!this.socket?.connected) {
      console.warn('[Socket] Cannot emit:', event)
      return
    }
    this.socket.emit(event, data)
  }

  on(event: EventName, fn: EventListener) {
    if (!this.eventListeners.has(event)) this.eventListeners.set(event, new Set())
    this.eventListeners.get(event)!.add(fn)
    return () => this.eventListeners.get(event)?.delete(fn)
  }

  addStatusListener(fn: StatusListener) {
    this.statusListeners.add(fn)
    return () => this.statusListeners.delete(fn)
  }

  get isConnected() { return this.socket?.connected ?? false }

  private _notifyStatus(v: boolean) { this.statusListeners.forEach(fn => fn(v)) }
  private _fakeError(message: string) {
    setTimeout(() => {
      this.eventListeners.get(EVENTS.PAIRING_ERROR)?.forEach(fn => fn({ message }))
    }, 100)
  }
}

export const socketService = new SocketService()