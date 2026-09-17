# Frontend Design Brief

Design direction for the SWSWBS web app (Phase 6+). Captured up front so the build
stays consistent. This is guidance, not final CSS — refine as we go.

## Audience & tone

The app is used by people reflecting on their **social well-being**. The experience
must feel **calm, gentle, and reassuring** — never clinical, alarming, or
over-stimulating. Generous whitespace, soft transitions, plain and kind language,
clear consent and privacy messaging before the survey.

## Colour — chosen palette: **"Ocean"** (locked 2026-09-17)

A calm, confident blue base with the University of South Wales crimson as a
restrained accent. Chosen because it stays bright and legible in **both** light and
dark. USW brand: primary Crimson `#C61436`, secondaries White `#FFFFFF` and dark grey
`#313131`. The blue base derives from the source set `#0A369D, #4472CA, #5E7CE2,
#92B4F4, #CFDEE7`.

**How we use crimson:** logo, primary call-to-action buttons, and small highlights
only — never a large filled background. This honours the USW identity without the
interface feeling bold or triggering.

**Design tokens** (CSS custom properties), light / dark:

| Token | Role | Light | Dark |
|---|---|---|---|
| `--plane` | page ground | `#EEF2F7` | `#0F1622` |
| `--surface` | cards / surfaces | `#FFFFFF` | `#17202E` |
| `--surface-2` | subtle fill | `#E2EBF3` | `#1E2937` |
| `--ink` | primary text | `#1B2430` | `#E9EEF5` |
| `--ink-2` | secondary text | `#465264` | `#B3BECE` |
| `--muted` | muted / labels | `#77839A` | `#8593A8` |
| `--border` | hairline | `rgba(27,36,48,.10)` | `rgba(255,255,255,.10)` |
| `--brand` | USW crimson accent | `#C61436` | `#E2647C` |
| `--brand-strong` | crimson hover | `#A71030` | `#EC7F93` |
| `--calm` | supportive blue | `#4472CA` | `#6F9BEA` |
| `--calm-deep` | links / heading accent | `#0A369D` | `#9CC0F7` |
| `--calm-soft` | tinted panel | `#CFDEE7` | `#1A2740` |

**Accessibility:** meet WCAG 2.2 AA contrast in both themes; never rely on colour
alone. `--calm-deep` is the link/heading accent, chosen for contrast on each surface.

## Logo

- Design an **original** SWSWBS wordmark/mark in USW crimson. **Do not reproduce the
  actual University of South Wales logo/crest** — it is their trademark.
- Using real USW branding in production requires USW's permission (see the
  pre-launch checklist). Until then, the original mark is a placeholder.

## Tagline

**“Well-being today for a stronger tomorrow.”** (chosen 2026-09-17.) Used under the SWSWBS wordmark in the logo lockup and where a strapline is helpful; the wordmark reads “SWSWBS — South Wales Social Well-being Scale”.

## Themes

- Support **light and dark mode**, defaulting to the visitor's system preference,
  with a **manual toggle** that persists their choice.
- Keep **both** themes calm — the dark theme is a soft, low-contrast dark (not pure
  black, not neon accents), designed as its own set rather than a naive inversion.

## Layout & interaction (planned)

- Survey as a **multi-step wizard** with a progress indicator (better completion,
  per-step validation) rather than one long form.
- The **cooldown** is shown clearly ("you can take this again on …").
- Dashboards follow the mockup: role-scoped, filterable (incl. custom date range),
  with ⓘ explanations on each metric.
- **Accessibility first:** keyboard navigation, visible focus, proper labels/roles,
  respects `prefers-reduced-motion`. Structure copy for future **Welsh** provision
  (i18n-ready) even if v1 ships English-only.

## Stack (from ARCHITECTURE.md)

React + Vite + Apollo Client + shadcn/ui + Tailwind, wired to the existing GraphQL API.
