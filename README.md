# South Wales Social Well-being Scale (SWSWBS)

A full-stack, type-safe web application that digitises the **South Wales Social
Well-being Scale (SWSWBS)** — a validated research instrument for measuring social
well-being. Participants complete the scale and track their own scores over time;
researchers get role-scoped, anonymised group analytics and SPSS-ready exports.

**Live demo:** <https://swswbs-web.onrender.com>
*(Free-tier hosting — the first request after a quiet spell can take ~50 seconds
to wake the server.)*

> This application handles well-being data about real people. **Data protection and
> confidentiality are first-class requirements, not afterthoughts:** access is
> role-scoped end to end, participant identities are pseudonymised, passwords and
> tokens are hashed at rest, and demographic segments smaller than five are
> suppressed in analytics.

## Highlights

- **Faithful to the published instrument** — 14 items, a 1–5 frequency scale, a
  14–70 total, three validated subscales, and the User Guide's mean-imputation
  rule for missing answers, all implemented exactly.
- **Two audiences, one app** — a guided experience for participants (take the
  survey, track your score over time) and anonymised analytics + export for
  researchers and site admins.
- **Privacy by design** — pseudonymous IDs, role-scoped access, small-sample
  suppression, and a GDPR right-to-erasure flow that anonymises data rather than
  destroying research records.
- **Secure, friendly auth** — email verification by **6-digit code _or_ one-click
  link**, bcrypt password hashing, JWT sessions, brute-force lockout, and
  self-service password reset.
- **Type-safe end to end** — TypeScript across a GraphQL API and a React client,
  with Prisma modelling the database as code.
- **Deployed** — live on Render via an infrastructure-as-code Blueprint, with
  database migrations applied automatically on every deploy.

## The instrument (SWSWBS)

The **South Wales Social Well-being Scale** is a validated self-report
questionnaire that measures **social well-being** — the social conditions and
connections that support wellbeing (a safe environment, financial security,
meaningful activity, relationships, feeling useful, inclusion, and community
involvement). It was developed in the context of **social prescribing** in Wales.

- **14 items**, each rated on a **5-point** frequency scale from *None of the time*
  (1) to *All of the time* (5), reflecting on the **past two weeks**.
- **Total score 14–70** (higher = better social well-being).
- **Missing-data rule**: a respondent must answer at least **12** of 14 items;
  missing items are imputed with the respondent's own mean before summing.
- **Three subscales (factors)**: (1) *Safe and inclusive interaction with others*,
  (2) *Learning, helping, and feeling useful*, (3) *Security, worthwhile
  activities, family and friends*.

This app implements that scoring exactly — see `docs/LEARNING_NOTES.md` (Phase 3).

**Source materials**

- **User Guide (Version 2, 16 Jan 2025)** — the authoritative administration and
  scoring guide, published by the Wales School for Social Prescribing Research
  (WSSPR): <https://www.wsspr.wales/ws/media-library/56772de855bcf21e2b5f7c941694b218/swswbs-user-guide_version-2_16jan25.pdf>
- **Validation paper** — *Development and preliminary validation of the South Wales
  Social Well-being Scale (SWSWBS)*, BMC Public Health (2024),
  DOI [10.1186/s12889-024-20015-9](https://doi.org/10.1186/s12889-024-20015-9).

## Features

**Accounts & authentication**
- Sign up with email + password; an anonymous participant ID (`SWSWBS0001`…) is
  assigned automatically — no real name required.
- Email verification by a **6-digit code** typed on the page, or a **one-click
  link** — whichever the user prefers. Wrong codes are limited (5 attempts, then a
  30-minute cooldown), and a fresh code can be requested at any time.
- Sign-in is gated on a verified email, with a brute-force lockout after repeated
  failures, and a self-service "forgot password" reset flow.

**Survey**
- A guided **14-item wizard**, one item at a time, with per-step validation and
  consent captured server-side.
- Scoring matches the User Guide: 1–5 items, 14–70 total, ≥12-of-14 completion
  rule with mean imputation, and the three validated subscales.
- A **14-day cooldown** between submissions (configurable with the research team).

**For participants**
- A personal dashboard: latest total and subscale scores, a **score-over-time**
  chart, a full history table, and a one-click download of your own data.

**For researchers & site admins**
- Role-scoped **group analytics**: responses/participants, mean total with 95% CI
  and standard deviation, score distribution, per-factor and per-item means, and
  demographic breakdowns.
- **SPSS-friendly CSV export** (whole-group, per-participant, or your own).
- Segments with **fewer than five** respondents are suppressed to protect anonymity.

**Privacy & GDPR**
- Pseudonymisation throughout; personal data is minimised (preset avatars, never
  uploaded photos).
- A user-requested, **admin-reviewed data-deletion** flow that anonymises the
  account while retaining the pseudonymised research data, with an email
  confirmation to the user.

## Tech stack

| Layer | Technology |
|---|---|
| Database | PostgreSQL (16 locally via Docker; 18 on Render) |
| ORM / migrations | Prisma 7 (driver adapter: `@prisma/adapter-pg` + `pg`) |
| API | GraphQL via Apollo Server 5 (standalone) |
| Auth | email + password, email verification, JWT (`bcryptjs`, `jsonwebtoken`) |
| Transactional email | Resend (HTTPS API), with an Ethereal test inbox in local dev |
| Frontend | React 19 + Vite + Apollo Client v4 |
| Styling | Tailwind CSS v4 — custom "Ocean" theme with light & dark modes |
| Language | TypeScript (strict, NodeNext) across server and client |
| Hosting | Render (Blueprint / infrastructure-as-code), auto-migrate on deploy |

## Architecture

A TypeScript monorepo (npm workspaces) with two apps that share one GraphQL
contract:

- **`server/`** — an Apollo Server 5 GraphQL API. Prisma models the schema as code
  and generates a fully-typed client; auth is email/password with hashed
  verification tokens and JWT sessions.
- **`web/`** — a React 19 + Vite single-page app using Apollo Client, Tailwind v4,
  and a custom accessible component set, with light/dark theming and client-side
  routing.

Design rationale and the full "as-built" decision log live in
`docs/ARCHITECTURE.md`; a concept-by-concept walkthrough is in
`docs/LEARNING_NOTES.md`; the UI design system is in `docs/FRONTEND_DESIGN.md`.

## Project layout

```
Survey_app/
├── docker-compose.yaml         # local PostgreSQL, one command
├── render.yaml                 # Render Blueprint: DB + API + static web
├── docs/
│   ├── ARCHITECTURE.md         # design + as-built decision log
│   ├── FRONTEND_DESIGN.md      # UI design system ("Ocean" theme)
│   └── LEARNING_NOTES.md       # concept-by-concept companion
├── server/                     # the GraphQL API
│   ├── prisma/
│   │   ├── schema.prisma       # the database, described as code
│   │   ├── migrations/         # versioned SQL, committed to git
│   │   ├── seed.ts             # baseline data (questions, options, admin)
│   │   └── sample-data.ts      # optional demo group + participants
│   ├── prisma.config.ts        # Prisma 7 config
│   └── src/
│       ├── schema.ts           # GraphQL SDL (the contract)
│       ├── resolvers.ts        # resolvers (the behaviour)
│       ├── context.ts          # per-request auth context
│       ├── index.ts            # Apollo server entrypoint
│       └── lib/                # prisma client, auth, email, validation
└── web/                        # the React app
    └── src/
        ├── pages/              # routes (survey, results, groups, analytics, auth…)
        ├── components/         # layout, charts, shared UI
        └── apollo.ts           # GraphQL client
```

## Getting started

You need **Node.js 22 LTS** and **Docker Desktop** installed and running.

```bash
# 1. Install dependencies (from the repo root)
npm install

# 2. Start PostgreSQL in a container
npm run db:up

# 3. Configure the server's environment
cp server/.env.example server/.env
#    Defaults match docker-compose.yaml. Set JWT_SECRET to any long random string.
#    Email is optional in dev (see "Email verification" below).

# 4. Create the database tables from the Prisma schema
npm run db:migrate            # first run: name the migration, e.g. "init"

# 5. Generate the Prisma client (Prisma 7 does NOT do this during migrate)
npm run db:generate -w server

# 6. Seed baseline data (14 questions, sector/education options, admin user)
npm run db:seed

# 7. (Optional) seed a demo group + participants for exploring the analytics
npm run db:sample -w server

# 8. Run both apps together (API on :4000, web on :5173)
npm run dev:all
```

Open <http://localhost:5173>.

Useful scripts:

```bash
npm run db:studio             # Prisma Studio table browser at http://localhost:5555
npm run db:down               # stop the Postgres container (data persists)
```

### Seeded accounts (local)

- **Site admin** — `admin@swswbs.local` / `ChangeMe123!` *(change before any real use)*.
- **Researcher / group admin** (from `db:sample`) — `researcher@swswbs.local` /
  `Password123`, owner of the **"Demo Research Group"** (invite code `DEMO2026`),
  with 14 demo participants (`demo1@swswbs.local` … `demo14@swswbs.local`, all
  `Password123`) so the analytics dashboards have data to show.

## Email verification

Verification and password-reset emails are sent through **[Resend](https://resend.com)**
using its **HTTPS API** (chosen over SMTP so it works on hosts, like Render's free
tier, that block outbound SMTP ports). Each verification email contains **both** a
6-digit code and a one-click link.

- **Production:** set `RESEND_API_KEY` (your Resend key) and `EMAIL_FROM`. Email
  sending never blocks signup — it runs with a short timeout and fails gracefully.
- **Local dev:** if no Resend key is set, the app falls back to an **Ethereal**
  test inbox and prints a preview URL (plus the code and verify link) to the server
  console, so you can verify accounts without sending real mail.

> **Sender note:** Resend's shared test sender (`onboarding@resend.dev`) only
> delivers to your own Resend-account address. To email anyone, verify a domain at
> resend.com/domains and set `EMAIL_FROM` to an address on that domain — no code
> change required.

## Deployment

The app deploys to **Render** from `render.yaml` (a Blueprint describing the
database, the Node API, and the static web app). On each deploy the API build runs
`prisma migrate deploy`, so schema changes are applied to the live database
automatically. Secrets (`JWT_SECRET`, `RESEND_API_KEY`, admin seed credentials) are
set as environment variables in the Render dashboard, never committed.

## Security & privacy

- **Role-scoped access** — participants see only their own data, group admins only
  their groups, site admins across groups.
- **Hashing at rest** — passwords with bcrypt; email-verification and reset tokens
  are stored only as SHA-256 hashes (the raw value lives only in the email).
- **Brute-force protection** — login lockout after repeated failures; verification
  codes are attempt-limited with a cooldown.
- **Small-sample suppression** — demographic segments under five respondents are
  hidden in analytics.
- **GDPR right-to-erasure** — anonymises the account while retaining pseudonymised
  research data, under admin review.

Further production hardening (Zod validation everywhere, rate limiting, security
headers, disabling introspection in production, an admin audit trail) is tracked as
the pre-launch checklist.

## Licensing

The SWSWBS instrument is free to use for research, but **permission from the
University of South Wales is required before deployment**. Confirm the demographic
field set and the cooldown interval with the research team before any live use.
