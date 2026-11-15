import React, { useState, useEffect } from 'react'
import { medicationsApi } from '../services/api'
import toast from 'react-hot-toast'
import { AlertCircle, Calendar, PackageCheck, AlertTriangle, RefreshCw } from 'lucide-react'

export default function RefillForecastCard() {
  const [loading, setLoading] = useState(true)
  const [forecast, setForecast] = useState([])
  const [lowCount, setLowCount] = useState(0)

  const loadForecast = async () => {
    try {
      setLoading(true)
      const res = await medicationsApi.getRefillForecast()
      const data = res.data?.data || res.data || {}
      setForecast(data.forecast || [])
      setLowCount(data.lowSupplyCount || 0)
    } catch (err) {
      console.error('Failed to load refill forecast:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadForecast()
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm animate-pulse">
        <div className="h-6 w-48 bg-gray-200 rounded mb-4"></div>
        <div className="h-20 bg-gray-100 rounded-2xl"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>📦 Prescription Refill Forecaster</span>
            {lowCount > 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 animate-pulse">
                {lowCount} Needs Refill
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Predicts runout dates based on prescribed frequency and daily taken counts.
          </p>
        </div>

        <button
          onClick={loadForecast}
          className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors"
          title="Refresh forecast"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Grid of Medications */}
      {forecast.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-xs italic">
          No active medications to forecast.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {forecast.map((med) => {
            const isCritical = med.status === 'CRITICAL_REFILL'
            const isWarning = med.status === 'REFILL_SOON'

            return (
              <div
                key={med.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isCritical
                    ? 'bg-rose-50/70 border-rose-300'
                    : isWarning
                    ? 'bg-amber-50/70 border-amber-300'
                    : 'bg-gray-50/60 border-gray-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-bold text-sm text-gray-900 truncate">{med.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCritical
                          ? 'bg-rose-600 text-white'
                          : isWarning
                          ? 'bg-amber-600 text-white'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {med.daysRemaining} days left
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mb-2">
                    Dosage: {med.dosage} ({med.dailyDoseCount}x / day)
                  </p>

                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Supply:</span>
                      <span className="font-semibold">{med.remainingDoses} / {med.totalStock} tablets</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Runs Out:</span>
                      <span className="font-semibold text-gray-900">{med.runoutDate}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-200/60">
                  <p className={`text-[11px] font-semibold ${
                    isCritical ? 'text-rose-700' : isWarning ? 'text-amber-700' : 'text-emerald-700'
                  }`}>
                    {med.alertMessage}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
