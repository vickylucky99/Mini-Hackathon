import { useEffect, useState } from 'react'
import api from '../lib/api'
import ScoreBreakdown from '../components/ScoreBreakdown'
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'

export default function AdminDashboard() {
  const [queue, setQueue] = useState([])
  const [challenges, setChallenges] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [overrides, setOverrides] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/api/admin/submissions/queue'),
      api.get('/api/challenges?status=active&limit=50'),
    ]).then(([q, ch]) => {
      setQueue(q.data)
      setChallenges(ch.data)
    }).finally(() => setLoading(false))
  }, [])

  async function submitOverride(submissionId) {
    const score = overrides[submissionId]
    if (!score) return
    setSaving(submissionId)
    await api.put(`/api/admin/submissions/${submissionId}/judge`, { final_score: Number(score) })
    setQueue((prev) => prev.filter((s) => s.id !== submissionId))
    setSaving(null)
  }

  async function closeChallenge(challengeId) {
    await api.post(`/api/admin/challenges/${challengeId}/close`)
    setChallenges((prev) => prev.map((c) => c.id === challengeId ? { ...c, status: 'closed' } : c))
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-white mb-8">Admin Dashboard</h1>

      {/* Judge queue */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold text-white mb-4">Judge Review Queue ({queue.length})</h2>
        {queue.length === 0 ? (
          <div className="card text-center py-10 text-gray-400">No submissions pending review.</div>
        ) : (
          <div className="space-y-4">
            {queue.map((sub) => (
              <div key={sub.id} className="card">
                <div
                  className="flex items-start justify-between cursor-pointer gap-4"
                  onClick={() => setExpanded(expanded === sub.id ? null : sub.id)}
                >
                  <div>
                    <p className="font-semibold text-white">{sub.profiles?.name}</p>
                    <p className="text-sm text-gray-400">{sub.challenges?.title}</p>
                    <p className="text-xs text-gray-500 mt-1">AI Score: {sub.llm_total_score}/100</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <input
                      className="input w-20 text-center py-1.5"
                      type="number"
                      min={0}
                      max={100}
                      placeholder="Score"
                      value={overrides[sub.id] || ''}
                      onChange={(e) => setOverrides({ ...overrides, [sub.id]: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      className="btn-primary text-sm py-1.5 flex items-center gap-1"
                      onClick={(e) => { e.stopPropagation(); submitOverride(sub.id) }}
                      disabled={saving === sub.id || !overrides[sub.id]}
                    >
                      <CheckCircle2 size={14} />
                      {saving === sub.id ? 'Saving…' : 'Submit'}
                    </button>
                    {expanded === sub.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {expanded === sub.id && sub.llm_score_json && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <div className="flex gap-6 text-sm text-gray-400 mb-4">
                      <a href={sub.repo_url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-400">GitHub →</a>
                      {sub.deck_url && <a href={sub.deck_url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-400">Deck →</a>}
                      {sub.video_url && <a href={sub.video_url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-400">Video →</a>}
                    </div>
                    <ScoreBreakdown scoreJson={sub.llm_score_json} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Close challenges */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Active Challenges</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {challenges.filter((c) => c.status === 'active').map((c) => (
            <div key={c.id} className="card">
              <p className="font-semibold text-white mb-1 truncate">{c.title}</p>
              <p className="text-xs text-gray-500 mb-4">{new Date(c.deadline).toLocaleDateString()}</p>
              <button
                onClick={() => closeChallenge(c.id)}
                className="btn-secondary w-full text-sm py-2"
              >
                Close & Award Badges
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
