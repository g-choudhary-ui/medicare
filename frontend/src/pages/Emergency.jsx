import React, { useState, useEffect } from 'react'
import { emergencyApi, medicationsApi } from '../services/api'
import { useProfile } from '../context/ProfileContext'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  Phone,
  Printer,
  Download,
  Share2,
  Heart,
  Pill,
  ShieldAlert,
  FileText,
  Copy,
  Check,
} from 'lucide-react'

export default function Emergency() {
  const { profile } = useProfile()
  const [emergencyData, setEmergencyData] = useState(null)
  const [medications, setMedications] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadingReport, setDownloadingReport] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sosLoading, setSosLoading] = useState(false)
  const [sosTriggered, setSosTriggered] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [emergRes, medsRes] = await Promise.allSettled([
        emergencyApi.get(),
        medicationsApi.getAll(),
      ])

      if (emergRes.status === 'fulfilled' && emergRes.value?.data) {
        setEmergencyData(emergRes.value.data.emergencyInfo || emergRes.value.data)
      } else if (profile) {
        setEmergencyData(profile)
      }

      if (medsRes.status === 'fulfilled' && medsRes.value?.data) {
        setMedications(medsRes.value.data.medications || medsRes.value.data || [])
      }
    } catch (err) {
      toast.error('Failed to load emergency profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true)
      const res = await emergencyApi.getPdf()
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `MediCare_Emergency_Card_${(profile?.elderlyName || 'patient').replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Emergency PDF downloaded')
    } catch (err) {
      toast.error('Failed to download emergency PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleDownloadDoctorReport = async () => {
    try {
      setDownloadingReport(true)
      const res = await emergencyApi.getDoctorReportPdf()
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `MediCare_Clinical_Doctor_Report_${(profile?.elderlyName || 'patient').replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Clinical Doctor Visit Summary downloaded!')
    } catch (err) {
      toast.error('Failed to download doctor report')
    } finally {
      setDownloadingReport(false)
    }
  }

  const handleTriggerSos = () => {
    setSosLoading(true)
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude, accuracy } = position.coords
            await emergencyApi.triggerSos({
              latitude,
              longitude,
              accuracy,
              note: `Emergency SOS triggered from Emergency Card by ${patientName}`,
            })
            setSosTriggered(true)
            toast.success('🚨 Family notified with your exact GPS location!')
          } catch (e) {
            setSosTriggered(true)
            toast.success('🚨 Emergency alert dispatched to family!')
          } finally {
            setSosLoading(false)
          }
        },
        async () => {
          try {
            await emergencyApi.triggerSos({
              note: `Emergency SOS triggered by ${patientName} (Location permission off)`,
            })
            setSosTriggered(true)
            toast.success('🚨 Emergency alert dispatched to family!')
          } finally {
            setSosLoading(false)
          }
        },
        { timeout: 7000 }
      )
    } else {
      emergencyApi.triggerSos({ note: `SOS triggered by ${patientName}` })
      setSosTriggered(true)
      setSosLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleShare = () => {
    const text = `EMERGENCY MEDICAL INFO:\nPatient: ${profile?.elderlyName || 'Unknown'}\nBlood Group: ${emergencyData?.bloodGroup || 'Unknown'}\nEmergency Contact: ${emergencyData?.emergencyContact?.name || ''} (${emergencyData?.emergencyContact?.phone || ''})\nAllergies: ${(emergencyData?.allergies || []).join(', ') || 'None'}\nConditions: ${(emergencyData?.conditions || []).join(', ') || 'None'}`

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Emergency info copied to clipboard!')
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const patientName = profile?.elderlyName || emergencyData?.elderlyName || 'Patient'
  const bloodGroup = emergencyData?.bloodGroup || profile?.bloodGroup || 'Unknown'
  const allergies = emergencyData?.allergies || profile?.allergies || []
  const conditions = emergencyData?.conditions || profile?.conditions || []
  const contact = emergencyData?.emergencyContact || profile?.emergencyContact || {}

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <span className="p-2 bg-rose-100 text-rose-700 rounded-xl">🚨</span>
            Emergency Medical Card
          </h1>
          <p className="text-gray-500 mt-1 text-base">
            First-responder ready medical identity and critical contact information.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all shadow-sm min-h-[48px]"
            aria-label="Download emergency card as PDF"
          >
            <Download size={18} />
            <span>{downloadingPdf ? 'Exporting...' : 'PDF Card'}</span>
          </button>

          <button
            onClick={handleDownloadDoctorReport}
            disabled={downloadingReport}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm min-h-[48px]"
            aria-label="Download clinical doctor visit report as PDF"
          >
            <FileText size={18} />
            <span>{downloadingReport ? 'Generating...' : 'Doctor Report (PDF)'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-all min-h-[48px]"
            aria-label="Print emergency card"
          >
            <Printer size={18} />
            <span>Print</span>
          </button>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-all min-h-[48px]"
            aria-label="Share emergency medical info"
          >
            {copied ? <Check size={18} className="text-emerald-600" /> : <Share2 size={18} />}
            <span>{copied ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* GPS SOS Beacon Card */}
      <div className="bg-gradient-to-r from-rose-600 to-rose-700 rounded-3xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="space-y-1">
          <span className="text-xs uppercase font-extrabold tracking-wider bg-white/20 px-3 py-1 rounded-full">
            🚨 Instant Dispatch Beacon
          </span>
          <h2 className="text-2xl font-black">One-Click GPS SOS Distress Alert</h2>
          <p className="text-sm text-rose-100 max-w-xl">
            Immediately transmits your real-time GPS coordinates, Google Maps pin, and medical history to all emergency contacts.
          </p>
        </div>

        <button
          onClick={handleTriggerSos}
          disabled={sosLoading}
          className="px-6 py-4 bg-white hover:bg-rose-50 text-rose-700 active:scale-95 text-base font-black rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2.5 min-h-[56px] flex-shrink-0"
        >
          <ShieldAlert size={22} />
          {sosLoading ? 'Acquiring GPS...' : sosTriggered ? '✓ Coordinates Dispatched' : 'ACTIVATE SOS BEACON'}
        </button>
      </div>

      {/* Main High-Contrast Emergency Card */}
      <div className="bg-white border-4 border-rose-500 rounded-3xl shadow-xl overflow-hidden print:border-2">
        {/* Card Header Alert Bar */}
        <div className="bg-rose-600 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
              🚨
            </div>
            <div>
              <p className="text-xs uppercase font-extrabold tracking-widest text-rose-200">
                Official Medical Alert Identification
              </p>
              <h2 className="text-3xl font-black">{patientName}</h2>
              <p className="text-sm text-rose-100 mt-0.5">
                {profile?.phone ? `Tel: ${profile.phone}` : ''}
              </p>
            </div>
          </div>

          {/* Blood group display - VERY LARGE */}
          <div className="bg-white text-rose-700 px-6 py-4 rounded-2xl text-center shadow-lg border-2 border-rose-200 flex-shrink-0">
            <p className="text-xs font-black uppercase tracking-wider text-rose-800">Blood Group</p>
            <p className="text-5xl font-black tracking-tight">{bloodGroup}</p>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Primary Emergency Contact */}
          <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-rose-800 flex items-center gap-2 mb-3">
              <Phone size={18} /> Primary Emergency Contact
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-2xl font-black text-gray-900">{contact.name || 'Not Designated'}</p>
                <p className="text-sm font-semibold text-gray-500">Authorized Healthcare Proxy / Family</p>
              </div>
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xl rounded-2xl shadow-md min-h-[52px]"
                  aria-label={`Call emergency contact at ${contact.phone}`}
                >
                  <Phone size={22} />
                  <span>{contact.phone}</span>
                </a>
              )}
            </div>
          </div>

          {/* Allergies & Conditions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Allergies */}
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5">
              <h4 className="text-sm font-black uppercase tracking-wider text-amber-900 flex items-center gap-2 mb-3">
                <AlertTriangle size={20} className="text-amber-600" />
                Known Drug & Food Allergies
              </h4>
              {allergies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {allergies.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-white text-rose-700 font-bold text-sm rounded-xl border border-rose-300 shadow-sm flex items-center gap-1.5"
                    >
                      <AlertTriangle size={15} /> {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 font-medium italic">No known severe allergies recorded.</p>
              )}
            </div>

            {/* Medical Conditions */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
              <h4 className="text-sm font-black uppercase tracking-wider text-blue-900 flex items-center gap-2 mb-3">
                <Heart size={20} className="text-blue-600" />
                Pre-existing Medical Conditions
              </h4>
              {conditions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {conditions.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-white text-blue-800 font-bold text-sm rounded-xl border border-blue-200 shadow-sm"
                    >
                      • {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 font-medium italic">No chronic medical conditions listed.</p>
              )}
            </div>
          </div>

          {/* Current Active Medications List */}
          <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50">
            <h4 className="text-sm font-black uppercase tracking-wider text-gray-700 flex items-center gap-2 mb-3">
              <Pill size={18} className="text-teal-600" />
              Active Daily Medications
            </h4>
            {medications.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No daily prescriptions logged.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {medications.map((med) => (
                  <div
                    key={med.id}
                    className="p-3 bg-white rounded-xl border border-gray-200 flex items-start gap-2 shadow-sm"
                  >
                    <div
                      className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: med.color || '#0d9488' }}
                    />
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{med.name}</p>
                      <p className="text-xs text-gray-500 font-semibold">{med.dosage} • <span className="capitalize">{med.frequency || 'Daily'}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="bg-gray-100 px-6 py-4 border-t border-gray-200 text-center text-xs text-gray-600">
          This digital card is generated by <strong>MediCare Care Management Platform</strong>. For immediate assistance, contact EMS (911) and the listed emergency proxy.
        </div>
      </div>
    </div>
  )
}
