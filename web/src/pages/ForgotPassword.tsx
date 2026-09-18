import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth-context'

const field =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-calm'

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await requestPasswordReset(email)
      setSent(true) // always show the same message, whether or not the email exists
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-3xl font-semibold text-ink">Reset your password</h1>

      {sent ? (
        <>
          <p className="mt-4 text-ink-2">
            If an account exists for <strong>{email}</strong>, we’ve sent it a link to reset the password.
            Please check your inbox.
          </p>
          <div className="mt-4 rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-ink-2">
            <strong className="text-ink">Development note:</strong> open the reset link from the
            <em> server</em> terminal (or the Ethereal preview) to continue.
          </div>
          <p className="mt-6 text-sm text-ink-2">
            <Link to="/sign-in" className="font-medium text-calm-deep hover:underline">← Back to sign in</Link>
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 text-ink-2">Enter your email and we’ll send you a link to set a new password.</p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-2" htmlFor="email">Email</label>
              <input id="email" type="email" required autoComplete="email"
                className={`mt-1 ${field}`} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button type="submit" disabled={busy}
              className="w-full rounded-xl bg-calm-deep px-6 py-3 font-semibold text-white transition hover:bg-calm disabled:opacity-60">
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
          <p className="mt-6 text-sm text-ink-2">
            <Link to="/sign-in" className="font-medium text-calm-deep hover:underline">← Back to sign in</Link>
          </p>
        </>
      )}
    </div>
  )
}
