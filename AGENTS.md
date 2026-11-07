# AGENTS.md

## Project Overview

Detoke is a directory of neighborhood businesses with online catalogs: each business has a page with products, hours, map, payment and delivery options, and orders go through WhatsApp. Single-app repo: Vite + React 19 frontend, Express 4 backend (SQLite by default, Postgres with `DATABASE_URL`).

## Language Rule

Code is in English: file names, variables, types, columns, API routes, JSON keys and comments. Everything the user sees is in Spanish: screens, toasts, API error messages and the WhatsApp message. Public web URLs (`/negocio/:slug`, `/explorar`) are user-visible and stay in Spanish.

## Commands

- `npm run dev` — dev server (`tsx watch server.ts`, port 3000, Vite middleware mode)
- `npm run build` — Vite production build to `dist/`
- `npm start` — production server (`NODE_ENV=production`, serves `dist/`)
- `npm run lint` — **typecheck only** (`tsc --noEmit`)
- `npm test` — API tests (vitest + supertest, temporary SQLite)
- `npm run db:seed` — **wipes the database** and loads `server/data/seed/*.json`
- `npm run db:check-images` — fails if the seed references an image that does not exist

Run `npm run lint` and `npm test` before any commit.

## Architecture

```
server.ts           → Express entry point (API + Vite middleware in dev, dist/ in production)
server/config.ts    → The only place that reads process.env
server/db.ts        → Sequelize init, initDb({ reset? })
server/app.ts       → createApp(): compression, cors, json, morgan, /data static, /api routes, errors
server/models/      → User, Business, BusinessCategory, Product, ProductCategory (sequelize-typescript)
server/routes/      → auth, businesses, products, categories, search
server/middleware/  → requireAuth (JWT Bearer), errorHandler (also asyncHandler, HttpError)
server/services/    → upload (multer + sharp), seed, slug, response (ok helper)
shared/             → business.ts (hours, open status, labels), schemas.ts (zod), profile.ts, types.ts
src/                → React SPA: layouts/, pages/, pages/dashboard/, components/, context/, react-router v7
src/api.ts          → Fetch client; unwraps { success, data } and throws ApiError
src/components/ui/  → shadcn/ui (new-york). Brand tokens live in src/index.css
```

**Key patterns:**
- API responses are always `{ success, data }` or `{ success: false, error }`, errors in Spanish.
- API routes: `/api/auth`, `/api/businesses`, `/api/products`, `/api/business-categories`, `/api/product-categories`, `/api/search`, `/api/contact`, `/api/health`.
- Express 4 does not catch async errors: wrap every async handler in `asyncHandler`, and throw `HttpError` or let zod throw.
- A seller `User` owns one `Business`. `POST /api/auth/register` creates both in a transaction.
- Validation lives in `shared/schemas.ts` and is reused by the API and by react-hook-form.
- `hours`, `gallery`, `images`, `deliveryOptions` and `paymentMethods` are JSON columns.
- "Open now" uses `openStatus()` from `shared/business.ts`, in the Buenos Aires time zone. It supports split shifts and overnight ranges.
- Admin impersonation: `POST /api/admin/impersonate/:userId` returns a 2 h token for the seller with `actorId` and `impersonationLogId`. `requireAuth` sets `req.impersonation`, every write is stored in `audit_logs`, and `requireAdmin` rejects impersonation tokens. Wrap future email, password or account deletion routes in `requireOwnSession`. The web keeps the admin token in `detoke.adminToken` while impersonating.
- Google sign-in: server-side OAuth (`server/routes/google.ts`). The callback never puts the JWT in a URL: it redirects to `/auth/callback?code=` with a one-time code (in memory, 60 s) traded at `POST /api/auth/google/exchange`. New Google accounts have no password and no business; the web sends them to `/register?step=business`, which uses `POST /api/businesses/me`. Admins can't sign in with Google.
- Deploy: Render (`render.yaml`). Every absolute URL comes from `APP_URL`. Production requires `DATABASE_URL` (or an explicit `DATABASE_PATH`).
- Contact messages live in `contact_messages`. `server/services/mail.ts` emails them only when `SMTP_HOST` is set. There is no inbox screen yet: `GET /api/contact` is admin-only.
- Search folds accents in JS (`fold()`), so `/api/businesses` and `/api/search` load all rows: revisit if the catalog grows.

## Gotchas

- Test mode: there are no migrations and `sync` does not alter SQLite tables. After changing a model, run `npm run db:seed`.
- `tsx` (esbuild) doesn't emit decorator metadata: always pass an explicit `DataType` to `@Column`.
- Never return a value from a `useEffect` arrow by accident: `window.scrollTo()` returns a Promise in current Chrome, and React then crashes calling it as cleanup.
- Components copied from other projects may use tokens that don't exist here (`bg-brand`): Tailwind drops them silently.
- `data/images/` (seed photos) is in git; `data/uploads/` is not. Keep the `/data/uploads/` rule in `.gitignore` anchored to the root.
- Many files in `data/images` do not show what their name says. Check the picture before using one in the seed, and run `npm run db:check-images`.
- `.env`, `database.sqlite` and `scripts/legacy/` API keys must never be pushed or published.
- `scripts/legacy/` is the old image and seed tooling, kept for reference. Its relative paths are not maintained.
