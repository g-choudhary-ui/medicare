import React, { useState, useEffect } from 'react'
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendBrowserNotification,
  playNotificationChime,
} from '../services/notificationService'
import toast from 'react-hot-toast'
import { Bell, BellRing, Volume2, ShieldAlert, CheckCircle2 } from 'lucide-react'

export default function NotificationBanner({ patientName = 'Loved One' }) {
  const [permission, setPermission] = useState('default')
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    setPermission(getNotificationPermission())
  }, [])

  const handleEnable = async () => {
    const res = await requestNotificationPermission()
    setPermission(res.status)

    if (res.status === 'granted') {
      toast.success('🔔 Desktop & sound notifications activated!')
      sendBrowserNotification(
        '🔔 MediCare Alerts Active!',
        `You will now receive sound chimes and desktop alerts for ${patientName}'s medications and appointments.`,
        'welcome-notification'
      )
    } else if (res.status === 'denied') {
      toast.error('Notifications blocked in browser. Please allow notifications from the URL bar.')
    }
  }

  const handleTest = () => {
    playNotificationChime()
    const shown = sendBrowserNotification(
      '💊 MediCare Reminder: Morning Dose Due',
      `Time for ${patientName}'s scheduled medication. Please take with water.`,
      'test-notification'
    )
    if (shown) {
      toast.success('Sound chime played & desktop alert sent!')
    } else {
      toast.success('Sound chime played! (Enable notifications for desktop popups)')
    }
  }

  if (permission === 'unsupported' || isDismissed) {
    return null
  }

  if (permission === 'granted') {
    return (
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
            <BellRing size={20} className="animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-bold text-teal-900 flex items-center gap-1.5">
              <span>Sound & Desktop Alerts Active</span>
              <CheckCircle2 size={16} className="text-teal-600 inline" />
            </p>
            <p className="text-xs text-teal-700">
              Windows notifications and chimes will ring when medicines are due.
            </p>
          </div>
        </div>

        <button
          onClick={handleTest}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-teal-100 text-teal-800 text-xs font-bold rounded-xl border border-teal-200 transition-colors shadow-sm self-start sm:self-auto min-h-[40px]"
        >
          <Volume2 size={16} /> Test Chime & Alert
        </button>
      </div>
    )
  }

  if (permission === 'denied') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-amber-800">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-amber-600 flex-shrink-0" />
          <span>Desktop notifications are currently muted in your browser. Click the lock icon in the address bar to unblock.</span>
        </div>
        <button
          onClick={handleTest}
          className="font-bold underline text-amber-900 whitespace-nowrap ml-2"
        >
          Play Sound Only
        </button>
      </div>
    )
  }

  // Default state: Prompt user to enable
  return (
    <div className="bg-gradient-to-r from-amber-50 via-teal-50 to-emerald-50 border border-teal-200/80 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-start gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
          <Bell size={22} className="animate-bounce" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            Enable Desktop & Sound Reminders 🔔
            <span className="text-xs font-semibold px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full">New</span>
          </h3>
          <p className="text-xs text-gray-600 mt-1 max-w-xl">
            Get instant gentle chimes and desktop popups when {patientName}'s medications or appointments are due — even if you are browsing another tab or working in another window.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 self-start md:self-auto flex-shrink-0">
        <button
          onClick={handleEnable}
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center gap-2 min-h-[44px]"
        >
          <BellRing size={16} /> Enable Alerts
        </button>
        <button
          onClick={() => setIsDismissed(true)}
          className="px-3.5 py-2.5 text-gray-500 hover:text-gray-700 text-xs font-medium rounded-xl hover:bg-gray-100 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
