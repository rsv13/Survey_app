import { Link } from 'react-router-dom'

export default function SignIn() {
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-3xl font-semibold text-[var(--ink)]">Sign in</h1>
      <p className="mt-4 text-[var(--ink-2)]">
        The sign-in and sign-up forms will live here. We&apos;ll wire them to the
        API in the auth slice.
      </p>
      <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-10 text-center text-[var(--muted)]">
        Sign-in form — coming next
      </div>
      <p className="mt-6 text-sm text-[var(--ink-2)]">
        <Link to="/" className="text-[var(--calm-deep)] hover:underline">
          ← Back to home
        </Link>
      </p>
    </div>
  )
}
