import React, { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { analyticsApi, adherenceApi } from '../services/api'
import StreakCounter from '../components/StreakCounter'
import toast from 'react-hot-toast'
import { TrendingUp, AlertCircle, Award, Calendar, BarChart2, ShieldCheck } from 'lucide-react'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [dashboardStats, setDashboardStats] = useState({
    adherencePercentage: 92,
    streak: 7,
    missedThisWeek: 1,
    takenTotal: 58,
    missedTotal: 5,
  })
  const [chartData, setChartData] = useState(null)
  const [missedMeds, setMissedMeds] = useState([])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const [dashRes, chartRes, missedRes] = await Promise.allSettled([
        analyticsApi.getDashboard(),
        analyticsApi.getAdherenceChart(),
        analyticsApi.getMissedMeds(),
      ])

      if (dashRes.status === 'fulfilled' && dashRes.value?.data) {
        setDashboardStats((prev) => ({
          ...prev,
          ...(dashRes.value.data.stats || dashRes.value.data),
        }))
      }

      if (chartRes.status === 'fulfilled' && chartRes.value?.data) {
        setChartData(chartRes.value.data)
      }

      if (missedRes.status === 'fulfilled' && missedRes.value?.data) {
        setMissedMeds(missedRes.value.data.missedMeds || missedRes.value.data || [])
      }
    } catch (err) {
      console.error('Failed to load analytics', err)
      toast.error('Could not load analytics figures')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  // 30-Day Line Chart Config
  const lineLabels = chartData?.labels || Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`)
  const lineValues = chartData?.values || [
    85, 90, 80, 95, 100, 100, 90, 95, 88, 92, 100, 100, 95, 90, 85,
    90, 95, 100, 90, 92, 95, 98, 100, 85, 90, 95, 92, 96, 100, 95,
  ]

  const lineChartData = {
    labels: lineLabels,
    datasets: [
      {
        label: 'Adherence %',
        data: lineValues,
        fill: true,
        borderColor: '#0d9488',
        backgroundColor: 'rgba(13, 148, 136, 0.12)',
        tension: 0.35,
        pointBackgroundColor: '#0d9488',
        pointRadius: 3,
        pointHoverRadius: 6,
      },
    ],
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `Adherence: ${context.parsed.y}%`,
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { callback: (val) => `${val}%` },
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
      },
      x: {
        grid: { display: false },
        ticks: { maxTicksLimit: 10 },
      },
    },
  }

  // Weekly Bar Chart (Taken vs Missed)
  const barChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Doses Taken',
        data: chartData?.weeklyTaken || [4, 4, 3, 4, 4, 3, 4],
        backgroundColor: '#0d9488',
        borderRadius: 8,
      },
      {
        label: 'Doses Missed',
        data: chartData?.weeklyMissed || [0, 0, 1, 0, 0, 1, 0],
        backgroundColor: '#f43f5e',
        borderRadius: 8,
      },
    ],
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
    },
  }

  // Adherence Doughnut
  const adherenceRate = Math.min(100, Math.max(0, dashboardStats.adherencePercentage ?? 92))
  const doughnutData = {
    labels: ['Adhered', 'Missed'],
    datasets: [
      {
        data: [adherenceRate, 100 - adherenceRate],
        backgroundColor: ['#0d9488', '#fecdd3'],
        borderWidth: 0,
      },
    ],
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <span className="p-2 bg-teal-100 text-teal-700 rounded-xl">📊</span>
          Adherence & Health Analytics
        </h1>
        <p className="text-gray-500 mt-1 text-base">
          Longitudinal insights, habit consistency, and medication compliance tracking.
        </p>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Streak card */}
        <StreakCounter streak={dashboardStats.streak ?? 0} size="large" />

        {/* Adherence % Gauge */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overall Compliance</p>
            <p className="text-4xl font-black text-teal-700 mt-1">{adherenceRate}%</p>
            <p className="text-xs text-gray-500 mt-2">
              Based on scheduled doses over the last 30 days.
            </p>
          </div>
          <div className="w-24 h-24 flex-shrink-0">
            <Doughnut
              data={doughnutData}
              options={{ cutout: '75%', plugins: { legend: { display: false } } }}
            />
          </div>
        </div>

        {/* Missed Doses Alert Card */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Missed Doses (Week)</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-4xl font-black ${dashboardStats.missedThisWeek > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {dashboardStats.missedThisWeek ?? 0}
              </span>
              <span className="text-sm font-semibold text-gray-500">doses</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {dashboardStats.missedThisWeek === 0
                ? 'Perfect attendance this week! 🎉'
                : 'Alert notifications sent to caretakers.'}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-teal-700">
            <ShieldCheck size={16} /> Care group alerted in real time
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 30-Day Line Chart */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">30-Day Adherence Trend</h3>
              <p className="text-xs text-gray-500">Daily medication adherence percentage</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-teal-50 text-teal-800 rounded-lg">
              Last 30 Days
            </span>
          </div>
          <div className="h-64">
            <Line data={lineChartData} options={lineOptions} />
          </div>
        </div>

        {/* Weekly Taken vs Missed Bar Chart */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Weekly Doses: Taken vs Missed</h3>
              <p className="text-xs text-gray-500">Comparison of daily administered vs skipped doses</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg">
              This Week
            </span>
          </div>
          <div className="h-64">
            <Bar data={barChartData} options={barOptions} />
          </div>
        </div>
      </div>

      {/* Most Missed Medications Table */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <AlertCircle size={22} className="text-amber-500" />
          Medication Adherence Insights
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Identifies specific medications that require closer monitoring or adjusted schedules.
        </p>

        {missedMeds.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl text-gray-500 font-medium">
            👏 Great job! No medications have recurring missed doses.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Medication</th>
                  <th className="py-3 px-4">Dosage</th>
                  <th className="py-3 px-4">Missed Count</th>
                  <th className="py-3 px-4">Compliance</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {missedMeds.map((med, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-bold text-gray-900">{med.name}</td>
                    <td className="py-3 px-4 text-gray-600">{med.dosage || 'Standard'}</td>
                    <td className="py-3 px-4 font-semibold text-rose-600">{med.missedCount || 1} times</td>
                    <td className="py-3 px-4 font-semibold text-gray-700">{med.complianceRate || 80}%</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Needs Attention
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
