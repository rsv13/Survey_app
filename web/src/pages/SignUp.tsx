import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth-context'

const field =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-calm'
const label = 'block text-sm font-medium text-ink-2'

// Mirrors the server's checks (validation.ts) so the form matches exactly.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function SignUp() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pwFocused, setPwFocused] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Live validation state.
  const emailValid = EMAIL_RE.test(email)
  const pwRules = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'At least one letter', ok: /[A-Za-z]/.test(password) },
    { label: 'At least one number', ok: /[0-9]/.test(password) },
  ]
  const pwAllOk = pwRules.every((r) => r.ok)
  const confirmOk = confirm.length > 0 && password === confirm
  const canSubmit = emailValid && pwAllOk && confirmOk && !busy

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!emailValid) {
      setError('Please enter a valid email address.')
      return
    }
    if (!pwAllOk) {
      setError('Please meet all the password requirements below.')
      return
    }
    if (!confirmOk) {
      setError('The passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await signUp(email, password, inviteCode)
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
      <p className="mt-2 text-ink-2">It only takes a moment. You’ll be given an anonymous participant ID automatically.</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
        <div>
          <label className={label} htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={`mt-1 ${field}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {email.length > 0 && !emailValid && (
            <p className="mt-1 text-xs text-brand-strong">Enter a valid email address, e.g. name@example.com.</p>
          )}
        </div>

        <div>
          <label className={label} htmlFor="password">Password</label>
          <div className="relative mt-1">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className={`${field} pr-16`}
              value={password}
              onFocus={() => setPwFocused(true)}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-calm-deep"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {(pwFocused || password.length > 0) && (
            <ul className="mt-2 space-y-1">
              {pwRules.map((r) => (
                <li key={r.label} className="flex items-center gap-2 text-xs">
                  <span
                    aria-hidden="true"
                    className={
                      'flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ' +
                      (r.ok ? 'bg-green-600 text-white' : 'bg-surface-2 text-muted')
                    }
                  >
                    {r.ok ? '✓' : ''}
                  </span>
                  <span className={r.ok ? 'text-ink-2' : 'text-muted'}>{r.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className={label} htmlFor="confirm">Confirm password</label>
          <input
            id="confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className={`mt-1 ${field}`}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {confirm.length > 0 && !confirmOk && (
            <p className="mt-1 text-xs text-brand-strong">The passwords do not match.</p>
          )}
        </div>

        <div>
          <label className={label} htmlFor="invite">Group invite code <span className="font-normal text-muted">(optional)</span></label>
          <input id="invite" type="text" className={`mt-1 ${field}`} value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)} />
          <p className="mt-1 text-xs text-muted">Have a code from a researcher? Enter it to join their group now. You can also add it later.</p>
        </div>

        {error && (
          <p className="rounded-lg bg-calm-soft px-3 py-2 text-sm text-brand-strong">{error}</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-xl bg-calm-deep px-6 py-3 font-semibold text-white transition hover:bg-calm disabled:opacity-60"
        >
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
