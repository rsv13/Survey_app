import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth-context'

const field =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-calm'
const label = 'block text-sm font-medium text-ink-2'

export default function SignUp() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    // Check the two passwords match before we bother the server.
    if (password !== confirm) {
      setError('The passwords do not match.')
      return
    }

    setBusy(true)
    try {
      await signUp(username, email, password)
      // Account created — go verify the email. Pass the email so the verify
      // page can greet the user by address.
      navigate('/verify', { state: { email } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-3xl font-semibold text-ink">Create an account</h1>
      <p className="mt-2 text-ink-2">It only takes a moment.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className={label} htmlFor="username">Username</label>
          <input id="username" type="text" required autoComplete="username"
            className={`mt-1 ${field}`} value={username}
            onChange={(e) => setUsername(e.target.value)} />
        </div>
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
              autoComplete="new-password" className={`${field} pr-16`} value={password}
              onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-calm-deep">
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="mt-1 text-xs text-muted">At least 8 characters, with a letter and a number.</p>
        </div>
        <div>
          <label className={label} htmlFor="confirm">Confirm password</label>
          <input id="confirm" type={showPassword ? 'text' : 'password'} required
            autoComplete="new-password" className={`mt-1 ${field}`} value={confirm}
            onChange={(e) => setConfirm(e.target.value)} />
        </div>

        {error && (
          <p className="rounded-lg bg-calm-soft px-3 py-2 text-sm text-brand-strong">{error}</p>
        )}

        <button type="submit" disabled={busy}
          className="w-full rounded-xl bg-calm-deep px-6 py-3 font-semibold text-white transition hover:bg-calm disabled:opacity-60">
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-2">
        Already have an account?{' '}
        <Link to="/sign-in" className="font-medium text-calm-deep hover:underline">Sign in</Link>
      </p>
    </div>
  )
}
