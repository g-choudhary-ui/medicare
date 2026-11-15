import React from 'react'
import { Pill, Clock, Calendar, CheckCircle2, AlertCircle, Edit2, Trash2, Check } from 'lucide-react'

export default function MedicationCard({
  medication,
  onEdit,
  onDelete,
  onTakeDose,
  isTaking = false,
}) {
  const {
    id,
    name,
    dosage,
    frequency,
    times = [],
    startDate,
    endDate,
    color = '#0d9488',
    instructions,
    prescribedBy,
    takenSlots = [],
  } = medication

  const allTaken = times.length > 0 && times.every(t => takenSlots.includes(t))

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
      style={{ borderLeftWidth: '6px', borderLeftColor: color }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
              style={{ backgroundColor: color }}
            >
              <Pill size={22} aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-xl leading-tight">{name}</h3>
              <p className="text-sm font-semibold text-gray-600">{dosage}</p>
            </div>
          </div>
          <span className="capitalize px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
            {frequency || 'Daily'}
          </span>
        </div>

        {instructions && (
          <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 mb-3 border border-gray-100">
            <strong className="text-gray-800">Note:</strong> {instructions}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-1.5">
            <Clock size={16} className="text-teal-600" />
            <span>Schedule: <strong className="text-gray-700 capitalize">{times.join(', ') || 'N/A'}</strong></span>
          </div>
          {prescribedBy && (
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-teal-600 font-bold">Dr.</span>
              <span className="truncate">By: <strong className="text-gray-700">{prescribedBy}</strong></span>
            </div>
          )}
        </div>

        {/* Today's slots checklist */}
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Today's Doses</span>
            {allTaken ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={13} /> Complete
              </span>
            ) : (
              <span className="text-xs text-gray-500">
                {takenSlots.length}/{times.length} taken
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {times.map((slot) => {
              const isTaken = takenSlots.includes(slot)
              return (
                <button
                  key={slot}
                  disabled={isTaken || isTaking}
                  onClick={() => !isTaken && onTakeDose && onTakeDose(id, slot)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[38px] ${
                    isTaken
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 active:scale-95'
                  }`}
                  aria-label={isTaken ? `${slot} taken` : `Mark ${slot} dose taken`}
                >
                  {isTaken ? <Check size={14} className="text-emerald-700" /> : <Clock size={14} className="text-teal-600" />}
                  <span className="capitalize">{slot}</span>
                  {!isTaken && <span className="underline ml-1">Take</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {startDate ? `Since ${startDate}` : 'Active'}
        </span>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(medication)}
              className="p-2 text-gray-500 hover:text-teal-600 hover:bg-white rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={`Edit ${name}`}
            >
              <Edit2 size={16} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(id)}
              className="p-2 text-gray-500 hover:text-rose-600 hover:bg-white rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={`Delete ${name}`}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
