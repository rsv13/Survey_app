import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client/react'
import { SURVEY_DEFINITION, SURVEY_ELIGIBILITY, SUBMIT_SURVEY } from '../graphql-survey'

// ---- Types describing what the queries return ----
type Option = { id: string; label: string; order: number }
type Question = { id: string; order: number; text: string; factor: number | null }
type DefinitionData = {
  surveyDefinition: { questions: Question[]; sectors: Option[]; educationLevels: Option[] }
}
type EligibilityData = {
  surveyEligibility: { canSubmit: boolean; nextEligibleAt: string | null; cooldownDays: number }
}
type Subscale = { factor: number; name: string; score: number }
type SubmitData = {
  submitSurvey: { id: string; totalScore: number; createdAt: string; subscaleScores: Subscale[] }
}

// ---- The 1–5 answer scale (labels shown to the user, enum values sent to the API) ----
const SCALE = [
  { value: 'NONE_OF_THE_TIME', label: 'None of the time' },
  { value: 'RARELY', label: 'Rarely' },
  { value: 'SOME_OF_THE_TIME', label: 'Some of the time' },
  { value: 'OFTEN', label: 'Often' },
  { value: 'ALL_OF_THE_TIME', label: 'All of the time' },
] as const

// Demographic dropdown choices (labels for display, enum values for the API).
const GENDERS: [string, string][] = [
  ['MALE', 'Male'], ['FEMALE', 'Female'], ['OTHERS', 'Other'], ['PREFER_NOT_TO_SAY', 'Prefer not to say'],
]
const AGE_GROUPS: [string, string][] = [
  ['AGE_16_24', '16–24'], ['AGE_25_34', '25–34'], ['AGE_35_44', '35–44'],
  ['AGE_45_54', '45–54'], ['AGE_55_64', '55–64'], ['AGE_65_PLUS', '65+'],
]

const MIN_ANSWERS = 12
const field =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-calm'
const labelCls = 'block text-sm font-medium text-ink-2'

type Phase = 'intro' | 'demographics' | 'questions' | 'review' | 'done'

export default function Survey() {
  const navigate = useNavigate()
  const def = useQuery<DefinitionData>(SURVEY_DEFINITION)
  const elig = useQuery<EligibilityData>(SURVEY_ELIGIBILITY)
  const [submitSurvey] = useMutation<SubmitData>(SUBMIT_SURVEY)

  const [phase, setPhase] = useState<Phase>('intro')
  const [qIndex, setQIndex] = useState(0)
  const [consent, setConsent] = useState(false)
  const [demo, setDemo] = useState({
    gender: '', ageGroup: '', sectorId: '', educationId: '',
    designation: '', country: '', state: '', city: '',
  })
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<SubmitData['submitSurvey'] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Questions sorted by their intended order.
  const questions = useMemo(
    () => [...(def.data?.surveyDefinition.questions ?? [])].sort((a, b) => a.order - b.order),
    [def.data],
  )
  const answeredCount = Object.keys(answers).length
  const demoComplete =
    demo.gender && demo.ageGroup && demo.sectorId && demo.educationId &&
    demo.designation.trim() && demo.country.trim() && demo.state.trim() && demo.city.trim()

  // ---- Loading / error guards ----
  if (def.loading || elig.loading) {
    return <div className="mx-auto max-w-2xl px-5 py-16 text-ink-2">Loading the survey…</div>
  }
  if (def.error || elig.error) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-brand-strong">
        Couldn’t load the survey. Please make sure you’re signed in and try again.
      </div>
    )
  }

  // ---- Cooldown: already submitted recently ----
  if (elig.data && !elig.data.surveyEligibility.canSubmit && phase !== 'done') {
    const next = elig.data.surveyEligibility.nextEligibleAt
    const when = next ? new Date(next).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : null
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="text-3xl font-semibold text-ink">Thanks — you’re all set for now</h1>
        <p className="mt-4 text-ink-2">
          You’ve completed the survey recently. To keep results meaningful, it can be taken once every{' '}
          {elig.data.surveyEligibility.cooldownDays} days.
          {when && <> You can take it again on <strong>{when}</strong>.</>}
        </p>
        <button onClick={() => navigate('/results')}
          className="mt-8 rounded-xl bg-calm-deep px-6 py-3 font-semibold text-white transition hover:bg-calm">
          View my results
        </button>
      </div>
    )
  }

  // ---- Submit ----
  async function onSubmit() {
    setError('')
    if (answeredCount < MIN_ANSWERS) {
      setError(`Please answer at least ${MIN_ANSWERS} of the ${questions.length} questions.`)
      return
    }
    setBusy(true)
    try {
      const input = {
        gender: demo.gender, ageGroup: demo.ageGroup,
        sectorId: demo.sectorId, educationId: demo.educationId,
        designation: demo.designation.trim(), country: demo.country.trim(),
        state: demo.state.trim(), city: demo.city.trim(), consent,
        // Only send questions that were actually answered.
        answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
      }
      const { data } = await submitSurvey({ variables: { input } })
      if (data?.submitSurvey) {
        setResult(data.submitSurvey)
        setPhase('done')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong submitting the survey.')
    } finally {
      setBusy(false)
    }
  }

  // ================= PHASES =================

  // Intro + consent
  if (phase === 'intro') {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="text-3xl font-semibold text-ink">The well-being survey</h1>
        <p className="mt-4 text-ink-2">
          This is the South Wales Social Well-being Scale — {questions.length} short statements about how
          you’ve been feeling recently. There are no right or wrong answers, and it takes only a few minutes.
        </p>
        <div className="mt-6 rounded-2xl border border-border bg-surface p-5 text-sm text-ink-2">
          Your responses are confidential and used only for research and to support well-being. Taking part
          is voluntary and you can stop at any time.
        </div>
        <label className="mt-6 flex items-start gap-3 text-ink">
          <input type="checkbox" className="mt-1" checked={consent}
            onChange={(e) => setConsent(e.target.checked)} />
          <span>I understand and agree to take part.</span>
        </label>
        <button disabled={!consent} onClick={() => setPhase('demographics')}
          className="mt-8 rounded-xl bg-calm-deep px-6 py-3 font-semibold text-white transition hover:bg-calm disabled:opacity-60">
          Begin
        </button>
      </div>
    )
  }

  // Demographics
  if (phase === 'demographics') {
    const sectors = [...(def.data?.surveyDefinition.sectors ?? [])].sort((a, b) => a.order - b.order)
    const educations = [...(def.data?.surveyDefinition.educationLevels ?? [])].sort((a, b) => a.order - b.order)
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="text-3xl font-semibold text-ink">About you</h1>
        <p className="mt-2 text-ink-2">A few details help us understand the results. All fields are required.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="gender">Gender</label>
            <select id="gender" className={`mt-1 ${field}`} value={demo.gender}
              onChange={(e) => setDemo({ ...demo, gender: e.target.value })}>
              <option value="">Select…</option>
              {GENDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="age">Age group</label>
            <select id="age" className={`mt-1 ${field}`} value={demo.ageGroup}
              onChange={(e) => setDemo({ ...demo, ageGroup: e.target.value })}>
              <option value="">Select…</option>
              {AGE_GROUPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="sector">Sector</label>
            <select id="sector" className={`mt-1 ${field}`} value={demo.sectorId}
              onChange={(e) => setDemo({ ...demo, sectorId: e.target.value })}>
              <option value="">Select…</option>
              {sectors.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="education">Education</label>
            <select id="education" className={`mt-1 ${field}`} value={demo.educationId}
              onChange={(e) => setDemo({ ...demo, educationId: e.target.value })}>
              <option value="">Select…</option>
              {educations.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="designation">Job title / role</label>
            <input id="designation" className={`mt-1 ${field}`} value={demo.designation}
              onChange={(e) => setDemo({ ...demo, designation: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="country">Country</label>
            <input id="country" className={`mt-1 ${field}`} value={demo.country}
              onChange={(e) => setDemo({ ...demo, country: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="state">County / state</label>
            <input id="state" className={`mt-1 ${field}`} value={demo.state}
              onChange={(e) => setDemo({ ...demo, state: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="city">Town / city</label>
            <input id="city" className={`mt-1 ${field}`} value={demo.city}
              onChange={(e) => setDemo({ ...demo, city: e.target.value })} />
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          <button onClick={() => setPhase('intro')}
            className="rounded-xl border border-border px-5 py-2.5 font-semibold text-ink hover:border-calm">Back</button>
          <button disabled={!demoComplete} onClick={() => { setQIndex(0); setPhase('questions') }}
            className="rounded-xl bg-calm-deep px-6 py-2.5 font-semibold text-white transition hover:bg-calm disabled:opacity-60">
            Continue
          </button>
        </div>
      </div>
    )
  }

  // Questions — one at a time
  if (phase === 'questions') {
    const q = questions[qIndex]
    const isLast = qIndex === questions.length - 1
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        {/* Progress */}
        <div className="flex items-center justify-between text-sm text-muted">
          <span>Question {qIndex + 1} of {questions.length}</span>
          <span>{answeredCount} answered</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-calm transition-all"
            style={{ width: `${((qIndex + 1) / questions.length) * 100}%` }} />
        </div>

        <h2 className="mt-8 text-xl font-semibold text-ink">{q.text}</h2>
        <p className="mt-1 text-sm text-muted">Over the last two weeks…</p>

        <div className="mt-5 space-y-2">
          {SCALE.map((opt) => {
            const selected = answers[q.id] === opt.value
            return (
              <button key={opt.value} type="button"
                onClick={() => setAnswers({ ...answers, [q.id]: opt.value })}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                  selected ? 'border-calm bg-calm-soft font-semibold text-ink'
                           : 'border-border bg-surface text-ink-2 hover:border-calm'}`}>
                {opt.label}
              </button>
            )
          })}
        </div>

        <div className="mt-8 flex justify-between">
          <button
            onClick={() => (qIndex === 0 ? setPhase('demographics') : setQIndex(qIndex - 1))}
            className="rounded-xl border border-border px-5 py-2.5 font-semibold text-ink hover:border-calm">Back</button>
          <button
            onClick={() => (isLast ? setPhase('review') : setQIndex(qIndex + 1))}
            className="rounded-xl bg-calm-deep px-6 py-2.5 font-semibold text-white transition hover:bg-calm">
            {isLast ? 'Review' : 'Next'}
          </button>
        </div>
        <p className="mt-4 text-xs text-muted">
          You can skip a question, but please answer at least {MIN_ANSWERS} of {questions.length}.
        </p>
      </div>
    )
  }

  // Review + submit
  if (phase === 'review') {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="text-3xl font-semibold text-ink">Review &amp; submit</h1>
        <p className="mt-4 text-ink-2">
          You’ve answered <strong>{answeredCount}</strong> of {questions.length} questions.
          {answeredCount < MIN_ANSWERS && (
            <> You need at least {MIN_ANSWERS} to submit — use Back to answer a few more.</>
          )}
        </p>

        <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface">
          {questions.map((q, i) => {
            const val = answers[q.id]
            const label = SCALE.find((s) => s.value === val)?.label
            return (
              <li key={q.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm text-ink-2">{i + 1}. {q.text}</span>
                <span className={`shrink-0 text-sm font-medium ${label ? 'text-calm-deep' : 'text-muted'}`}>
                  {label ?? 'Skipped'}
                </span>
              </li>
            )
          })}
        </ul>

        {error && <p className="mt-6 rounded-lg bg-calm-soft px-3 py-2 text-sm text-brand-strong">{error}</p>}

        <div className="mt-8 flex justify-between">
          <button onClick={() => { setQIndex(questions.length - 1); setPhase('questions') }}
            className="rounded-xl border border-border px-5 py-2.5 font-semibold text-ink hover:border-calm">Back</button>
          <button disabled={busy || answeredCount < MIN_ANSWERS} onClick={onSubmit}
            className="rounded-xl bg-calm-deep px-6 py-2.5 font-semibold text-white transition hover:bg-calm disabled:opacity-60">
            {busy ? 'Submitting…' : 'Submit survey'}
          </button>
        </div>
      </div>
    )
  }

  // Done — show the score
  if (phase === 'done' && result) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-3xl font-semibold text-ink">Thank you</h1>
        <p className="mt-3 text-ink-2">Your responses have been recorded.</p>

        <div className="mt-8 inline-flex flex-col items-center rounded-2xl border border-border bg-surface px-10 py-8 shadow-sm">
          <span className="text-sm font-medium uppercase tracking-widest text-muted">Your total score</span>
          <span className="mt-1 text-5xl font-semibold text-calm-deep">{result.totalScore}</span>
          <span className="text-sm text-muted">out of 70</span>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {result.subscaleScores.map((s) => (
            <div key={s.factor} className="rounded-xl border border-border bg-surface px-4 py-3 text-left">
              <div className="text-xs text-muted">{s.name}</div>
              <div className="text-lg font-semibold text-ink">{s.score}</div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <button onClick={() => navigate('/results')}
            className="rounded-xl bg-calm-deep px-6 py-3 font-semibold text-white transition hover:bg-calm">
            See my results over time
          </button>
        </div>
      </div>
    )
  }

  return null
}
