import axios from 'axios'
import { supabase } from './supabase'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

// Attach Supabase JWT to every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

// On 401, sign out and redirect to home so the user re-authenticates
// This handles stale sessions (e.g. after Supabase project restore)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await supabase.auth.signOut()
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

export default api
