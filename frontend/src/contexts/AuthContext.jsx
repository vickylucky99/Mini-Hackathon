import { createContext, useContext, useEffect, useState } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { user, isLoaded } = useUser()
  const { signOut: clerkSignOut, openSignIn } = useClerk()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded) return
    if (user) {
      fetchProfile()
    } else {
      setProfile(null)
      setLoading(false)
    }
  }, [user, isLoaded])

  async function fetchProfile() {
    try {
      const { data } = await api.get('/api/auth/profile/me')
      setProfile(data)
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  function signIn() {
    openSignIn({ afterSignInUrl: '/auth/callback', afterSignUpUrl: '/auth/callback' })
  }

  async function signOut() {
    await clerkSignOut()
    setProfile(null)
  }

  // Expose `session` as a boolean alias so existing code that checks `if (session)` works.
  const session = !!user

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signInWithGoogle: signIn, signOut, refetchProfile: fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
