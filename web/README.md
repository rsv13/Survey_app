# SWSWBS — Web (frontend)

The React single-page app for the **South Wales Social Well-being Scale**. It talks
to the GraphQL API in `../server` and is deployed as a Render static site.

- **Stack:** React 19 + Vite + Apollo Client v4 + Tailwind CSS v4 — a custom
  "Ocean" design system with light & dark modes.
- **Routes:** home, sign up, email verification, sign in, forgot/reset password,
  the survey wizard, personal results, groups, analytics, and profile.

## Develop

From the repo root (recommended — starts the database, API and web together):

```bash
npm run dev:all
```

Or run just the web app from this folder:

```bash
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # type-check + production build to dist/
npm run preview    # preview the production build
```

The app reads the API URL from `VITE_API_URL` (defaults to `http://localhost:4000/`).

See the repo-root `README.md` for full setup, and `docs/FRONTEND_DESIGN.md` for the
design system.
