import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import LeaderboardTable from '../components/LeaderboardTable'
import { RefreshCw } from 'lucide-react'

export default function Leaderboard() {
  const { id } = useParams()
  const [challenge, setChallenge] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    setLoading(true)
    const [ch, lb] = await Promise.all([
      api.get(`/api/challenges/${id}`),
      api.get(`/api/leaderboard/${id}`),
    ])
    setChallenge(ch.data)
    setEntries(lb.data)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [id])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Leaderboard</h1>
          {challenge && (
            <p className="text-gray-400">{challenge.title}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="btn-secondary flex items-center gap-2 text-sm py-2">
            <RefreshCw size={14} />
            Refresh
          </button>
          {challenge && (
            <Link to={`/challenges/${id}`} className="btn-secondary text-sm py-2">
              Challenge Brief
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
        </div>
      ) : (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-400">{entries.length} submissions</p>
            <p className="text-xs text-gray-500">Auto-refreshes every 60s</p>
          </div>
          <LeaderboardTable entries={entries} />
        </div>
      )}
    </div>
  )
}
