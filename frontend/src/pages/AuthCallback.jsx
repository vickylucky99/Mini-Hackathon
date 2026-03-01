import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import api from '../lib/api'

export default function AuthCallback() {
  const navigate = useNavigate()
  const handled = useRef(false)

  useEffect(() => {
    // Listen for the SIGNED_IN event — fires after Supabase finishes
    // the PKCE code exchange from the ?code= param in the URL.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (handled.current) return
        if (event !== 'SIGNED_IN' || !session) return

        handled.current = true
        subscription.unsubscribe()

        try {
          const user = session.user
          await api.post('/api/auth/profile', {
            name: user.user_metadata?.full_name || user.email?.split('@')[0],
            role: 'builder',
          })

          const { data: profile } = await api.get('/api/auth/profile/me')

          if (profile?.role === 'sponsor' && !profile?.company_name) {
            navigate('/onboarding')
          } else if (!profile?.github_url && profile?.role === 'builder') {
            navigate('/onboarding')
          } else {
            navigate('/dashboard')
          }
        } catch {
          navigate('/onboarding')
        }
      }
    )

    // Fallback: if already signed in (page refresh on callback), getSession works
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session || handled.current) return
      handled.current = true
      subscription.unsubscribe()

      try {
        const user = session.user
        await api.post('/api/auth/profile', {
          name: user.user_metadata?.full_name || user.email?.split('@')[0],
          role: 'builder',
        })
        const { data: profile } = await api.get('/api/auth/profile/me')
        if (profile?.role === 'sponsor' && !profile?.company_name) {
          navigate('/onboarding')
        } else if (!profile?.github_url && profile?.role === 'builder') {
          navigate('/onboarding')
        } else {
          navigate('/dashboard')
        }
      } catch {
        navigate('/onboarding')
      }
    })

    return () => subscription.unsubscribe()
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
