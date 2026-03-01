import { Link } from 'react-router-dom'
import { Calendar, Trophy, Tag } from 'lucide-react'

const DOMAIN_COLORS = {
  NLP: 'bg-purple-900 text-purple-300',
  Vision: 'bg-blue-900 text-blue-300',
  Agents: 'bg-green-900 text-green-300',
  Multimodal: 'bg-orange-900 text-orange-300',
  default: 'bg-gray-700 text-gray-300',
}

export default function ChallengeCard({ challenge }) {
  const deadline = new Date(challenge.deadline)
  const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24))
  const domainColor = DOMAIN_COLORS[challenge.domain] || DOMAIN_COLORS.default

  return (
    <Link to={`/challenges/${challenge.id}`} className="card hover:border-brand-500 transition-colors block">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-white text-lg leading-tight">{challenge.title}</h3>
        {challenge.domain && (
          <span className={`badge shrink-0 ${domainColor}`}>
            <Tag size={11} />
            {challenge.domain}
          </span>
        )}
      </div>

      <p className="text-gray-400 text-sm line-clamp-2 mb-4">
        {challenge.description}
      </p>

      {challenge.profiles && (
        <p className="text-xs text-gray-500 mb-4">
          by {challenge.profiles.company_name || challenge.profiles.name}
        </p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-800 text-sm">
        <div className="flex items-center gap-1.5 text-yellow-400">
          <Trophy size={14} />
          <span className="font-semibold">
            {challenge.prize_currency} {Number(challenge.prize_amount).toLocaleString()}
          </span>
        </div>
        <div className={`flex items-center gap-1.5 ${daysLeft < 3 ? 'text-red-400' : 'text-gray-400'}`}>
          <Calendar size={14} />
          <span>{daysLeft > 0 ? `${daysLeft}d left` : 'Closed'}</span>
        </div>
      </div>
    </Link>
  )
}
