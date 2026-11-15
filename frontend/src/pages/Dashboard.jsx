import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useProfile } from '../context/ProfileContext'
import {
  analyticsApi,
  medicationsApi,
  appointmentsApi,
  emergencyApi,
} from '../services/api'
import StreakCounter from '../components/StreakCounter'
import EmergencyCard from '../components/EmergencyCard'
import AdherenceTracker from '../components/AdherenceTracker'
import ActivityLog from '../components/ActivityLog'
import AppointmentCard from '../components/AppointmentCard'
import toast from 'react-hot-toast'
import {
  Pill,
  Calendar,
  BarChart2,
  AlertCircle,
  PlusCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'

export default function Dashboard() {
  const { profile } = useProfile()
  const [stats, setStats] = useState({
    adherencePercentage: 0,
    streak: 0,
    upcomingAppointmentsCount: 0,
    activeMedicationsCount: 0,
    missedThisWeek: 0,
  })
  const [medications, setMedications] = useState([])
  const [upcomingAppointments, setUpcomingAppointments] = useState([])
  const [activities, setActivities] = useState([])
  const [emergencyInfo, setEmergencyInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [takingDose, setTakingDose] = useState(false)

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [statsRes, medsRes, apptsRes, emergRes] = await Promise.allSettled([
        analyticsApi.getDashboard(),
        medicationsApi.getAll(),
        appointmentsApi.getAll('upcoming'),
        emergencyApi.get(),
      ])

      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        setStats(statsRes.value.data.stats || statsRes.value.data)
        if (statsRes.value.data.recentActivities) {
          setActivities(statsRes.value.data.recentActivities)
        }
      }

      if (medsRes.status === 'fulfilled' && medsRes.value?.data) {
        setMedications(medsRes.value.data.medications || medsRes.value.data || [])
      }

      if (apptsRes.status === 'fulfilled' && apptsRes.value?.data) {
        const appts = apptsRes.value.data.appointments || apptsRes.value.data || []
        setUpcomingAppointments(appts.slice(0, 3))
      }

      if (emergRes.status === 'fulfilled' && emergRes.value?.data) {
        setEmergencyInfo(emergRes.value.data.emergencyInfo || emergRes.value.data)
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      toast.error('Could not load dashboard information')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const handleTakeDose = async (medicationId, timeSlot) => {
    try {
      setTakingDose(true)
      await medicationsApi.take(medicationId, timeSlot)
      toast.success(`Dose marked as taken! 💊`)
      // Refresh dashboard stats and med list
      await loadDashboardData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record dose')
    } finally {
      setTakingDose(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent mb-4"></div>
        <p className="text-gray-600 font-medium text-lg">Gathering health insights...</p>
      </div>
    )
  }

  const patientName = profile?.elderlyName || 'Loved One'

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-teal-800 rounded-3xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold mb-3">
            <span>✨ Care Management Active</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            {getGreeting()}, {patientName}! 💊
          </h1>
          <p className="mt-2 text-teal-100 text-base md:text-lg">
            Stay on track with today's routine. Family & caretakers are connected.
          </p>
        </div>
        <div className="hidden md:block absolute right-8 top-1/2 -translate-y-1/2 text-8xl opacity-30 select-none">
          🩺
        </div>
      </div>

      {/* Stats Row - 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Adherence % */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 flex-shrink-0">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Adherence Rate</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-0.5">
              {stats.adherencePercentage ?? 92}%
            </p>
            <p className="text-xs text-teal-700 font-semibold mt-0.5">
              {stats.missedThisWeek > 0 ? `${stats.missedThisWeek} missed this week` : 'Excellent adherence!'}
            </p>
          </div>
        </div>

        {/* Card 2: Streak 🔥 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 flex-shrink-0">
            <span className="text-3xl animate-fire">🔥</span>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Streak</p>
            <p className="text-3xl font-extrabold text-amber-900 mt-0.5">
              {stats.streak ?? 0} <span className="text-sm font-semibold text-gray-500">days</span>
            </p>
            <p className="text-xs text-amber-700 font-semibold mt-0.5">Keep up the streak!</p>
          </div>
        </div>

        {/* Card 3: Upcoming Appointments */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
            <Calendar size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Appointments</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-0.5">
              {stats.upcomingAppointmentsCount ?? upcomingAppointments.length}
            </p>
            <p className="text-xs text-blue-600 font-semibold mt-0.5">
              <Link to="/appointments" className="hover:underline">View calendar →</Link>
            </p>
          </div>
        </div>

        {/* Card 4: Active Medications */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
            <Pill size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Meds</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-0.5">
              {stats.activeMedicationsCount ?? medications.length}
            </p>
            <p className="text-xs text-purple-700 font-semibold mt-0.5">
              <Link to="/medications" className="hover:underline">Manage prescriptions →</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Meds Tracker + Side info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Adherence Tracker */}
        <div className="lg:col-span-2 space-y-6">
          <AdherenceTracker
            medications={medications}
            onTakeDose={handleTakeDose}
            isTaking={takingDose}
          />

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              to="/medications"
              className="p-4 bg-white rounded-2xl border border-gray-100 hover:border-teal-300 hover:shadow-sm text-center flex flex-col items-center justify-center gap-2 transition-all min-h-[90px]"
            >
              <Pill className="text-teal-600" size={24} />
              <span className="text-sm font-bold text-gray-800">Add Medication</span>
            </Link>
            <Link
              to="/appointments"
              className="p-4 bg-white rounded-2xl border border-gray-100 hover:border-teal-300 hover:shadow-sm text-center flex flex-col items-center justify-center gap-2 transition-all min-h-[90px]"
            >
              <Calendar className="text-blue-600" size={24} />
              <span className="text-sm font-bold text-gray-800">Book Doctor</span>
            </Link>
            <Link
              to="/notes"
              className="p-4 bg-white rounded-2xl border border-gray-100 hover:border-teal-300 hover:shadow-sm text-center flex flex-col items-center justify-center gap-2 transition-all min-h-[90px]"
            >
              <span className="text-2xl">📝</span>
              <span className="text-sm font-bold text-gray-800">Health Journal</span>
            </Link>
            <Link
              to="/analytics"
              className="p-4 bg-white rounded-2xl border border-gray-100 hover:border-teal-300 hover:shadow-sm text-center flex flex-col items-center justify-center gap-2 transition-all min-h-[90px]"
            >
              <BarChart2 className="text-purple-600" size={24} />
              <span className="text-sm font-bold text-gray-800">Full Analytics</span>
            </Link>
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar size={22} className="text-teal-600" />
                Next Upcoming Appointments
              </h3>
              <Link to="/appointments" className="text-sm font-bold text-teal-600 hover:underline flex items-center gap-1">
                View all <ArrowRight size={16} />
              </Link>
            </div>

            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl">
                <p className="text-gray-500 font-medium">No upcoming appointments scheduled.</p>
                <Link
                  to="/appointments"
                  className="mt-2 inline-flex items-center gap-2 text-sm text-teal-600 font-bold hover:underline"
                >
                  <PlusCircle size={16} /> Schedule an appointment
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingAppointments.map((appt) => (
                  <AppointmentCard key={appt.id} appointment={appt} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Emergency Info Card + Activity Log */}
        <div className="space-y-6">
          <EmergencyCard emergencyInfo={emergencyInfo || profile} />
          <ActivityLog activities={activities} maxItems={5} />
        </div>
      </div>
    </div>
  )
}
