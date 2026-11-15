import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Pill, Calendar, BarChart2, AlertCircle,
  BookOpen, Settings, LogOut, Menu, X, Sun, Moon, Heart
} from 'lucide-react'
import { useProfile } from '../context/ProfileContext'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/medications', icon: Pill, label: 'Medications' },
  { to: '/appointments', icon: Calendar, label: 'Appointments' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/emergency', icon: AlertCircle, label: 'Emergency' },
  { to: '/notes', icon: BookOpen, label: 'Notes' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Layout({ children }) {
  const { profile, member, logout } = useProfile()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [highContrast, setHighContrast] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/')
  }

  const toggleContrast = () => {
    setHighContrast(!highContrast)
    document.body.classList.toggle('high-contrast')
  }

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all min-h-[48px] ${
      isActive
        ? 'bg-teal-600 text-white shadow-md'
        : 'text-gray-600 hover:bg-teal-50 hover:text-teal-700'
    }`

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-6 border-b border-gray-100">
        <div className="text-3xl">🏥</div>
        <div>
          <h1 className="text-xl font-bold text-teal-700">MediCare</h1>
          <p className="text-sm text-gray-500">Care Platform</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" role="navigation" aria-label="Main navigation">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={linkClass} onClick={() => setSidebarOpen(false)} aria-label={label}>
            <Icon size={22} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-2">
        {/* High contrast toggle */}
        <button
          onClick={toggleContrast}
          aria-label={highContrast ? 'Disable high contrast' : 'Enable high contrast'}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-gray-600 hover:bg-gray-100 transition-all min-h-[48px]"
        >
          {highContrast ? <Sun size={22} aria-hidden="true" /> : <Moon size={22} aria-hidden="true" />}
          <span className="text-base">{highContrast ? 'Normal View' : 'High Contrast'}</span>
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 px-4 py-3 bg-teal-50 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-teal-200 flex items-center justify-center text-teal-700 font-bold text-lg">
            {(profile?.elderlyName || member?.name || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 truncate text-sm">{profile?.elderlyName || 'User'}</p>
            <p className="text-sm text-gray-500 capitalize">{member?.role || 'member'}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          aria-label="Logout"
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-600 hover:bg-red-50 transition-all min-h-[48px]"
        >
          <LogOut size={22} aria-hidden="true" />
          <span className="text-base font-medium">Logout</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 fixed h-full z-20 shadow-sm">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white z-40 transform transition-transform duration-300 lg:hidden shadow-xl ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile navigation"
      >
        <div className="flex justify-end p-4">
          <button onClick={() => setSidebarOpen(false)} aria-label="Close menu" className="p-2 rounded-lg hover:bg-gray-100">
            <X size={24} />
          </button>
        </div>
        <Sidebar />
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="p-2 rounded-lg hover:bg-gray-100 min-h-[48px] min-w-[48px] flex items-center justify-center"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏥</span>
            <span className="text-xl font-bold text-teal-700">MediCare</span>
          </div>
          <button
            onClick={toggleContrast}
            aria-label="Toggle contrast"
            className="p-2 rounded-lg hover:bg-gray-100 min-h-[48px] min-w-[48px] flex items-center justify-center"
          >
            {highContrast ? <Sun size={22} /> : <Moon size={22} />}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-20 lg:pb-8" role="main">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 flex shadow-lg"
        role="navigation"
        aria-label="Mobile bottom navigation"
      >
        {navItems.slice(0, 5).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] text-xs transition-colors ${
                isActive ? 'text-teal-600' : 'text-gray-500'
              }`
            }
            aria-label={label}
          >
            <Icon size={22} aria-hidden="true" />
            <span className="mt-0.5" style={{ fontSize: '11px' }}>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
