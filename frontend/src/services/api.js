import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: attach auth headers
api.interceptors.request.use(
  (config) => {
    const profileId = localStorage.getItem('profileId')
    const passcode = localStorage.getItem('passcode')
    const memberId = localStorage.getItem('memberId')
    if (profileId && profileId !== 'undefined') config.headers['x-profile-id'] = profileId
    if (passcode && passcode !== 'undefined') config.headers['x-passcode'] = passcode
    if (memberId && memberId !== 'undefined') config.headers['x-member-id'] = memberId
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: unwrap and normalize data + handle errors
api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && response.data.data && typeof response.data.data === 'object') {
      response.data = {
        ...response.data,
        ...response.data.data,
      }
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      if (window.location.pathname !== '/') {
        localStorage.clear()
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

// Profile APIs
export const profileApi = {
  create: (data) => api.post('/profile/create', data),
  join: (data) => api.post('/profile/join', data),
  login: (data) => api.post('/profile/login', data),
  forgotPasscode: (identifier) => api.post('/profile/forgot-passcode', { identifier }),
  get: () => api.get('/profile'),
  update: (data) => api.put('/profile', data),
  getMembers: () => api.get('/profile/members'),
  removeMember: (memberId) => api.delete(`/profile/members/${memberId}`),
}

// Medications APIs
export const medicationsApi = {
  getAll: () => api.get('/medications'),
  add: (data) => api.post('/medications', data),
  update: (id, data) => api.put(`/medications/${id}`, data),
  delete: (id) => api.delete(`/medications/${id}`),
  take: (id, timeSlot) => api.post(`/medications/${id}/take`, { timeSlot }),
  getRefillForecast: () => api.get('/medications/refill-forecast'),
}

// Appointments APIs
export const appointmentsApi = {
  getAll: (filter = 'all') => api.get(`/appointments?filter=${filter}`),
  add: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  delete: (id) => api.delete(`/appointments/${id}`),
}

// Adherence APIs
export const adherenceApi = {
  get: () => api.get('/adherence'),
  getLogs: (startDate, endDate) => api.get(`/adherence/logs?startDate=${startDate}&endDate=${endDate}`),
  getTrends: () => api.get('/adherence/trends'),
}

// Analytics APIs
export const analyticsApi = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getAdherenceChart: () => api.get('/analytics/adherence-chart'),
  getMissedMeds: () => api.get('/analytics/missed-meds'),
}

// Emergency APIs
export const emergencyApi = {
  get: () => api.get('/emergency'),
  getPdf: () => api.get('/emergency/pdf', { responseType: 'blob' }),
  getDoctorReportPdf: () => api.get('/emergency/doctor-report', { responseType: 'blob' }),
  triggerSos: (data) => api.post('/emergency/sos', data),
}

// AI APIs (Google Gemini Drug & Food Interaction Checker)
export const aiApi = {
  getDrugCheck: () => api.get('/ai/drug-check'),
}

// Notes APIs
export const notesApi = {
  getAll: (startDate, endDate) => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    return api.get(`/notes?${params.toString()}`)
  },
  add: (data) => api.post('/notes', data),
  delete: (id) => api.delete(`/notes/${id}`),
}

export default api
