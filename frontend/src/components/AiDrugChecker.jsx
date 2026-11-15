import React, { useState } from 'react'
import { aiApi } from '../services/api'
import toast from 'react-hot-toast'
import { Sparkles, ShieldCheck, AlertTriangle, AlertCircle, Utensils, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

export default function AiDrugChecker() {
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [isOpen, setIsOpen] = useState(false)

  const runAnalysis = async () => {
    try {
      setLoading(true)
      const res = await aiApi.getDrugCheck()
      const data = res.data?.data || res.data || {}
      setAnalysis(data)
      setIsOpen(true)
      toast.success('Clinical AI safety analysis complete!')
    } catch (err) {
      console.error('Drug check failed:', err)
      toast.error('Could not complete drug safety analysis')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-lg space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/20 text-teal-300 rounded-full text-xs font-bold border border-teal-400/30">
            <Sparkles size={14} /> Powered by Google Gemini AI
          </div>
          <h3 className="text-2xl font-black tracking-tight">
            Drug-Drug & Dietary Interaction Checker
          </h3>
          <p className="text-sm text-teal-100 max-w-2xl">
            Detects dangerous polypharmacy interactions (e.g. blood thinners + NSAIDs) and food absorption warnings (e.g. grapefruit with statins).
          </p>
        </div>

        <button
          onClick={runAnalysis}
          disabled={loading}
          className="px-6 py-3.5 bg-teal-500 hover:bg-teal-400 active:scale-95 text-gray-950 font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-2.5 min-h-[48px] flex-shrink-0 disabled:opacity-60"
        >
          {loading ? (
            <>
              <RefreshCw size={18} className="animate-spin" /> Analyzing Prescriptions...
            </>
          ) : (
            <>
              <Sparkles size={18} /> {analysis ? 'Re-Run AI Safety Check' : 'Run AI Safety Check'}
            </>
          )}
        </button>
      </div>

      {/* Analysis Results View */}
      {analysis && isOpen && (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 space-y-6">
          {/* Top Score Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-teal-300 font-bold">Polypharmacy Safety Score</p>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-4xl font-black text-white">{analysis.safetyScore || 90}</span>
                <span className="text-teal-200 text-sm font-semibold">/ 100 Safety Rating</span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    analysis.riskLevel === 'High'
                      ? 'bg-rose-500/30 text-rose-300 border border-rose-400'
                      : analysis.riskLevel === 'Moderate'
                      ? 'bg-amber-500/30 text-amber-300 border border-amber-400'
                      : 'bg-emerald-500/30 text-emerald-300 border border-emerald-400'
                  }`}
                >
                  {analysis.riskLevel || 'Low'} Risk Level
                </span>
              </div>
            </div>

            <p className="text-xs text-teal-200/80 max-w-md">
              {analysis.summary}
            </p>
          </div>

          {/* Drug-Drug Interactions */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-teal-200 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              Drug-Drug Potential Interactions ({analysis.drugInteractions?.length || 0})
            </h4>

            {!analysis.drugInteractions || analysis.drugInteractions.length === 0 ? (
              <div className="p-3.5 bg-white/5 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2">
                <ShieldCheck size={16} /> No hazardous drug-drug interactions detected between active medications.
              </div>
            ) : (
              analysis.drugInteractions.map((item, idx) => (
                <div key={idx} className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-white">{item.title}</span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        item.severity === 'High'
                          ? 'bg-rose-500/30 text-rose-300'
                          : 'bg-amber-500/30 text-amber-300'
                      }`}
                    >
                      {item.severity} Severity
                    </span>
                  </div>
                  <p className="text-xs text-teal-100">{item.mechanism}</p>
                  <p className="text-xs text-teal-300 font-semibold">
                    💡 Clinical Guidance: {item.recommendation}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Food / Dietary Warnings */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-teal-200 flex items-center gap-2">
              <Utensils size={16} className="text-teal-400" />
              Dietary & Food Absorption Precautions ({analysis.foodWarnings?.length || 0})
            </h4>

            {!analysis.foodWarnings || analysis.foodWarnings.length === 0 ? (
              <div className="p-3.5 bg-white/5 rounded-xl text-xs text-emerald-300 font-medium flex items-center gap-2">
                <ShieldCheck size={16} /> Standard dietary intake is compatible with current medications.
              </div>
            ) : (
              analysis.foodWarnings.map((item, idx) => (
                <div key={idx} className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">
                      {item.drug}: Avoid/Monitor {item.food}
                    </span>
                    <span className="text-[11px] font-bold text-amber-300">{item.severity} Precaution</span>
                  </div>
                  <p className="text-xs text-teal-100">{item.effect}</p>
                  <p className="text-xs text-teal-300 font-semibold">📌 {item.instruction}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
