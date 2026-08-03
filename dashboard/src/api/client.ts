import { useAuthStore } from '../stores/auth'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const authStore = useAuthStore()
  const headers = new Headers(options.headers)
  
  if (authStore.token) {
    headers.set('Authorization', `Bearer ${authStore.token}`)
  }
  
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })
  
  if (response.status === 401 || response.status === 403) {
    authStore.logout()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || 'API Error')
  }
  
  return response.json()
}
