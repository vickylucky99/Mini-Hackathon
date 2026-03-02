import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

// Attach Clerk JWT to every request.
// ClerkProvider mounts window.Clerk; session.getToken() returns the current JWT.
api.interceptors.request.use(async (config) => {
  const token = await window.Clerk?.session?.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401, sign out and redirect to home
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await window.Clerk?.signOut()
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

export default api
