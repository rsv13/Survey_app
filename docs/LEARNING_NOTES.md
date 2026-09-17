# Learning Notes

A running, concept-by-concept companion to the SWSWBS build. Each phase adds a
section. It is written so you can re-read it later, re-teach yourself, and explain
the app to stakeholders or other developers. It lives in the repo so it travels
with the code, and it is meant to grow: every new phase adds a section in the same
style.

---

## Phase 0 — Foundation: PostgreSQL + Prisma

### Why PostgreSQL instead of MongoDB?

The original app stored a survey as a document with a bare array of numbers
(`surveyAnswers: [3, 4, 2, ...]`). Nothing recorded which question each number
belonged to, whether there were the right number of them, or whether the values
were valid. Demographic fields were free strings, so `"Male"`, `"male"` and `"M"`
could all coexist and quietly corrupt analysis.

PostgreSQL is a **relational** database: data lives in typed columns, and the
database itself enforces rules — types, uniqueness, "this must point to a real row
in another table", "this value must be one of these options". For research data on
social well-being and mental health, having the database refuse bad data is worth
far more than schema flexibility. Mental model: Mongo trusts your code to keep data
clean; Postgres trusts no one and checks everything. For a study, that distrust is a
feature.

### What Prisma gives us

Prisma is an **ORM** — a typed layer between our TypeScript and the SQL database.
Three things matter:

1. **One schema file** (`prisma/schema.prisma`) describes every table in a readable
   syntax — the single source of truth for the data model.
2. **Migrations**: `prisma migrate dev` compares the schema to the real database,
   writes the SQL to reconcile them into a timestamped folder under
   `prisma/migrations/`, and applies it. Those files are committed to git, so the
   database structure is versioned exactly like code.
3. **A type-safe client**: `prisma generate` produces a client where
   `prisma.user.findMany()` is fully autocompleted and type-checked, so a mistyped
   field is caught at compile time.

Note on Prisma 7: the database URL lives in `prisma.config.ts` (not in
`schema.prisma`), it uses a driver adapter (`@prisma/adapter-pg` + `pg`), and
`migrate dev` does **not** auto-generate the client or auto-seed — run
`prisma generate` and the seed separately.

### The key modelling decision: answers as ROWS

Instead of an array of numbers, a `SurveyAnswer` table holds **one row per question
per response**, each row pointing at the exact `SurveyQuestion` it answers and
carrying a `numericValue`. The extra table is worth it: questions become
individually queryable. "Average score for question 7 among Healthcare
respondents" is one SQL `AVG()` with a couple of joins — the analytical capability
researchers actually want, which was essentially impossible with the array design.

### Other foundation choices

- **Deliberate denormalisation**: `SurveyAnswer` stores both the enum label
  (`OFTEN`) and its `numericValue` (`4`). The number is derivable, but storing it
  lets aggregation run directly on an integer column. A knowing trade-off, commented
  in the code.
- **Soft deletes**: core tables have a `deletedAt` timestamp; "deleting" sets it and
  queries filter `deletedAt: null`. For research data a mis-click can never destroy
  collected responses, and it supports GDPR anonymisation over destructive erasure.
- **Idempotent seed** (`prisma/seed.ts`): fills a fresh database with the 14
  questions, the sector/education option lists, and the first admin, using `upsert`
  so running it repeatedly never duplicates.
- **Monorepo (npm workspaces)**: one repo holds `server` now and `web` later, so a
  single `npm install` at the root wires everything.
- **TypeScript `strict`** with `noUncheckedIndexedAccess`: null/undefined and
  out-of-range mistakes are caught at compile time.

---

## Phase 1 — GraphQL server (Apollo Server 5)

The server is Apollo Server 5 via `startStandaloneServer`, listening on
`http://localhost:4000/`. GraphQL has two halves that mirror each other:

- **The schema (`src/schema.ts`)** — the SDL contract: the types that exist and the
  queries/mutations that are possible. Nothing runs from here; it is the promise.
- **The resolvers (`src/resolvers.ts`)** — the functions that actually fetch or
  change data for each field.

The first query, `surveyDefinition`, returns the questions plus the sector and
education option lists — everything a client needs to render the form.

**Field resolvers** are the pattern to internalise: a small function that receives
the parent object and computes one field on demand. It runs *only when that field is
requested*, so unused fields cost nothing. We use this repeatedly — for computed
scores, member counts, and date formatting.

---

## Phase 2 — Auth (signup, verification, login, roles)

The flow is email + password with email verification — no third-party OAuth, chosen
for confidentiality and simplicity.

- **Sign up** creates the user as a `NORMAL_USER` with a hashed password
  (`bcryptjs`, cost 12) and a display handle `SWSWBS0001`, `SWSWBS0002`, … The handle
  can only be built after the row exists (the number is database-assigned), so we
  create with a placeholder, read the number back, then update.
- **Verification tokens**: we generate a random token, hand the **raw** value to the
  user (logged to the dev console for now, since there is no email service), but
  store only its **SHA-256 hash**. So even a database leak can't be used to verify or
  reset an account. `verifyEmail` marks the email verified and logs the user in.
- **Login tokens (JWT)**: `signAccessToken` signs a token whose `sub` claim is the
  user id; `verifyAccessToken` reads it back. The token proves who you are on each
  request.
- **Per-request context (`src/context.ts`)**: reads the `Authorization: Bearer
  <token>` header, verifies it, and exposes `userId` to every resolver. This is how a
  resolver knows who is calling.
- **Roles (RBAC)**: `Role` is `NORMAL_USER | GROUP_ADMIN | ADMIN`. Everyone signs up
  as a normal user; roles are granted deliberately (see Phase 4).

---

## Phase 3 — Survey responses & scoring

Scoring follows the [SWSWBS User Guide (Version 2, 16 Jan 2025)](https://www.wsspr.wales/ws/media-library/56772de855bcf21e2b5f7c941694b218/swswbs-user-guide_version-2_16jan25.pdf) exactly; see also the validation paper in *BMC Public Health* ([doi:10.1186/s12889-024-20015-9](https://doi.org/10.1186/s12889-024-20015-9)).

- **Scale**: each of the 14 items is scored **1–5** (1 = none of the time … 5 = all
  of the time), so a complete total ranges **14–70**.
- **Missing-data rule**: a respondent must answer at least **12** of 14. Missing
  items are imputed with the mean of the answered ones, then all 14 are summed. That
  reduces to `sum × 14 / n`; when all 14 are present it is just the sum. We report the
  total as a whole number.
- **Three subscales** (validated factors): each answer's question carries a `factor`
  (1, 2 or 3), and a subscale score is the sum of that factor's answered items. The
  factor names come from the User Guide.
- **`submitSurvey` guards**: consent required; each question answered at most once;
  between 12 and 14 answers; and the cooldown (below).
- **14-day cooldown**: one submission per fortnight, matching the scale's recall
  window. `surveyEligibility` tells a client whether they can submit now and, if not,
  the date they next can. The same check guards `submitSurvey` itself, so the rule
  can't be bypassed by calling the API directly.
- **Role-scoped reads**: `surveyResponses` returns all responses for a site admin,
  the group's responses for a group admin, and only their own for a normal user. This
  scoping is the backbone of confidentiality.

`totalScore`, `subscaleScores` and `createdAt` are all **field resolvers** on
`SurveyResponse` — computed on demand from the answer rows, nothing extra stored.

---

## Phase 4 — Groups & authorization

This phase adds group management and, with it, the app's most important security
surface: **who can see whose data**.

### The security model (why it is shaped this way)

The survey collects well-being and mental-health data, so "who can read a group's
responses" is the single most important control. A self-appointed group admin who is
the only member of their own group, yet can view others' responses, would be a
confidentiality breach. Therefore:

- **Everyone signs up as `NORMAL_USER`.** There is no "sign up as group admin"
  option.
- **Only the site admin grants the group-admin role.** The request happens
  off-platform (a researcher emails the site admin); there is deliberately no in-app
  "request admin" button, which would only invite spam and widen the attack surface.
- **Once trusted, a group admin is autonomous**: they can create and run their own
  groups without waiting on the site admin for each one. This is safe because a group
  admin only ever sees their *own* groups' data (the Phase 3 role scoping enforces
  this).

### Membership vs admin-ship

A user relates to a group in three distinct ways, and keeping them separate is what
makes the model work:

- **Member** (`user.groupId`) — the one group a user participates in. This is what
  analytics scope on.
- **Admin** (`Group.admins`, many-to-many) — who administers the group. A group can
  have several admins (e.g. two primary researchers over one cohort).
- **Creator** (`Group.creator`) — who set the group up.

Creating or administering a group does **not** make you a participant, and leaving a
group as a member does **not** remove your admin role. They are independent.

### The seven mutations

- **`grantGroupAdmin`** (site admin only) — promotes a normal user to `GROUP_ADMIN`.
  The one privileged trust grant; idempotent, and it refuses to touch a fellow site
  admin.
- **`createGroup`** (site admin or group admin) — creates a group with a unique
  invite code; the caller becomes creator and first admin.
- **`addGroupAdmin`** (a group's own admin) — adds a co-admin who **already** holds
  the group-admin role. This shares a group among already-trusted admins; it never
  grants the role, so it can't be a backdoor.
- **`joinGroup`** (any signed-in user) — join by invite code. Guarded against joining
  while already in a group (so a wrong-code join is fixed by leaving then re-joining)
  and against invalid codes. Codes are matched case-insensitively.
- **`leaveGroup`** (any member) — clears your own membership.
- **`removeMember`** (a group's own admin) — removes a member from that group.
  Removing a *fellow admin* is reserved for the site admin, so co-admins can't remove
  each other.
- **`reassignMember`** (site admin only) — moves a user straight from one group into
  another; the heavy tool for correcting misplacements centrally.

### Techniques introduced here

- **Authorization guards**: `requireUser` (throws if not logged in) and
  `requireAdmin` (also checks the `ADMIN` role). Every sensitive mutation starts by
  asking "who is calling, and are they allowed?" — the permission check is the first
  line, before any data is touched.
- **Prisma nested writes with `connect`**: `createGroup` creates the group and links
  the creator and first admin in one atomic step. `connect` attaches *existing* rows
  to a relation (versus `create`, which makes new ones, as `submitSurvey` does for
  answer rows).
- **Invite-code generation**: an 8-character code from an alphabet with no
  easily-confused characters (no `O`/`0`, no `I`/`1`), regenerated until unique.
- **Guard ordering**: within a resolver we check caller authority first, then target
  eligibility, then idempotency — each `throw` stops the ones below it.
- **Field resolvers on new types**: `Group.memberCount` (counts members on demand),
  `Group.creator`, `Group.createdAt`, and `User.group`.

---

## Cumulative glossary

- **ORM** — library mapping database rows to code objects (Prisma).
- **Migration** — a versioned SQL change-set that evolves the database structure.
- **Foreign key** — a column pointing at another table's primary key; the database
  enforces that the target row exists.
- **Enum** — a column whose value must be one of a fixed list.
- **Idempotent** — an operation with the same effect whether run once or many times.
- **Seed** — a script that loads baseline/reference data into an empty database.
- **Soft delete** — marking a row deleted (a timestamp) instead of removing it.
- **SDL** — Schema Definition Language, the text that describes a GraphQL schema.
- **Resolver** — a function that fetches or changes the data for a schema field.
- **Field resolver** — a resolver for a single field, run only when that field is
  requested.
- **Context** — per-request data (here, the logged-in `userId`) available to every
  resolver.
- **JWT** — a signed token proving who a request is from (`sub` = user id).
- **RBAC** — role-based access control (`NORMAL_USER` / `GROUP_ADMIN` / `ADMIN`).
- **Imputation** — filling a missing value with an estimate (here, the mean of the
  answered items).
- **Nested write / `connect`** — creating a row and linking it to related rows in one
  atomic Prisma call.

---

## Dashboard metrics — what they mean and how they're read (design)

The analytics dashboards (Phase 5) turn the stored responses into views for
supervisors, counsellors and researchers. This section records what each metric
means and how to read it, so the numbers are never mistaken for something they
are not. (These same explanations appear as ⓘ tooltips on the dashboard itself.)

**Headline numbers (KPI tiles)**

- **Mean total score (14–70)** — the group's average SWSWBS total; higher means
  better social well-being. The **95% confidence interval** is the range the true
  group average likely sits in; the **standard deviation** shows how spread out
  individuals are. A wide CI or SD means treat the average cautiously.
- **Responses vs participants** — some people retake each fortnight, so total
  submissions can exceed the number of distinct participants.
- **Completed this fortnight** — how many of the cohort submitted inside the
  current 14-day cooldown window; a simple engagement measure.
- **Factor means (1–5)** — the average *per item* for each of the three validated
  factors, which makes them directly comparable to each other.

**Charts**

- **Total-score distribution** — a histogram of how responses spread across
  14–70. Read the shape: a cluster toward the high end is healthy; a long tail at
  the low end flags people who may be struggling.
- **Subscale profile** — the three factors as 1–5 bars. The lowest bar is the
  dimension of social well-being most in need of support.
- **Average score per question** — the mean (1–5) for each of the 14 items,
  sorted lowest first. The lowest items are the group's collective pain points —
  the concrete experiences to act on.
- **Trend over time** — the group's mean per fortnight; read the direction, not
  the absolute value.
- **Mean by demographic** — average total by sector, age group, and so on, to see
  which segments sit below the group mean.
- **Question × group heatmap** — mean item score across a demographic; colour
  patterns reveal which items dip for which group.
- **Respondent table** — each participant's latest score, their trajectory over
  repeated submissions, subscale means, and a follow-up status — all
  pseudonymised.

**Cross-cutting rules (the same everywhere)**

- **Role-scoped**: participants see only their own results, group admins only
  their group(s), the site admin everything — enforced server-side (Phase 3).
- **Small-N suppression**: a segment average is hidden when it covers fewer than
  ~5 respondents, so no individual can be re-identified from an aggregate.
- **Non-clinical framing**: the scale measures *social well-being*, not clinical
  risk. "Attention" flags are prompts for a human to review, never an automated
  judgement.
- **Filterable and customizable**: a global filter bar (group, date range —
  presets or a custom range — sector, age, gender) drives every widget at once,
  and users can save named views.

## What's next

- **Analytics + export**: aggregation queries for dashboards (group and admin-wide
  means, standard deviation, 95% confidence intervals on the 14–70 scale, subscale
  breakdowns) and an SPSS-friendly CSV/Excel export.
- **Frontend**: React + Vite + Apollo Client + shadcn/ui — auth screens, the survey
  wizard with the cooldown timer, dashboards with charts, and the export button.
- **Hardening before deploy**: httpOnly refresh cookies, input validation, rate
  limiting, and suppressing error stack traces in production
  (`NODE_ENV=production`).
