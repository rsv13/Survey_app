import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client/react'
import { PROFILE, CHANGE_PASSWORD, UPDATE_AVATAR } from '../graphql-profile'

type Data = {
  me: {
    id: string; username: string; email: string; role: string; emailVerified: boolean
    surveyUsername: string; avatar: string; group: { id: string; name: string } | null
  } | null
}

const ROLE_LABELS: Record<string, string> = {
  NORMAL_USER: 'Participant', GROUP_ADMIN: 'Group Admin', ADMIN: 'Site Admin',
}
const AVATARS = ['🌊', '🌱', '🌟', '🦉', '🌻', '🐿️', '☀️', '🌙', '🍀', '🌈', '🐬', '🦋']

const field =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-calm'
const labelCls = 'block text-sm font-medium text-ink-2'

export default function Profile() {
  const { data, loading, refetch } = useQuery<Data>(PROFILE, { fetchPolicy: 'cache-and-network' })
  const [updateAvatar] = useMutation(UPDATE_AVATAR)
  const me = data?.me

  async function pickAvatar(a: string) {
    await updateAvatar({ variables: { avatar: a } })
    await refetch()
  }

  if (loading && !data) return <div className="mx-auto max-w-2xl px-5 py-16 text-ink-2">Loading…</div>
  if (!me) return <div className="mx-auto max-w-2xl px-5 py-16 text-brand-strong">Please sign in.</div>

  const shownAvatar = me.avatar && me.avatar !== 'default' ? me.avatar : me.username.charAt(0).toUpperCase()

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-3xl font-semibold text-ink">Your account</h1>

      {/* Account details */}
      <div className="mt-8 flex items-center gap-5 rounded-2xl border border-border bg-surface p-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-calm-soft text-3xl">
          {shownAvatar}
        </div>
        <div className="min-w-0">
          <p className="text-xl font-semibold text-ink">{me.username}</p>
          <p className="truncate text-sm text-ink-2">{me.email}</p>
          <p className="mt-1 text-xs text-muted">
            {ROLE_LABELS[me.role] ?? me.role} · Survey ID {me.surveyUsername}
          </p>
        </div>
      </div>

      {/* Group membership */}
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-surface p-5">
        <div>
          <p className="text-sm text-muted">Group</p>
          <p className="font-medium text-ink">{me.group ? me.group.name : 'Not in a group'}</p>
        </div>
        <Link to="/groups" className="text-sm font-semibold text-calm-deep hover:underline">
          {me.group ? 'Manage' : 'Join a group'}
        </Link>
      </div>

      {/* Avatar picker */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Avatar</h2>
        <p className="mt-1 text-sm text-muted">Pick an icon for your profile.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button key={a} onClick={() => pickAvatar(a)}
              className={`flex h-11 w-11 items-center justify-center rounded-full border text-xl transition ${
                me.avatar === a ? 'border-calm bg-calm-soft' : 'border-border bg-surface hover:border-calm'}`}>
              {a}
            </button>
          ))}
        </div>
      </section>

      {/* Change password */}
      <ChangePassword />
    </div>
  )
}

function ChangePassword() {
  const [changePassword] = useMutation(CHANGE_PASSWORD)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(''); setOk('')
    if (next !== confirm) { setError('The new passwords do not match.'); return }
    setBusy(true)
    try {
      await changePassword({ variables: { currentPassword: current, newPassword: next } })
      setOk('Your password has been changed.')
      setCurrent(''); setNext(''); setConfirm('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change your password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold text-ink">Change password</h2>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div>
          <label className={labelCls} htmlFor="current">Current password</label>
          <input id="current" type={show ? 'text' : 'password'} required autoComplete="current-password"
            className={`mt-1 ${field}`} value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
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
          <label className={labelCls} htmlFor="confirmpw">Confirm new password</label>
          <input id="confirmpw" type={show ? 'text' : 'password'} required autoComplete="new-password"
            className={`mt-1 ${field}`} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>

        {error && <p className="rounded-lg bg-calm-soft px-3 py-2 text-sm text-brand-strong">{error}</p>}
        {ok && <p className="rounded-lg bg-calm-soft px-3 py-2 text-sm text-calm-deep">{ok}</p>}

        <button type="submit" disabled={busy}
          className="rounded-xl bg-calm-deep px-6 py-2.5 font-semibold text-white transition hover:bg-calm disabled:opacity-60">
          {busy ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </section>
  )
}
