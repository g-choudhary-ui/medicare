import React, { useState, useEffect } from 'react'
import { medicationsApi } from '../services/api'
import MedicationCard from '../components/MedicationCard'
import toast from 'react-hot-toast'
import { Plus, X, Pill, Filter, CheckCircle2, Search } from 'lucide-react'

const COLOR_OPTIONS = [
  { label: 'Teal', value: '#0d9488' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Purple', value: '#9333ea' },
  { label: 'Rose', value: '#e11d48' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Emerald', value: '#059669' },
]

const TIME_SLOT_OPTIONS = [
  { id: 'morning', label: 'Morning (8:00 AM)' },
  { id: 'afternoon', label: 'Afternoon (1:00 PM)' },
  { id: 'evening', label: 'Evening (6:00 PM)' },
  { id: 'night', label: 'Night (10:00 PM)' },
]

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Once Daily' },
  { value: 'twice daily', label: 'Twice Daily' },
  { value: 'thrice daily', label: 'Thrice Daily' },
  { value: 'as needed', label: 'As Needed (PRN)' },
  { value: 'custom', label: 'Custom' },
]

export default function Medications() {
  const [medications, setMedications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'active' | 'today'
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMed, setEditingMed] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [takingDose, setTakingDose] = useState(false)

  const initialForm = {
    name: '',
    dosage: '',
    frequency: 'daily',
    times: ['morning'],
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    color: '#0d9488',
    instructions: '',
    prescribedBy: '',
  }

  const [formData, setFormData] = useState(initialForm)

  const loadMedications = async () => {
    try {
      setLoading(true)
      const res = await medicationsApi.getAll()
      setMedications(res.data.medications || res.data || [])
    } catch (err) {
      toast.error('Failed to load medications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMedications()
  }, [])

  const handleOpenAddModal = () => {
    setEditingMed(null)
    setFormData(initialForm)
    setModalOpen(true)
  }

  const handleOpenEditModal = (med) => {
    setEditingMed(med)
    setFormData({
      name: med.name || '',
      dosage: med.dosage || '',
      frequency: med.frequency || 'daily',
      times: med.times || ['morning'],
      startDate: med.startDate ? med.startDate.split('T')[0] : '',
      endDate: med.endDate ? med.endDate.split('T')[0] : '',
      color: med.color || '#0d9488',
      instructions: med.instructions || '',
      prescribedBy: med.prescribedBy || '',
    })
    setModalOpen(true)
  }

  const handleToggleTimeSlot = (slotId) => {
    setFormData((prev) => {
      const exists = prev.times.includes(slotId)
      if (exists) {
        if (prev.times.length === 1) return prev // keep at least one
        return { ...prev, times: prev.times.filter((t) => t !== slotId) }
      } else {
        return { ...prev, times: [...prev.times, slotId] }
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return toast.error('Medication name is required')
    if (!formData.dosage.trim()) return toast.error('Dosage is required')
    if (formData.times.length === 0) return toast.error('Select at least one time slot')

    try {
      setSaving(true)
      if (editingMed) {
        await medicationsApi.update(editingMed.id, formData)
        toast.success('Medication updated successfully')
      } else {
        await medicationsApi.add(formData)
        toast.success('Medication added to schedule')
      }
      setModalOpen(false)
      loadMedications()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save medication')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await medicationsApi.delete(id)
      toast.success('Medication removed')
      setDeleteConfirmId(null)
      loadMedications()
    } catch (err) {
      toast.error('Failed to delete medication')
    }
  }

  const handleTakeDose = async (medicationId, timeSlot) => {
    try {
      setTakingDose(true)
      await medicationsApi.take(medicationId, timeSlot)
      toast.success('Dose logged as taken! 💊')
      loadMedications()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record dose')
    } finally {
      setTakingDose(false)
    }
  }

  // Filtered list
  const filteredMeds = medications.filter((m) => {
    const matchesSearch = m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.prescribedBy?.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    if (filter === 'active') {
      if (!m.endDate) return true
      return new Date(m.endDate) >= new Date()
    }
    if (filter === 'today') {
      return (m.times || []).length > 0
    }
    return true
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <span className="p-2 bg-teal-100 text-teal-700 rounded-xl">💊</span>
            Medication Management
          </h1>
          <p className="text-gray-500 mt-1 text-base">
            Track prescriptions, dosages, schedules, and daily intake.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-sm transition-all min-h-[52px]"
          aria-label="Add new medication"
        >
          <Plus size={22} />
          <span>Add Medication</span>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medications or doctors..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[46px]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {[
            { id: 'all', label: 'All Prescriptions' },
            { id: 'active', label: 'Active Only' },
            { id: 'today', label: "Today's Schedule" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-sm font-bold transition-all min-h-[44px] ${
                filter === item.id
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Medications */}
      {loading ? (
        <div className="text-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">Loading prescription catalog...</p>
        </div>
      ) : filteredMeds.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm max-w-xl mx-auto">
          <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto text-4xl mb-4">
            💊
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No medications found</h3>
          <p className="text-gray-500 mb-6 text-base">
            {searchQuery
              ? 'No medications matched your search query.'
              : 'Keep medications organized and never miss a dose by adding your first prescription.'}
          </p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl min-h-[48px]"
          >
            <Plus size={20} /> Add First Medication
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMeds.map((med) => (
            <MedicationCard
              key={med.id}
              medication={med}
              onEdit={handleOpenEditModal}
              onDelete={(id) => setDeleteConfirmId(id)}
              onTakeDose={handleTakeDose}
              isTaking={takingDose}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Remove Medication?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this medication? This will also remove scheduled reminders for it.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl min-h-[48px]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl min-h-[48px]"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Medication Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-8">
            <div className="p-6 bg-teal-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Pill size={24} />
                <h2 className="text-2xl font-bold">
                  {editingMed ? 'Edit Medication' : 'Add New Medication'}
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

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="medName">
                    Medication Name *
                  </label>
                  <input
                    id="medName"
                    type="text"
                    required
                    placeholder="e.g. Lisinopril, Metformin"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 min-h-[48px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="medDosage">
                    Dosage *
                  </label>
                  <input
                    id="medDosage"
                    type="text"
                    required
                    placeholder="e.g. 10mg, 1 tablet, 5ml"
                    value={formData.dosage}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 min-h-[48px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="medFreq">
                    Frequency
                  </label>
                  <select
                    id="medFreq"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 min-h-[48px] bg-white"
                  >
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="prescribedBy">
                    Prescribed By (Doctor)
                  </label>
                  <input
                    id="prescribedBy"
                    type="text"
                    placeholder="e.g. Dr. Adams"
                    value={formData.prescribedBy}
                    onChange={(e) => setFormData({ ...formData, prescribedBy: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 min-h-[48px]"
                  />
                </div>
              </div>

              {/* Time Slots Checkboxes */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Daily Time Slots *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {TIME_SLOT_OPTIONS.map((slot) => {
                    const selected = formData.times.includes(slot.id)
                    return (
                      <button
                        type="button"
                        key={slot.id}
                        onClick={() => handleToggleTimeSlot(slot.id)}
                        className={`p-3 rounded-xl border text-center transition-all min-h-[56px] flex flex-col justify-center items-center ${
                          selected
                            ? 'bg-teal-50 border-teal-500 text-teal-800 font-bold'
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}
                        aria-pressed={selected}
                      >
                        <span className="capitalize text-sm">{slot.id}</span>
                        <span className="text-[11px] opacity-75">{slot.label.split(' ')[1]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Color Code Picker */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Color Tagging
                </label>
                <div className="flex items-center gap-3">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      type="button"
                      key={c.value}
                      onClick={() => setFormData({ ...formData, color: c.value })}
                      style={{ backgroundColor: c.value }}
                      className={`w-9 h-9 rounded-full transition-transform min-h-[36px] min-w-[36px] ${
                        formData.color === c.value ? 'ring-4 ring-offset-2 ring-teal-500 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      aria-label={`Select ${c.label} color`}
                    />
                  ))}
                </div>
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="startDate">
                    Start Date
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 min-h-[48px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="endDate">
                    End Date (Optional)
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 min-h-[48px]"
                  />
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="instructions">
                  Special Instructions
                </label>
                <textarea
                  id="instructions"
                  rows={2}
                  placeholder="e.g. Take with water after breakfast, do not crush tablet"
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>

              {/* Submit Buttons */}
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
                  {saving ? 'Saving...' : editingMed ? 'Save Changes' : 'Add Medication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
