// src/services/clipboardService.ts
// React Native equivalent of the webapp's clipboardService.js
// Uses expo-clipboard instead of navigator.clipboard
// Talks to the same server clipboardHandler.js events

import * as ExpoClipboard from 'expo-clipboard'
import { socketService, EVENTS } from './socket'

// ─── TYPES ────────────────────────────────────────────────────────────────────
export interface ClipboardData {
  id:          string
  type:        'text' | 'image'
  content:     string       // preview (truncated for images)
  fullContent: string       // full content
  deviceId:    string
  timestamp:   number
  size:        number
}

export interface ClipboardStatus {
  hasContent:  boolean
  lastUpdated: number | null
  type:        string | null
  historyCount: number
}

type ClipboardEvent =
  | 'sync'       // new content arrived from webapp
  | 'updated'    // server confirmed our send
  | 'cleared'    // clipboard cleared
  | 'empty'      // nothing on server
  | 'history'    // history response
  | 'error'      // something went wrong
  | 'status'     // status response

type Listener = (data?: any) => void

// ─── SERVICE ──────────────────────────────────────────────────────────────────
class MobileClipboardService {
  private listeners    = new Map<ClipboardEvent, Set<Listener>>()
  private lastSynced   = ''         // avoid echo-sending what we just received
  private monitorTimer: any = null  // polling interval for auto-sync
  clipboardData: ClipboardData | null = null
  history:       ClipboardData[]      = []

  constructor() {
    this._setupSocketListeners()
  }

  // ── Socket listeners — mirrors webapp clipboardService.setupSocketListeners()
  private _setupSocketListeners() {
    // Incoming sync from webapp (via server relay)
    socketService.on(EVENTS.CLIPBOARD_SYNC, (data: ClipboardData) => {
      this.clipboardData = data
      this._addToHistory(data)
      this._emit('sync', data)

      // Auto-write to phone clipboard so user can paste immediately
      if (data.type === 'text' && data.fullContent) {
        this.lastSynced = data.fullContent
        ExpoClipboard.setStringAsync(data.fullContent).catch(() => {})
      }
    })

    // Server confirmed our clipboard-update was saved
    socketService.on(EVENTS.CLIPBOARD_UPDATED, ({ success, data }: { success: boolean; data: ClipboardData }) => {
      if (success) {
        this.clipboardData = data
        this._addToHistory(data)
        this._emit('updated', data)
      }
    })

    // History response
    socketService.on(EVENTS.CLIPBOARD_HISTORY_RESPONSE, (history: ClipboardData[]) => {
      this.history = history
      this._emit('history', history)
    })

    // Status response
    socketService.on(EVENTS.CLIPBOARD_STATUS_RESPONSE, (status: ClipboardStatus) => {
      this._emit('status', status)
    })

    // Cleared
    socketService.on(EVENTS.CLIPBOARD_CLEARED, () => {
      this.clipboardData = null
      this._emit('cleared')
    })

    // Empty
    socketService.on(EVENTS.CLIPBOARD_EMPTY, () => {
      this._emit('empty')
    })

    // Error
    socketService.on(EVENTS.CLIPBOARD_ERROR, ({ message }: { message: string }) => {
      this._emit('error', { message })
    })
  }

  // ── Send phone clipboard to server → webapp ───────────────────────────────
  async updateClipboard(roomId: string, type: 'text' | 'image', content: string) {
    if (!roomId) throw new Error('No active room')

    socketService.emit(EVENTS.CLIPBOARD_UPDATE, { roomId, type, content })
    if (type === 'text') this.lastSynced = content
  }

  // ── Read phone clipboard and send if changed ──────────────────────────────
  async syncFromPhoneClipboard(roomId: string): Promise<boolean> {
    try {
      const text = await ExpoClipboard.getStringAsync()
      if (!text || text === this.lastSynced) return false

      await this.updateClipboard(roomId, 'text', text)
      return true
    } catch {
      return false
    }
  }

  // ── Request latest clipboard stored on server ─────────────────────────────
  requestClipboard(roomId: string) {
    if (!roomId) return
    socketService.emit(EVENTS.CLIPBOARD_REQUEST, { roomId })
  }

  // ── Request history ───────────────────────────────────────────────────────
  getHistory(roomId: string, limit = 20) {
    if (!roomId) return
    socketService.emit(EVENTS.CLIPBOARD_HISTORY, { roomId, limit })
  }

  // ── Clear clipboard on server ─────────────────────────────────────────────
  clearClipboard(roomId: string) {
    if (!roomId) return
    socketService.emit(EVENTS.CLIPBOARD_CLEAR, { roomId })
  }

  // ── Get status ────────────────────────────────────────────────────────────
  getStatus(roomId: string) {
    if (!roomId) return
    socketService.emit(EVENTS.CLIPBOARD_STATUS, { roomId })
  }

  // ── Auto-monitor: poll phone clipboard every 2s and sync if changed ───────
  // Mirrors webapp's startMonitoring() interval
  startMonitoring(roomId: string) {
    if (this.monitorTimer) return  // already running

    this.monitorTimer = setInterval(async () => {
      if (!socketService.isConnected || !roomId) return
      await this.syncFromPhoneClipboard(roomId)
    }, 2000)

    console.log('[Clipboard] Auto-monitor started')
  }

  stopMonitoring() {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer)
      this.monitorTimer = null
      console.log('[Clipboard] Auto-monitor stopped')
    }
  }

  // ── Write text to phone system clipboard ──────────────────────────────────
  async copyToPhoneClipboard(text: string): Promise<boolean> {
    try {
      await ExpoClipboard.setStringAsync(text)
      this.lastSynced = text  // don't echo back
      return true
    } catch {
      return false
    }
  }

  // ── Read from phone system clipboard ─────────────────────────────────────
  async readPhoneClipboard(): Promise<string | null> {
    try {
      return await ExpoClipboard.getStringAsync()
    } catch {
      return null
    }
  }

  getCurrentClipboard() { return this.clipboardData }
  getHistoryList()      { return this.history }

  // ── Event emitter ─────────────────────────────────────────────────────────
  on(event: ClipboardEvent, fn: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(fn)
    return () => this.listeners.get(event)?.delete(fn)
  }

  off(event: ClipboardEvent, fn: Listener) {
    this.listeners.get(event)?.delete(fn)
  }

  private _emit(event: ClipboardEvent, data?: any) {
    this.listeners.get(event)?.forEach(fn => fn(data))
  }

  private _addToHistory(data: ClipboardData) {
    this.history = [data, ...this.history].slice(0, 50)
  }
}

export const mobileClipboardService = new MobileClipboardService()