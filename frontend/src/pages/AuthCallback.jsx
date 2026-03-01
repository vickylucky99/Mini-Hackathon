import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import api from '../lib/api'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    async function handleCallback() {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) {
        navigate('/')
        return
      }

      try {
        // Upsert profile (creates if new, no-op if exists)
        const user = session.user
        await api.post('/api/auth/profile', {
          name: user.user_metadata?.full_name || user.email?.split('@')[0],
          role: 'builder',
        })

        // Check if profile is complete (has github_url / company_name)
        const { data: profile } = await api.get('/api/auth/profile/me')

        if (!profile?.github_url && profile?.role === 'builder') {
          navigate('/onboarding')
        } else if (profile?.role === 'sponsor' && !profile?.company_name) {
          navigate('/onboarding')
        } else {
          navigate('/dashboard')
        }
      } catch {
        navigate('/onboarding')
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="flex items-center justify-center min-h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4" />
        <p className="text-gray-400">Signing you in…</p>
      </div>
    </div>
  )
}
