import { useEffect, useState } from 'react'
import api from '../lib/api'
import ChallengeCard from '../components/ChallengeCard'
import { Search, SlidersHorizontal } from 'lucide-react'

const DOMAINS = ['All', 'NLP', 'Vision', 'Agents', 'Multimodal']

export default function Challenges() {
  const [challenges, setChallenges] = useState([])
  const [filtered, setFiltered] = useState([])
  const [domain, setDomain] = useState('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/challenges?status=active&limit=100')
      .then((r) => { setChallenges(r.data); setFiltered(r.data) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let result = challenges
    if (domain !== 'All') result = result.filter((c) => c.domain === domain)
    if (search) result = result.filter((c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase())
    )
    setFiltered(result)
  }, [domain, search, challenges])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Challenges</h1>
        <p className="text-gray-400">Pick a challenge, build an AI MVP, get ranked.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            className="input pl-10"
            placeholder="Search challenges…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {DOMAINS.map((d) => (
            <button
              key={d}
              onClick={() => setDomain(d)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                domain === d
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          No challenges found. Try adjusting your filters.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c) => <ChallengeCard key={c.id} challenge={c} />)}
        </div>
      )}
    </div>
  )
}
