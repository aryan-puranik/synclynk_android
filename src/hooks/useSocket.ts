// src/hooks/useSocket.ts
import { useEffect, useRef, useState, useMemo } from 'react'
import { socketService, EventName } from '../services/socket'

type EventListener = (data: any) => void

// ── Listen to one or more socket events ───────────────────────────────────────
export function useSocketEvent(
  event: EventName | EventName[],
  handler: EventListener
) {
  const handlerRef = useRef(handler)
  useEffect(() => { handlerRef.current = handler }, [handler])

  // Memoize events to fix the line 31 dependency error and prevent loops
  const events = useMemo(() => 
    (Array.isArray(event) ? event : [event]), 
    [JSON.stringify(event)]
  )

  useEffect(() => {
    const cleanups = events.map(e =>
      socketService.on(e, (data) => handlerRef.current(data))
    )
    // Fix: Explicitly return void in the cleanup function
    return () => { cleanups.forEach(fn => fn()) }
  }, [events]) 
}

// ── Get reactive connection status ────────────────────────────────────────────
export function useSocketStatus() {
  const [isConnected, setIsConnected] = useState(socketService.isConnected)

  useEffect(() => {
    setIsConnected(socketService.isConnected)
    const removeListener = socketService.addStatusListener(setIsConnected)
    
    // Fix: Wrap the call to ensure the useEffect returns void, not boolean
    return () => {
      removeListener()
    }
  }, [])

  return isConnected
}

// ── Combined hook — status + optional event listener ─────────────────────────
export function useSocket(
  event?: EventName | EventName[],
  handler?: EventListener
) {
  const isConnected = useSocketStatus()

  // Use the event hook logic if parameters are provided
  const events = useMemo(() => {
    if (!event) return []
    return Array.isArray(event) ? event : [event]
  }, [JSON.stringify(event)])

  const handlerRef = useRef(handler)
  useEffect(() => { handlerRef.current = handler }, [handler])

  useEffect(() => {
    if (events.length === 0 || !handler) return

    const cleanups = events.map(e =>
      socketService.on(e, (data) => handlerRef.current?.(data))
    )
    return () => { cleanups.forEach(fn => fn()) }
  }, [events, !!handler])

  return {
    isConnected,
    emit: socketService.emit.bind(socketService),
  }
}