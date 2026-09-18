import { useEffect, useState, type ReactNode } from 'react'
import { apolloClient } from './apollo'
import { getToken, setToken, clearToken } from './auth'
import { ME, SIGN_IN, SIGN_UP, VERIFY_EMAIL } from './graphql'
import { AuthContext, type AuthUser } from './auth-context'

// The token + user the server returns on a successful sign-in/verify.
type AuthPayload = { token: string; user: AuthUser }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // On first load: if we have a saved token, ask the server "who am I?"
  // to restore the session. If the token is stale/invalid, drop it.
  useEffect(() => {
    let active = true
    async function restore() {
      if (!getToken()) {
        setLoading(false)
        return
      }
      try {
        const { data } = await apolloClient.query<{ me: AuthUser | null }>({
          query: ME,
          fetchPolicy: 'network-only',
        })
        if (!active) return
        if (data?.me) setUser(data.me)
        else clearToken()
      } catch {
        clearToken()
      } finally {
        if (active) setLoading(false)
      }
    }
    restore()
    return () => {
      active = false
    }
  }, [])

  // Save a new session, then clear cached queries so any role-scoped data
  // is refetched for the newly signed-in user.
  async function applySession(payload: AuthPayload) {
    setToken(payload.token)
    setUser(payload.user)
    await apolloClient.resetStore()
  }

  async function signIn(email: string, password: string) {
    const { data } = await apolloClient.mutate<{ signIn: AuthPayload }>({
      mutation: SIGN_IN,
      variables: { input: { email, password } },
    })
    if (!data?.signIn) throw new Error('Sign in failed.')
    await applySession(data.signIn)
  }

  async function signUp(username: string, email: string, password: string) {
    const { data } = await apolloClient.mutate<{ signUp: { id: string } }>({
      mutation: SIGN_UP,
      variables: { input: { username, email, password } },
    })
    if (!data?.signUp) throw new Error('Sign up failed.')
    // No token yet — the user must verify their email next.
  }

  async function verifyEmail(token: string) {
    const { data } = await apolloClient.mutate<{ verifyEmail: AuthPayload }>({
      mutation: VERIFY_EMAIL,
      variables: { token },
    })
    if (!data?.verifyEmail) throw new Error('Verification failed.')
    await applySession(data.verifyEmail)
  }

  async function signOut() {
    clearToken()
    setUser(null)
    await apolloClient.resetStore()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, verifyEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
