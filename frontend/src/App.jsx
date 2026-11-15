import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ProfileProvider, useProfile } from './context/ProfileContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Medications from './pages/Medications'
import Appointments from './pages/Appointments'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import Emergency from './pages/Emergency'
import Notes from './pages/Notes'

function ProtectedRoute({ children }) {
  const { profile, isLoading } = useProfile()
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🏥</div>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading MediCare...</p>
        </div>
      </div>
    )
  }
  if (!profile) return <Navigate to="/" replace />
  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { profile, isLoading } = useProfile()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🏥</div>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading MediCare...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={profile ? <Navigate to="/dashboard" replace /> : <Home />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/medications" element={<ProtectedRoute><Medications /></ProtectedRoute>} />
      <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/emergency" element={<ProtectedRoute><Emergency /></ProtectedRoute>} />
      <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ProfileProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontSize: '16px', borderRadius: '12px', padding: '12px 16px' },
            success: { iconTheme: { primary: '#0d9488', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </ProfileProvider>
  )
}
