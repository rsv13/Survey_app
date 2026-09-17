import { useId } from 'react'

// The SWSWBS mark: a person reaching up from the South Wales hills, in the Ocean
// palette (blue), with a single USW-crimson accent — the head.
export function Logo({ size = 36 }: { size?: number }) {
  const id = useId() // unique clip id so multiple logos on a page don't clash
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="SWSWBS logo">
      <defs>
        <clipPath id={id}>
          <circle cx="24" cy="24" r="22" />
        </clipPath>
      </defs>
      <circle cx="24" cy="24" r="22" fill="var(--calm-soft)" />
      <g clipPath={`url(#${id})`}>
        <path d="M-2 35 Q 12 28 24 33 T 50 31 L 50 50 L -2 50 Z" fill="var(--calm)" opacity="0.5" />
        <path d="M-2 40 Q 16 34 28 38 T 50 37 L 50 50 L -2 50 Z" fill="var(--calm-deep)" opacity="0.55" />
      </g>
      <circle cx="24" cy="24" r="21" fill="none" stroke="var(--calm-deep)" strokeWidth="1.4" opacity="0.35" />
      <path d="M24 31 L 24 21 M24 23 L 19 17 M24 23 L 29 17" fill="none" stroke="var(--calm-deep)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="24" cy="14.5" r="3.1" fill="var(--brand)" />
    </svg>
  )
}
