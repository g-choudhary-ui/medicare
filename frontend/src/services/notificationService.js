/**
 * MediCare Web Notifications & Audio Chime Service
 * Provides native desktop/mobile notifications and pleasant audio chimes
 * for elderly patients and caretakers.
 */

// Play gentle, two-tone notification chime using Web Audio API
export const playNotificationChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return

    const ctx = new AudioContext()
    const now = ctx.currentTime

    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(659.25, now)
    gain1.gain.setValueAtTime(0.18, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.35)

    // Tone 2: A5 (880 Hz) - uplifting melodic finish
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880, now + 0.16)
    gain2.gain.setValueAtTime(0.22, now + 0.16)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.16)
    osc2.stop(now + 0.65)
  } catch (err) {
    console.warn('[NotificationService] Audio chime failed:', err.message)
  }
}

// Check current notification permission state
export const getNotificationPermission = () => {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

// Request permission from the user
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    return { supported: false, status: 'unsupported' }
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      playNotificationChime()
    }
    return { supported: true, status: permission }
  } catch (err) {
    console.error('[NotificationService] Permission request failed:', err)
    return { supported: true, status: Notification.permission }
  }
}

// Trigger a browser notification + chime sound
export const sendBrowserNotification = (title, body, tag = 'medicare-alert') => {
  playNotificationChime()

  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: '/vite.svg',
      tag,
      badge: '/vite.svg',
      silent: true, // We already play our custom melodic audio chime
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    return true
  } catch (err) {
    console.warn('[NotificationService] Displaying notification failed:', err.message)
    return false
  }
}

// Test trigger helper
export const testNotification = (patientName = 'Your Loved One') => {
  return sendBrowserNotification(
    '💊 MediCare Reminder: Metformin 500mg Due',
    `Time for ${patientName}'s morning dose. Please take with food and water.`,
    'test-notification'
  )
}
