import { createContext, useContext } from 'react'

// The shape of a logged-in user, as the rest of the app uses it.
export interface AuthUser {
  id: string
  username: string
  email: string
  role: 'NORMAL_USER' | 'GROUP_ADMIN' | 'ADMIN'
  emailVerified: boolean
}

// What useAuth() gives you.
export interface AuthContextValue {
  user: AuthUser | null
  loading: boolean // true while we check for an existing session on first load
  signIn: (email: string, password: string) => Promise<void>
  signUp: (username: string, email: string, password: string) => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  signOut: () => Promise<void>
}

// The context itself. The provider (in AuthContext.tsx) fills it in.
export const AuthContext = createContext<AuthContextValue | null>(null)

// Convenience hook so any component can read auth state with useAuth().
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
