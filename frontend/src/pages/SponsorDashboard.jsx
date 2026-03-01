import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import ScoreBreakdown from '../components/ScoreBreakdown'
import { Plus, Phone, Download, ChevronDown, ChevronUp, Trophy, Calendar, Tag } from 'lucide-react'
import jsPDF from 'jspdf'

const DOMAINS = ['NLP', 'Vision', 'Agents', 'Multimodal', 'Other']
const EMPTY_CRITERION = { name: '', description: '', max_score: 20 }

export default function SponsorDashboard() {
  const { profile } = useAuth()
  const [challenges, setChallenges] = useState([])
  const [selectedChallenge, setSelectedChallenge] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [expandedSub, setExpandedSub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    title: '', description: '', domain: 'NLP',
    deadline: '', prize_amount: '', prize_currency: 'INR',
    dataset_url: '',
    rubric: [{ ...EMPTY_CRITERION }],
  })

  useEffect(() => {
    api.get('/api/challenges?status=active&limit=50')
      .then((r) => {
        const mine = r.data.filter((c) => c.sponsor_id === profile?.id)
        setChallenges(mine)
        if (mine.length) selectChallenge(mine[0].id)
      })
      .finally(() => setLoading(false))
  }, [profile])

  async function selectChallenge(id) {
    setSelectedChallenge(id)
    const subs = await api.get(`/api/submissions/challenge/${id}`)
    setSubmissions(subs.data)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError(null)
    setCreating(true)
    try {
      const payload = {
        title: form.title,
        description: form.description,
        domain: form.domain,
        deadline: new Date(form.deadline).toISOString(),
        prize_amount: Number(form.prize_amount),
        prize_currency: form.prize_currency,
        dataset_url: form.dataset_url || undefined,
        rubric_json: form.rubric.map((r) => ({
          name: r.name, description: r.description, max_score: Number(r.max_score),
        })),
      }
      const { data } = await api.post('/api/challenges', payload)
      setChallenges((prev) => [data, ...prev])
      setShowCreateForm(false)
      setForm({ title: '', description: '', domain: 'NLP', deadline: '', prize_amount: '', prize_currency: 'INR', dataset_url: '', rubric: [{ ...EMPTY_CRITERION }] })
      selectChallenge(data.id)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create challenge')
    } finally {
      setCreating(false)
    }
  }

  async function markContacted(submissionId) {
    await api.patch(`/api/submissions/${submissionId}/contact`)
    setSubmissions((prev) => prev.map((s) => s.id === submissionId ? { ...s, contacted: true } : s))
  }

  function downloadPacket(sub) {
    const doc = new jsPDF()
    doc.setFontSize(20)
    doc.text('Candidate Packet — EliteBuilders', 14, 20)
    doc.setFontSize(12)
    const challenge = challenges.find((c) => c.id === sub.challenge_id)
    doc.text(`Challenge: ${challenge?.title || ''}`, 14, 35)
    doc.text(`Builder: ${sub.profiles?.name || 'Unknown'}`, 14, 45)
    doc.text(`Score: ${sub.final_score ?? sub.llm_total_score ?? 'Pending'}/100`, 14, 55)
    doc.text(`Status: ${sub.status}`, 14, 65)
    doc.text(`GitHub: ${sub.repo_url}`, 14, 75)
    if (sub.deck_url) doc.text(`Deck: ${sub.deck_url}`, 14, 85)
    if (sub.video_url) doc.text(`Video: ${sub.video_url}`, 14, 95)
    if (sub.profiles?.bio) {
      doc.text('Bio:', 14, 110)
      const bioLines = doc.splitTextToSize(sub.profiles.bio, 180)
      doc.text(bioLines, 14, 120)
    }
    doc.save(`candidate-${sub.profiles?.name?.replace(/\s+/g, '-') || sub.id}.pdf`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Sponsor Dashboard</h1>
          <p className="text-gray-400 text-sm">Manage challenges and review top builders.</p>
        </div>
        <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New Challenge
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-white mb-6">Create Challenge</h2>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Title</label>
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Build an AI Document Intelligence MVP" />
              </div>
              <div>
                <label className="label">Domain</label>
                <select className="input" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })}>
                  {DOMAINS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required placeholder="Describe the challenge, context, and what you're looking for…" />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Deadline</label>
                <input className="input" type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} required />
              </div>
              <div>
                <label className="label">Prize Amount</label>
                <input className="input" type="number" value={form.prize_amount} onChange={(e) => setForm({ ...form, prize_amount: e.target.value })} placeholder="50000" />
              </div>
              <div>
                <label className="label">Currency</label>
                <select className="input" value={form.prize_currency} onChange={(e) => setForm({ ...form, prize_currency: e.target.value })}>
                  <option>INR</option><option>USD</option><option>EUR</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Dataset URL (optional)</label>
              <input className="input" type="url" value={form.dataset_url} onChange={(e) => setForm({ ...form, dataset_url: e.target.value })} placeholder="https://…" />
            </div>

            {/* Rubric builder */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="label mb-0">Evaluation Rubric</label>
                <button type="button" className="text-brand-400 text-sm hover:text-brand-300" onClick={() => setForm({ ...form, rubric: [...form.rubric, { ...EMPTY_CRITERION }] })}>
                  + Add Criterion
                </button>
              </div>
              <div className="space-y-3">
                {form.rubric.map((criterion, idx) => (
                  <div key={idx} className="grid sm:grid-cols-4 gap-3 p-3 bg-gray-800 rounded-lg">
                    <input className="input sm:col-span-2" placeholder="Criterion name" value={criterion.name} onChange={(e) => { const r = [...form.rubric]; r[idx].name = e.target.value; setForm({ ...form, rubric: r }) }} required />
                    <input className="input" placeholder="Description" value={criterion.description} onChange={(e) => { const r = [...form.rubric]; r[idx].description = e.target.value; setForm({ ...form, rubric: r }) }} />
                    <div className="flex gap-2">
                      <input className="input" type="number" placeholder="Max pts" value={criterion.max_score} onChange={(e) => { const r = [...form.rubric]; r[idx].max_score = e.target.value; setForm({ ...form, rubric: r }) }} min={1} max={100} required />
                      {form.rubric.length > 1 && (
                        <button type="button" onClick={() => setForm({ ...form, rubric: form.rubric.filter((_, i) => i !== idx) })} className="text-red-400 hover:text-red-300 px-2">✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={creating}>{creating ? 'Creating…' : 'Create Challenge'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowCreateForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Challenge selector */}
      {challenges.length > 0 && (
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          {challenges.map((c) => (
            <button
              key={c.id}
              onClick={() => selectChallenge(c.id)}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedChallenge === c.id ? 'bg-brand-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              {c.title}
            </button>
          ))}
        </div>
      )}

      {/* Submissions table */}
      {selectedChallenge && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Ranked Submissions</h2>
            <span className="text-sm text-gray-400">{submissions.length} total</span>
          </div>

          {submissions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No submissions yet.</div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub, idx) => (
                <div key={sub.id} className={`border rounded-xl p-4 transition-colors ${sub.contacted ? 'border-green-800 bg-green-950/20' : 'border-gray-800'}`}>
                  <div
                    className="flex items-start justify-between cursor-pointer gap-4"
                    onClick={() => setExpandedSub(expandedSub === sub.id ? null : sub.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-gray-600">#{idx + 1}</span>
                      <div>
                        <p className="font-semibold text-white">{sub.profiles?.name || 'Anonymous'}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                          <a href={sub.repo_url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-400" onClick={(e) => e.stopPropagation()}>GitHub →</a>
                          {sub.deck_url && <a href={sub.deck_url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-400" onClick={(e) => e.stopPropagation()}>Deck →</a>}
                          {sub.video_url && <a href={sub.video_url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-400" onClick={(e) => e.stopPropagation()}>Video →</a>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {sub.llm_total_score != null && (
                        <span className="text-xl font-bold text-white">
                          {sub.final_score ?? sub.llm_total_score}<span className="text-gray-500 text-sm">/100</span>
                        </span>
                      )}
                      {!sub.contacted && (
                        <button
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                          onClick={(e) => { e.stopPropagation(); markContacted(sub.id) }}
                        >
                          <Phone size={12} /> Contact
                        </button>
                      )}
                      {sub.contacted && <span className="badge bg-green-900 text-green-300">Contacted</span>}
                      <button
                        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                        onClick={(e) => { e.stopPropagation(); downloadPacket(sub) }}
                      >
                        <Download size={12} /> PDF
                      </button>
                      {expandedSub === sub.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>

                  {expandedSub === sub.id && sub.llm_score_json && (
                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <ScoreBreakdown scoreJson={sub.llm_score_json} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && challenges.length === 0 && !showCreateForm && (
        <div className="text-center py-20">
          <p className="text-gray-400 mb-4">You haven't created any challenges yet.</p>
          <button onClick={() => setShowCreateForm(true)} className="btn-primary">Create Your First Challenge</button>
        </div>
      )}
    </div>
  )
}
