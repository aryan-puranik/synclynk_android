// src/hooks/useNotifications.ts

import { useState, useEffect, useCallback } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import {
  notificationService,
  MirroredNotification,
  PermissionStatus,
} from '../services/notificationService'
import { useSocketStatus } from './useSocket'
import { socketService } from '../services/socket'

export function useNotifications() {
  const isConnected = useSocketStatus()
  const roomId      = socketService.roomId

  const [permission,    setPermission]    = useState<PermissionStatus>(
    notificationService.permissionStatus
  )
  const [isListening,   setIsListening]   = useState(notificationService.isListening)
  const [notifications, setNotifications] = useState<MirroredNotification[]>(
    notificationService.history
  )

  // ── Permission listener ───────────────────────────────────────────────────
  useEffect(() => {
    const remove = notificationService.addPermListener((s) => {
      setPermission(s)
    })
    // Check on mount
    notificationService.checkPermission()
    return remove
  }, [])

  // ── Notification listener ─────────────────────────────────────────────────
  useEffect(() => {
    const remove = notificationService.addNotifListener(() => {
      // Re-read full history from service on every new notification
      setNotifications([...notificationService.history])
    })
    return remove
  }, [])

  // ── Auto-start when connected + permission granted ────────────────────────
  useEffect(() => {
    if (isConnected && permission === 'authorized') {
      notificationService.startListening()
      setIsListening(true)
    } else if (!isConnected) {
      notificationService.stopListening()
      setIsListening(false)
    }
    return () => {
      notificationService.stopListening()
      setIsListening(false)
    }
  }, [isConnected, permission])

  // ── Pause/resume on app state change ─────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        // Re-check permission when user comes back (may have changed in Settings)
        notificationService.checkPermission()
        if (isConnected && permission === 'authorized') {
          notificationService.startListening()
          setIsListening(true)
        }
      }
    })
    return () => sub.remove()
  }, [isConnected, permission])

  // ── Actions ───────────────────────────────────────────────────────────────
  const openSettings = useCallback(() => {
    notificationService.openSettings()
  }, [])

  const recheckPermission = useCallback(async () => {
    await notificationService.checkPermission()
  }, [])

  const toggleListening = useCallback(() => {
    if (notificationService.isListening) {
      notificationService.stopListening()
      setIsListening(false)
    } else {
      notificationService.startListening()
      setIsListening(true)
    }
  }, [])

  const clearHistory = useCallback(() => {
    setNotifications([])
  }, [])

  return {
    permission,
    isListening,
    notifications,
    isConnected,
    roomId,
    hasPermission: permission === 'authorized',
    openSettings,
    recheckPermission,
    toggleListening,
    clearHistory,
  }
}