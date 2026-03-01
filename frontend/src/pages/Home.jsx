import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Zap, Trophy, Users, BarChart3, ArrowRight, CheckCircle } from 'lucide-react'

const HOW_IT_WORKS = [
  { step: '01', title: 'Pick a Challenge', desc: 'Browse company-sponsored AI challenges. Filter by domain, prize, or deadline.' },
  { step: '02', title: 'Build Your MVP', desc: 'Ship a real AI product in a weekend. Submit your GitHub repo, pitch deck, and demo video.' },
  { step: '03', title: 'Get Scored', desc: 'Our AI evaluator scores your submission within 15 minutes against the rubric. Human judges review final rankings.' },
  { step: '04', title: 'Land the Job', desc: 'Top builders earn badges and get noticed by hiring sponsors. Your profile becomes your proof of work.' },
]

const STATS = [
  { label: 'Active Challenges', value: '3+' },
  { label: 'Prize Pool', value: '₹1.5L+' },
  { label: 'Builder Signups', value: '500+' },
  { label: 'Hires Facilitated', value: '3+' },
]

export default function Home() {
  const { session, signInWithGoogle } = useAuth()

  return (
    <div>
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-900/40 border border-brand-700/50 rounded-full px-4 py-1.5 text-brand-300 text-sm mb-6">
          <Zap size={14} />
          Season 1 is live — 3 active challenges
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight mb-6">
          Replace LeetCode with
          <br />
          <span className="text-brand-500">Real AI MVPs</span>
        </h1>

        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Ship AI products, get ranked by LLM + human judges, and land top applied-AI roles.
          The proof-of-work credential for serious builders.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {session ? (
            <Link to="/challenges" className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-3">
              Browse Challenges <ArrowRight size={18} />
            </Link>
          ) : (
            <button onClick={signInWithGoogle} className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-3">
              Join as Builder <ArrowRight size={18} />
            </button>
          )}
          <Link to="/challenges" className="btn-secondary inline-flex items-center gap-2 text-lg px-8 py-3">
            Post a Challenge
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-800 bg-gray-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-white mb-1">{s.value}</div>
                <div className="text-sm text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-3xl font-bold text-white text-center mb-4">How It Works</h2>
        <p className="text-gray-400 text-center mb-14">Four steps from signup to job offer.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className="card relative">
              <div className="text-5xl font-black text-gray-800 mb-4">{item.step}</div>
              <h3 className="font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-gray-400 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* For sponsors CTA */}
      <section className="bg-gray-900 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <Trophy className="mx-auto text-yellow-400 mb-6" size={40} />
          <h2 className="text-3xl font-bold text-white mb-4">Hire Top AI Talent in 6 Weeks</h2>
          <p className="text-gray-400 max-w-xl mx-auto mb-8">
            Post a challenge, define your rubric, and receive ranked, pre-vetted candidate packets.
            No sourcing. No resume black holes.
          </p>
          <Link to="/sponsor" className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-3">
            Post a Challenge <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  )
}
