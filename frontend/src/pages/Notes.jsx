import React, { useState, useEffect } from 'react'
import { notesApi } from '../services/api'
import toast from 'react-hot-toast'
import { Plus, BookOpen, Trash2, Calendar, Smile, AlertCircle, Heart } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const MOODS = [
  { emoji: '😊', label: 'Good / Happy', value: 'good' },
  { emoji: '😐', label: 'Neutral / Okay', value: 'neutral' },
  { emoji: '😔', label: 'Tired / Low', value: 'tired' },
  { emoji: '😰', label: 'Anxious / Pain', value: 'anxious' },
]

const COMMON_SYMPTOMS = [
  'Headache',
  'Dizziness',
  'Nausea',
  'Fatigue',
  'Joint Pain',
  'Shortness of Breath',
  'Loss of Appetite',
  'Sleep Trouble',
]

export default function Notes() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [content, setContent] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [mood, setMood] = useState('good')
  const [selectedSymptoms, setSelectedSymptoms] = useState([])

  const loadNotes = async () => {
    try {
      setLoading(true)
      const res = await notesApi.getAll()
      setNotes(res.data.notes || res.data || [])
    } catch (err) {
      toast.error('Failed to load health notes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotes()
  }, [])

  const handleToggleSymptom = (sym) => {
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== sym))
    } else {
      setSelectedSymptoms([...selectedSymptoms, sym])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim() && selectedSymptoms.length === 0) {
      return toast.error('Please add note content or select observed symptoms')
    }

    try {
      setSubmitting(true)
      await notesApi.add({
        date,
        content: content.trim(),
        mood,
        symptoms: selectedSymptoms,
      })
      toast.success('Journal entry saved! 📝')
      setContent('')
      setSelectedSymptoms([])
      setMood('good')
      loadNotes()
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to save note')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await notesApi.delete(id)
      toast.success('Note removed')
      loadNotes()
    } catch (err) {
      toast.error('Failed to remove note')
    }
  }

  const getMoodEmoji = (moodVal) => {
    const found = MOODS.find((m) => m.value === moodVal)
    return found ? found.emoji : '📝'
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Top Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <span className="p-2 bg-teal-100 text-teal-700 rounded-xl">📝</span>
          Health Journal & Care Notes
        </h1>
        <p className="text-gray-500 mt-1 text-base">
          Log daily observations, mood checks, symptoms, and updates for the care team.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Editor Form (Left Col) */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5 h-fit">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen size={20} className="text-teal-600" />
            New Journal Entry
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date selection */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="noteDate">
                Date
              </label>
              <input
                id="noteDate"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 text-sm min-h-[46px]"
              />
            </div>

            {/* Mood selector */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Patient Mood Today
              </label>
              <div className="grid grid-cols-4 gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMood(m.value)}
                    className={`py-3 rounded-xl flex flex-col items-center justify-center transition-all min-h-[56px] border ${
                      mood === m.value
                        ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500 shadow-sm'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    aria-label={`Select mood: ${m.label}`}
                    aria-pressed={mood === m.value}
                  >
                    <span className="text-2xl">{m.emoji}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Symptoms checklist */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                Observed Symptoms (if any)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SYMPTOMS.map((sym) => {
                  const selected = selectedSymptoms.includes(sym)
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleToggleSymptom(sym)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] ${
                        selected
                          ? 'bg-rose-100 text-rose-800 border border-rose-300 font-bold'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-transparent'
                      }`}
                      aria-pressed={selected}
                    >
                      {selected ? '✓ ' : '+ '}
                      {sym}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Notes Content */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="noteContent">
                Care Notes & Remarks
              </label>
              <textarea
                id="noteContent"
                rows={4}
                placeholder="How is patient feeling? Appetite, mobility, sleep quality..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all shadow-sm min-h-[50px] flex items-center justify-center gap-2 disabled:bg-teal-400"
            >
              {submitting ? 'Saving entry...' : <><Plus size={20} /> Save Journal Entry</>}
            </button>
          </form>
        </div>

        {/* Notes Feed (Right 2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center justify-between">
            <span>Historical Log</span>
            <span className="text-sm font-semibold text-gray-500">
              {notes.length} {notes.length === 1 ? 'entry' : 'entries'}
            </span>
          </h2>

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-600 border-t-transparent mx-auto mb-3"></div>
              <p className="text-gray-500 text-sm">Loading health notes...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
              <span className="text-5xl block mb-3">📖</span>
              <h3 className="text-xl font-bold text-gray-900 mb-1">No Journal Entries Yet</h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">
                Start tracking daily well-being, vitals, or symptoms so your family and doctors have a complete record.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((item) => {
                const noteDate = item.date
                  ? format(typeof item.date === 'string' ? parseISO(item.date) : new Date(item.date), 'EEEE, MMMM d, yyyy')
                  : 'Undated'

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl" role="img" aria-label={`Mood: ${item.mood}`}>
                          {getMoodEmoji(item.mood)}
                        </span>
                        <div>
                          <p className="font-bold text-gray-900 text-base">{noteDate}</p>
                          <p className="text-xs text-gray-500 capitalize">
                            Logged by: <strong>{item.memberName || 'Care Member'}</strong>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Delete note"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {item.content && (
                      <p className="text-gray-700 text-base leading-relaxed bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                        {item.content}
                      </p>
                    )}

                    {item.symptoms && item.symptoms.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Symptoms:</span>
                        {item.symptoms.map((s, idx) => (
                          <span
                            key={idx}
                            className="bg-rose-50 text-rose-800 text-xs px-2.5 py-1 rounded-md font-semibold border border-rose-200"
                          >
                            ⚠️ {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
