// src/services/notificationHandler.ts
// This file is imported by index.js and registered as a Headless JS task.
// Android calls it every time a new notification arrives — even when the app
// is in the background. It bridges the notification to the React layer via
// DeviceEventEmitter so the notificationService can relay it via socket.

import { DeviceEventEmitter } from 'react-native'

export const NOTIFICATION_EVENT = 'SYNCLYNK_NOTIFICATION'

export interface RawNotification {
  time:               string
  app:                string   // package name e.g. "com.whatsapp"
  title:              string
  titleBig:           string
  text:               string
  subText:            string
  summaryText:        string
  bigText:            string
  audioContentsURI:   string
  imageBackgroundURI: string
  extraInfoText:      string
  groupedMessages:    any[]
}

// This is the headless task function registered in index.js.
// It MUST return a Promise — Android considers the task done when it resolves.
const notificationHandler = async ({ notification }: { notification: string }): Promise<void> => {
  if (!notification) return

  try {
    const parsed: RawNotification = JSON.parse(notification)

    // Skip empty or system notifications
    if (!parsed.app) return
    if (!parsed.title && !parsed.text && !parsed.bigText) return

    // Emit to the React layer — notificationService picks this up
    DeviceEventEmitter.emit(NOTIFICATION_EVENT, parsed)

  } catch (err) {
    console.error('[NotifHandler] Failed to parse notification:', err)
  }
}

export default notificationHandler