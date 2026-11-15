import React, { useState, useEffect } from 'react'
import { appointmentsApi } from '../services/api'
import AppointmentCard from '../components/AppointmentCard'
import toast from 'react-hot-toast'
import { Plus, Calendar, Clock, Stethoscope, ChevronDown, ChevronUp, MapPin, X, Bell } from 'lucide-react'
import { isPast, parseISO } from 'date-fns'

const SPECIALTIES = [
  'General Practitioner / Family Medicine',
  'Cardiology',
  'Geriatrics',
  'Endocrinology',
  'Neurology',
  'Orthopedics',
  'Ophthalmology',
  'Dentistry',
  'Physical Therapy',
  'Psychiatry / Mental Health',
  'Other',
]

export default function Appointments() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAppt, setEditingAppt] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [pastExpanded, setPastExpanded] = useState(false)
  const [saving, setSaving] = useState(false)

  const initialForm = {
    doctorName: '',
    specialty: 'General Practitioner / Family Medicine',
    date: new Date().toISOString().split('T')[0],
    time: '10:00 AM',
    location: '',
    notes: '',
    reminderEnabled: true,
  }

  const [formData, setFormData] = useState(initialForm)

  const loadAppointments = async () => {
    try {
      setLoading(true)
      const res = await appointmentsApi.getAll()
      setAppointments(res.data.appointments || res.data || [])
    } catch (err) {
      toast.error('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAppointments()
  }, [])

  const handleOpenAdd = () => {
    setEditingAppt(null)
    setFormData(initialForm)
    setModalOpen(true)
  }

  const handleOpenEdit = (appt) => {
    setEditingAppt(appt)
    setFormData({
      doctorName: appt.doctorName || '',
      specialty: appt.specialty || SPECIALTIES[0],
      date: appt.date ? appt.date.split('T')[0] : '',
      time: appt.time || '',
      location: appt.location || '',
      notes: appt.notes || '',
      reminderEnabled: appt.reminderEnabled ?? true,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.doctorName.trim()) return toast.error('Doctor name is required')
    if (!formData.date) return toast.error('Appointment date is required')

    try {
      setSaving(true)
      if (editingAppt) {
        await appointmentsApi.update(editingAppt.id, formData)
        toast.success('Appointment updated')
      } else {
        await appointmentsApi.add(formData)
        toast.success('Appointment scheduled')
      }
      setModalOpen(false)
      loadAppointments()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save appointment')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await appointmentsApi.delete(id)
      toast.success('Appointment removed')
      setDeleteConfirmId(null)
      loadAppointments()
    } catch (err) {
      toast.error('Failed to remove appointment')
    }
  }

  const isPastItem = (appt) => {
    if (!appt.date) return false
    try {
      const dt = typeof appt.date === 'string' ? parseISO(appt.date) : new Date(appt.date)
      return isPast(dt)
    } catch {
      return false
    }
  }

  const upcomingAppts = appointments.filter((a) => !isPastItem(a))
  const pastAppts = appointments.filter((a) => isPastItem(a))

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <span className="p-2 bg-teal-100 text-teal-700 rounded-xl">📅</span>
            Doctor Appointments
          </h1>
          <p className="text-gray-500 mt-1 text-base">
            Keep track of visits, checkups, clinic locations, and medical reminders.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-sm transition-all min-h-[52px]"
          aria-label="Schedule new appointment"
        >
          <Plus size={22} />
          <span>Schedule Visit</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">Loading appointment schedule...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span>Upcoming Visits</span>
                <span className="text-sm font-semibold bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full">
                  {upcomingAppts.length}
                </span>
              </h2>
            </div>

            {upcomingAppts.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm max-w-lg mx-auto">
                <Calendar size={48} className="mx-auto text-teal-500 mb-3" />
                <h3 className="text-xl font-bold text-gray-800 mb-1">No Upcoming Appointments</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Schedule follow-ups, regular checkups or specialist consultations.
                </p>
                <button
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl min-h-[48px]"
                >
                  <Plus size={18} /> Schedule an Appointment
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingAppts.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    onEdit={handleOpenEdit}
                    onDelete={(id) => setDeleteConfirmId(id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Past Appointments (Accordion) */}
          {pastAppts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <button
                onClick={() => setPastExpanded(!pastExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors min-h-[52px]"
                aria-expanded={pastExpanded}
              >
                <div className="flex items-center gap-2 font-bold text-gray-700">
                  <span>Past Appointments & History</span>
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                    {pastAppts.length}
                  </span>
                </div>
                {pastExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {pastExpanded && (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 border-t border-gray-200">
                  {pastAppts.map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      onEdit={handleOpenEdit}
                      onDelete={(id) => setDeleteConfirmId(id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Appointment?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel and delete this appointment record?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl min-h-[48px]"
              >
                Keep
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl min-h-[48px]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Appointment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden my-8">
            <div className="p-6 bg-teal-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar size={24} />
                <h2 className="text-2xl font-bold">
                  {editingAppt ? 'Edit Appointment' : 'Schedule New Appointment'}
                </h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 hover:bg-teal-700 rounded-xl"
                aria-label="Close dialog"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="docName">
                  Doctor or Clinic Name *
                </label>
                <input
                  id="docName"
                  type="text"
                  required
                  placeholder="e.g. Dr. Emily Martinez"
                  value={formData.doctorName}
                  onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 min-h-[48px]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="specialty">
                  Specialty
                </label>
                <select
                  id="specialty"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 min-h-[48px] bg-white"
                >
                  {SPECIALTIES.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="apptDate">
                    Date *
                  </label>
                  <input
                    id="apptDate"
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 min-h-[48px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="apptTime">
                    Time
                  </label>
                  <input
                    id="apptTime"
                    type="text"
                    placeholder="e.g. 10:30 AM"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 min-h-[48px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="location">
                  Clinic Location / Address
                </label>
                <input
                  id="location"
                  type="text"
                  placeholder="e.g. City Health Clinic, Room 302"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 min-h-[48px]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="notes">
                  Notes / Preparation instructions
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  placeholder="e.g. Fasting required for 8 hours prior, bring blood work reports"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>

              {/* Reminder toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  id="reminder"
                  type="checkbox"
                  checked={formData.reminderEnabled}
                  onChange={(e) => setFormData({ ...formData, reminderEnabled: e.target.checked })}
                  className="w-5 h-5 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                />
                <label htmlFor="reminder" className="text-sm font-semibold text-gray-700 cursor-pointer">
                  Send reminder notification to family members 24h before
                </label>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl min-h-[50px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl min-h-[50px] shadow-sm disabled:bg-teal-400"
                >
                  {saving ? 'Saving...' : editingAppt ? 'Save Changes' : 'Schedule Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
