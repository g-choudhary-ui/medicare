import React from 'react'
import { Check, Clock, X, AlertCircle } from 'lucide-react'

const TIME_SLOTS = [
  { id: 'morning', label: 'Morning', time: '8:00 AM' },
  { id: 'afternoon', label: 'Afternoon', time: '1:00 PM' },
  { id: 'evening', label: 'Evening', time: '6:00 PM' },
  { id: 'night', label: 'Night', time: '10:00 PM' },
]

export default function AdherenceTracker({ medications = [], onTakeDose, isTaking = false }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>📅 Today's Medication Tracker</span>
          </h3>
          <p className="text-sm text-gray-500">Track and log today's doses across scheduled time slots</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-emerald-700">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Taken
          </span>
          <span className="flex items-center gap-1.5 text-gray-500">
            <span className="w-3 h-3 rounded-full bg-gray-300 inline-block"></span> Pending
          </span>
          <span className="flex items-center gap-1.5 text-rose-600">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span> Missed
          </span>
        </div>
      </div>

      {medications.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl">
          <p className="text-gray-500 font-medium">No medications scheduled for today.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {medications.map((med) => {
            const medTimes = med.times || ['morning']
            const takenSlots = med.todayLogs ? med.todayLogs.map(l => l.timeSlot) : (med.takenSlots || [])

            return (
              <div
                key={med.id}
                className="p-4 rounded-xl border border-gray-200 hover:border-teal-300 transition-colors bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-4 h-12 rounded-full flex-shrink-0"
                    style={{ backgroundColor: med.color || '#0d9488' }}
                    aria-hidden="true"
                  />
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg leading-tight truncate">{med.name}</h4>
                    <p className="text-sm text-gray-600 font-medium">
                      {med.dosage} • <span className="capitalize">{med.frequency || 'Daily'}</span>
                    </p>
                    {med.instructions && (
                      <p className="text-xs text-teal-800 mt-0.5 line-clamp-1 italic">{med.instructions}</p>
                    )}
                  </div>
                </div>

                {/* Slots tracker */}
                <div className="flex items-center gap-3 flex-wrap">
                  {TIME_SLOTS.filter(slot => medTimes.includes(slot.id)).map((slot) => {
                    const isTaken = takenSlots.includes(slot.id)

                    return (
                      <button
                        key={slot.id}
                        onClick={() => !isTaken && onTakeDose && onTakeDose(med.id, slot.id)}
                        disabled={isTaken || isTaking}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all min-h-[48px] ${
                          isTaken
                            ? 'bg-emerald-100 text-emerald-800 cursor-default border border-emerald-300'
                            : 'bg-gray-100 hover:bg-teal-100 text-gray-700 hover:text-teal-900 border border-gray-200 active:scale-95'
                        }`}
                        title={isTaken ? `Taken for ${slot.label}` : `Click to mark ${slot.label} dose as taken`}
                        aria-label={`Mark ${med.name} ${slot.label} dose as taken`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            isTaken ? 'bg-emerald-600 text-white' : 'bg-gray-300 text-gray-600'
                          }`}
                        >
                          {isTaken ? <Check size={14} /> : <Clock size={14} />}
                        </div>
                        <div className="text-left">
                          <p className="leading-none">{slot.label}</p>
                          <p className="text-[11px] opacity-75">{slot.time}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
