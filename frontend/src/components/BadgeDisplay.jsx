import { Award, Star, Heart, TrendingUp } from 'lucide-react'

const BADGE_CONFIG = {
  winner: { label: 'Winner', icon: Award, color: 'bg-yellow-900 text-yellow-300 border-yellow-700' },
  top10: { label: 'Top 10%', icon: TrendingUp, color: 'bg-brand-900 text-brand-300 border-brand-700' },
  sponsor_fav: { label: 'Sponsor Fav', icon: Heart, color: 'bg-pink-900 text-pink-300 border-pink-700' },
  top_performer: { label: 'Top Performer', icon: Star, color: 'bg-green-900 text-green-300 border-green-700' },
}

export default function BadgeDisplay({ badges = [] }) {
  if (!badges.length) return null

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => {
        const config = BADGE_CONFIG[badge.badge_type] || BADGE_CONFIG.top_performer
        const Icon = config.icon
        return (
          <span
            key={badge.id}
            title={badge.challenges?.title}
            className={`badge border ${config.color}`}
          >
            <Icon size={12} />
            {config.label}
          </span>
        )
      })}
    </div>
  )
}
