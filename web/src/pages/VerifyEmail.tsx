import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../auth-context'
import { getToken } from '../auth'

const field =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-calm'
const CODE_LEN = 6

export default function VerifyEmail() {
  const { verifyEmail, verifyEmailCode, resendVerification } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const location = useLocation()

  // The email the link carries (?email=...), or the one passed from sign-up.
  const emailFromCtx =
    params.get('email') ??
    (location.state as { email?: string } | null)?.email ??
    ''

  const urlToken = params.get('token') ?? ''

  // ----- Link path (token in the URL): auto-verify, then show a confirmation.
  const [linkDone, setLinkDone] = useState(false)
  const [linkError, setLinkError] = useState('')
  const autoRan = useRef(false)
  useEffect(() => {
    if (urlToken && !autoRan.current) {
      autoRan.current = true
      verifyEmail(urlToken.trim())
        .then(() => setLinkDone(true))
        .catch((err) => setLinkError(err instanceof Error ? err.message : 'Something went wrong.'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ----- Waiting room: if the user verifies elsewhere (link in another tab),
  // the login token lands in shared localStorage — take this tab home.
  useEffect(() => {
    if (urlToken) return
    const goHomeIfSignedIn = () => {
      if (getToken()) window.location.assign('/')
    }
    goHomeIfSignedIn()
    window.addEventListener('storage', goHomeIfSignedIn)
    window.addEventListener('focus', goHomeIfSignedIn)
    const id = window.setInterval(goHomeIfSignedIn, 2000)
    return () => {
      window.removeEventListener('storage', goHomeIfSignedIn)
      window.removeEventListener('focus', goHomeIfSignedIn)
      window.clearInterval(id)
    }
  }, [urlToken])

  // ----- Code entry (verifies in THIS tab, so no new window opens). -----
  const [addr, setAddr] = useState(emailFromCtx)
  const [digits, setDigits] = useState<string[]>(Array(CODE_LEN).fill(''))
  const [codeErr, setCodeErr] = useState('')
  const [busy, setBusy] = useState(false)
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const code = digits.join('')

  function focusBox(i: number) {
    const idx = Math.max(0, Math.min(i, CODE_LEN - 1))
    requestAnimationFrame(() => inputs.current[idx]?.focus())
  }

  // Type (or autofill) one or more digits starting at box i.
  function onBoxChange(i: number, raw: string) {
    const only = raw.replace(/\D/g, '')
    setDigits((prev) => {
      const next = [...prev]
      if (only === '') {
        next[i] = ''
        return next
      }
      let p = i
      for (const ch of only) {
        if (p >= CODE_LEN) break
        next[p] = ch
        p++
      }
      focusBox(i + only.length)
      return next
    })
  }

  function onBoxKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && digits[i] === '' && i > 0) {
      e.preventDefault()
      setDigits((prev) => {
        const next = [...prev]
        next[i - 1] = ''
        return next
      })
      focusBox(i - 1)
    } else if (e.key === 'ArrowLeft' && i > 0) {
      focusBox(i - 1)
    } else if (e.key === 'ArrowRight' && i < CODE_LEN - 1) {
      focusBox(i + 1)
    }
  }

  // Paste the whole code at once (e.g. copied from the inbox) — fills every box.
  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, CODE_LEN)
    if (!pasted) return
    e.preventDefault()
    const next = Array(CODE_LEN).fill('')
    for (let k = 0; k < pasted.length; k++) next[k] = pasted[k]
    setDigits(next)
    focusBox(pasted.length)
  }

  async function doVerify(value: string) {
    setCodeErr('')
    if (!addr) {
      setCodeErr('Please enter the email you signed up with.')
      return
    }
    if (value.length < CODE_LEN) {
      setCodeErr(`Enter all ${CODE_LEN} digits of the code.`)
      return
    }
    setBusy(true)
    try {
      await verifyEmailCode(addr, value)
      navigate('/') // verified + signed in, in this same tab
    } catch (err) {
      setCodeErr(err instanceof Error ? err.message : 'Could not verify.')
    } finally {
      setBusy(false)
    }
  }

  // ----- Resend, with a short cooldown so the button can't be spammed. -----
  const [resendMsg, setResendMsg] = useState('')
  const [cooldown, setCooldown] = useState(0)
  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => window.clearTimeout(id)
  }, [cooldown])

  async function onResend() {
    if (!addr) {
      setCodeErr('Please enter your email first.')
      return
    }
    if (cooldown > 0) return
    setResendMsg('')
    try {
      await resendVerification(addr)
      setResendMsg('If that address is awaiting verification, a fresh code and link are on the way.')
      setDigits(Array(CODE_LEN).fill(''))
      setCooldown(30)
    } catch {
      setResendMsg('Could not resend right now — please try again shortly.')
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-3xl font-semibold text-ink">Verify your email</h1>

      {urlToken ? (
        linkDone ? (
          <>
            <p className="mt-3 text-ink-2">✓ Your email is verified and you’re signed in.</p>
            <p className="mt-2 text-sm text-muted">
              If you signed up in another tab, it’s taking you in now — you can close this one.
              Otherwise, continue below.
            </p>
            <Link
              to="/"
              className="mt-6 inline-block rounded-xl bg-calm-deep px-6 py-3 font-semibold text-white transition hover:bg-calm"
            >
              Continue to the app
            </Link>
          </>
        ) : linkError ? (
          <p className="mt-3 text-ink-2">We couldn’t confirm your email.</p>
        ) : (
          <p className="mt-3 text-ink-2">Confirming your email…</p>
        )
      ) : (
        <>
          <p className="mt-3 text-ink-2">
            {emailFromCtx ? (
              <>We’ve sent a 6-digit code and a link to <strong>{emailFromCtx}</strong>.</>
            ) : (
              <>Enter the email you signed up with and the code we sent you.</>
            )}{' '}
            Type or paste the code below, or just click the link in the email.
          </p>

          {!emailFromCtx && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-ink-2" htmlFor="addr">Email</label>
              <input
                id="addr"
                type="email"
                autoComplete="email"
                className={`mt-1 ${field}`}
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
              />
            </div>
          )}

          <label className="mt-6 block text-sm font-medium text-ink-2">Verification code</label>
          <div className="mt-2 flex gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el
                }}
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                placeholder="_"
                aria-label={`Digit ${i + 1}`}
                className="h-14 w-full rounded-lg border border-border bg-surface text-center text-2xl font-semibold text-ink outline-none focus:border-calm placeholder:text-muted"
                value={d}
                onChange={(e) => onBoxChange(i, e.target.value)}
                onKeyDown={(e) => onBoxKeyDown(i, e)}
                onPaste={onPaste}
              />
            ))}
          </div>

          {codeErr && (
            <p className="mt-3 rounded-lg bg-calm-soft px-3 py-2 text-sm text-brand-strong">{codeErr}</p>
          )}

          <button
            type="button"
            onClick={() => doVerify(code)}
            disabled={busy || code.length < CODE_LEN}
            className="mt-4 w-full rounded-xl bg-calm-deep px-6 py-3 font-semibold text-white transition hover:bg-calm disabled:opacity-60"
          >
            {busy ? 'Verifying…' : 'Verify and continue'}
          </button>

          <p className="mt-5 text-sm text-ink-2">
            Didn’t get it? Check your spam folder, or{' '}
            <button
              type="button"
              onClick={onResend}
              disabled={cooldown > 0}
              className="font-medium text-calm-deep hover:underline disabled:text-muted disabled:no-underline"
            >
              {cooldown > 0 ? `resend in ${cooldown}s` : 'resend the email'}
            </button>
            .
          </p>
          {resendMsg && <p className="mt-2 text-sm text-muted">{resendMsg}</p>}

          <div className="mt-6 flex items-center gap-3 text-sm text-ink-2">
            <span
              aria-hidden="true"
              className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-calm-soft border-t-calm-deep"
            />
            <span>Clicked the link instead? This page will take you in automatically.</span>
          </div>
        </>
      )}

      <p className="mt-8 text-sm text-ink-2">
        <Link to="/sign-in" className="font-medium text-calm-deep hover:underline">← Back to sign in</Link>
      </p>
    </div>
  )
}
