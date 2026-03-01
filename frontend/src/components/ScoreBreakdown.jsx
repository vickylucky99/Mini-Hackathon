export default function ScoreBreakdown({ scoreJson }) {
  if (!scoreJson?.criteria?.length) return null

  return (
    <div className="space-y-4">
      {scoreJson.criteria.map((criterion, idx) => (
        <div key={idx}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-300">{criterion.name}</span>
            <span className="text-sm font-semibold text-white">{criterion.score}/100</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2 mb-1.5">
            <div
              className="bg-brand-500 h-2 rounded-full transition-all"
              style={{ width: `${criterion.score}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">{criterion.feedback}</p>
        </div>
      ))}

      {scoreJson.overall_feedback && (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <p className="text-sm font-medium text-gray-300 mb-1">Overall Feedback</p>
          <p className="text-sm text-gray-400">{scoreJson.overall_feedback}</p>
        </div>
      )}

      {scoreJson.flags?.length > 0 && (
        <div className="mt-3 p-3 bg-red-950 border border-red-800 rounded-lg">
          <p className="text-sm font-medium text-red-400 mb-1">Flags</p>
          <ul className="text-sm text-red-300 list-disc list-inside space-y-1">
            {scoreJson.flags.map((flag, i) => <li key={i}>{flag}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
