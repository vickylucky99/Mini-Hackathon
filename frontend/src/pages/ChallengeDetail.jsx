import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { Calendar, Trophy, Tag, Database, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

export default function ChallengeDetail() {
  const { id } = useParams()
  const { session, profile } = useAuth()
  const [challenge, setChallenge] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rubricOpen, setRubricOpen] = useState(false)

  useEffect(() => {
    api.get(`/api/challenges/${id}`)
      .then((r) => setChallenge(r.data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
    </div>
  )
  if (!challenge) return <div className="text-center py-20 text-gray-400">Challenge not found.</div>

  const deadline = new Date(challenge.deadline)
  const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24))
  const isPast = daysLeft <= 0

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        {challenge.domain && (
          <span className="badge bg-brand-900 text-brand-300 border border-brand-700 mb-3">
            <Tag size={11} />
            {challenge.domain}
          </span>
        )}
        <h1 className="text-3xl font-bold text-white mb-3">{challenge.title}</h1>
        {challenge.profiles && (
          <p className="text-gray-400 text-sm">
            by <span className="text-white">{challenge.profiles.company_name || challenge.profiles.name}</span>
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-3">Challenge Brief</h2>
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{challenge.description}</p>
          </div>

          {/* Rubric accordion */}
          <div className="card">
            <button
              onClick={() => setRubricOpen(!rubricOpen)}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-lg font-semibold text-white">Evaluation Rubric</h2>
              {rubricOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>

            {rubricOpen && challenge.rubric_json?.length > 0 && (
              <div className="mt-4 space-y-3">
                {challenge.rubric_json.map((criterion, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-4 py-3 border-t border-gray-800">
                    <div>
                      <p className="font-medium text-white text-sm">{criterion.name}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{criterion.description}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-brand-400">{criterion.max_score} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dataset */}
          {challenge.dataset_url && (
            <div className="card flex items-center gap-3">
              <Database size={18} className="text-brand-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-white mb-0.5">Sample Dataset</p>
                <a
                  href={challenge.dataset_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-400 text-sm hover:text-brand-300 flex items-center gap-1"
                >
                  Download <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Prize Pool</p>
              <p className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
                <Trophy size={20} />
                {challenge.prize_currency} {Number(challenge.prize_amount).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Deadline</p>
              <p className={`font-semibold flex items-center gap-2 ${isPast ? 'text-red-400' : 'text-white'}`}>
                <Calendar size={16} />
                {deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              {!isPast && <p className="text-xs text-gray-500 mt-0.5">{daysLeft} days remaining</p>}
            </div>
          </div>

          {/* CTA */}
          {!isPast && (
            session ? (
              profile?.role === 'builder' || profile?.role === 'admin' ? (
                <Link to={`/challenges/${id}/submit`} className="btn-primary w-full text-center block">
                  Submit My Project
                </Link>
              ) : null
            ) : (
              <Link to="/" className="btn-primary w-full text-center block">
                Sign In to Submit
              </Link>
            )
          )}

          <Link to={`/leaderboard/${id}`} className="btn-secondary w-full text-center block text-sm">
            View Leaderboard
          </Link>
        </div>
      </div>
    </div>
  )
}
