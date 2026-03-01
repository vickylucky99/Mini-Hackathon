import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'
import { Zap } from 'lucide-react'

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

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = { role, name: form.name }
      if (role === 'builder') {
        payload.bio = form.bio
        payload.github_url = form.github_url
      } else {
        payload.company_name = form.company_name
        payload.company_logo_url = form.company_logo_url
      }
      await api.post('/api/auth/profile', payload)
      await refetchProfile()
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong')
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

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={saving}>
          {saving ? 'Saving…' : 'Continue to Dashboard'}
        </button>
      </form>
    </div>
  )
}
