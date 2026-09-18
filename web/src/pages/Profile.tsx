import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client/react'
import { PROFILE, CHANGE_PASSWORD, UPDATE_AVATAR } from '../graphql-profile'
import { SURVEY_ELIGIBILITY } from '../graphql-survey'
import { MY_NOTES, ADD_NOTE, DELETE_NOTE } from '../graphql-notes'

type Data = {
  me: {
    id: string; username: string; email: string; role: string; emailVerified: boolean
    surveyUsername: string; avatar: string; group: { id: string; name: string } | null
  } | null
}
type EligData = {
  surveyEligibility: { canSubmit: boolean; nextEligibleAt: string | null; cooldownDays: number; lastSubmittedAt: string | null }
}
type Note = { id: string; content: string; createdAt: string }
type NotesData = { myNotes: Note[] }

const ROLE_LABELS: Record<string, string> = {
  NORMAL_USER: 'Participant', GROUP_ADMIN: 'Group Admin', ADMIN: 'Site Admin',
}
const AVATARS = ['🌊', '🌱', '🌟', '🦉', '🌻', '🐿️', '☀️', '🌙', '🍀', '🌈', '🐬', '🦋']

const field =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-calm'
const labelCls = 'block text-sm font-medium text-ink-2'

function parseDate(v: string) {
  const n = Number(v)
  return new Date(Number.isNaN(n) ? v : n)
}
const fmt = (v: string) =>
  parseDate(v).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })

export default function Profile() {
  const { data, loading, refetch } = useQuery<Data>(PROFILE, { fetchPolicy: 'cache-and-network' })
  const [updateAvatar] = useMutation(UPDATE_AVATAR)
  const [editingAvatar, setEditingAvatar] = useState(false)
  const me = data?.me

  async function pickAvatar(a: string) {
    await updateAvatar({ variables: { avatar: a } })
    await refetch()
    setEditingAvatar(false)
  }

  if (loading && !data) return <div className="mx-auto max-w-2xl px-5 py-16 text-ink-2">Loading…</div>
  if (!me) return <div className="mx-auto max-w-2xl px-5 py-16 text-brand-strong">Please sign in.</div>

  const custom = me.avatar && me.avatar !== 'default'
  const shownAvatar = custom ? me.avatar : me.username.charAt(0).toUpperCase()

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-3xl font-semibold text-ink">Your account</h1>

      {/* Identity card — click the avatar to change it */}
      <div className="mt-8 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-5">
          <button
            onClick={() => setEditingAvatar((v) => !v)}
            title="Change your icon"
            className="group relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-calm-soft text-3xl transition hover:ring-2 hover:ring-calm">
            {shownAvatar}
            <span className="absolute -bottom-1 -right-1 rounded-full border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-calm-deep">
              Edit
            </span>
          </button>
          <div className="min-w-0">
            <p className="text-xl font-semibold text-ink">{me.username}</p>
            <p className="truncate text-sm text-ink-2">{me.email}</p>
            <p className="mt-1 text-xs text-muted">
              {ROLE_LABELS[me.role] ?? me.role} · Survey ID {me.surveyUsername}
            </p>
          </div>
        </div>

        {editingAvatar && (
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-sm text-muted">Choose an icon</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {AVATARS.map((a) => (
                <button key={a} onClick={() => pickAvatar(a)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border text-xl transition ${
                    me.avatar === a ? 'border-calm bg-calm-soft' : 'border-border bg-surface hover:border-calm'}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Group */}
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-surface p-5">
        <div>
          <p className="text-sm text-muted">Group</p>
          <p className="font-medium text-ink">{me.group ? me.group.name : 'Not in a group'}</p>
        </div>
        <Link to="/groups" className="text-sm font-semibold text-calm-deep hover:underline">
          {me.group ? 'Manage' : 'Join a group'}
        </Link>
      </div>

      <SurveyActivity />
      <Notes />
      <Security />
    </div>
  )
}

// ---- Survey activity: last taken / next available ----
function SurveyActivity() {
  const { data } = useQuery<EligData>(SURVEY_ELIGIBILITY, { fetchPolicy: 'cache-and-network' })
  const e = data?.surveyEligibility
  return (
    <section className="mt-4 rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold text-ink">Survey activity</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-surface-2 px-4 py-3">
          <p className="text-xs text-muted">Last taken</p>
          <p className="font-medium text-ink">
            {e?.lastSubmittedAt ? fmt(e.lastSubmittedAt) : 'Not taken yet'}
          </p>
        </div>
        <div className="rounded-xl bg-surface-2 px-4 py-3">
          <p className="text-xs text-muted">Next available</p>
          <p className="font-medium text-ink">
            {e?.canSubmit ? 'Available now' : e?.nextEligibleAt ? fmt(e.nextEligibleAt) : '—'}
          </p>
        </div>
      </div>
      {e?.canSubmit && (
        <Link to="/survey"
          className="mt-4 inline-block rounded-xl bg-calm-deep px-5 py-2.5 font-semibold text-white transition hover:bg-calm">
          Take the survey
        </Link>
      )}
    </section>
  )
}

// ---- Personal notes / reminders ----
function Notes() {
  const { data, loading, refetch } = useQuery<NotesData>(MY_NOTES, { fetchPolicy: 'cache-and-network' })
  const [addNote] = useMutation(ADD_NOTE)
  const [deleteNote] = useMutation(DELETE_NOTE)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  async function onAdd(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    try {
      await addNote({ variables: { content: text.trim() } })
      setText('')
      await refetch()
    } finally {
      setBusy(false)
    }
  }
  async function onDelete(id: string) {
    await deleteNote({ variables: { id } })
    await refetch()
  }

  const notes = data?.myNotes ?? []

  return (
    <section className="mt-4 rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold text-ink">Notes &amp; reminders</h2>
      <p className="mt-1 text-sm text-muted">
        Private to you — jot down anything you’d like to remember or raise later.
      </p>

      <form onSubmit={onAdd} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <textarea rows={2} className={`${field} sm:flex-1`} placeholder="Write a note…"
          value={text} onChange={(ev) => setText(ev.target.value)} />
        <button type="submit" disabled={busy || !text.trim()}
          className="rounded-xl bg-calm-deep px-5 py-2.5 font-semibold text-white transition hover:bg-calm disabled:opacity-60 sm:self-start">
          Add
        </button>
      </form>

      {loading && notes.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No notes yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3">
              <div className="min-w-0">
                <p className="whitespace-pre-wrap break-words text-sm text-ink">{n.content}</p>
                <p className="mt-1 text-xs text-muted">{fmt(n.createdAt)}</p>
              </div>
              <button onClick={() => onDelete(n.id)}
                className="shrink-0 text-sm font-semibold text-brand-strong hover:underline">Delete</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ---- Security: change password (collapsed by default) ----
function Security() {
  const [open, setOpen] = useState(false)
  return (
    <section className="mt-4 rounded-2xl border border-border bg-surface p-5">
      <button onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left">
        <span className="text-lg font-semibold text-ink">Security</span>
        <span className="text-sm font-semibold text-calm-deep">{open ? 'Close' : 'Change password'}</span>
      </button>
      {open && <ChangePassword />}
    </section>
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
    <form onSubmit={onSubmit} className="mt-4 space-y-3 border-t border-border pt-4">
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
  )
}
