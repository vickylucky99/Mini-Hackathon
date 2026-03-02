import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import api from '../lib/api'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { user, isLoaded } = useUser()
  const handled = useRef(false)

  useEffect(() => {
    if (!isLoaded || handled.current) return
    if (!user) return  // Not signed in yet — keep waiting

    handled.current = true

    const syncProfile = async () => {
      try {
        const email = user.emailAddresses?.[0]?.emailAddress
        const name = user.fullName || email?.split('@')[0] || 'Builder'

        await api.post('/api/auth/profile', { name, email, role: 'builder' })

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

    syncProfile()
  }, [user, isLoaded, navigate])

  return (
    <div className="flex items-center justify-center min-h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4" />
        <p className="text-gray-400">Signing you in…</p>
      </div>
    </div>
  )
}
