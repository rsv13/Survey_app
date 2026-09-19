import { AboutArt, IconShield, IconHeart, IconInsight } from '../components/Illustrations'

const factors = [
  { icon: <IconHeart />, title: 'Safe & inclusive interaction', body: 'Feeling safe, free from harassment, and able to connect with others.' },
  { icon: <IconInsight />, title: 'Learning, helping, feeling useful', body: 'Doing worthwhile activities, helping others, and being taken seriously.' },
  { icon: <IconShield />, title: 'Security & worthwhile activities', body: 'Security, meaningful activity, and time with family and friends.' },
]

export default function About() {
  return (
    <div className="mx-auto max-w-5xl px-5">
      {/* Intro */}
      <section className="grid items-center gap-10 py-16 md:grid-cols-2">
        <div className="fade-up">
          <p className="text-sm font-semibold uppercase tracking-widest text-calm-deep">About the scale</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-ink">A simple measure of social well-being</h1>
          <p className="mt-5 text-lg text-ink-2">
            The South Wales Social Well-being Scale (SWSWBS) is a 14-item questionnaire. Each item is answered
            on a five-point scale, giving a total score between 14 and 70 — a higher score reflects greater
            social well-being.
          </p>
        </div>
        <div className="fade-up-1 floaty md:order-last"><AboutArt /></div>
      </section>

      {/* The three factors */}
      <section className="pb-6">
        <h2 className="text-2xl font-semibold text-ink">What it measures</h2>
        <p className="mt-2 max-w-2xl text-ink-2">The scale captures three validated factors of social well-being.</p>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {factors.map((f, i) => (
            <div key={f.title} className={`lift rounded-2xl border border-border bg-surface p-6 shadow-sm fade-up-${i + 1}`}>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-calm-soft text-calm-deep">{f.icon}</div>
              <h3 className="mt-4 font-semibold text-ink">{f.title}</h3>
              <p className="mt-2 text-sm text-ink-2">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Provenance + confidentiality */}
      <section className="grid gap-4 pb-20 pt-8 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h3 className="font-semibold text-ink">Developed through research</h3>
          <p className="mt-2 text-sm text-ink-2">
            The scale was developed by the Wales School for Social Prescribing Research (WSSPR) and partners.
            This application follows the published SWSWBS User Guide (version 2) for scoring and reporting.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h3 className="font-semibold text-ink">Confidential by design</h3>
          <p className="mt-2 text-sm text-ink-2">
            Your individual responses are private. Where results are shared with researchers or group leads,
            they are aggregated and pseudonymised so that individuals cannot be identified.
          </p>
        </div>
      </section>
    </div>
  )
}
