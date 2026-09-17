import { useState } from 'react'

function isDark() {
  const c = document.documentElement.getAttribute('data-theme')
  if (c) return c === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeToggle() {
  const [dark, setDark] = useState(isDark)
  function toggle() {
    const next = dark ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('swswbs-theme', next) } catch { /* ignore */ }
    setDark(!dark)
  }
  return (
    <button
      onClick={toggle}
      aria-label="Toggle light or dark theme"
      className="rounded-lg border border-border px-2.5 py-1.5 text-sm text-ink-2 hover:border-calm"
    >
      {dark ? '☀' : '☾'}
    </button>
  )
}
