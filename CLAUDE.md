# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server**: `npm run dev` (Next.js dev server on localhost:3000)
- **Build**: `npm run build` (production build)
- **Production server**: `npm start` (runs production build)
- **Lint**: `npm run lint` (ESLint)
- **Bundle analysis**: `ANALYZE=true npm run build` (requires `@next/bundle-analyzer`)

## Architecture Overview

This is a **Next.js 15 app** using the **App Router**, TypeScript, Tailwind CSS, and Supabase for auth and database. The app is an **MPS (Managed Print Services) dashboard** for monitoring printer fleet devices, toner levels, and generating service orders.

### Key Application Layers

1. **Data Source**: `Gas_Gage` table in Supabase - primary device/toner data
2. **Server Components**: Fetch data server-side, transform Gas_Gage rows to DeviceRow format
3. **Client Components**: Interactive UI (tables, filters, charts) marked with `"use client"`
4. **API Routes**: Handle CSV imports, settings updates, batch upserts

### Route Groups & Layouts

- **(dashboard)**: Authenticated pages, enforced by [layout.tsx](src/app/(dashboard)/layout.tsx) which redirects to `/login` if no session
  - `/devices` - main device list/dashboard
  - `/devices/[serial]` - device detail page
  - `/devices/[serial]/settings` - per-device alert thresholds
  - `/devices/import` - CSV upload for Gas_Gage data
  - `/analytics`, `/orders` - additional dashboard pages
- **(auth)**: Login/auth flows (no layout-level auth guard)
- **Root layout** ([layout.tsx](src/app/layout.tsx)): Async server component, fetches session, provides ThemeProvider and SupabaseListener

### Supabase Integration

**Environment variables** (required):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Client patterns**:
- **Server-side**: Import `getSupabaseServerClient()` from [src/lib/supabase/server.ts](src/lib/supabase/server.ts) in server components and API routes. This handles cookies and returns a request-aware client.
- **Client-side**: Import `getSupabaseBrowserClient()` from [src/lib/supabase/client.ts](src/lib/supabase/client.ts) in `"use client"` components only. Throws if env vars missing.

**Database types**: Centralized in [src/lib/database.types.ts](src/lib/database.types.ts). Use typed queries (e.g., `Database["public"]["Tables"]["Gas_Gage"]["Row"]`) for type safety.

### Data Transformation Pattern

The app uses a **Gas_Gage table** as its primary data source but transforms rows to a `DeviceRow` shape for compatibility with the UI dashboard. See [src/app/(dashboard)/devices/page.tsx](src/app/(dashboard)/devices/page.tsx) for the `transformGasGageToDevice()` function. This pattern keeps the UI decoupled from the exact database schema.

### CSV Import Flow

1. User uploads CSV at `/devices/import`
2. Frontend parses CSV with **papaparse**, sends JSON to API route
3. [API route](src/app/api/gas-gage/import/route.ts) transforms rows, handles date/number parsing, and upserts in **batches of 100** using `onConflict: "device_id"`
4. Returns success/error counts

### Alert Settings

Each device can have custom toner thresholds stored in `device_alert_settings` table. The dashboard page joins settings with devices to generate warning messages when toner levels fall below thresholds.

## Component Structure

- **UI primitives**: [src/components/ui/](src/components/ui/) - Button, Card, Input, TonerGauge, etc.
  - Built with **Radix UI**, **class-variance-authority**, **clsx**, and **Tailwind**
  - Match existing prop names and CSS patterns when adding new components
- **Feature components**: [src/components/devices/](src/components/devices/) - DeviceDashboard, TonerGaugeGroup, CSVUpload, etc.
- **Providers**: [src/components/providers/](src/components/providers/) - SupabaseListener for auth state, ThemeProvider

## Development Patterns

### Server vs Client Components
- Files with `"use client"` directive are client components
- Root and dashboard layouts are **async server components** (fetch session before rendering)
- Prefer server components for data fetching; use client components only when needed for interactivity

### API Route Conventions
- Located in `src/app/api/*/route.ts`
- Export HTTP handler functions: `export async function POST(request: NextRequest) { ... }`
- Use `getSupabaseServerClient()` to get request-aware Supabase client
- Return `NextResponse.json()`

### Styling
- **Tailwind CSS v4** + utility classes
- **CSS variables** for theming (dark mode via `next-themes`)
- Use `cn()` utility from [src/lib/utils.ts](src/lib/utils.ts) to merge class names

### Database Operations
- Use typed inserts/updates: `Database["public"]["Tables"]["TableName"]["Insert"]`
- Batch large operations (see CSV import for pattern)
- Use `upsert()` with `onConflict` for idempotent imports

## Testing & Debugging

- **No test scripts defined** - use dev server and browser for manual testing
- **Server-side logs**: Check terminal running `npm run dev` (console.log/console.error)
- **Client-side logs**: Browser console
- API routes can be tested with tools like Postman or `curl`

## Important Files Reference

- **Routing**: [src/app/](src/app/) - layouts, pages, API routes
- **Supabase helpers**: [src/lib/supabase/client.ts](src/lib/supabase/client.ts), [src/lib/supabase/server.ts](src/lib/supabase/server.ts)
- **Types**: [src/lib/database.types.ts](src/lib/database.types.ts)
- **UI components**: [src/components/ui/](src/components/ui/), [src/components/devices/](src/components/devices/)

## Do/Don't Guidelines

- **Do**: Use server Supabase client in server components and API routes
- **Do**: Use typed `Database` shapes from database.types.ts
- **Do**: Transform Gas_Gage rows to DeviceRow format in server components before passing to client
- **Do**: Handle date/number parsing carefully in CSV imports (see parseDate/parseNumber helpers)
- **Do**: Process large imports in batches
- **Don't**: Add direct server-side fetches from client components; use server/client helpers instead
- **Don't**: Skip type annotations when working with Supabase queries
