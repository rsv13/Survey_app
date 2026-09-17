import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-[var(--calm-deep)]">
        South Wales Social Well-being Scale
      </p>
      <h1 className="mt-4 text-4xl font-semibold leading-tight text-[var(--ink)] sm:text-5xl">
        Well-being today for a stronger tomorrow
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-[var(--ink-2)]">
        A short, validated questionnaire that helps you and your community reflect
        on social well-being. It takes just a few minutes, and your answers stay
        confidential.
      </p>
      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          to="/survey"
          className="rounded-xl bg-[var(--calm-deep)] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[var(--calm)]"
        >
          Take the survey
        </Link>
        <Link
          to="/about"
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-3 font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-2)]"
        >
          Learn more
        </Link>
      </div>

      <div className="mt-16 grid gap-6 sm:grid-cols-3">
        {[
          { t: '14 questions', d: 'Answer on a simple 1–5 scale. Under five minutes.' },
          { t: 'Confidential', d: 'Individual answers are never shown to anyone but you.' },
          { t: 'Research-backed', d: 'Built on the published SWSWBS User Guide (v2).' },
        ].map((c) => (
          <div
            key={c.t}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
          >
            <h3 className="font-semibold text-[var(--ink)]">{c.t}</h3>
            <p className="mt-2 text-sm text-[var(--ink-2)]">{c.d}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
