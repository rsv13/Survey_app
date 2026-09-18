import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth-context'

// Shared class strings (canonical Tailwind utilities mapped from our theme).
const field =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-calm'
const label = 'block text-sm font-medium text-ink-2'

export default function SignIn() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn(email, password)
      navigate('/') // signed in — send them home
    } catch (err) {
      // The server sends friendly messages like "Invalid email or password."
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-3xl font-semibold text-ink">Sign in</h1>
      <p className="mt-2 text-ink-2">Welcome back.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className={label} htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email"
            className={`mt-1 ${field}`} value={email}
            onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="password">Password</label>
          <div className="relative mt-1">
            <input id="password" type={showPassword ? 'text' : 'password'} required
              autoComplete="current-password" className={`${field} pr-16`} value={password}
              onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-calm-deep">
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="mt-1 text-right text-xs">
            <Link to="/forgot-password" className="font-medium text-calm-deep hover:underline">Forgot password?</Link>
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-calm-soft px-3 py-2 text-sm text-brand-strong">{error}</p>
        )}

        <button type="submit" disabled={busy}
          className="w-full rounded-xl bg-calm-deep px-6 py-3 font-semibold text-white transition hover:bg-calm disabled:opacity-60">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-2">
        New here?{' '}
        <Link to="/sign-up" className="font-medium text-calm-deep hover:underline">Create an account</Link>
      </p>
    </div>
  )
}
