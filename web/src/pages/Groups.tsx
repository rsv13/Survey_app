import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client/react'
import { useAuth } from '../auth-context'
import { downloadResponsesCsv } from '../exportCsv'
import {
  MY_GROUPS, MEMBERSHIP, CREATE_GROUP, JOIN_GROUP, LEAVE_GROUP,
  REMOVE_MEMBER, ADD_GROUP_ADMIN, GRANT_GROUP_ADMIN,
} from '../graphql-groups'

// ---- Types ----
type Member = { id: string; surveyUsername: string; role: string }
type Group = {
  id: string; name: string; description: string; inviteCode: string
  memberCount: number; createdAt: string; members: Member[]
}
type MyGroupsData = { myGroups: Group[] }
type MembershipData = {
  me: { id: string; role: string; group: { id: string; name: string; inviteCode: string } | null } | null
}

const field =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-calm'
const btnPrimary =
  'rounded-xl bg-calm-deep px-5 py-2.5 font-semibold text-white transition hover:bg-calm disabled:opacity-60'
const btnGhost =
  'rounded-xl border border-border px-4 py-2 text-sm font-semibold text-ink hover:border-calm'
const errText = 'rounded-lg bg-calm-soft px-3 py-2 text-sm text-brand-strong'

export default function Groups() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'GROUP_ADMIN'
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-3xl font-semibold text-ink">Groups</h1>
      {isAdmin ? <AdminView isSiteAdmin={user?.role === 'ADMIN'} /> : <MemberView />}
    </div>
  )
}

// ---------------- Normal user: join / leave a group ----------------
function MemberView() {
  const navigate = useNavigate()
  const { data, loading, refetch } = useQuery<MembershipData>(MEMBERSHIP, { fetchPolicy: 'cache-and-network' })
  const [joinGroup] = useMutation(JOIN_GROUP)
  const [leaveGroup] = useMutation(LEAVE_GROUP)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmingLeave, setConfirmingLeave] = useState(false)

  const group = data?.me?.group ?? null

  async function onJoin(e: FormEvent) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      await joinGroup({ variables: { inviteCode: code.trim() } })
      setCode('')
      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join that group.')
    } finally {
      setBusy(false)
    }
  }

  async function onLeave() {
    setError(''); setBusy(true)
    try {
      await leaveGroup()
      setConfirmingLeave(false)
      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not leave the group.')
    } finally {
      setBusy(false)
    }
  }

  if (loading && !data) return <p className="mt-6 text-ink-2">Loading…</p>

  return (
    <div className="mt-6">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm font-semibold text-calm-deep hover:underline">
        ← Back
      </button>
      {group ? (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">You’re a member of</p>
          <p className="text-xl font-semibold text-ink">{group.name}</p>
          <p className="mt-2 text-sm text-ink-2">
            Your responses are shared (pseudonymously) with this group’s researchers.
          </p>
          {!confirmingLeave ? (
            <button onClick={() => setConfirmingLeave(true)} disabled={busy} className={`mt-4 ${btnGhost}`}>Leave group</button>
          ) : (
            <div className="mt-4 rounded-xl border border-border bg-surface-2 p-4">
              <p className="text-sm text-ink">Leave <strong>{group.name}</strong>?</p>
              <p className="mt-1 text-xs text-muted">
                Your account and your survey results stay with you — leaving only unlinks you from this
                group. You can rejoin any time with the invite code.
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={onLeave} disabled={busy}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60">
                  {busy ? 'Leaving…' : 'Yes, leave group'}
                </button>
                <button onClick={() => setConfirmingLeave(false)} disabled={busy} className={btnGhost}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={onJoin} className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-ink-2">Have an invite code from a researcher? Enter it to join their group.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input className={field} placeholder="Invite code" value={code}
              onChange={(e) => setCode(e.target.value)} />
            <button type="submit" disabled={busy || !code.trim()} className={btnPrimary}>Join</button>
          </div>
        </form>
      )}
      {error && <p className={`mt-4 ${errText}`}>{error}</p>}
    </div>
  )
}

// ---------------- Group admin / site admin: manage groups ----------------
function AdminView({ isSiteAdmin }: { isSiteAdmin: boolean }) {
  const { data, loading, refetch } = useQuery<MyGroupsData>(MY_GROUPS, { fetchPolicy: 'cache-and-network' })
  const [createGroup] = useMutation(CREATE_GROUP)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      await createGroup({ variables: { input: { name: name.trim(), description: description.trim() } } })
      setName(''); setDescription('')
      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the group.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-6 space-y-8">
      {isSiteAdmin && <GrantAdminPanel />}

      {/* Create a group */}
      <form onSubmit={onCreate} className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold text-ink">Create a group</h2>
        <div className="mt-4 space-y-3">
          <input className={field} placeholder="Group name" value={name}
            onChange={(e) => setName(e.target.value)} />
          <input className={field} placeholder="Short description" value={description}
            onChange={(e) => setDescription(e.target.value)} />
          <button type="submit" disabled={busy || !name.trim() || !description.trim()} className={btnPrimary}>
            Create group
          </button>
        </div>
        {error && <p className={`mt-4 ${errText}`}>{error}</p>}
      </form>

      {/* Existing groups */}
      {loading && !data ? (
        <p className="text-ink-2">Loading your groups…</p>
      ) : (data?.myGroups.length ?? 0) === 0 ? (
        <p className="text-ink-2">You don’t have any groups yet. Create one above.</p>
      ) : (
        data!.myGroups.map((g) => <GroupCard key={g.id} group={g} onChange={refetch} />)
      )}
    </div>
  )
}

// A single group: invite code, members, add co-admin.
function GroupCard({ group, onChange }: { group: Group; onChange: () => void }) {
  const [removeMember] = useMutation(REMOVE_MEMBER)
  const [addAdmin] = useMutation(ADD_GROUP_ADMIN)
  const [copied, setCopied] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [msg, setMsg] = useState('')

  async function copyCode() {
    try { await navigator.clipboard.writeText(group.inviteCode); setCopied(true); setTimeout(() => setCopied(false), 1200) } catch { /* ignore */ }
  }
  async function onRemove(userId: string) {
    setMsg('')
    try { await removeMember({ variables: { userId } }); onChange() }
    catch (err) { setMsg(err instanceof Error ? err.message : 'Could not remove member.') }
  }
  async function onAddAdmin(e: FormEvent) {
    e.preventDefault(); setMsg('')
    try {
      await addAdmin({ variables: { input: { email: adminEmail.trim(), groupId: group.id } } })
      setAdminEmail(''); setMsg('Co-admin added.'); onChange()
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Could not add co-admin.') }
  }

  const participants = group.members.filter((m) => m.role === 'NORMAL_USER')

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink">{group.name}</h3>
          <p className="text-sm text-ink-2">{group.description}</p>
        </div>
        <span className="rounded-full bg-surface-2 px-3 py-1 text-sm text-ink-2">{group.memberCount} members</span>
      </div>

      {/* Invite code */}
      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-muted">Invite code</span>
        <code className="rounded-lg bg-surface-2 px-3 py-1 font-mono text-sm text-ink">{group.inviteCode}</code>
        <button onClick={copyCode} className={btnGhost}>{copied ? 'Copied ✓' : 'Copy'}</button>
      </div>

      {/* Members */}
      <div className="mt-5">
        <p className="text-sm font-medium text-ink-2">Participants</p>
        {participants.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No participants have joined yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border">
            {participants.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-2">
                <span className="font-mono text-sm text-ink">{m.surveyUsername}</span>
                <span className="flex items-center gap-4">
                  <button
                    onClick={() => downloadResponsesCsv({ userId: m.id, filename: `swswbs-${m.surveyUsername}.csv` })}
                    className="text-sm font-semibold text-calm-deep hover:underline">
                    Download
                  </button>
                  <button onClick={() => onRemove(m.id)} className="text-sm font-semibold text-brand-strong hover:underline">
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add co-admin */}
      <form onSubmit={onAddAdmin} className="mt-5 flex flex-col gap-2 sm:flex-row">
        <input className={field} placeholder="Co-admin email (must already be a group admin)"
          value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
        <button type="submit" disabled={!adminEmail.trim()} className={btnGhost}>Add co-admin</button>
      </form>

      {msg && <p className="mt-3 text-sm text-ink-2">{msg}</p>}
    </div>
  )
}

// Site-admin only: promote a normal user to Group Admin.
function GrantAdminPanel() {
  const [grant] = useMutation(GRANT_GROUP_ADMIN)
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function onGrant(e: FormEvent) {
    e.preventDefault(); setMsg(''); setBusy(true)
    try {
      await grant({ variables: { email: email.trim() } })
      setMsg(`${email.trim()} is now a Group Admin.`); setEmail('')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not grant the role.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onGrant} className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold text-ink">Grant Group Admin role</h2>
      <p className="mt-1 text-sm text-ink-2">
        Promote an existing (verified) user to Group Admin so they can create and manage groups.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input className={field} type="email" placeholder="User’s email" value={email}
          onChange={(e) => setEmail(e.target.value)} />
        <button type="submit" disabled={busy || !email.trim()} className={btnPrimary}>Grant role</button>
      </div>
      {msg && <p className="mt-3 text-sm text-ink-2">{msg}</p>}
    </form>
  )
}
