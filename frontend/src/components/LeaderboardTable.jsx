import { Link } from 'react-router-dom'
import { Medal, Github } from 'lucide-react'

const rankStyle = (rank) => {
  if (rank === 1) return 'text-yellow-400'
  if (rank === 2) return 'text-gray-300'
  if (rank === 3) return 'text-amber-600'
  return 'text-gray-500'
}

export default function LeaderboardTable({ entries = [] }) {
  if (!entries.length) {
    return (
      <div className="text-center py-16 text-gray-500">
        No scored submissions yet.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-gray-400 text-left">
            <th className="pb-3 pr-4 font-medium w-12">Rank</th>
            <th className="pb-3 pr-4 font-medium">Builder</th>
            <th className="pb-3 pr-4 font-medium text-right">Score</th>
            <th className="pb-3 font-medium text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {entries.map((entry) => (
            <tr key={entry.id} className="hover:bg-gray-800/30 transition-colors">
              <td className="py-3 pr-4">
                <span className={`font-bold text-base ${rankStyle(entry.rank)}`}>
                  {entry.rank <= 3 ? <Medal size={16} className="inline" /> : null}
                  {entry.rank}
                </span>
              </td>
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/profile/${entry.builder_id}`}
                    className="font-medium text-white hover:text-brand-400 transition-colors"
                  >
                    {entry.builder_name || 'Anonymous'}
                  </Link>
                  {entry.github_url && (
                    <a href={entry.github_url} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-300">
                      <Github size={14} />
                    </a>
                  )}
                </div>
              </td>
              <td className="py-3 pr-4 text-right">
                <span className="font-semibold text-white">
                  {entry.effective_score ?? '—'}
                </span>
                <span className="text-gray-500">/100</span>
              </td>
              <td className="py-3 text-right">
                <span className={`badge ${entry.status === 'reviewed' ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-400'}`}>
                  {entry.status === 'reviewed' ? 'Final' : 'Provisional'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
