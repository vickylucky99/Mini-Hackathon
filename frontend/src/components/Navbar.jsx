import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Zap, LogOut, User, LayoutDashboard } from 'lucide-react'

export default function Navbar() {
  const { session, profile, signInWithGoogle, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-white">
          <Zap className="text-brand-500" size={22} />
          EliteBuilders
        </Link>

        <div className="flex items-center gap-2">
          <Link to="/challenges" className="text-gray-400 hover:text-white px-3 py-2 text-sm transition-colors">
            Challenges
          </Link>

          {session && profile ? (
            <>
              {profile.role === 'sponsor' || profile.role === 'admin' ? (
                <Link to="/sponsor" className="text-gray-400 hover:text-white px-3 py-2 text-sm transition-colors">
                  Sponsor Dashboard
                </Link>
              ) : null}
              {profile.role === 'admin' && (
                <Link to="/admin" className="text-gray-400 hover:text-white px-3 py-2 text-sm transition-colors">
                  Admin
                </Link>
              )}
              <Link to="/dashboard" className="btn-secondary flex items-center gap-1.5 text-sm py-2 px-3">
                <LayoutDashboard size={15} />
                Dashboard
              </Link>
              <button
                onClick={() => { signOut(); navigate('/') }}
                className="flex items-center gap-1.5 text-gray-400 hover:text-white px-3 py-2 text-sm transition-colors"
              >
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <button onClick={signInWithGoogle} className="btn-primary text-sm py-2">
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
