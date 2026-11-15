import React, { useState } from 'react'
import { playNotificationChime } from '../services/notificationService'
import { Check, Clock, Sparkles } from 'lucide-react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SLOTS = [
  { id: 'morning', label: 'Morning', icon: '☀️', time: '8:00 AM' },
  { id: 'afternoon', label: 'Noon', icon: '🌤️', time: '1:00 PM' },
  { id: 'evening', label: 'Evening', icon: '🌅', time: '6:00 PM' },
  { id: 'night', label: 'Bedtime', icon: '🌙', time: '9:00 PM' },
]

export default function PillOrganizer({ medications = [], onTakeDose, isSeniorMode = false }) {
  const todayIdx = new Date().getDay()
  const [activeDay, setActiveDay] = useState(todayIdx)

  // Map active meds into slots
  const getSlotMeds = (slotId) => {
    return medications.filter((m) => m.isActive !== false && (m.times || []).includes(slotId))
  }

  const handleCompartmentClick = (med, slotId) => {
    playNotificationChime()
    if (onTakeDose) {
      onTakeDose(med.id || med._id, slotId)
    }
  }

  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-teal-100 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <span>💊 7-Day Physical Pill Organizer</span>
            <span className="text-xs font-bold px-2.5 py-1 bg-teal-50 text-teal-800 rounded-full border border-teal-200">
              Skeuomorphic View
            </span>
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Modeled after traditional Sunday–Saturday weekly pillboxes. Tap any compartment to log doses.
          </p>
        </div>

        {/* Day Selector Pills for Mobile/Tablet */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {DAYS.map((day, idx) => (
            <button
              key={day}
              onClick={() => setActiveDay(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] ${
                activeDay === idx
                  ? 'bg-teal-600 text-white shadow-sm scale-105'
                  : idx === todayIdx
                  ? 'bg-teal-50 text-teal-700 border border-teal-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {day} {idx === todayIdx && '• Today'}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Physical Compartments for Active Day */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SLOTS.map((slot) => {
          const medsInSlot = getSlotMeds(slot.id)
          const allTaken = medsInSlot.length > 0 && medsInSlot.every((m) => (m.todayTaken || []).includes(slot.id))

          return (
            <div
              key={slot.id}
              className={`relative rounded-2xl p-5 border-2 transition-all flex flex-col justify-between ${
                allTaken
                  ? 'bg-emerald-50/80 border-emerald-300 shadow-sm'
                  : medsInSlot.length > 0
                  ? 'bg-gradient-to-b from-teal-50/50 to-white border-teal-200 shadow-md hover:border-teal-400'
                  : 'bg-gray-50/60 border-dashed border-gray-200 opacity-60'
              }`}
            >
              {/* Compartment Lid Badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl select-none">{slot.icon}</span>
                  <div>
                    <h4 className="text-sm font-black text-gray-900">{slot.label}</h4>
                    <span className="text-[11px] font-semibold text-gray-500">{slot.time}</span>
                  </div>
                </div>

                {allTaken ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-full text-xs font-extrabold shadow-sm">
                    <Check size={13} /> Taken
                  </span>
                ) : (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                    {medsInSlot.length} pill{medsInSlot.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Pills Inside Compartment */}
              <div className="space-y-2.5 my-2">
                {medsInSlot.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-4 text-center">Empty compartment</p>
                ) : (
                  medsInSlot.map((med) => {
                    const isTaken = (med.todayTaken || []).includes(slot.id)
                    return (
                      <div
                        key={med.id || med._id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                          isTaken
                            ? 'bg-white/80 border-emerald-200 text-emerald-900'
                            : 'bg-white border-gray-200 shadow-sm hover:border-teal-400'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: med.color || '#0d9488' }}
                          />
                          <div className="truncate">
                            <p className="text-xs font-bold text-gray-900 truncate">{med.name}</p>
                            <p className="text-[10px] text-gray-500">{med.dosage || 'Standard'}</p>
                          </div>
                        </div>

                        {!isTaken ? (
                          <button
                            onClick={() => handleCompartmentClick(med, slot.id)}
                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1 min-h-[34px]"
                          >
                            Take
                          </button>
                        ) : (
                          <span className="text-emerald-600 text-xs font-bold">✓</span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Physical Pillbox Hinged Lid Effect Indicator */}
              <div className="mt-3 pt-2 border-t border-gray-200/60 flex items-center justify-between text-[10px] text-gray-400">
                <span>Compartment #{SLOTS.indexOf(slot) + 1}</span>
                <span>{allTaken ? '🔒 Lid Closed' : '🔓 Ready to Take'}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
