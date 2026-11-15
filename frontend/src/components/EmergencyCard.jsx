import React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Phone, ArrowRight, ShieldAlert, HeartPulse } from 'lucide-react'

export default function EmergencyCard({ emergencyInfo, compact = true }) {
  const navigate = useNavigate()
  const contact = emergencyInfo?.emergencyContact || {}
  const bloodGroup = emergencyInfo?.bloodGroup || 'Unknown'
  const allergies = emergencyInfo?.allergies || []
  const conditions = emergencyInfo?.conditions || []

  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
            <ShieldAlert size={24} aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-bold text-red-900 text-lg leading-tight">Emergency Information</h3>
            <p className="text-red-700 text-sm">Critical medical details</p>
          </div>
        </div>
        <span className="bg-red-600 text-white font-extrabold text-lg px-3 py-1 rounded-xl shadow-sm" aria-label={`Blood Group: ${bloodGroup}`}>
          {bloodGroup}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm">
        <div className="bg-white/80 p-3 rounded-xl border border-red-100">
          <p className="font-semibold text-gray-700 text-xs uppercase tracking-wider mb-1">Primary Emergency Contact</p>
          <p className="font-bold text-gray-900 text-base">{contact.name || 'Not specified'}</p>
          {contact.phone ? (
            <a
              href={`tel:${contact.phone}`}
              className="inline-flex items-center gap-1.5 text-red-600 font-bold hover:underline mt-1 min-h-[36px]"
              aria-label={`Call emergency contact at ${contact.phone}`}
            >
              <Phone size={16} aria-hidden="true" />
              <span>{contact.phone}</span>
            </a>
          ) : (
            <p className="text-gray-500 text-xs">No phone provided</p>
          )}
        </div>

        <div className="bg-white/80 p-3 rounded-xl border border-red-100">
          <p className="font-semibold text-gray-700 text-xs uppercase tracking-wider mb-1">Allergies & Alerts</p>
          {allergies.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {allergies.map((allergy, idx) => (
                <span key={idx} className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-md font-medium">
                  ⚠️ {allergy}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-xs">No known allergies</p>
          )}
        </div>
      </div>

      <button
        onClick={() => navigate('/emergency')}
        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors min-h-[48px]"
        aria-label="View full emergency medical card"
      >
        <span>View Full Emergency Card & PDF</span>
        <ArrowRight size={18} aria-hidden="true" />
      </button>
    </div>
  )
}
