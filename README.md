# SWSWBS Survey

**South Wales Social Well-Being Scale Survey** — a digital, type-safe, secure
rebuild of the SWSWBS study instrument.

> This app collects data on social well-being and mental health. **Data protection
> and confidentiality are first-class requirements, not afterthoughts** — access to
> responses is role-scoped throughout (see `docs/LEARNING_NOTES.md`, Phase 4).

## The instrument (SWSWBS)

The **South Wales Social Well-being Scale (SWSWBS)** is a validated self-report
questionnaire that measures a person's **social well-being** — the social
conditions and connections that support wellbeing (a safe environment, financial
security, meaningful activity, relationships, feeling useful, inclusion, and
community involvement). It was developed in the context of **social prescribing**
in Wales.

**TL;DR of the scale**

- **14 items**, each rated on a **5-point** frequency scale from *None of the time*
  (1) to *All of the time* (5), reflecting on the **past two weeks**.
- **Total score 14–70** (higher = better social well-being).
- **Missing-data rule**: a respondent must answer at least **12** of 14 items;
  missing items are imputed with the respondent's mean before summing.
- **Three subscales (factors)**: (1) *Safe and inclusive interaction with others*,
  (2) *Learning, helping, and feeling useful*, (3) *Security, worthwhile
  activities, family and friends*.

This app implements that scoring exactly — see `docs/LEARNING_NOTES.md` (Phase 3).

**Source materials (recommended reading)**

- **User Guide (Version 2, 16 Jan 2025)** — the authoritative administration and
  scoring guide, published by the Wales School for Social Prescribing Research
  (WSSPR): <https://www.wsspr.wales/ws/media-library/56772de855bcf21e2b5f7c941694b218/swswbs-user-guide_version-2_16jan25.pdf>
- **Validation paper** — *Development and preliminary validation of the South Wales
  Social Well-being Scale (SWSWBS)*, BMC Public Health (2024),
  DOI [10.1186/s12889-024-20015-9](https://doi.org/10.1186/s12889-024-20015-9).

## Tech stack

| Layer | Technology |
|---|---|
| Database | PostgreSQL 16 (via Docker) |
| ORM / migrations | Prisma 7 (driver adapter: `@prisma/adapter-pg` + `pg`) |
| API | GraphQL via Apollo Server 5 |
| Language | TypeScript (strict, NodeNext) |
| Auth | email + password, email verification, JWT (`bcryptjs`, `jsonwebtoken`) |
| Frontend | React + Vite + Apollo Client + shadcn/ui *(planned)* |

## Project layout

```
Survey_app/
├── docker-compose.yaml       # local PostgreSQL, one command
├── docs/
│   └── LEARNING_NOTES.md      # concept-by-concept companion, grows each phase
├── server/                    # the GraphQL API
│   ├── prisma/
│   │   ├── schema.prisma      # the database, described as code
│   │   ├── migrations/        # versioned SQL, committed to git
│   │   └── seed.ts            # baseline data (questions, options, admin)
│   ├── prisma.config.ts       # Prisma 7 config (datasource URL lives here)
│   └── src/
│       ├── schema.ts          # GraphQL SDL (the contract)
│       ├── resolvers.ts       # resolvers (the behaviour)
│       ├── context.ts         # per-request auth context
│       ├── index.ts           # Apollo server entrypoint
│       └── lib/               # prisma client + auth helpers
└── web/                       # React app (planned)
```

## Build status

- [x] **Phase 0** — Foundation: PostgreSQL, Prisma schema + seed, monorepo
- [x] **Phase 1** — GraphQL server (Apollo Server 5)
- [x] **Phase 2** — Auth: signup, email verification, login (JWT), roles
- [x] **Phase 3** — Survey responses: scoring, imputation, subscales, 14-day cooldown
- [x] **Phase 4** — Groups & authorization: full group lifecycle, role-scoped access
- [ ] **Phase 5** — Analytics + export (dashboards aggregations, SPSS-friendly CSV/Excel)
- [ ] **Phase 6** — Frontend foundation (React + Vite + Apollo Client + shadcn/ui)
- [ ] **Phase 7** — Survey wizard, dashboards, export UI
- [ ] **Phase 8** — Hardening & deploy

## Dashboard metrics (planned)

The analytics dashboards (Phase 5) will present the SWSWBS data role-scoped,
filterable (including a custom date range), and customizable per user. Each
metric answers a specific question:

| Metric | What it shows | What to look for |
|---|---|---|
| Mean total score (14–70) | Group average well-being, with 95% CI and SD | Overall level; a wide CI or SD means more uncertainty / spread |
| Total-score distribution | How responses spread across 14–70 | Skew — a long low tail flags people struggling |
| Subscale profile (1–5) | Average score per validated factor | The weakest factor, i.e. what to support |
| Average per question (1–5) | Mean for each of the 14 items | The lowest items — the group's collective pain points |
| Trend over time | Group mean per fortnight | The direction of change |
| Mean by demographic | Average by sector / age / etc. | Segments sitting below the group mean |
| Question × group heatmap | Mean item score by segment | Patterns and hot spots |
| Respondent table | Per-person latest score + trajectory (pseudonymised) | Downward trends needing follow-up |

Access is **role-scoped** (participant → their own results; group admin → their
group; site admin → all groups). Segments with fewer than 5 respondents are
**suppressed** to protect anonymity, and any "attention" flags are prompts for a
person to review — never automated or clinical assessments. See
`docs/LEARNING_NOTES.md` for a fuller "what each metric means and how it's read".

## Getting started

You need **Node.js 22 LTS** and **Docker Desktop** installed and running.

```bash
# 1. Install dependencies (from the repo root)
npm install

# 2. Start PostgreSQL in a container
npm run db:up

# 3. Configure the server's environment
cp server/.env.example server/.env
#    Defaults already match docker-compose.yaml. Set a JWT_SECRET (any long
#    random string) before running the server.

# 4. Create the database tables from the Prisma schema
npm run db:migrate            # first run: name the migration, e.g. "init"

# 5. Generate the Prisma client (Prisma 7 does NOT do this during migrate)
npm run db:generate -w server

# 6. Seed baseline data (14 questions, sector/education options, admin user)
npm run db:seed

# 7. Run the API server (from the server workspace)
cd server && npm run dev      # GraphQL at http://localhost:4000/
```

Optional:

```bash
npm run db:studio             # Prisma Studio table browser at http://localhost:5555
npm run db:down               # stop the Postgres container (data persists)
```

**Admin login** (created by the seed): `admin@swswbs.local` / `ChangeMe123!` —
change this before any real use.

### Note on email verification (development)

There is no email service wired up yet. When a user signs up, the verification
token is **printed to the server's terminal** (the one running `npm run dev`):

```
[DEV] Verify someone@example.com with this token:
  <long hex token>
```

Use that token with the `verifyEmail` mutation to verify the account.

## A note on licensing

The SWSWBS instrument is free to use for research, but **permission from the
University of South Wales is required before deployment**. Confirm the demographic
field set and the cooldown interval with the research team before any live use.
