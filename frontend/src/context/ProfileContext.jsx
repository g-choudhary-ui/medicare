import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { profileApi } from '../services/api'

const ProfileContext = createContext(null)

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [member, setMember] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Persona mode: 'caregiver' | 'senior'
  const [persona, setPersonaState] = useState(() => {
    return localStorage.getItem('medicare_persona') || 'caregiver'
  })

  // Font size scaler: 'sm' (16px), 'md' (18px default), 'lg' (21px), 'xl' (24px)
  const [fontSize, setFontSizeState] = useState(() => {
    return localStorage.getItem('medicare_fontsize') || 'md'
  })

  const setPersona = (mode) => {
    setPersonaState(mode)
    localStorage.setItem('medicare_persona', mode)
  }

  const togglePersona = () => {
    const next = persona === 'senior' ? 'caregiver' : 'senior'
    setPersona(next)
  }

  const setFontSize = (size) => {
    setFontSizeState(size)
    localStorage.setItem('medicare_fontsize', size)
    const sizeMap = { sm: '16px', md: '18px', lg: '21px', xl: '24px' }
    document.documentElement.style.fontSize = sizeMap[size] || '18px'
  }

  useEffect(() => {
    const sizeMap = { sm: '16px', md: '18px', lg: '21px', xl: '24px' }
    document.documentElement.style.fontSize = sizeMap[fontSize] || '18px'
  }, [fontSize])

  const loadProfile = useCallback(async () => {
    const profileId = localStorage.getItem('profileId')
    const passcode = localStorage.getItem('passcode')
    if (!profileId || !passcode || profileId === 'undefined' || passcode === 'undefined') {
      localStorage.removeItem('profileId')
      localStorage.removeItem('passcode')
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      const res = await profileApi.get()
      const data = res.data || {}
      const prof = data.profile || data
      const mem = data.currentMember || (data.members && data.members[0]) || { role: 'owner', name: prof?.elderlyName }
      setProfile(prof)
      setMember(mem)
    } catch (err) {
      console.error('Error loading profile:', err)
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to load profile')
      localStorage.clear()
      setProfile(null)
      setMember(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const saveToRecent = (prof, passcode, role = 'owner') => {
    try {
      const id = prof?.id || prof?.profileId
      if (!id) return
      const existing = JSON.parse(localStorage.getItem('savedProfiles') || '[]')
      const filtered = existing.filter(p => p.profileId !== id)
      const updated = [
        {
          profileId: id,
          elderlyName: prof.elderlyName || 'Patient',
          email: prof.email || '',
          passcode: passcode || '',
          role,
          lastActive: new Date().toISOString(),
        },
        ...filtered,
      ].slice(0, 5)
      localStorage.setItem('savedProfiles', JSON.stringify(updated))
    } catch (e) {
      console.warn('Could not save profile to recent:', e)
    }
  }

  const createProfile = async (data) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await profileApi.create(data)
      const resData = res.data || {}
      const profileId = resData.profileId || resData.data?.profileId
      const passcode = resData.passcode || resData.data?.passcode
      const prof = resData.profile || resData.data?.profile || { ...data, id: profileId }

      if (profileId) localStorage.setItem('profileId', profileId)
      if (passcode) localStorage.setItem('passcode', passcode)
      setProfile(prof)
      setMember({ role: 'owner', name: data.elderlyName })
      saveToRecent(prof, passcode, 'owner')
      return { profileId, passcode, profile: prof, ...resData }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to create profile'
      setError(msg)
      throw new Error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const joinProfile = async (data) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await profileApi.join(data)
      const resData = res.data || {}
      const profileId = resData.profileId || resData.data?.profileId || data.profileId
      const passcode = resData.passcode || resData.data?.passcode || data.passcode
      const prof = resData.profile || resData.data?.profile || { id: profileId }
      const mem = resData.member || resData.data?.member || { role: data.role, name: data.name }

      if (profileId) localStorage.setItem('profileId', profileId)
      if (passcode) localStorage.setItem('passcode', passcode)
      if (resData.memberId) localStorage.setItem('memberId', resData.memberId)
      setProfile(prof)
      setMember(mem)
      saveToRecent(prof, passcode, mem.role)
      return { profileId, passcode, profile: prof, member: mem, ...resData }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to join profile'
      setError(msg)
      throw new Error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const loginProfile = async (identifier, passcode) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await profileApi.login({ identifier, passcode })
      const resData = res.data || {}
      const profileId = resData.profileId || resData.data?.profileId
      const code = resData.passcode || passcode
      const prof = resData.profile || resData.data?.profile || { id: profileId }
      const mem = resData.member || resData.data?.member || { role: 'owner', name: prof.elderlyName }

      if (profileId) localStorage.setItem('profileId', profileId)
      if (code) localStorage.setItem('passcode', code)
      setProfile(prof)
      setMember(mem)
      saveToRecent(prof, code, mem.role)
      return { profileId, passcode: code, profile: prof, member: mem, ...resData }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to log in'
      setError(msg)
      throw new Error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('profileId')
    localStorage.removeItem('passcode')
    localStorage.removeItem('memberId')
    setProfile(null)
    setMember(null)
    setError(null)
  }

  const updateProfile = async (data) => {
    setIsLoading(true)
    try {
      const res = await profileApi.update(data)
      const updated = res.data?.data?.profile || res.data?.profile || data
      setProfile((prev) => ({ ...prev, ...updated }))
      return res.data
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update profile'
      setError(msg)
      throw new Error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ProfileContext.Provider value={{
      profile,
      member,
      isLoading,
      error,
      persona,
      setPersona,
      togglePersona,
      fontSize,
      setFontSize,
      createProfile,
      joinProfile,
      loginProfile,
      logout,
      updateProfile,
      loadProfile,
    }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}
