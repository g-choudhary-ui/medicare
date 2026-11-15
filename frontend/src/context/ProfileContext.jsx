import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { profileApi } from '../services/api'

const ProfileContext = createContext(null)

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [member, setMember] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadProfile = useCallback(async () => {
    const profileId = localStorage.getItem('profileId')
    const passcode = localStorage.getItem('passcode')
    if (!profileId || !passcode) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      const res = await profileApi.get()
      setProfile(res.data.profile)
      setMember(res.data.currentMember)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile')
      localStorage.clear()
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const createProfile = async (data) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await profileApi.create(data)
      const { profileId, passcode, profile: prof } = res.data
      localStorage.setItem('profileId', profileId)
      localStorage.setItem('passcode', passcode)
      setProfile(prof)
      setMember({ role: 'owner', name: data.elderlyName })
      return res.data
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create profile'
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
      const { profileId, passcode, profile: prof, member: mem } = res.data
      localStorage.setItem('profileId', profileId)
      localStorage.setItem('passcode', passcode)
      setProfile(prof)
      setMember(mem)
      return res.data
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to join profile'
      setError(msg)
      throw new Error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.clear()
    setProfile(null)
    setMember(null)
    setError(null)
  }

  const updateProfile = async (data) => {
    setIsLoading(true)
    try {
      const res = await profileApi.update(data)
      setProfile(res.data.profile)
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
    <ProfileContext.Provider value={{ profile, member, isLoading, error, createProfile, joinProfile, logout, updateProfile, loadProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider')
  return ctx
}
