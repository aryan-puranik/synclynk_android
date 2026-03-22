// src/hooks/useClipboard.ts
// React Native equivalent of the webapp's useClipboard.js
// Mirrors the same API so both sides behave consistently

import { useState, useEffect, useCallback, useRef } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { mobileClipboardService, ClipboardData, ClipboardStatus } from '../services/clipboardService'
import { socketService } from '../services/socket'
import { useSocketStatus } from './useSocket'

export function useClipboard() {
  const isConnected = useSocketStatus()
  const roomId      = socketService.roomId

  const [clipboard,        setClipboard]        = useState<ClipboardData | null>(
    mobileClipboardService.getCurrentClipboard()
  )
  const [clipboardHistory, setClipboardHistory] = useState<ClipboardData[]>(
    mobileClipboardService.getHistoryList()
  )
  const [isLoading,        setIsLoading]        = useState(false)
  const [lastEvent,        setLastEvent]         = useState<string>('Waiting for activity…')
  const [status,           setStatus]           = useState<ClipboardStatus | null>(null)

  const appStateRef = useRef(AppState.currentState)

  // ── Register service listeners ─────────────────────────────────────────────
  useEffect(() => {
    const removers = [
      // New content arrived from webapp — auto-written to phone clipboard by service
      mobileClipboardService.on('sync', (data: ClipboardData) => {
        setClipboard(data)
        setClipboardHistory(mobileClipboardService.getHistoryList())
        setLastEvent(
          data.type === 'text'
            ? `📋 Received: "${data.fullContent?.slice(0, 60)}"`
            : '📋 Image received from web app'
        )
        setIsLoading(false)
      }),

      // Server confirmed our send
      mobileClipboardService.on('updated', (data: ClipboardData) => {
        setClipboard(data)
        setClipboardHistory(mobileClipboardService.getHistoryList())
        setLastEvent(`✅ Sent to web app: "${data.fullContent?.slice(0, 60)}"`)
      }),

      // History loaded
      mobileClipboardService.on('history', (history: ClipboardData[]) => {
        setClipboardHistory(history)
        setIsLoading(false)
      }),

      // Status loaded
      mobileClipboardService.on('status', (s: ClipboardStatus) => {
        setStatus(s)
      }),

      // Cleared
      mobileClipboardService.on('cleared', () => {
        setClipboard(null)
        setLastEvent('🗑 Clipboard cleared')
      }),

      // Nothing on server
      mobileClipboardService.on('empty', () => {
        setLastEvent('ℹ No clipboard content on server yet')
        setIsLoading(false)
      }),

      // Error
      mobileClipboardService.on('error', ({ message }: { message: string }) => {
        setLastEvent(`❌ Error: ${message}`)
        setIsLoading(false)
      }),
    ]

    return () => removers.forEach(remove => remove())
  }, [])

  // ── Auto-monitor: start/stop based on connection ──────────────────────────
  // Mirrors webapp's useEffect that calls startMonitoring() when connected
  useEffect(() => {
    if (isConnected && roomId) {
      mobileClipboardService.startMonitoring(roomId)
      // Fetch latest from server on connect
      mobileClipboardService.requestClipboard(roomId)
    } else {
      mobileClipboardService.stopMonitoring()
    }

    return () => mobileClipboardService.stopMonitoring()
  }, [isConnected, roomId])

  // ── Pause monitor when app is backgrounded, resume when foregrounded ──────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prev = appStateRef.current
      appStateRef.current = nextState

      if (nextState === 'active' && prev !== 'active' && isConnected && roomId) {
        // App came to foreground — do an immediate sync
        mobileClipboardService.syncFromPhoneClipboard(roomId)
        mobileClipboardService.startMonitoring(roomId)
      } else if (nextState === 'background') {
        mobileClipboardService.stopMonitoring()
      }
    })

    return () => sub.remove()
  }, [isConnected, roomId])

  // ── Actions ───────────────────────────────────────────────────────────────

  // Send text to server → webapp
  const updateClipboard = useCallback(async (type: 'text' | 'image', content: string) => {
    if (!roomId) { setLastEvent('❌ Not connected'); return false }
    try {
      await mobileClipboardService.updateClipboard(roomId, type, content)
      return true
    } catch (e: any) {
      setLastEvent(`❌ ${e.message}`)
      return false
    }
  }, [roomId])

  // Read phone clipboard and send immediately (manual trigger)
  const sendPhoneClipboard = useCallback(async () => {
    if (!roomId) { setLastEvent('❌ Not connected'); return false }
    setIsLoading(true)
    const sent = await mobileClipboardService.syncFromPhoneClipboard(roomId)
    if (!sent) setLastEvent('ℹ Clipboard unchanged — nothing to send')
    setIsLoading(false)
    return sent
  }, [roomId])

  // Fetch latest from server (pull)
  const requestClipboard = useCallback(async () => {
    if (!roomId) return
    setIsLoading(true)
    mobileClipboardService.requestClipboard(roomId)
    // Loading cleared by 'sync' or 'empty' event; timeout as safety net
    setTimeout(() => setIsLoading(false), 5000)
  }, [roomId])

  // Fetch history
  const getClipboardHistory = useCallback((limit = 20) => {
    if (!roomId) return
    setIsLoading(true)
    mobileClipboardService.getHistory(roomId, limit)
  }, [roomId])

  // Clear
  const clearClipboard = useCallback(() => {
    if (!roomId) return
    mobileClipboardService.clearClipboard(roomId)
  }, [roomId])

  // Copy a history item to phone system clipboard
  const copyToPhone = useCallback(async (text: string) => {
    const ok = await mobileClipboardService.copyToPhoneClipboard(text)
    setLastEvent(ok ? '📋 Copied to phone clipboard' : '❌ Failed to copy')
    return ok
  }, [])

  // Get server status
  const getStatus = useCallback(() => {
    if (!roomId) return
    mobileClipboardService.getStatus(roomId)
  }, [roomId])

  return {
    // State
    clipboard,
    clipboardHistory,
    isLoading,
    lastEvent,
    status,
    isConnected,
    roomId,

    // Actions
    updateClipboard,
    sendPhoneClipboard,
    requestClipboard,
    getClipboardHistory,
    clearClipboard,
    copyToPhone,
    getStatus,
  }
}