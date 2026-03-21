export const MSG = {
  // Pairing
  PAIR_REQUEST:    'pair_request',
  PAIR_SUCCESS:    'pair_success',
  PAIR_FAILED:     'pair_failed',

  // Clipboard
  CLIPBOARD_SYNC:  'clipboard_sync',

  // Notifications
  NOTIFICATION:    'notification_push',

  // WebRTC signalling
  RTC_OFFER:       'rtc_offer',
  RTC_ANSWER:      'rtc_answer',
  RTC_ICE:         'rtc_ice_candidate',

  // Connection
  HEARTBEAT:       'heartbeat',
  DISCONNECT:      'disconnect',
} as const

export type MsgType = typeof MSG[keyof typeof MSG]

export interface WSMessage {
  type: MsgType
  payload?: any
  sessionToken?: string
}