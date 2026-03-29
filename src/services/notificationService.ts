// src/services/notificationService.ts
// Manages:
//   1. Checking / requesting Notification Access permission
//   2. Listening for DeviceEventEmitter events from the headless task
//   3. Relaying notifications to the webapp via socket
//   4. Maintaining local history for the UI

import { DeviceEventEmitter } from 'react-native'
import RNAndroidNotificationListener from 'react-native-notification-listener'
import { socketService, EVENTS } from './socket'
import { NOTIFICATION_EVENT, RawNotification } from './notificationHandler'

// ─── TYPES ────────────────────────────────────────────────────────────────────
export interface MirroredNotification {
  id:        string
  app:       string      // package name
  appName:   string      // human-readable name
  title:     string
  body:      string
  timestamp: number
}

export type PermissionStatus = 'authorized' | 'denied' | 'unknown'

type NotifListener = (notif: MirroredNotification) => void
type PermListener  = (status: PermissionStatus) => void

// ─── APP NAME MAP ─────────────────────────────────────────────────────────────
const APP_NAMES: Record<string, string> = {
  'com.whatsapp':                      'WhatsApp',
  'com.whatsapp.w4b':                  'WhatsApp Business',
  'com.instagram.android':             'Instagram',
  'com.facebook.katana':               'Facebook',
  'com.facebook.orca':                 'Messenger',
  'com.twitter.android':               'X (Twitter)',
  'com.google.android.gm':             'Gmail',
  'com.microsoft.teams':               'Microsoft Teams',
  'com.slack':                         'Slack',
  'org.telegram.messenger':            'Telegram',
  'com.discord':                       'Discord',
  'com.snapchat.android':              'Snapchat',
  'com.linkedin.android':              'LinkedIn',
  'com.google.android.apps.messaging': 'Messages',
  'com.samsung.android.messaging':     'Samsung Messages',
}

function getAppName(pkg: string): string {
  if (APP_NAMES[pkg]) return APP_NAMES[pkg]
  // Fall back to last segment of package name, capitalised
  const parts = pkg.split('.')
  const last   = parts[parts.length - 1]
  return last.charAt(0).toUpperCase() + last.slice(1)
}

// ─── SERVICE ──────────────────────────────────────────────────────────────────
class NotificationService {
  private emitterSubscription: any       = null
  private notifListeners = new Set<NotifListener>()
  private permListeners  = new Set<PermListener>()
  private _history:        MirroredNotification[] = []
  private _isListening     = false

  permissionStatus: PermissionStatus = 'unknown'

  // ── Check Notification Access permission ──────────────────────────────────
  async checkPermission(): Promise<PermissionStatus> {
    try {
      const status = await RNAndroidNotificationListener.getPermissionStatus()
      // Returns 'authorized' | 'denied' | 'unknown'
      this.permissionStatus = status as PermissionStatus
      this.permListeners.forEach(fn => fn(this.permissionStatus))
      return this.permissionStatus
    } catch (err) {
      console.error('[Notif] checkPermission error:', err)
      return 'unknown'
    }
  }

  // ── Open Android Notification Access settings ─────────────────────────────
  // User must manually enable Synclynk in Settings → Apps → Special app access
  openSettings(): void {
    try {
      RNAndroidNotificationListener.requestPermission()
    } catch (err) {
      console.error('[Notif] openSettings error:', err)
    }
  }

  // ── Start listening — subscribe to DeviceEventEmitter ────────────────────
  startListening(): void {
    if (this._isListening) return

    this.emitterSubscription = DeviceEventEmitter.addListener(
      NOTIFICATION_EVENT,
      (raw: RawNotification) => this._handleRaw(raw)
    )

    this._isListening = true
    console.log('[Notif] Listening started')
  }

  // ── Stop listening ────────────────────────────────────────────────────────
  stopListening(): void {
    if (!this._isListening) return
    this.emitterSubscription?.remove()
    this.emitterSubscription = null
    this._isListening = false
    console.log('[Notif] Listening stopped')
  }

  get isListening(): boolean { return this._isListening }
  get history(): MirroredNotification[] { return this._history }

  // ── Listeners ─────────────────────────────────────────────────────────────
  addNotifListener(fn: NotifListener): () => void {
    this.notifListeners.add(fn)
    return () => this.notifListeners.delete(fn)
  }

  addPermListener(fn: PermListener): () => void {
    this.permListeners.add(fn)
    return () => this.permListeners.delete(fn)
  }

  // ── Handle raw notification from headless task ────────────────────────────
  private _handleRaw(raw: RawNotification): void {
    const roomId = socketService.roomId

    // Skip our own app's notifications to prevent echo
    if (raw.app?.includes('synclynk')) return
    if (!raw.app) return

    const notif: MirroredNotification = {
      id:        `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      app:       raw.app,
      appName:   getAppName(raw.app),
      title:     raw.title      || raw.titleBig || '',
      body:      raw.bigText    || raw.text     || raw.subText || '',
      timestamp: raw.time ? parseInt(raw.time, 10) : Date.now(),
    }

    // Add to history (keep last 50)
    this._history = [notif, ...this._history].slice(0, 50)

    // Notify React UI
    this.notifListeners.forEach(fn => fn(notif))

    // Relay to webapp if connected
    if (roomId && socketService.isConnected) {
      socketService.emit(EVENTS.NOTIFICATION, {
        roomId,
        notification: notif,
      })
      console.log(`[Notif] Relayed: ${notif.appName} — ${notif.title}`)
    }
  }
}

export const notificationService = new NotificationService()