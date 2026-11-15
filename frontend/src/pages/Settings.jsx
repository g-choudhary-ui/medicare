import React, { useState, useEffect } from 'react'
import { useProfile } from '../context/ProfileContext'
import { profileApi } from '../services/api'
import { playNotificationChime, sendBrowserNotification } from '../services/notificationService'
import toast from 'react-hot-toast'
import {
  Settings as SettingsIcon,
  User,
  Users,
  KeyRound,
  Eye,
  EyeOff,
  Trash2,
  Bell,
  RefreshCw,
  Shield,
  Save,
  CheckCircle2,
  Copy,
} from 'lucide-react'

export default function Settings() {
  const { profile, member, updateProfile, logout } = useProfile()
  const [members, setMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [showPasscode, setShowPasscode] = useState(false)
  const [copiedPasscode, setCopiedPasscode] = useState(false)

  // Profile editable form
  const [formData, setFormData] = useState({
    elderlyName: '',
    email: '',
    phone: '',
    bloodGroup: 'O+',
    allergies: '',
    conditions: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emailReminders: true,
  })

  const storedPasscode = localStorage.getItem('passcode') || '••••••'
  const storedProfileId = localStorage.getItem('profileId') || ''
  const isOwner = member?.role === 'owner' || !member?.role

  useEffect(() => {
    if (profile) {
      setFormData({
        elderlyName: profile.elderlyName || '',
        email: profile.email || '',
        phone: profile.phone || '',
        bloodGroup: profile.bloodGroup || 'O+',
        allergies: Array.isArray(profile.allergies) ? profile.allergies.join(', ') : (profile.allergies || ''),
        conditions: Array.isArray(profile.conditions) ? profile.conditions.join(', ') : (profile.conditions || ''),
        emergencyContactName: profile.emergencyContact?.name || '',
        emergencyContactPhone: profile.emergencyContact?.phone || '',
        emailReminders: profile.preferences?.emailReminders ?? true,
      })
    }
  }, [profile])

  const loadMembers = async () => {
    try {
      setLoadingMembers(true)
      const res = await profileApi.getMembers()
      setMembers(res.data.members || res.data || [])
    } catch (err) {
      console.warn('Could not load members', err)
    } finally {
      setLoadingMembers(false)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [])

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    try {
      setSavingProfile(true)
      const payload = {
        elderlyName: formData.elderlyName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        bloodGroup: formData.bloodGroup,
        allergies: formData.allergies.split(',').map((s) => s.trim()).filter(Boolean),
        conditions: formData.conditions.split(',').map((s) => s.trim()).filter(Boolean),
        emergencyContact: {
          name: formData.emergencyContactName.trim(),
          phone: formData.emergencyContactPhone.trim(),
        },
        preferences: {
          emailReminders: formData.emailReminders,
        },
      }
      await updateProfile(payload)
      toast.success('Profile preferences updated')
    } catch (err) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this caregiver/family member from the profile?')) return
    try {
      await profileApi.removeMember(memberId)
      toast.success('Member removed')
      loadMembers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member')
    }
  }

  const handleCopyPasscode = () => {
    navigator.clipboard.writeText(storedPasscode)
    setCopiedPasscode(true)
    toast.success('Passcode copied to clipboard')
    setTimeout(() => setCopiedPasscode(false), 2000)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Top Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <span className="p-2 bg-teal-100 text-teal-700 rounded-xl">⚙️</span>
          Platform Settings & Care Team
        </h1>
        <p className="text-gray-500 mt-1 text-base">
          Manage patient profile, caregiver permissions, access passcodes, and alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Profile Form & Notification settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User size={24} className="text-teal-600" />
              Patient Medical Profile
            </h2>

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="settingsName">
                  Patient's Full Name *
                </label>
                <input
                  id="settingsName"
                  type="text"
                  required
                  value={formData.elderlyName}
                  onChange={(e) => setFormData({ ...formData, elderlyName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 min-h-[48px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="settingsEmail">
                    Email Address
                  </label>
                  <input
                    id="settingsEmail"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 min-h-[48px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="settingsPhone">
                    Phone Number
                  </label>
                  <input
                    id="settingsPhone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 min-h-[48px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="settingsBlood">
                  Blood Group
                </label>
                <select
                  id="settingsBlood"
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 min-h-[48px] bg-white"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="settingsAllergies">
                  Known Allergies (comma-separated)
                </label>
                <input
                  id="settingsAllergies"
                  type="text"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 min-h-[48px]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="settingsConditions">
                  Chronic Conditions (comma-separated)
                </label>
                <input
                  id="settingsConditions"
                  type="text"
                  value={formData.conditions}
                  onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 min-h-[48px]"
                />
              </div>

              {/* Emergency Contact */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm font-bold text-rose-700 mb-3 flex items-center gap-2">
                  <Shield size={16} /> Emergency Proxy Contact
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="secName">
                      Contact Name
                    </label>
                    <input
                      id="secName"
                      type="text"
                      value={formData.emergencyContactName}
                      onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 min-h-[48px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1" htmlFor="secPhone">
                      Contact Phone
                    </label>
                    <input
                      id="secPhone"
                      type="tel"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 min-h-[48px]"
                    />
                  </div>
                </div>
              </div>

              {/* Email Notifications toggle */}
              <div className="pt-4 border-t border-gray-100 space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    id="emailReminders"
                    type="checkbox"
                    checked={formData.emailReminders}
                    onChange={(e) => setFormData({ ...formData, emailReminders: e.target.checked })}
                    className="w-5 h-5 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                  />
                  <div>
                    <label htmlFor="emailReminders" className="text-sm font-bold text-gray-800 cursor-pointer">
                      Send daily medication & appointment emails
                    </label>
                    <p className="text-xs text-gray-500">
                      Dispatches reminders and alerts whenever a scheduled dose is missed.
                    </p>
                  </div>
                </div>

                {/* Sound & Desktop Alerts Test */}
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2.5">
                    <Bell size={18} className="text-teal-600" />
                    <div>
                      <p className="text-xs font-bold text-gray-800">Sound Chime & Desktop Notification</p>
                      <p className="text-[11px] text-gray-500">Test the gentle audio alert for medication reminders</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playNotificationChime()
                      sendBrowserNotification(
                        '🔔 MediCare Sound Alert Test',
                        'Notification sound and alert working perfectly!',
                        'settings-test'
                      )
                      toast.success('Sound chime played!')
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-teal-50 text-teal-700 text-xs font-bold rounded-lg border border-teal-200 shadow-sm transition-colors"
                  >
                    Test Alert Sound
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all shadow-sm min-h-[52px] flex items-center justify-center gap-2 disabled:bg-teal-400"
              >
                {savingProfile ? (
                  'Updating Profile...'
                ) : (
                  <>
                    <Save size={20} /> Save Profile Changes
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Col: Team Members & Security credentials */}
        <div className="space-y-6">
          {/* Access Credentials & Passcode */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <KeyRound size={20} className="text-teal-600" />
              Access Passcode
            </h3>
            <p className="text-xs text-gray-500">
              Share your Profile ID and passcode with loved ones or nurses so they can join this care circle.
            </p>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Profile ID</p>
                <p className="font-mono font-bold text-gray-800 text-sm select-all">{storedProfileId || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Group Passcode</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-2xl font-black text-teal-800 tracking-widest">
                    {showPasscode ? storedPasscode : '••••••'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowPasscode(!showPasscode)}
                      className="p-2 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-white"
                      aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                    >
                      {showPasscode ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <button
                      onClick={handleCopyPasscode}
                      className="p-2 text-gray-500 hover:text-teal-600 rounded-lg hover:bg-white"
                      aria-label="Copy passcode"
                    >
                      {copiedPasscode ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Members List */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Users size={20} className="text-teal-600" />
                Care Circle Members
              </h3>
              <span className="text-xs font-bold bg-teal-50 text-teal-800 px-2 py-0.5 rounded-full">
                {members.length || 1}
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {/* Profile creator / owner entry */}
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{profile?.elderlyName || 'Owner'}</p>
                  <p className="text-xs text-gray-500">Patient & Profile Primary</p>
                </div>
                <span className="text-xs font-bold bg-teal-100 text-teal-800 px-2.5 py-1 rounded-full">
                  Primary Owner
                </span>
              </div>

              {members.map((mem) => (
                <div key={mem.id || mem.memberId} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{mem.name || 'Member'}</p>
                    <p className="text-xs text-gray-500">{mem.email || 'No email'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold bg-gray-100 text-gray-700 capitalize px-2 py-0.5 rounded-md">
                      {mem.role || 'caregiver'}
                    </span>
                    {isOwner && mem.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(mem.id || mem.memberId)}
                        className="text-gray-400 hover:text-rose-600 p-1 rounded"
                        aria-label={`Remove ${mem.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
