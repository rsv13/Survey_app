import { useEffect, useState } from 'react'
import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'

// The first real query: the survey definition (14 questions + option lists).
const SURVEY_DEFINITION = gql`
  query SurveyDefinition {
    surveyDefinition {
      questions { id order text }
      sectors { id label }
      educationLevels { id label }
    }
  }
`

type SurveyDef = {
  surveyDefinition: {
    questions: unknown[]
    sectors: unknown[]
    educationLevels: unknown[]
  }
}

function ApiStatus() {
  const { data, loading, error } = useQuery<SurveyDef>(SURVEY_DEFINITION)
  if (loading) return <p className="text-ink-2">Checking the API…</p>
  if (error) return <p className="text-brand">Couldn’t reach the API: {error.message}</p>
  const def = data?.surveyDefinition
  return (
    <p className="text-ink-2">
      Connected ✓ — <b className="text-ink">{def?.questions.length}</b> questions,{' '}
      <b className="text-ink">{def?.sectors.length}</b> sectors,{' '}
      <b className="text-ink">{def?.educationLevels.length}</b> education levels loaded.
    </p>
  )
}

function App() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null)
  useEffect(() => {
    const root = document.documentElement
    if (theme) root.setAttribute('data-theme', theme)
    else root.removeAttribute('data-theme')
  }, [theme])

  return (
    <div className="min-h-screen bg-plane text-ink">
      <header className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-calm-soft font-semibold text-calm-deep">
          SW
        </div>
        <div>
          <div className="font-semibold leading-none">SWSWBS</div>
          <div className="text-xs text-muted">South Wales Social Well-being Scale</div>
        </div>
        <button
          onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          className="ml-auto rounded-lg border border-border px-3 py-1.5 text-sm text-ink-2 hover:border-calm"
        >
          Toggle theme
        </button>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">Well-being today for a stronger tomorrow</h1>
          <p className="mt-3 text-ink-2">The frontend is wired up in the Ocean palette.</p>

          <div className="mt-6 rounded-xl border border-border bg-surface-2 p-4">
            <ApiStatus />
          </div>

          <button className="mt-6 rounded-xl bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-strong">
            Take the survey
          </button>
        </div>
      </main>
    </div>
  )
}

export default App