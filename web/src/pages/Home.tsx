import { Link } from 'react-router-dom'
import { HeroArt, IconSurvey, IconShield, IconInsight } from '../components/Illustrations'

const features = [
  { icon: <IconSurvey />, title: '14 short questions', body: 'A validated questionnaire on a simple 1–5 scale. It takes only a few minutes.' },
  { icon: <IconShield />, title: 'Confidential', body: 'Your individual answers are private — others only ever see anonymised, aggregated results.' },
  { icon: <IconInsight />, title: 'See your progress', body: 'Track your well-being score over time, and revisit whenever you like.' },
]

const steps = [
  { n: '1', title: 'Create an account', body: 'Sign up in seconds — you’re given an anonymous participant ID.' },
  { n: '2', title: 'Take the survey', body: 'Answer the 14 statements about how you’ve been feeling.' },
  { n: '3', title: 'View your results', body: 'Get your score and watch it change each time you take part.' },
]

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-5">
      {/* Hero */}
      <section className="grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
        <div className="fade-up">
          <p className="text-sm font-semibold uppercase tracking-widest text-calm-deep">
            South Wales Social Well-being Scale
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-ink sm:text-5xl">
            Well-being today for a stronger tomorrow
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-2">
            A short, validated questionnaire that helps you and your community reflect on social
            well-being — confidential, quick, and research-backed.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/survey"
              className="rounded-xl bg-calm-deep px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-calm">
              Take the survey
            </Link>
            <Link to="/about"
              className="rounded-xl border border-border bg-surface px-6 py-3 font-semibold text-ink transition hover:border-calm">
              Learn more
            </Link>
          </div>
        </div>
        <div className="order-first md:order-last fade-up-1 floaty">
          <HeroArt />
        </div>
      </section>

      {/* Features */}
      <section className="pb-8">
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="lift rounded-2xl border border-border bg-surface p-6 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-calm-soft text-calm-deep">
                {f.icon}
              </div>
              <h3 className="mt-4 font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm text-ink-2">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-14">
        <h2 className="text-center text-2xl font-semibold text-ink">How it works</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="lift relative rounded-2xl border border-border bg-surface p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-calm-deep text-sm font-semibold text-white">
                {s.n}
              </span>
              <h3 className="mt-4 font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm text-ink-2">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing band */}
      <section className="mb-16 overflow-hidden rounded-3xl border border-border bg-surface-2 px-6 py-12 text-center">
        <h2 className="text-2xl font-semibold text-ink">Ready to begin?</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-2">
          Take a few minutes to reflect on your social well-being. Your answers stay confidential.
        </p>
        <Link to="/survey"
          className="mt-6 inline-block rounded-xl bg-calm-deep px-6 py-3 font-semibold text-white transition hover:bg-calm">
          Take the survey
        </Link>
      </section>
    </div>
  )
}
