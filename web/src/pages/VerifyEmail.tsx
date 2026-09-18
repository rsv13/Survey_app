import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useAuth } from '../auth-context'

const field =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-ink outline-none focus:border-calm'

export default function VerifyEmail() {
  const { verifyEmail } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const location = useLocation()

  // The email a real verification link carries (?email=...), or the one passed
  // from the sign-up page.
  const email =
    params.get('email') ??
    (location.state as { email?: string } | null)?.email ??
    ''

  // A real email link includes ?token=... — prefill it when present.
  const urlToken = params.get('token') ?? ''
  const [token, setToken] = useState(urlToken)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Does the actual verification. Shared by the auto-run and the manual button.
  async function runVerify(value: string) {
    setError('')
    setBusy(true)
    try {
      await verifyEmail(value.trim())
      navigate('/') // verified + signed in
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  // If we arrived from the email link (token in the URL), verify automatically
  // so it's a true one-click confirmation. The ref makes sure this runs once.
  const autoRan = useRef(false)
  useEffect(() => {
    if (urlToken && !autoRan.current) {
      autoRan.current = true
      void runVerify(urlToken)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void runVerify(token)
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-3xl font-semibold text-ink">Verify your email</h1>
      <p className="mt-2 text-ink-2">
        {urlToken
          ? 'Confirming your email…'
          : email
            ? <>We sent a verification link to <strong>{email}</strong>. Open that email and click the button — or paste the token below.</>
            : 'Open the verification link we emailed you, or paste the token below.'}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-2" htmlFor="token">Verification token</label>
          <input id="token" type="text" required className={`mt-1 ${field}`}
            value={token} onChange={(e) => setToken(e.target.value)} />
        </div>

        {error && (
          <p className="rounded-lg bg-calm-soft px-3 py-2 text-sm text-brand-strong">{error}</p>
        )}

        <button type="submit" disabled={busy}
          className="w-full rounded-xl bg-calm-deep px-6 py-3 font-semibold text-white transition hover:bg-calm disabled:opacity-60">
          {busy ? 'Verifying…' : 'Verify and continue'}
        </button>
      </form>
    </div>
  )
}
