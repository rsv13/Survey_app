# SWSWBS Survey — Rebuild Architecture & Implementation Plan

**South Wales Social Well-Being Scale Survey — v2**
Migration from MERN → PostgreSQL + Prisma + GraphQL (Apollo) + React/TypeScript

Author: Rohit (rsv13) · Date: 2026-09-14 · Status: **Original design draft — superseded in parts; see the As-Built addendum at the end**

> **Reading note (added 2026-09-17).** Sections 0–15 below are the *original*, pre-build design draft, kept for provenance and to show the reasoning we started from. Some decisions and code sketches here were changed during implementation. For the current, as-built state, read the **As-Built Changes & Decisions** addendum at the end of this file and the project **[README](../README.md)**. The authoritative source for the data model and API is always the code itself — `server/prisma/schema.prisma` and `server/src/schema.ts` — never the sketches in this draft.

---

## 0. How to read this document

This is a **plan-first** design doc. Nothing here is built yet — the point is that you review the decisions below, push back where you disagree, and then we build against an agreed spec. I've flagged every genuine decision as either **[Decided]** (you already chose it) or **[Open]** (needs your call), and I've been honest about the trade-offs and the parts that are real work rather than glue.

The single most important thing to internalise before we write code: **this is not "MERN plus GraphQL". It's a database change (Mongo → Postgres), a language change (JS → TypeScript), an API-paradigm change (REST → GraphQL), and a UI overhaul, all at once.** That's four independent learning curves. The phased roadmap in §13 is designed so you learn one layer at a time and always have something runnable.

---

## 1. Goals & non-goals

### Goals
1. **Learn GraphQL CRUD properly** — this is your stated primary goal, so the design leans into making the CRUD lifecycle explicit and teachable, not hidden behind magic.
2. **Give researchers a clean, trustworthy tool** — reliable data export, correct role-scoped access, and an interface a non-technical researcher can use without training.
3. **Modernise for correctness** — relational integrity for research data, type safety end-to-end, and a security posture appropriate for data about real people in Wales (UK GDPR applies).
4. **Efficiency** — fewer round-trips, indexed queries, and a codebase that's cheap to extend (add a survey question, add a role) without touching ten files.

### Non-goals (explicitly out of scope for v2, at least initially)
- Multi-survey / survey-builder ("researchers define arbitrary surveys"). The current app is single-survey; keep that. Noted as a future extension in §14.
- Real-time collaboration / live dashboards via subscriptions. Discussed and **recommended against** for v1 (§5.5).
- Native mobile apps. Responsive web only.

---

## 2. Technology stack

Versions below are the current stable releases as of **September 2026** (verified against npm), so the plan doesn't anchor you to outdated tutorials.

| Layer | Choice | Version | Why |
|---|---|---|---|
| Runtime | Node.js | 22 LTS (or 24 LTS) | Stick to an LTS line, not `latest`. |
| Language | TypeScript | 7.x | Type safety pairs with GraphQL codegen; catches whole error classes at compile time. **[Decided]** |
| Database | PostgreSQL | 16 or 17 | Relational integrity for structured research data. **[Decided]** |
| ORM | Prisma | **7.x (stable)** | Type-safe DB client, migrations, great DX. See note below. **[Decided]** |
| GraphQL runtime | `graphql` | 17.x | Reference implementation. |
| API server | Apollo Server | 5.x | Best-documented ecosystem, your learning goal. **[Decided]** |
| HTTP framework | Express | 5.x (via `@as-integrations/express5`) | Apollo Server 5 is transport-agnostic; Express hosts it + gives you middleware for security. |
| Validation | Zod | 4.x | Runtime input validation, shares types with TS. |
| Frontend | React | 19.x | |
| Frontend build | Vite | 8.x | You already use Vite — familiar. |
| GraphQL client | Apollo Client | 4.x | Normalised cache, hooks, devtools. **[Decided]** |
| Styling | Tailwind CSS | 4.x | You know it; v4 is faster and config-light. |
| Component layer | **[Open]** — see §9.3 | | shadcn/ui vs. keep Flowbite |
| Auth tokens | `jsonwebtoken` + httpOnly cookies | | Access + refresh pattern (§8.2) |
| Codegen | GraphQL Code Generator | 5.x | Generates TS types from your schema for both server resolvers and client hooks. This is the glue that makes the whole "type-safe end to end" claim real. |

> **Honest note on Prisma versions:** `prisma@8` exists but is a **release candidate** right now (`8.0.0-rc`). Do **not** build a research tool on an RC. Use the stable **7.x** line (`@prisma/client@7`). We revisit when 8 goes stable.

> **Honest note on scope creep:** every "modern" tool above is a real thing to learn. If any layer feels like too much at once, the fallback is: keep Mongoose, keep JS, and only adopt GraphQL. You chose the bigger jump, which I think is the right long-term call for a research tool — but the roadmap (§13) exists precisely so you're never learning all four at once.

---

## 3. Domain recap — what carries over

From reading the current codebase, the domain is:

- **Users** with three roles: `normalUser`, `Group Admin`, `Admin`. Each user gets an auto-generated confidential **survey username** (`SWSWBS0001`, `SWSWBS0002`, …) so responses aren't tied to their real identity in exports.
- **Groups**: a Group Admin owns a group, has an **invite code** (`ABCD-EFGH`), and members join via that code. Group Admins see only their group's responses.
- **Survey**: one fixed instrument — 8 demographic fields (gender, age group, sector, designation, education, country, state, city) + a consent flag + **14 well-being questions** answered on a 5-point scale ("None of the time" … "All of the time"). Each submission gets a unique `surveyIdentifier`.
- **Counter**: a Mongo hack to generate sequential survey usernames (`findOneAndUpdate` + `$inc`). Postgres replaces this with a native sequence/identity column — one of the small wins of moving to a relational DB.

All of this is preserved. The changes are structural (how it's stored and served), not to what the survey *is*.

---

## 4. Data model — PostgreSQL via Prisma

### 4.1 Design decisions

The current Mongo `Survey` doc stores `surveyAnswers` as a bare `[Number]` array and demographic values as free strings. For a research tool that's a liability: no referential integrity, easy to write "None of the time" as `"none"` in one place and `0` in another, and hard to query "how many respondents in Healthcare answered ≥4 on Q7". The relational model fixes this:

- **Enums** for gender, age group, sector, education, and the answer scale — the database itself rejects invalid values. Adding/removing an option is a migration, tracked in git.
- **Answers as rows**, not an array: a `SurveyAnswer` table (one row per question per response) makes "average score for question N in group G" a trivial, indexed SQL aggregate. This is the single biggest analytical improvement for researchers.
- **Sequential survey usernames** via a Postgres identity/sequence, not a hand-rolled counter collection.
- **Soft deletes** (`deletedAt`) instead of hard deletes, so a researcher can never accidentally destroy collected data; exports filter out soft-deleted rows.

### 4.2 Prisma schema (`prisma/schema.prisma`)

> The full data model is defined in the live file [`server/prisma/schema.prisma`](../server/prisma/schema.prisma). The original draft's schema sketch has been removed here to avoid duplicating — and drifting from — the real file. See the As-Built addendum for how the model changed from this draft (e.g. `avatar` replaced `profilePicture`, the answer scale is 1–5 not 0–4, a `factor` column was added for the subscales, and the `AuthProvider` table was dropped).

### 4.3 Why these specific choices (the teachable bits)

- **`surveyUsername` denormalised onto `SurveyResponse`** — so if a user is deleted, the exported dataset still carries the anonymised handle. Research data must outlive accounts.
- **`SurveyAnswer.numericValue`** duplicates information derivable from `value`. That's a deliberate denormalisation: aggregation queries (`AVG(numericValue)`) run far faster than mapping enums at query time. Documented so it doesn't look like a mistake.
- **`SurveyOption` lookup tables** for sector/education instead of enums — these lists are long and researchers may want to tweak them; a lookup table means an admin UI edit instead of a migration + redeploy.
- **`publicId` vs `id`** — internal `id` never leaves the server; anything a client references uses the unguessable `publicId`. Prevents enumeration attacks.

---

## 5. GraphQL API design

### 5.1 Schema-first, with codegen

We write the schema as SDL (`.graphql` files), and GraphQL Code Generator produces TypeScript types for resolvers. This keeps the schema as the single source of truth and makes resolver signatures type-checked. This is the workflow that teaches you GraphQL cleanly — the schema is a contract you can read top to bottom.

### 5.2 Core schema (SDL excerpt)

> The live GraphQL schema is the source of truth: [`server/src/schema.ts`](../server/src/schema.ts). The original SDL sketch has been removed here to avoid drift. The real schema differs from this draft — it adds the full group mutations and `surveyEligibility`, the subscale types, and drops the Google-auth mutations and cursor-pagination types sketched below.

### 5.3 The CRUD lifecycle, made explicit (your learning goal)

For each operation, here's how a request flows through the system. This is the mental model to internalise:

**CREATE — `submitSurvey`:**
1. Client sends a mutation with `SubmitSurveyInput` (demographics + 14 answers).
2. Apollo Server parses & validates against the schema (types checked for free).
3. Resolver runs **Zod validation** on the input (business rules the schema can't express — e.g. exactly 14 answers, consent must be `true`).
4. `context.user` is checked for auth (§8).
5. Prisma writes the `SurveyResponse` + 14 `SurveyAnswer` rows in a **single transaction** (`prisma.$transaction`) — all-or-nothing, no half-saved responses (a real bug class in the current app).
6. The created object is returned; Apollo Client writes it into its normalised cache so the UI updates without a refetch.

**READ — `surveyResponses`:**
1. Resolver inspects `context.user.role` and builds the Prisma `where` clause: Admin → all; Group Admin → `groupId = user.groupId`; normalUser → `userId = user.id`. **Authorization is server-side and unavoidable** — the client can't ask for data outside its scope.
2. Cursor pagination via Prisma `cursor`/`take`.
3. Field resolvers (`totalScore`, `answers`) fill in derived/related data only if the query asked for them — that's the GraphQL efficiency win over REST (no over-fetching).

**UPDATE / DELETE** follow the same shape: validate → authorize → Prisma write (soft delete sets `deletedAt`).

The key insight GraphQL teaches you here: **one endpoint, many operations, and the client declares exactly what it needs.** Contrast with your current REST app's `/api/survey`, `/api/user`, `/api/group` sprawl.

### 5.4 N+1 problem & DataLoader

The moment you have `SurveyResponse.user` and query a list, a naive resolver fires one DB query per response (the classic GraphQL N+1). We solve it with **DataLoader** (batches + caches per-request). I'll set this up in the reference slice so you see the pattern once and reuse it. This is *the* GraphQL performance gotcha — worth understanding early.

### 5.5 Subscriptions — recommended **out of scope** for v1

Real-time push (WebSockets) is a large operational addition (stateful connections, scaling, auth over WS). A survey tool for researchers doesn't need live updates — a refetch-on-focus or a manual refresh button is plenty. **[Open]** but my recommendation is no. Revisit only if researchers explicitly want a live-updating dashboard.

### 5.6 Error handling

Apollo Server 5 uses typed `GraphQLError` with `extensions.code`. We define a small set: `UNAUTHENTICATED`, `FORBIDDEN`, `BAD_USER_INPUT`, `NOT_FOUND`, `INTERNAL`. Validation errors return structured field-level detail so the client can show inline form errors. Stack traces are stripped in production.

---

## 6. Authentication & authorization

### 6.1 Model

- **Access token**: short-lived JWT (15 min), sent as an httpOnly, `Secure`, `SameSite=Strict` cookie. Carries `userId` + `role`.
- **Refresh token**: long-lived (7 days), random opaque string, **stored hashed** in `RefreshToken`, also httpOnly cookie. `refreshSession` mutation rotates it (issues a new one, revokes the old) — rotation detects token theft.
- This fixes the current app's weaknesses: 1h token with no refresh, cookie with no `Secure`/`SameSite`, no way to revoke a session.

### 6.2 Google sign-in

Keep it, but **verify the Google ID token server-side** (`google-auth-library`) instead of trusting client-sent `email`/`name` (the current app trusts the client, which is spoofable). Link via the `AuthProvider` table.

### 6.3 Authorization (RBAC) — three enforcement layers

1. **Context**: every request resolves `context.user` from the access-token cookie (or `null`).
2. **Directive / guard**: a reusable `@auth(requires: ROLE)` schema directive (or a resolver wrapper) rejects unauthenticated/under-privileged calls before the resolver body runs.
3. **Row scoping**: for data queries, the resolver narrows the Prisma `where` by role (§5.3). This is the layer that actually protects respondents' data.

### 6.4 Field-level authorization

Some fields are sensitive: `Group.inviteCode` and `Group.members` should only resolve for that group's admin or a global Admin; everyone else gets `null`/`[]`. GraphQL makes this natural — authorization lives on the field resolver, not bolted onto a REST route.

---

## 7. Security hardening (beyond auth)

A tool collecting well-being data about real people in the UK needs to take this seriously. Concretely:

- **Input validation**: Zod on every mutation input. Never trust the client.
- **Query cost controls**: depth limiting + complexity analysis (`graphql-depth-limit` / cost plugin) so nobody can send a maliciously nested query that hammers the DB. Disable introspection in production.
- **Rate limiting**: `express-rate-limit` on the `/graphql` endpoint, stricter limits on auth mutations (brute-force protection).
- **Password hashing**: `bcrypt` cost 12 (consistently — the current app mixes 10 and 12), or Argon2id (stronger; **[Open]**).
- **HTTP hardening**: `helmet`, explicit CORS allow-list (current app allows all origins), HTTPS only, secure cookies.
- **Secrets**: `.env` never committed; document required vars; use a secrets manager in production (Render/railway env, not files).
- **CSRF**: with `SameSite=Strict` cookies + a custom header requirement on mutations, CSRF risk is low; document the reasoning.
- **Audit trail**: log admin actions (delete response, change role) with actor + timestamp. Researchers/ethics boards will ask.

### 7.1 Data-protection / research ethics (UK GDPR)

Not optional for this domain — worth designing in, not bolting on:
- **Consent** is already a first-class field; enforce it server-side (reject `consent: false`).
- **Pseudonymisation**: real identity (email/username) is separated from responses via `surveyUsername`; exports use only the pseudonym.
- **Right to erasure**: a `deleteUser` flow that anonymises responses (null the `userId`, keep the pseudonymised data) rather than destroying research data — document this in the privacy notice.
- **Data export** for the research team: CSV/XLSX generation server-side, Admin-only, logged.
- Recommend confirming the **ethics approval / data-handling requirements** with Professor Ware's team before go-live — the schema supports it but the policy is theirs to set. **[Open — needs stakeholder input]**

---

## 8. Frontend architecture

### 8.1 Stack

React 19 + TypeScript + Vite 8 + Apollo Client 4 + Tailwind 4. Apollo Client's generated hooks (via codegen) give you `useSubmitSurveyMutation()` etc. with fully typed variables and results — the payoff of the schema-first approach.

### 8.2 State

- **Server state** → Apollo Client cache (this replaces most of what Redux did in the current app). Apollo's normalised cache handles caching, refetching, optimistic updates.
- **Client-only UI state** (theme, form wizard step) → React context / `useReducer`. **Redux is likely unnecessary in v2** — dropping it is a simplification, not a loss.

### 8.3 Routing & structure

React Router 7. Route groups: public (home, about, sign-in/up), authenticated (take survey, my responses), and dashboard (role-gated: Group Admin sees their group; Admin sees everything). Route guards mirror the server RBAC — but remember the guard is UX only; the server is the real gate.

### 8.4 UI/UX improvements over v1

- **Survey as a multi-step wizard** with a progress bar instead of one long form — much better completion rates, and lets you validate per-step.
- **Accessibility (WCAG 2.2 AA)** — this is a well-being survey for a broad Welsh public; keyboard nav, proper labels, sufficient contrast, screen-reader support for the radio scales. Non-negotiable for a public research instrument, and likely a funder requirement.
- **Bilingual readiness (English/Welsh)** — public-sector Wales often requires Welsh-language provision (Welsh Language Standards). Even if v1 ships English-only, structure copy with an i18n layer (`react-i18next`) so Welsh can be added without a rewrite. **[Open — confirm requirement]**
- **Clear consent & privacy screen** before the survey.
- **Responsive dashboard** with the response table, filters (by group, date, demographics), and charts (average score per question, distributions) — the analytical view researchers actually want. Uses the `SurveyAnswer` rows from §4.
- **Loading/empty/error states** designed, not afterthoughts.

### 8.5 Component layer — **[Open decision]**

Two reasonable paths:
- **Keep Flowbite-React** — least new to learn, you know it.
- **Move to shadcn/ui + Radix** — you own the component code, better accessibility primitives, more modern feel, pairs beautifully with Tailwind 4. More to learn.

My lean: **shadcn/ui**, because accessibility matters here and you're already rebuilding. But it's a real time cost. Your call.

---

## 9. Repository & folder structure

Monorepo, two apps. (You could split into two repos, but a monorepo with shared types is simpler for one developer.)

> See the **Project layout** section of the [README](../README.md) for the current repository structure. The tree originally sketched here (with `packages/graphql-types`, a `web/` app, DataLoader `loaders/`, and so on) reflects the *intended* full-stack layout; the backend as built lives under `server/`, and the frontend folders will appear when that phase begins.

---

## 10. Data migration (Mongo → Postgres)

This is **real work, not a config flag** — being honest so it's not a surprise. If the current app has live research data you must keep:

1. Export the Mongo collections (`mongoexport` → JSON).
2. Write a one-off migration script (`server/scripts/migrate-from-mongo.ts`) that: creates `SurveyOption`/`SurveyQuestion` reference rows, then maps each Mongo user/group/survey doc to Postgres rows, converting the `surveyAnswers: [Number]` array into `SurveyAnswer` rows and mapping demographic strings to enum/lookup IDs.
3. Reconcile: row counts + spot-checks + total-score sums before/after.
4. Keep the Mongo dump as an immutable backup.

If there's **no data worth keeping** (or it's just test data), skip all of this and start clean — much simpler. **[Open — do you have real responses to preserve?]**

---

## 11. Testing & quality

- **Unit**: Zod validators, score calculations, auth guards (Vitest).
- **Integration**: resolvers against a real Postgres (Testcontainers or a disposable test DB) — the highest-value tests; they catch the role-scoping bugs that matter most for data privacy.
- **E2E**: a couple of Playwright flows (sign up → take survey → see it in dashboard).
- **CI**: GitHub Actions — lint, typecheck, test, `prisma migrate` check on every PR.
- **Tooling**: ESLint + Prettier, strict `tsconfig`, GraphQL codegen in CI so schema/types can't drift.

---

## 12. Deployment

- **DB**: managed Postgres (Render, Neon, Railway, or Supabase). Neon/Supabase have generous free tiers suited to a research project.
- **Server**: containerised Node on Render/Railway/Fly.
- **Web**: static build on Vercel/Netlify/Render static.
- **Env**: `DATABASE_URL`, `JWT_SECRET`, `REFRESH_SECRET`, `GOOGLE_CLIENT_ID`, `CORS_ORIGIN`, `NODE_ENV`.
- **Migrations**: `prisma migrate deploy` in the release step.
- Prefer one platform for DB + server to keep latency and config low. **[Open — deployment target?]**

---

## 13. Phased implementation roadmap

Ordered so you always have something runnable and learn one layer at a time. This is what I'd propose we actually build, phase by phase, in later sessions.

**Phase 0 — Foundation (½–1 day)**
Monorepo, Docker Postgres, Prisma schema + first migration, seed script (14 questions, options, one admin). Deliverable: `npx prisma studio` shows the seeded DB. *Learn: Prisma + Postgres, no GraphQL yet.*

**Phase 1 — GraphQL server skeleton (1 day)**
Apollo Server 5 + Express, context, one query (`surveyDefinition`) and one query (`me`). Codegen wired. Deliverable: Apollo Sandbox runs a real query. *Learn: schema → resolver → response, the core loop.*

**Phase 2 — Auth vertical slice (1–2 days)**
`signUp`/`signIn`/`refreshSession`/`signOut`, cookies, guards, RBAC context. Deliverable: you can register and log in via GraphQL. *Learn: mutations, context, authorization.*

**Phase 3 — Survey CRUD reference slice (1–2 days)** ← the heart of your learning goal
Full `submitSurvey` (transactional create), `surveyResponses` (role-scoped read + pagination + DataLoader), `updateSurveyResponse`, `deleteSurveyResponse`. Deliverable: complete CRUD you can replay in Sandbox. *Learn: all four CRUD verbs, N+1, transactions.*

**Phase 4 — Groups (1 day)**
Create group, invite codes, membership, group-scoped access.

**Phase 5 — Frontend foundation (1–2 days)**
React + Apollo Client + auth flow + typed hooks. Sign in/up UI wired to the real API.

**Phase 6 — Survey wizard UI (1–2 days)**
Multi-step accessible form, validation, submission, confirmation.

**Phase 7 — Dashboard (2–3 days)**
Role-scoped response table, filters, charts, CSV/XLSX export.

**Phase 8 — Hardening & ship (1–2 days)**
Rate limiting, helmet, depth limits, tests, CI, deploy, migration (if needed), docs for the research team.

Rough total: ~2–3 focused weeks. Front-loaded learning; each phase is independently demoable.

---

## 14. Future extensions (noted, not now)
- **Survey builder** so researchers define their own instruments (the schema's `SurveyQuestion`/`SurveyOption` tables already lean this way).
- **Longitudinal tracking** (same respondent over time) for well-being trends.
- **Welsh language** full rollout.
- **Advanced analytics** / statistical export (SPSS/R-friendly formats).

---

## 15. Decisions I need from you

1. **Component library** — shadcn/ui (my lean) vs. keep Flowbite? (§8.5)
2. **Existing data** — real responses to migrate, or start clean? (§10)
3. **Welsh language** — required for v1, or English-first with i18n scaffolding? (§8.4)
4. **Deployment target** — any platform preference / existing Render setup to reuse? (§12)
5. **Password hashing** — bcrypt (familiar) vs. Argon2id (stronger)? (§7)
6. **Ethics/data-handling constraints** from the research team I should design around? (§7.1)

Answer those and I'll start Phase 0. Or if you want to change any **[Decided]** item first, now's the moment — it's far cheaper to change here than after code exists.


---

# Addendum — As-Built Changes & Decisions

**Added: 2026-09-17 · Status: reflects the backend as actually implemented**

Everything above is the original design draft (14 September 2026), kept **unchanged** as the historical record of the plan we started from. This addendum records how the build actually evolved — the decisions taken *during* implementation and, crucially, *why* — so the document as a whole tells the full story: the plan, and the reasoning that reshaped it.

Three forces drove most of the changes: **fidelity to the validated SWSWBS instrument** (the scoring must match the published User Guide exactly), **participant privacy and confidentiality under UK GDPR** (this is well-being and mental-health data about real people in Wales), and **sequencing the work so correctness is proven before any UI is built**.

Legend: **[Implemented]** built and tested · **[Deferred]** planned, not yet built · **[Dropped]** deliberately decided against.

## A. Authentication & identity

- **[Dropped] Google / OAuth sign-in.** The draft (§6.2) kept Google sign-in. We removed it entirely — no `signInWithGoogle`, no `AuthProvider` table in use. Rationale: **confidentiality and data minimisation** — a well-being study should not hand participant identity to a third-party identity provider, and it removes an external dependency, a cost, and an attack surface. Simpler is safer here.
- **[Implemented] Email + password with email verification.** New since the draft. Sign-up creates a `NORMAL_USER`; a verification token is generated, the **raw** value handed to the user (printed to the dev console for now, as there is no email service yet) while only its **SHA-256 hash** is stored. Verifying the email also logs the user in. Rationale: confirm ownership of the email, and hash-at-rest means a database leak cannot be used to verify or reset an account.
- **[Implemented] Single JWT access token (7-day), sent as an `Authorization: Bearer` header, on Apollo Server 5 *standalone*** (`startStandaloneServer`, no Express yet). This is the working auth core we tested end-to-end.
- **[Deferred] httpOnly access + refresh cookies with rotation, hosted on Express.** The draft's stronger token model (§6.1) is a pre-production hardening step, not abandoned — the `RefreshToken` model is retained for it. Rationale: get a correct, testable auth core first; move to cookies + refresh rotation + Express middleware during the hardening phase.

## B. Survey scoring — fidelity to the SWSWBS User Guide

- **[Implemented] Answer scale is 1–5, not 0–4; total range is 14–70.** The draft assumed 0–4 (total 0–56). We corrected this against the **actual SWSWBS User Guide** — this is a research-fidelity fix, the most important correctness change in the project.
- **[Implemented] Missing-data rule.** A respondent must answer at least **12 of 14** items; missing items are imputed with the mean of the answered ones, then all 14 summed (which reduces to `sum × 14 / n`). Straight from the User Guide.
- **[Implemented] Three validated subscales.** Each question carries a `factor` (1–3); a subscale score is the sum of that factor's answered items. Not in the draft — added to match the instrument's validated structure.
- **[Implemented] 14-day cooldown + `surveyEligibility`.** One submission per fortnight, matching the scale's recall window, enforced on both the advisory query and the write itself. Rationale: prevents overlapping/duplicate responses from distorting the data.

## C. Groups & confidentiality (expanded well beyond the draft's one line)

The draft's Phase 4 was a single line ("create group, invite codes, membership, group-scoped access"). In build we designed a full role-based model, driven by confidentiality:

- **Only the site admin grants the group-admin role** (`grantGroupAdmin`). There is no "sign up as group admin" and no in-app request button. Rationale: a self-appointed group admin who could view others' responses would be a **confidentiality breach** — so the trust decision is centralised and made off-platform.
- **[Implemented]** Group admins then **self-create** their own cohorts (`createGroup`, unique invite codes); members `joinGroup` / `leaveGroup`; a group can have **co-admins** (`addGroupAdmin`, which shares a group among already-trusted admins but never grants the role); admins can `removeMember` from their own group (removing a *fellow admin* is reserved for the site admin); and the site admin can `reassignMember` across groups.
- Role-scoped reads (from Phase 3) guarantee a group admin only ever sees **their own groups'** responses — the layer that actually protects participants.

## D. Privacy & data protection (UK GDPR) — retained and reinforced

- **[Implemented] Avatars are preloaded personas/emojis, not uploaded photos** (`User.avatar`). The draft had `profilePicture`. Rationale: data minimisation — no real participant images.
- **[Implemented] Pseudonymisation** via the confidential `surveyUsername` handle, and **consent enforced server-side** (a submission with `consent: false` is rejected), and **soft deletes** so collected data is never destroyed by accident — all as the draft's §7.1 intended.
- **[Deferred] Right-to-erasure by anonymisation** (a `deleteUser` flow that nulls the user link but keeps the pseudonymised research data) remains the planned approach.

## E. Deferred hardening (before production)

Consciously sequenced *after* the functional backend, all still planned: **Zod** input validation, **rate limiting** (esp. on auth mutations), **helmet** + explicit CORS allow-list, GraphQL **query depth/complexity limits**, **disabling introspection in production**, and **stripping error stack traces in production** (they currently show in dev, which is fine locally but must be off in prod), plus an **audit trail** of admin actions. These make up the GDPR/production security posture.

## F. Tooling / performance (planned when needed)

**GraphQL Codegen**, **DataLoader** (the N+1 fix), and **cursor pagination** were all in the draft and remain sensible; they'll be added when the frontend actually consumes the API, rather than up front. The current backend is typed by hand and returns plain lists, which is enough to prove correctness.

## G. Sequencing change

We built and **proved the entire backend end-to-end** (via Apollo Sandbox tests: auth, scoring, cooldown, and the full group lifecycle) **before starting the frontend**, rather than interleaving as the draft's roadmap did. Rationale: for a research tool, the correctness of scoring, authorization and confidentiality must be verified before any UI is layered on top.

## H. Platform mechanics (Prisma 7)

The draft's Prisma snippet predates the Prisma 7 details we hit in practice: the datasource URL lives in **`prisma.config.ts`** (not `schema.prisma`), it uses a **driver adapter** (`@prisma/adapter-pg` + `pg`), the generator is **`prisma-client`** with an explicit `output`, and `migrate dev` **no longer auto-generates the client or seeds** (both are separate steps).

## Still open — to confirm with the research team

The draft's §15 questions that touch policy remain genuinely open and are **stakeholder decisions**: ethics / data-handling constraints, whether **Welsh-language** provision is required for v1, the exact **demographic field set**, and the **deployment target**. The schema supports all of these; the policy is the research team's to set.
