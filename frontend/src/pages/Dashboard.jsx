import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'
import ChallengeCard from '../components/ChallengeCard'
import BadgeDisplay from '../components/BadgeDisplay'
import { Star, Clock, CheckCircle2, ArrowRight } from 'lucide-react'

const STATUS_ICONS = {
  pending: <Clock size={14} className="text-yellow-400" />,
  scored: <CheckCircle2 size={14} className="text-brand-400" />,
  reviewed: <CheckCircle2 size={14} className="text-green-400" />,
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [challenges, setChallenges] = useState([])
  const [mySubmissions, setMySubmissions] = useState([])
  const [myBadges, setMyBadges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    Promise.all([
      api.get('/api/challenges?status=active&limit=6'),
      api.get(`/api/leaderboard/profile/${profile.id}`),
      api.get(`/api/profiles/${profile.id}`),
    ]).then(([ch, subs, prof]) => {
      setChallenges(ch.data)
      setMySubmissions(subs.data)
      setMyBadges(prof.data.badges || [])
    }).finally(() => setLoading(false))
  }, [profile])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Welcome back, {profile?.name?.split(' ')[0] || 'Builder'}!
          </h1>
          <p className="text-gray-400">Your Season Score: <span className="font-semibold text-white">{profile?.season_score || 0} pts</span></p>
        </div>
        <div className="flex items-center gap-2">
          <Star size={16} className="text-yellow-400" />
          <BadgeDisplay badges={myBadges.slice(0, 3)} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* My Submissions */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-white mb-4">My Submissions</h2>
          {mySubmissions.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-gray-400 text-sm mb-4">No submissions yet.</p>
              <Link to="/challenges" className="btn-primary text-sm">Browse Challenges</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {mySubmissions.map((sub) => (
                <div key={sub.id} className="card">
                  <p className="font-medium text-white text-sm mb-1">
                    {sub.challenges?.title || 'Challenge'}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      {STATUS_ICONS[sub.status]}
                      {sub.status}
                    </div>
                    {sub.llm_total_score != null && (
                      <span className="text-sm font-semibold text-white">
                        {sub.final_score ?? sub.llm_total_score}<span className="text-gray-500">/100</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Challenges */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Active Challenges</h2>
            <Link to="/challenges" className="text-brand-400 text-sm hover:text-brand-300 flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {challenges.map((c) => <ChallengeCard key={c.id} challenge={c} />)}
          </div>
        </div>
      </div>
    </div>
  )
}
