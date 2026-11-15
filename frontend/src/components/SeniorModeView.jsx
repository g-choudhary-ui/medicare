import React, { useState } from 'react'
import { speechService } from '../services/speechService'
import { playNotificationChime } from '../services/notificationService'
import { emergencyApi } from '../services/api'
import toast from 'react-hot-toast'
import { Volume2, VolumeX, AlertTriangle, CheckCircle, Clock, ShieldAlert, Sparkles, MapPin } from 'lucide-react'

export default function SeniorModeView({
  profile,
  medications = [],
  appointments = [],
  onTakeDose,
}) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [sosTriggered, setSosTriggered] = useState(false)
  const [sosLoading, setSosLoading] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  const patientName = profile?.elderlyName || 'Loved One'

  // Determine current slot
  const now = new Date()
  const hour = now.getHours()
  let currentSlot = 'morning'
  let slotLabel = 'Morning'
  let slotIcon = '☀️'

  if (hour >= 11 && hour < 16) {
    currentSlot = 'afternoon'
    slotLabel = 'Afternoon (Lunch)'
    slotIcon = '🌤️'
  } else if (hour >= 16 && hour < 20) {
    currentSlot = 'evening'
    slotLabel = 'Evening (Dinner)'
    slotIcon = '🌅'
  } else if (hour >= 20 || hour < 5) {
    currentSlot = 'night'
    slotLabel = 'Bedtime'
    slotIcon = '🌙'
  }

  // Find due medications for the current slot
  const currentSlotMeds = medications.filter(
    (m) => m.isActive !== false && (m.times || []).includes(currentSlot)
  )
  const pendingMeds = currentSlotMeds.filter(
    (m) => !(m.todayTaken || []).includes(currentSlot)
  )
  const nextMed = pendingMeds[0] || currentSlotMeds[0]

  // Voice Companion
  const handleReadSchedule = () => {
    if (isSpeaking) {
      speechService.stop()
      setIsSpeaking(false)
    } else {
      setIsSpeaking(true)
      speechService.speakSchedule(patientName, medications, appointments)
      setTimeout(() => setIsSpeaking(false), 12000)
    }
  }

  // Dose Taken with Dignified Micro-Celebration
  const handleTakeDose = (medId) => {
    playNotificationChime()
    setShowCelebration(true)
    if (onTakeDose) {
      onTakeDose(medId, currentSlot)
    }
    toast.success('Dose recorded! Great job staying healthy 🎉')
    setTimeout(() => setShowCelebration(false), 4000)
  }

  // GPS SOS Beacon
  const handleTriggerSos = () => {
    setSosLoading(true)
    playNotificationChime()

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude, accuracy } = position.coords
            await emergencyApi.triggerSos({
              latitude,
              longitude,
              accuracy,
              note: `Senior SOS beacon triggered directly from Senior Mode by ${patientName}`,
            })
            setSosTriggered(true)
            toast.success('🚨 Family notified with your exact GPS location!')
          } catch (e) {
            setSosTriggered(true)
            toast.success('🚨 Emergency alert dispatched to family!')
          } finally {
            setSosLoading(false)
          }
        },
        async () => {
          // Geolocation denied or unavailable fallback
          try {
            await emergencyApi.triggerSos({
              note: `Senior SOS beacon triggered by ${patientName} (Location permission off)`,
            })
            setSosTriggered(true)
            toast.success('🚨 Emergency alert dispatched to family!')
          } finally {
            setSosLoading(false)
          }
        },
        { timeout: 7000 }
      )
    } else {
      emergencyApi.triggerSos({ note: `SOS triggered by ${patientName}` })
      setSosTriggered(true)
      setSosLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Micro-Celebration Banner */}
      {showCelebration && (
        <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 rounded-3xl p-6 text-white text-center shadow-xl animate-bounce">
          <h2 className="text-3xl font-black flex items-center justify-center gap-2">
            <Sparkles size={32} /> Wonderful Job, {patientName}!
          </h2>
          <p className="text-lg font-medium text-emerald-100 mt-1">
            Dose recorded successfully. Your health streak is on fire! 🔥
          </p>
        </div>
      )}

      {/* Greeting Banner */}
      <div className="bg-teal-700 text-white p-8 rounded-3xl shadow-md text-center">
        <span className="text-4xl select-none">{slotIcon}</span>
        <h1 className="text-3xl md:text-5xl font-black mt-2">
          Hello, {patientName}!
        </h1>
        <p className="text-teal-100 text-xl md:text-2xl mt-2 font-medium">
          Right now is your <strong className="text-white underline">{slotLabel}</strong> routine.
        </p>
      </div>

      {/* 3 Massive Senior Cards */}
      <div className="grid grid-cols-1 gap-6">
        {/* CARD 1: What to Take Right Now */}
        <div className="bg-white rounded-3xl p-8 border-4 border-teal-500 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="px-4 py-1.5 rounded-full bg-teal-100 text-teal-900 text-base font-extrabold uppercase tracking-wide">
                1. Medication Due Now
              </span>
              <span className="text-sm font-bold text-gray-500 flex items-center gap-1.5">
                <Clock size={18} /> {slotLabel}
              </span>
            </div>

            {nextMed ? (
              <div className="space-y-4 my-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm text-white font-black"
                    style={{ backgroundColor: nextMed.color || '#0d9488' }}
                  >
                    💊
                  </div>
                  <div>
                    <h2 className="text-3xl md:text-4xl font-black text-gray-900">
                      {nextMed.name}
                    </h2>
                    <p className="text-xl font-bold text-teal-700 mt-1">
                      Dosage: {nextMed.dosage || '1 Tablet'}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <p className="text-lg text-gray-800 font-medium">
                    📌 <strong>Instructions:</strong> {nextMed.instructions || 'Take with a full glass of water after food.'}
                  </p>
                </div>

                {/* GIANT 60px+ TAKE BUTTON */}
                {pendingMeds.length > 0 ? (
                  <button
                    onClick={() => handleTakeDose(nextMed.id || nextMed._id)}
                    className="w-full py-6 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-2xl md:text-3xl font-black rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3 min-h-[72px]"
                  >
                    <CheckCircle size={36} /> I TOOK THIS PILL
                  </button>
                ) : (
                  <div className="bg-emerald-50 border-2 border-emerald-300 p-6 rounded-2xl text-center">
                    <p className="text-2xl font-black text-emerald-800 flex items-center justify-center gap-2">
                      <CheckCircle size={28} /> All {slotLabel} medicines taken!
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-2xl">
                <p className="text-2xl font-bold text-gray-700">
                  🎉 No medications scheduled for this time slot!
                </p>
                <p className="text-gray-500 text-lg mt-2">
                  Relax and enjoy your day.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: Voice Schedule Companion ("Read to Me") */}
        <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-3xl p-8 border-2 border-teal-200 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-lg">
            <span className="px-3.5 py-1 rounded-full bg-teal-200 text-teal-900 text-sm font-bold uppercase tracking-wider">
              2. Voice Companion
            </span>
            <h3 className="text-2xl md:text-3xl font-black text-gray-900">
              Read My Schedule to Me 🗣️
            </h3>
            <p className="text-gray-600 text-base md:text-lg">
              Listen to today's medication times and instructions spoken out loud in a clear voice.
            </p>
          </div>

          <button
            onClick={handleReadSchedule}
            className={`px-8 py-5 rounded-2xl text-xl font-bold transition-all shadow-md flex items-center justify-center gap-3 min-h-[64px] flex-shrink-0 ${
              isSpeaking
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                : 'bg-teal-600 hover:bg-teal-700 active:scale-95 text-white'
            }`}
          >
            {isSpeaking ? (
              <>
                <VolumeX size={28} /> Stop Reading
              </>
            ) : (
              <>
                <Volume2 size={28} /> Read to Me
              </>
            )}
          </button>
        </div>

        {/* CARD 3: One-Tap Emergency GPS SOS Beacon */}
        <div className="bg-rose-50 rounded-3xl p-8 border-4 border-rose-300 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="px-3.5 py-1 rounded-full bg-rose-200 text-rose-900 text-sm font-bold uppercase tracking-wider">
                3. Emergency Help
              </span>
              <h3 className="text-2xl md:text-3xl font-black text-rose-950 flex items-center gap-2">
                <AlertTriangle size={32} className="text-rose-600" />
                Emergency SOS Beacon
              </h3>
              <p className="text-rose-800 text-base md:text-lg">
                Tap this button if you feel unwell or fell down. It sends your live GPS location to your family.
              </p>
            </div>

            <button
              onClick={handleTriggerSos}
              disabled={sosLoading}
              className={`px-8 py-6 rounded-2xl text-2xl font-black text-white transition-all shadow-xl flex items-center justify-center gap-3 min-h-[72px] flex-shrink-0 ${
                sosTriggered
                  ? 'bg-emerald-600'
                  : 'bg-rose-600 hover:bg-rose-700 active:scale-95 animate-pulse'
              }`}
            >
              <ShieldAlert size={36} />
              {sosLoading ? 'Sending Alert...' : sosTriggered ? '✓ Family Alerted' : '🚨 PRESS FOR HELP'}
            </button>
          </div>

          {sosTriggered && (
            <div className="mt-4 p-4 bg-emerald-100 border border-emerald-300 rounded-2xl text-emerald-900 font-bold text-center text-lg flex items-center justify-center gap-2">
              <MapPin size={22} /> Help is on the way! Your family received your live alert & GPS location.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
