import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { CheckCircle2, Github, Link2, Video } from 'lucide-react'

export default function Submit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [challenge, setChallenge] = useState(null)
  const [form, setForm] = useState({ repo_url: '', deck_url: '', video_url: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    api.get(`/api/challenges/${id}`).then((r) => setChallenge(r.data))
  }, [id])

  function validateUrl(url, field) {
    if (url && !url.startsWith('http')) {
      setError(`${field} must start with http:// or https://`)
      return false
    }
    return true
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!validateUrl(form.repo_url, 'GitHub URL')) return
    if (!validateUrl(form.deck_url, 'Deck URL')) return
    if (!validateUrl(form.video_url, 'Video URL')) return

    setSubmitting(true)
    try {
      await api.post('/api/submissions', {
        challenge_id: id,
        repo_url: form.repo_url,
        deck_url: form.deck_url || null,
        video_url: form.video_url || null,
      })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <CheckCircle2 size={48} className="text-green-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Submission Received!</h2>
        <p className="text-gray-400 mb-2">Your project has been submitted. Our AI scorer will evaluate it within 15 minutes.</p>
        <p className="text-gray-400 mb-8">You'll receive an email with your provisional score.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/dashboard')} className="btn-primary">View Dashboard</button>
          <button onClick={() => navigate(`/leaderboard/${id}`)} className="btn-secondary">View Leaderboard</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Submit Your Project</h1>
        {challenge && <p className="text-gray-400 text-sm">{challenge.title}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="label flex items-center gap-1.5">
            <Github size={14} /> GitHub Repository URL <span className="text-red-400">*</span>
          </label>
          <input
            className="input"
            type="url"
            placeholder="https://github.com/yourname/project"
            value={form.repo_url}
            onChange={(e) => setForm({ ...form, repo_url: e.target.value })}
            required
          />
          <p className="text-xs text-gray-500 mt-1">Must be a public repository.</p>
        </div>

        <div>
          <label className="label flex items-center gap-1.5">
            <Link2 size={14} /> Pitch Deck URL
          </label>
          <input
            className="input"
            type="url"
            placeholder="https://canva.com/… or https://slides.google.com/…"
            value={form.deck_url}
            onChange={(e) => setForm({ ...form, deck_url: e.target.value })}
          />
        </div>

        <div>
          <label className="label flex items-center gap-1.5">
            <Video size={14} /> Demo Video URL
          </label>
          <input
            className="input"
            type="url"
            placeholder="https://loom.com/… or https://youtube.com/…"
            value={form.video_url}
            onChange={(e) => setForm({ ...form, video_url: e.target.value })}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-950 border border-red-800 rounded-lg text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="p-4 bg-gray-800 rounded-lg text-sm text-gray-400">
          <p className="font-medium text-gray-300 mb-1">Before you submit:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Ensure your GitHub repo is public and has a README.</li>
            <li>Submission is final — you cannot re-submit to the same challenge.</li>
            <li>AI scoring begins immediately; expect results within 15 minutes.</li>
            <li>By submitting you certify this is your original work.</li>
          </ul>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Project'}
        </button>
      </form>
    </div>
  )
}
