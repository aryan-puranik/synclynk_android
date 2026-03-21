// src/hooks/useSocket.ts
// Replaces useWebSocket.ts — works with the new socketService

import { useEffect, useRef, useState } from 'react'
import { socketService, EventName } from '../services/socket'

type EventListener = (data: any) => void

// ── Listen to one or more socket events ───────────────────────────────────────
export function useSocketEvent(
  event: EventName | EventName[],
  handler: EventListener
) {
  // Store handler in ref so useEffect never re-runs due to handler changing
  const handlerRef = useRef(handler)
  useEffect(() => { handlerRef.current = handler }, [handler])

  useEffect(() => {
    const events = Array.isArray(event) ? event : [event]
    const cleanups = events.map(e =>
      socketService.on(e, (data) => handlerRef.current(data))
    )
    return () => cleanups.forEach(fn => fn())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}

// ── Get reactive connection status ────────────────────────────────────────────
export function useSocketStatus() {
  const [isConnected, setIsConnected] = useState(socketService.isConnected)

  useEffect(()=> {
    // Sync immediately in case status changed before mount
    setIsConnected(socketService.isConnected)
    const remove = socketService.addStatusListener(setIsConnected)
    return remove
  }, [])

  return isConnected
}

// ── Combined hook — status + optional event listener ─────────────────────────
export function useSocket(
  event?: EventName | EventName[],
  handler?: EventListener
) {
  const isConnected = useSocketStatus()

  const handlerRef = useRef(handler)
  useEffect(() => { handlerRef.current = handler }, [handler])

  useEffect(() => {
    if (!event) return
    const events = Array.isArray(event) ? event : [event]
    const cleanups = events.map(e =>
      socketService.on(e, (data) => handlerRef.current?.(data))
    )
    return () => cleanups.forEach(fn => fn())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isConnected,
    emit: socketService.emit.bind(socketService),
  }
}