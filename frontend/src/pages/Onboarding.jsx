import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import api from '../lib/api'
import { Zap, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Onboarding() {
  const { profile, refetchProfile } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState(profile?.role || 'builder')
  const [form, setForm] = useState({
    name: profile?.name || '',
    bio: '',
    github_url: '',
    company_name: '',
    company_logo_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showDebug, setShowDebug] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = { role, name: form.name }
    if (role === 'builder') {
      payload.bio = form.bio
      payload.github_url = form.github_url
    } else {
      payload.company_name = form.company_name
      payload.company_logo_url = form.company_logo_url
    }

    // Grab token for debug info
    const { data: { session } } = await supabase.auth.getSession()
    const hasToken = !!session?.access_token

    try {
      await api.post('/api/auth/profile', payload)
      await refetchProfile()
      navigate('/dashboard')
    } catch (err) {
      let title = 'Request failed'
      let detail = ''
      let hint = ''

      if (!err.response) {
        // Network error — no response received at all
        title = 'Cannot reach the backend'
        detail = err.message || 'Network Error'
        if (API_URL.includes('localhost')) {
          hint = 'VITE_API_URL is not set — the frontend is calling localhost:8000 instead of your Render backend. Set VITE_API_URL in the Render frontend service env vars.'
        } else {
          hint = `Check that the backend is running at ${API_URL} and that FRONTEND_URL on the backend includes this frontend's origin.`
        }
      } else if (err.response.status === 401) {
        title = 'Authentication failed (401)'
        detail = err.response.data?.detail || 'Unauthorized'
        hint = hasToken
          ? 'A token was sent but the backend rejected it. Verify SUPABASE_JWT_SECRET on the Render backend matches the JWT Secret in your Supabase project (Settings → API → JWT Secret).'
          : 'No session token found. Your Supabase session may have expired — try signing out and signing in again.'
      } else if (err.response.status === 422) {
        title = 'Validation error (422)'
        detail = JSON.stringify(err.response.data?.detail || err.response.data, null, 2)
        hint = 'The form data sent to the backend failed validation.'
      } else {
        title = `Server error (${err.response.status})`
        detail = err.response.data?.detail || err.response.statusText
        hint = 'Check the Render backend service logs for the full traceback.'
      }

      setError({ title, detail, hint, hasToken, apiUrl: API_URL })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <div className="flex items-center gap-2 mb-8">
        <Zap className="text-brand-500" size={24} />
        <h1 className="text-2xl font-bold text-white">Complete Your Profile</h1>
      </div>

      {/* Role toggle */}
      <div className="flex gap-2 mb-8 p-1 bg-gray-800 rounded-lg">
        {['builder', 'sponsor'].map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`flex-1 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
              role === r ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Full Name</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Riya Sharma"
            required
          />
        </div>

        {role === 'builder' && (
          <>
            <div>
              <label className="label">Bio</label>
              <textarea
                className="input resize-none"
                rows={3}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Self-taught ML engineer passionate about AI products…"
              />
            </div>
            <div>
              <label className="label">GitHub Profile URL</label>
              <input
                className="input"
                value={form.github_url}
                onChange={(e) => setForm({ ...form, github_url: e.target.value })}
                placeholder="https://github.com/yourhandle"
                type="url"
              />
            </div>
          </>
        )}

        {role === 'sponsor' && (
          <>
            <div>
              <label className="label">Company Name</label>
              <input
                className="input"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                placeholder="Acme AI"
                required
              />
            </div>
            <div>
              <label className="label">Company Logo URL (optional)</label>
              <input
                className="input"
                value={form.company_logo_url}
                onChange={(e) => setForm({ ...form, company_logo_url: e.target.value })}
                placeholder="https://…"
                type="url"
              />
            </div>
          </>
        )}

        {/* Error block */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 overflow-hidden">
            <div className="flex items-start gap-3 p-4">
              <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-red-300 text-sm">{error.title}</p>
                {error.hint && (
                  <p className="text-red-400 text-xs mt-1 leading-relaxed">{error.hint}</p>
                )}
              </div>
            </div>

            {/* Collapsible debug details */}
            <button
              type="button"
              onClick={() => setShowDebug(!showDebug)}
              className="w-full flex items-center justify-between px-4 py-2 bg-red-950/60 text-xs text-red-400 hover:text-red-300 transition-colors border-t border-red-800/50"
            >
              Debug details
              {showDebug ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showDebug && (
              <div className="px-4 py-3 bg-gray-950 border-t border-red-800/50 text-xs font-mono space-y-1.5">
                <div className="flex gap-2">
                  <span className="text-gray-500 w-24 shrink-0">API URL</span>
                  <span className="text-gray-300 break-all">{error.apiUrl}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 w-24 shrink-0">Token</span>
                  <span className={error.hasToken ? 'text-green-400' : 'text-red-400'}>
                    {error.hasToken ? 'present' : 'missing — session not established'}
                  </span>
                </div>
                {error.detail && (
                  <div className="flex gap-2">
                    <span className="text-gray-500 w-24 shrink-0">Detail</span>
                    <pre className="text-gray-300 whitespace-pre-wrap break-all">{error.detail}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? 'Saving…' : 'Continue to Dashboard'}
        </button>
      </form>
    </div>
  )
}
