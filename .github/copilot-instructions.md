### Quick orientation

- This repo is a Next.js (app router) application (Next 15) using TypeScript. Top-level app code lives in `src/app/` (layouts, pages, and API routes). UI components are in `src/components/` and small libraries in `src/lib/`.
- Key integrations: Supabase (auth + DB) under `src/lib/supabase/{client,server}.ts`. The app uses a server-side RootLayout that reads the Supabase session (`src/app/layout.tsx`).

### How to run / build

- Dev: `npm run dev` (maps to `next dev`).
- Build: `npm run build` then `npm run start` for production server.
- Lint: `npm run lint` (ESLint configured). See `package.json` for scripts.

### Environment & secrets

- Supabase requires: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. These are referenced by both `src/lib/supabase/client.ts` (browser) and `src/lib/supabase/server.ts` (server). Fail-fast behavior is implemented when they are missing.

### Architecture notes for editing/PRs

- File routing and API conventions follow Next.js app-router conventions. Example API route: `src/app/api/gas-gage/import/route.ts` — it exports HTTP handlers (e.g., `export async function POST(request)`), uses `getSupabaseServerClient()` and returns `NextResponse`.
- Supabase usage pattern:
  - Use `getSupabaseServerClient()` in server components and API routes to get a request-aware server client (handles cookies). See `src/lib/supabase/server.ts`.
  - Use `getSupabaseBrowserClient()` from client components only (it throws if env is missing). See `src/lib/supabase/client.ts` and `src/components/providers/supabase-listener.tsx` for an example of auth-state handling.
- Server vs Client: files with `"use client"` at the top are client components. Root layout is async server component and fetches session before rendering.

### Patterns & conventions to preserve

- Database types are centralized in `src/lib/database.types.ts` — prefer using those types when interacting with Supabase to keep type-safety.
- UI primitives: `src/components/ui/*` contain small, composable components (Button, Card, Input, TonerGauge, etc.). Match existing prop names and the CSS class/utility patterns (Tailwind + class-variance-authority + clsx) when adding new components.
- CSV/import pattern: large data imports are transformed in API routes and upserted in batches (see `src/app/api/gas-gage/import/route.ts`), including careful parsing of dates/numbers and batch upserts with `onConflict`.

### Tests / debugging hints

- There are no test scripts defined in `package.json`. For quick runtime checks, run the dev server and use the browser to exercise pages and API routes (e.g., POST to `/api/gas-gage/import`).
- When editing server-side code, remember Next.js server components run on Node — use `console.error`/`console.log` and inspect terminal running `npm run dev`.

### Useful files to reference when coding

- Routing & pages: `src/app/` (layouts and pages)
- API patterns: `src/app/api/*/route.ts` (exported HTTP handler functions)
- Supabase helpers: `src/lib/supabase/{client,server}.ts`
- Types: `src/lib/database.types.ts`
- UI components: `src/components/ui/*`, `src/components/devices/*`

### Do/Don't quick list

- Do: use the server Supabase client in server components and API routes; prefer typed `Database` shapes.
- Do: update env docs / README when adding new required env vars.
- Don't: add direct server-side fetches from client components; use server/client client helpers instead.

If any of these sections are unclear or you want me to pull more examples from specific files (components or API routes), say which area and I will expand or merge with existing guidance.
