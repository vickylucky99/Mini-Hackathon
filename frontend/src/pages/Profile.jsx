import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import BadgeDisplay from '../components/BadgeDisplay'
import ScoreBreakdown from '../components/ScoreBreakdown'
import { Github, Star, Clock, CheckCircle2 } from 'lucide-react'

const STATUS_ICONS = {
  pending: <Clock size={14} className="text-yellow-400" />,
  scored: <CheckCircle2 size={14} className="text-brand-400" />,
  reviewed: <CheckCircle2 size={14} className="text-green-400" />,
}

export default function Profile() {
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/api/profiles/${id}`),
      api.get(`/api/leaderboard/profile/${id}`),
    ]).then(([p, s]) => {
      setProfile(p.data)
      setSubmissions(s.data)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
    </div>
  )
  if (!profile) return <div className="text-center py-20 text-gray-400">Profile not found.</div>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Profile header */}
      <div className="card mb-8">
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 rounded-full bg-brand-900 flex items-center justify-center text-2xl font-bold text-brand-300 shrink-0">
            {profile.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white mb-1">{profile.name}</h1>
            {profile.bio && <p className="text-gray-400 text-sm mb-3">{profile.bio}</p>}

            <div className="flex flex-wrap items-center gap-4 text-sm">
              {profile.github_url && (
                <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors">
                  <Github size={14} />
                  GitHub
                </a>
              )}
              <div className="flex items-center gap-1.5 text-gray-400">
                <Star size={14} className="text-yellow-400" />
                <span className="font-semibold text-white">{profile.season_score || 0}</span> season pts
              </div>
            </div>
          </div>
        </div>

        {profile.badges?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 mb-2">Badges</p>
            <BadgeDisplay badges={profile.badges} />
          </div>
        )}
      </div>

      {/* Submissions */}
      <h2 className="text-xl font-semibold text-white mb-4">Submissions</h2>
      {submissions.length === 0 ? (
        <div className="card text-center py-10 text-gray-400">No submissions yet.</div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <div key={sub.id} className="card">
              <div
                className="flex items-start justify-between cursor-pointer"
                onClick={() => setSelected(selected === sub.id ? null : sub.id)}
              >
                <div>
                  <p className="font-medium text-white">{sub.challenges?.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    {STATUS_ICONS[sub.status]}
                    {sub.status}
                    {sub.challenges?.domain && (
                      <span className="bg-gray-800 px-2 py-0.5 rounded">{sub.challenges.domain}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {sub.llm_total_score != null && (
                    <p className="text-xl font-bold text-white">
                      {sub.final_score ?? sub.llm_total_score}
                      <span className="text-gray-500 text-sm">/100</span>
                    </p>
                  )}
                  {sub.final_score && sub.status === 'reviewed' && (
                    <p className="text-xs text-green-400">Final Score</p>
                  )}
                </div>
              </div>

              {selected === sub.id && sub.llm_score_json && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <ScoreBreakdown scoreJson={sub.llm_score_json} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
