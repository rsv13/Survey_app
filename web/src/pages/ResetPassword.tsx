import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth-context'

const field =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-calm'
const labelCls = 'block text-sm font-medium text-ink-2'

export default function ResetPassword() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!token) { setError('This reset link is missing its token. Please use the link from your email.'); return }
    if (next !== confirm) { setError('The passwords do not match.'); return }
    setBusy(true)
    try {
      await resetPassword(token, next)
      navigate('/') // reset + signed in
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset your password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-3xl font-semibold text-ink">Set a new password</h1>
      <p className="mt-2 text-ink-2">Choose a new password for your account.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className={labelCls} htmlFor="new">New password</label>
          <div className="relative mt-1">
            <input id="new" type={show ? 'text' : 'password'} required autoComplete="new-password"
              className={`${field} pr-16`} value={next} onChange={(e) => setNext(e.target.value)} />
            <button type="button" onClick={() => setShow((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-calm-deep">
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="mt-1 text-xs text-muted">At least 8 characters, with a letter and a number.</p>
        </div>
        <div>
          <label className={labelCls} htmlFor="confirm">Confirm new password</label>
          <input id="confirm" type={show ? 'text' : 'password'} required autoComplete="new-password"
            className={`mt-1 ${field}`} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>

        {error && <p className="rounded-lg bg-calm-soft px-3 py-2 text-sm text-brand-strong">{error}</p>}

        <button type="submit" disabled={busy}
          className="w-full rounded-xl bg-calm-deep px-6 py-3 font-semibold text-white transition hover:bg-calm disabled:opacity-60">
          {busy ? 'Saving…' : 'Set new password'}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-2">
        <Link to="/sign-in" className="font-medium text-calm-deep hover:underline">← Back to sign in</Link>
      </p>
    </div>
  )
}
