// Original, on-brand SVG artwork — abstract shapes in the Ocean palette that
// recolour automatically for light/dark via CSS theme tokens. Nothing here is
// third-party art.

// Hero: an abstract "growth + connection" composition (echoes the app's
// score-over-time line), with soft ripples and a single crimson accent.
export function HeroArt() {
  const pts = [
    [40, 300], [120, 250], [200, 268], [280, 182], [360, 120],
  ]
  return (
    <svg viewBox="0 0 440 360" width="100%" className="h-auto"
      role="img" aria-label="Abstract illustration of steady well-being growth and social connection">
      <defs>
        <linearGradient id="oceanPanel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--calm-soft)" />
          <stop offset="1" stopColor="var(--surface)" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="440" height="360" rx="28" fill="url(#oceanPanel)" />

      {/* soft focal glow */}
      <circle cx="330" cy="110" r="72" fill="var(--calm)" opacity="0.16" />
      <circle cx="330" cy="110" r="46" fill="var(--calm)" opacity="0.20" />

      {/* ripples of reach / community */}
      <g fill="none" stroke="var(--calm-deep)" strokeOpacity="0.22" strokeWidth="2">
        <circle cx="86" cy="304" r="42" />
        <circle cx="86" cy="304" r="72" />
        <circle cx="86" cy="304" r="102" />
      </g>

      {/* growth line */}
      <polyline points={pts.map((p) => p.join(',')).join(' ')}
        fill="none" stroke="var(--calm-deep)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="7" fill="var(--surface)" stroke="var(--calm-deep)" strokeWidth="3" />
      ))}
      {/* crimson accent on the latest point */}
      <circle cx="360" cy="120" r="8" fill="var(--brand)" />

      {/* floating dots */}
      <circle cx="150" cy="86" r="6" fill="var(--calm)" opacity="0.6" />
      <circle cx="212" cy="58" r="4" fill="var(--calm-deep)" opacity="0.5" />
      <circle cx="398" cy="250" r="5" fill="var(--calm)" opacity="0.5" />
    </svg>
  )
}

// --- Feature icons (24x24, drawn with currentColor so a wrapper sets the hue) ---
const base = {
  width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
}

export function IconSurvey() {
  return (
    <svg {...base}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1Z" />
      <path d="M8.5 11l1.5 1.5 2.5-2.5" />
      <path d="M15 11h1M8.5 15.5l1.5 1.5 2.5-2.5M15 16h1" />
    </svg>
  )
}
export function IconShield() {
  return (
    <svg {...base}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="M9.5 12l1.8 1.8 3.2-3.6" />
    </svg>
  )
}
export function IconInsight() {
  return (
    <svg {...base}>
      <path d="M4 19h16" />
      <path d="M6 16l4-4 3 2 5-6" />
      <circle cx="18" cy="8" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

// A calm abstract motif for the About page: overlapping "connection" circles.
export function AboutArt() {
  return (
    <svg viewBox="0 0 420 300" width="100%" className="h-auto"
      role="img" aria-label="Abstract illustration of connected people and community">
      <defs>
        <linearGradient id="aboutPanel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--calm-soft)" />
          <stop offset="1" stopColor="var(--surface)" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="420" height="300" rx="26" fill="url(#aboutPanel)" />
      {/* connection lines */}
      <g stroke="var(--calm-deep)" strokeOpacity="0.35" strokeWidth="2">
        <line x1="120" y1="150" x2="220" y2="95" />
        <line x1="220" y1="95" x2="315" y2="160" />
        <line x1="120" y1="150" x2="210" y2="215" />
        <line x1="210" y1="215" x2="315" y2="160" />
      </g>
      {/* nodes (people) */}
      {[[120,150,'var(--calm)'],[220,95,'var(--calm-deep)'],[315,160,'var(--calm)'],[210,215,'var(--brand)']].map(([x,y,c],i)=>(
        <g key={i}>
          <circle cx={x as number} cy={y as number} r="22" fill="var(--surface)" stroke={c as string} strokeWidth="3" />
          <circle cx={x as number} cy={(y as number)-4} r="6" fill={c as string} />
          <path d={`M${(x as number)-9},${(y as number)+10} a9,7 0 0 1 18,0`} fill={c as string} />
        </g>
      ))}
    </svg>
  )
}

// --- extra icons (share the same stroke base) ---
export function IconBook() {
  return (<svg {...base}><path d="M4 5a2 2 0 0 1 2-2h9v16H6a2 2 0 0 0-2 2V5Z" /><path d="M15 3h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-3" /></svg>)
}
export function IconBuilding() {
  return (<svg {...base}><rect x="5" y="4" width="9" height="16" rx="1" /><path d="M14 9h4a1 1 0 0 1 1 1v10" /><path d="M8 8h3M8 12h3M8 16h3M4 20h16" /></svg>)
}
export function IconCompass() {
  return (<svg {...base}><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5 5-2Z" /></svg>)
}
export function IconList() {
  return (<svg {...base}><path d="M8 6h12M8 12h12M8 18h12" /><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" /></svg>)
}
export function IconLifebuoy() {
  return (<svg {...base}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M5 5l3.5 3.5M15.5 15.5L19 19M19 5l-3.5 3.5M8.5 15.5L5 19" /></svg>)
}
export function IconHeart() {
  return (<svg {...base}><path d="M12 20s-7-4.4-7-9.3A3.7 3.7 0 0 1 12 8a3.7 3.7 0 0 1 7 2.7C19 15.6 12 20 12 20Z" /></svg>)
}
