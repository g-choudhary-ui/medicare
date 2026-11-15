import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../context/ProfileContext'
import toast from 'react-hot-toast'
import { UserPlus, LogIn, Heart, Shield, Clock, X, Copy, CheckCircle } from 'lucide-react'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']
const ROLES = [
  { value: 'caretaker', label: 'Caretaker' },
  { value: 'family', label: 'Family Member' },
]

function PasscodeModal({ passcode, profileId, onClose }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(`Profile ID: ${profileId}\nPasscode: ${passcode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="passcode-title">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 id="passcode-title" className="text-2xl font-bold text-gray-800 mb-2">Profile Created!</h2>
        <p className="text-gray-600 mb-6">Save these credentials. Share them with family/caretakers to join.</p>

        <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-6 mb-6">
          <p className="text-sm text-amber-700 font-semibold mb-3 uppercase tracking-wide">⚠️ Save This Information</p>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">Profile ID</p>
            <p className="text-xl font-mono font-bold text-gray-800 bg-white rounded-lg px-4 py-2 border border-gray-200">{profileId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Passcode</p>
            <p className="text-4xl font-mono font-bold text-teal-700 bg-white rounded-lg px-4 py-3 border-2 border-teal-300 tracking-widest">{passcode}</p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          aria-label="Copy credentials"
          className="flex items-center gap-2 justify-center w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all mb-3 min-h-[48px]"
        >
          {copied ? <CheckCircle size={20} className="text-green-600" /> : <Copy size={20} />}
          {copied ? 'Copied!' : 'Copy Credentials'}
        </button>

        <button
          onClick={onClose}
          className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition-all min-h-[48px] text-lg"
          aria-label="Go to dashboard"
        >
          Go to Dashboard →
        </button>
      </div>
    </div>
  )
}

export default function Home() {
  const { createProfile, joinProfile, loginProfile } = useProfile()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('login') // 'login' | 'create' | 'join'
  const [loading, setLoading] = useState(false)
  const [passcodeModal, setPasscodeModal] = useState(null)
  const [savedProfiles, setSavedProfiles] = useState([])

  // Load saved profiles from localStorage on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('savedProfiles') || '[]')
      // If none saved, check if current profileId in localStorage can be seeded
      const currentId = localStorage.getItem('profileId')
      const currentPass = localStorage.getItem('passcode')
      if (stored.length === 0 && currentId && currentPass) {
        stored.push({
          profileId: currentId,
          elderlyName: 'Your Profile',
          email: '',
          passcode: currentPass,
          role: 'owner',
        })
      }
      setSavedProfiles(stored)
      if (stored.length === 0) {
        setActiveTab('create')
      }
    } catch (e) {
      setSavedProfiles([])
    }
  }, [])

  // Login form state
  const [loginForm, setLoginForm] = useState({
    identifier: '',
    passcode: '',
  })

  // Create form state
  const [createForm, setCreateForm] = useState({
    elderlyName: '', email: '', phone: '',
    bloodGroup: 'O+', allergies: '', conditions: '',
    emergencyContactName: '', emergencyContactPhone: '',
  })

  // Join form state
  const [joinForm, setJoinForm] = useState({
    profileId: '', passcode: '', role: 'caretaker', name: '', email: '',
  })

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!loginForm.identifier.trim()) return toast.error('Please enter your Email or Profile ID')
    if (!loginForm.passcode.trim()) return toast.error('Please enter your 6-digit passcode')
    setLoading(true)
    try {
      await loginProfile(loginForm.identifier.trim(), loginForm.passcode.trim())
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = async (p) => {
    setLoading(true)
    try {
      await loginProfile(p.profileId || p.email, p.passcode)
      toast.success(`Welcome back, ${p.elderlyName}!`)
      navigate('/dashboard')
    } catch (err) {
      setActiveTab('login')
      setLoginForm({ identifier: p.email || p.profileId, passcode: '' })
      toast.error('Please enter your passcode to log in')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveSaved = (profileId, e) => {
    e.stopPropagation()
    const updated = savedProfiles.filter(p => p.profileId !== profileId)
    setSavedProfiles(updated)
    localStorage.setItem('savedProfiles', JSON.stringify(updated))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!createForm.elderlyName.trim()) return toast.error('Patient name is required')
    setLoading(true)
    try {
      const payload = {
        elderlyName: createForm.elderlyName.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim(),
        bloodGroup: createForm.bloodGroup,
        allergies: createForm.allergies ? createForm.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        conditions: createForm.conditions ? createForm.conditions.split(',').map(s => s.trim()).filter(Boolean) : [],
        emergencyContact: {
          name: createForm.emergencyContactName.trim(),
          phone: createForm.emergencyContactPhone.trim(),
        },
      }
      const result = await createProfile(payload)
      if (result && result.passcode) {
        setPasscodeModal({ passcode: result.passcode, profileId: result.profileId })
      } else {
        toast.success('Profile created successfully!')
        navigate('/dashboard')
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create profile')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!joinForm.profileId || !joinForm.passcode) return toast.error('Profile ID and passcode are required')
    setLoading(true)
    try {
      await joinProfile({
        profileId: joinForm.profileId.trim(),
        passcode: joinForm.passcode.trim(),
        role: joinForm.role,
        name: joinForm.name.trim(),
        email: joinForm.email.trim(),
      })
      toast.success('Joined profile successfully!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message || 'Failed to join profile')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-base min-h-[48px] bg-white"
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1"

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900">
      {passcodeModal && (
        <PasscodeModal
          passcode={passcodeModal.passcode}
          profileId={passcodeModal.profileId}
          onClose={() => { setPasscodeModal(null); navigate('/dashboard') }}
        />
      )}

      {/* Hero */}
      <div className="text-center pt-10 pb-6 px-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-6xl">🏥</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">MediCare</h1>
        <p className="text-xl text-teal-100 font-medium mb-2">Your Family's Healthcare, Together</p>
        <p className="text-base text-teal-200 max-w-md mx-auto">
          Manage medications, appointments, and emergency info for your elderly loved ones — all in one place.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          {[
            { icon: '💊', text: 'Medication Tracking' },
            { icon: '📅', text: 'Appointments' },
            { icon: '🚨', text: 'Emergency Info' },
            { icon: '📊', text: 'Analytics' },
          ].map(({ icon, text }) => (
            <span key={text} className="flex items-center gap-2 bg-white/20 text-white rounded-full px-4 py-2 text-sm font-medium backdrop-blur-sm">
              {icon} {text}
            </span>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-5xl mx-auto px-4 pb-12">
        {/* Saved Profiles on this device banner */}
        {savedProfiles.length > 0 && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-xl mb-8 border-2 border-teal-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👋</span>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Continue with Saved Profile</h3>
                  <p className="text-sm text-gray-600">Quick 1-click access to your health dashboard</p>
                </div>
              </div>
              <span className="text-xs bg-teal-100 text-teal-800 font-semibold px-3 py-1 rounded-full">
                Saved on this device
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {savedProfiles.map((p) => (
                <div
                  key={p.profileId}
                  className="flex items-center justify-between p-4 bg-teal-50 hover:bg-teal-100/90 rounded-xl transition-all border border-teal-200 shadow-sm"
                >
                  <div className="pr-2">
                    <p className="font-bold text-teal-900 text-lg">{p.elderlyName}</p>
                    <p className="text-xs text-gray-600 truncate max-w-[200px]">{p.email || p.profileId}</p>
                    <p className="text-xs text-teal-700 mt-1 font-mono">
                      Passcode: <span className="font-bold">{p.passcode || '••••••'}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQuickLogin(p)}
                      disabled={loading}
                      aria-label={`Open profile for ${p.elderlyName}`}
                      className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all shadow-md text-sm min-h-[44px]"
                    >
                      Open →
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveSaved(p.profileId, e)}
                      title="Remove from saved"
                      className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab selector */}
        <div className="flex bg-white/20 rounded-2xl p-1 mb-8 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-3 rounded-xl font-semibold text-base transition-all min-h-[48px] ${
              activeTab === 'login' ? 'bg-white text-teal-700 shadow-md' : 'text-white hover:bg-white/10'
            }`}
            aria-pressed={activeTab === 'login'}
          >
            🔑 Log In
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 rounded-xl font-semibold text-base transition-all min-h-[48px] ${
              activeTab === 'create' ? 'bg-white text-teal-700 shadow-md' : 'text-white hover:bg-white/10'
            }`}
            aria-pressed={activeTab === 'create'}
          >
            ➕ New Profile
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-3 rounded-xl font-semibold text-base transition-all min-h-[48px] ${
              activeTab === 'join' ? 'bg-white text-teal-700 shadow-md' : 'text-white hover:bg-white/10'
            }`}
            aria-pressed={activeTab === 'join'}
          >
            🤝 Join Care Group
          </button>
        </div>

        {/* Active Tab View */}
        <div className="max-w-xl mx-auto">
          {/* LOGIN CARD */}
          {activeTab === 'login' && (
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-6 flex items-center gap-4 text-white">
                <LogIn size={32} />
                <div>
                  <h2 className="text-2xl font-bold">Log In to Your Profile</h2>
                  <p className="text-teal-100 text-sm mt-0.5">Enter your email or Profile ID and passcode</p>
                </div>
              </div>
              <form onSubmit={handleLogin} className="p-8 space-y-5" noValidate>
                <div>
                  <label className={labelClass} htmlFor="loginIdentifier">
                    Email or Patient Name or Profile ID *
                  </label>
                  <input
                    id="loginIdentifier"
                    type="text"
                    placeholder="e.g. garimachoudhary120@gmail.com"
                    className={inputClass}
                    value={loginForm.identifier}
                    onChange={(e) => setLoginForm((f) => ({ ...f, identifier: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass} htmlFor="loginPasscode">
                    6-Character Passcode *
                  </label>
                  <input
                    id="loginPasscode"
                    type="password"
                    placeholder="Enter 6-character code"
                    className={inputClass}
                    value={loginForm.passcode}
                    onChange={(e) => setLoginForm((f) => ({ ...f, passcode: e.target.value }))}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  aria-label="Log in to profile"
                  className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-xl font-bold text-lg transition-all min-h-[56px] flex items-center justify-center gap-2 shadow-lg"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <LogIn size={22} /> Enter Dashboard
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <p className="text-sm text-gray-500">
                    Don't have a profile yet?{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('create')}
                      className="text-teal-700 font-bold hover:underline"
                    >
                      Create one here
                    </button>
                  </p>
                </div>
              </form>
            </div>
          )}

          {/* CREATE PROFILE CARD */}
          {activeTab === 'create' && (
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-6 flex items-center gap-3 text-white">
                <UserPlus size={30} />
                <div>
                  <h2 className="text-2xl font-bold">Create New Profile</h2>
                  <p className="text-teal-100 text-sm mt-0.5">Set up care for your elderly family member</p>
                </div>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4" noValidate>
                <div>
                  <label className={labelClass} htmlFor="elderlyName">Patient's Full Name *</label>
                  <input id="elderlyName" type="text" placeholder="e.g. Garima Choudhary" className={inputClass}
                    value={createForm.elderlyName} onChange={e => setCreateForm(f => ({ ...f, elderlyName: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass} htmlFor="email">Email</label>
                    <input id="email" type="email" placeholder="email@example.com" className={inputClass}
                      value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="phone">Phone</label>
                    <input id="phone" type="tel" placeholder="+91 98765 43210" className={inputClass}
                      value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className={labelClass} htmlFor="bloodGroup">Blood Group</label>
                  <select id="bloodGroup" className={inputClass}
                    value={createForm.bloodGroup} onChange={e => setCreateForm(f => ({ ...f, bloodGroup: e.target.value }))}>
                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="allergies">Known Allergies</label>
                  <input id="allergies" type="text" placeholder="e.g. Penicillin, Peanuts (comma separated)" className={inputClass}
                    value={createForm.allergies} onChange={e => setCreateForm(f => ({ ...f, allergies: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="conditions">Medical Conditions</label>
                  <input id="conditions" type="text" placeholder="e.g. Diabetes, Hypertension (comma separated)" className={inputClass}
                    value={createForm.conditions} onChange={e => setCreateForm(f => ({ ...f, conditions: e.target.value }))} />
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm font-bold text-red-600 mb-3 flex items-center gap-2"><Shield size={16} /> Emergency Contact</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass} htmlFor="ecName">Contact Name</label>
                      <input id="ecName" type="text" placeholder="Contact person" className={inputClass}
                        value={createForm.emergencyContactName} onChange={e => setCreateForm(f => ({ ...f, emergencyContactName: e.target.value }))} />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="ecPhone">Contact Phone</label>
                      <input id="ecPhone" type="tel" placeholder="+91 98765 43210" className={inputClass}
                        value={createForm.emergencyContactPhone} onChange={e => setCreateForm(f => ({ ...f, emergencyContactPhone: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  aria-label="Create profile"
                  className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-xl font-bold text-lg transition-all min-h-[56px] flex items-center justify-center gap-2 shadow-lg"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  ) : (
                    <><UserPlus size={22} /> Create Profile & Generate Passcode</>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* JOIN PROFILE CARD */}
          {activeTab === 'join' && (
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 flex items-center gap-3 text-white">
                <LogIn size={30} />
                <div>
                  <h2 className="text-2xl font-bold">Join Existing Profile</h2>
                  <p className="text-blue-100 text-sm mt-0.5">Join as a caretaker or family member</p>
                </div>
              </div>
              <form onSubmit={handleJoin} className="p-6 space-y-4" noValidate>
                <div>
                  <label className={labelClass} htmlFor="profileId">Profile ID or Email *</label>
                  <input id="profileId" type="text" placeholder="Enter Profile ID or Patient Email" className={inputClass}
                    value={joinForm.profileId} onChange={e => setJoinForm(f => ({ ...f, profileId: e.target.value }))} required />
                </div>
                <div>
                  <label className={labelClass} htmlFor="passcode">6-Character Passcode *</label>
                  <input id="passcode" type="password" placeholder="6-character passcode" className={inputClass}
                    value={joinForm.passcode} onChange={e => setJoinForm(f => ({ ...f, passcode: e.target.value }))} required />
                </div>
                <div>
                  <label className={labelClass} htmlFor="role">Your Role</label>
                  <select id="role" className={inputClass}
                    value={joinForm.role} onChange={e => setJoinForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="joinName">Your Name *</label>
                  <input id="joinName" type="text" placeholder="Your full name" className={inputClass}
                    value={joinForm.name} onChange={e => setJoinForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <label className={labelClass} htmlFor="joinEmail">Your Email</label>
                  <input id="joinEmail" type="email" placeholder="your@email.com" className={inputClass}
                    value={joinForm.email} onChange={e => setJoinForm(f => ({ ...f, email: e.target.value }))} />
                </div>

                <div className="bg-blue-50 rounded-xl p-4 flex gap-3">
                  <Clock size={20} className="text-blue-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm text-blue-700">Enter the 6-character passcode given by the patient to link your account as their authorized caretaker or family member.</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  aria-label="Join profile"
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold text-lg transition-all min-h-[56px] flex items-center justify-center gap-2 shadow-lg"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  ) : (
                    <><LogIn size={22} /> Join Care Group</>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          {[
            { icon: '🔒', title: 'Secure', desc: 'Passcode protected' },
            { icon: '👨‍👩‍👧', title: 'Family', desc: 'Multi-member access' },
            { icon: '📱', title: 'Mobile First', desc: 'Works everywhere' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white/15 backdrop-blur-sm rounded-xl p-4 text-center text-white">
              <div className="text-3xl mb-2">{icon}</div>
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-teal-100 mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
