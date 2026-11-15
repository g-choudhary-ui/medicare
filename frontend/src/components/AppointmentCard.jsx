import React from 'react'
import { Calendar, Clock, MapPin, Stethoscope, Bell, Trash2, Edit2 } from 'lucide-react'
import { format, parseISO, isPast } from 'date-fns'

export default function AppointmentCard({ appointment, onEdit, onDelete }) {
  const {
    id,
    doctorName,
    specialty,
    date,
    time,
    location,
    notes,
    reminderEnabled = true,
  } = appointment

  const appointmentDate = date ? (typeof date === 'string' ? parseISO(date) : new Date(date)) : new Date()
  const isPastAppointment = isPast(appointmentDate)

  return (
    <div
      className={`rounded-2xl border p-5 transition-all shadow-sm flex flex-col justify-between ${
        isPastAppointment
          ? 'bg-gray-50 border-gray-200 opacity-80'
          : 'bg-white border-teal-200 hover:border-teal-400 hover:shadow-md'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isPastAppointment ? 'bg-gray-200 text-gray-600' : 'bg-teal-100 text-teal-700'
              }`}
            >
              <Stethoscope size={24} aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-xl leading-tight">
                {doctorName ? (doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`) : 'Doctor Appointment'}
              </h3>
              <p className="text-sm font-semibold text-teal-700">{specialty || 'General Practitioner'}</p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              isPastAppointment
                ? 'bg-gray-200 text-gray-700'
                : 'bg-teal-50 text-teal-800 border border-teal-200'
            }`}
          >
            {isPastAppointment ? 'Past' : 'Upcoming'}
          </span>
        </div>

        <div className="space-y-2 mt-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-teal-600 flex-shrink-0" />
            <span className="font-medium text-gray-800">
              {format(appointmentDate, 'EEEE, MMMM d, yyyy')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Clock size={18} className="text-teal-600 flex-shrink-0" />
            <span className="font-medium text-gray-800">{time || 'Time not specified'}</span>
          </div>

          {location && (
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-teal-600 flex-shrink-0" />
              <span className="text-gray-700">{location}</span>
            </div>
          )}

          {notes && (
            <div className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-100 text-sm text-gray-600 italic">
              "{notes}"
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Bell size={14} className={reminderEnabled ? 'text-teal-600' : 'text-gray-400'} />
          <span>{reminderEnabled ? 'Reminder Active' : 'No reminder'}</span>
        </div>
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              onClick={() => onEdit(appointment)}
              className="p-2 text-gray-500 hover:text-teal-600 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={`Edit appointment with ${doctorName}`}
            >
              <Edit2 size={16} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(id)}
              className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={`Delete appointment with ${doctorName}`}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
