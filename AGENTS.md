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
- `npm run db:demo` — reloads only the demo data (`@detoke.test` accounts, their businesses, products and orders, sample messages); real accounts and categories keep their ids. Prefer it over `db:seed` when the database has real data.
- Demo data is set in Uruguay: Montevideo barrios plus Canelones, Maldonado and Colonia; prices in pesos uruguayos (`shared/money.ts`, `es-UY`, `$ 450`), time zone `America/Montevideo`.
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
- "Open now" uses `openStatus()` from `shared/business.ts`, in the Montevideo time zone (`TIMEZONE`, UTC-3). It supports split shifts and overnight ranges.
- Admin impersonation: `POST /api/admin/impersonate/:userId` returns a 2 h token for the seller with `actorId` and `impersonationLogId`. `requireAuth` sets `req.impersonation`, every write is stored in `audit_logs`, and `requireAdmin` rejects impersonation tokens. Wrap future email, password or account deletion routes in `requireOwnSession`. The web keeps the admin token in `detoke.adminToken` while impersonating.
- Google sign-in: server-side OAuth (`server/routes/google.ts`). The callback never puts the JWT in a URL: it redirects to `/auth/callback?code=` with a one-time code (in memory, 60 s) traded at `POST /api/auth/google/exchange`. New Google accounts have no password and no business; the web sends them to `/register?step=business`, which uses `POST /api/businesses/me`. Admins can't sign in with Google.
- Deploy: Render (`render.yaml`). Every absolute URL comes from `APP_URL`. Production requires `DATABASE_URL` (or an explicit `DATABASE_PATH`).
- Geocoding goes through `/api/geo` (`server/services/geo.ts`): Georef for Argentine cities, Photon for Uruguayan cities, addresses and reverse lookups. Cached in memory and throttled to one request per second per host; tests stub `fetch`. The shared UI is `src/components/dashboard/LocationFields.tsx`.
- Orders: `shared/orders.ts` holds the statuses (pending → confirmed → completed, or cancelled; kept few on purpose), transitions, labels and badge tones; the server recalculates prices from the database. Realtime is Socket.IO (`server/services/realtime.ts`, events typed in `shared/realtime.ts`): JWT in the handshake, rooms `business:{id}` (owner or admin) and `order:{publicCode}` (read only). Change state only through the REST API, which emits. On the web use `getSocket()` from `src/socket.ts` and the hooks in `src/hooks/useRealtime.ts`, which rejoin rooms and refetch after reconnecting. New-order alerts (toast, sound, tab title count, browser notification in the background) live in `OrderAlertsProvider` (`src/context/OrderAlertsContext.tsx`), mounted in `App`, so the owner hears them on any page; it alone joins the `business:{id}` room, and views read the count with `usePendingOrders()`. The checkout sends a `clientRequestId` per attempt (idempotent create, serialized with `oneAtATime`); orders placed from the browser live in `src/lib/recentOrders.ts` (`detoke.recentOrders`, pure helpers tested in `test/recent-orders.test.ts`) and render through `src/components/orders/RecentOrders.tsx`.
- Dashboard filters and tabs live in the URL query (`useUrlState`, as in Explorar), so reloading or going back keeps them.
- Contact messages live in `contact_messages`. `server/services/mail.ts` emails them only when `SMTP_HOST` is set. There is no inbox screen yet: `GET /api/contact` is admin-only.
- Search folds accents in JS (`fold()`), so `/api/businesses` and `/api/search` load all rows: revisit if the catalog grows.

- Link previews: the WhatsApp message is only the order link. `server/services/pageMeta.ts` writes Open Graph and Twitter tags into index.html for `/pedido/:code` and `/negocio/:slug` (in dev on Vite's HTML, in production on `dist/index.html`), escaping every value and never including customer data. The image is `/api/og/business/:slug.jpg`: the business photo as a 1200×630 JPEG with the awning drawn as shapes (no text, so it needs no fonts on the server). Previews only work from the public URL (`APP_URL`), not localhost.

- Logo: `src/components/brand/LogoMarks.tsx` holds the three explored marks; `LogoMark` is the one in use and `Wordmark` the "detoke" lettering. `npm run brand:icons` writes `public/favicon.svg`, `favicon-32.png` and `apple-touch-icon.png` from it; the brand preview image (`/api/og/site.jpg`) reads the favicon. `/dev/logo` compares the options and exists only in development.

## UI Conventions

- Everything clickable shows the hand cursor. `src/index.css` (`@layer base`) sets `cursor: pointer` on enabled buttons, links with `href`, ARIA roles button/tab/menuitem/option/checkbox/radio/switch, `summary`, `label[for]`, `select` and clickable inputs, and `cursor: not-allowed` on disabled controls (Tailwind v4 leaves buttons with the default cursor). Menu, command and select items use `cursor-pointer`; disabled `Button`s use `disabled:cursor-not-allowed`. Any other clickable element (a `div` or card with `onClick`) needs `cursor-pointer` explicitly, or better, should be a `button` or `Link`.

- Never open new tabs: no `target="_blank"` or `window.open`. In-app navigation uses react-router `Link`; external links (WhatsApp, maps, Instagram, websites) are plain `<a href>` or `window.location.assign`, so on a phone WhatsApp opens its app and Back returns to Detoke. The checkout writes what it sent to `sessionStorage` before leaving for WhatsApp, so the confirmation is still there on return.
- Surfaces: the page (`--background`) is the muted one; the navbar and the panel header (`--navbar`) and cards are the cleaner surfaces on top.

## Gotchas

- Test mode: there are no migrations and `sync` does not alter SQLite tables. After changing a model, run `npm run db:seed`.
- `tsx` (esbuild) doesn't emit decorator metadata: always pass an explicit `DataType` to `@Column`.
- Never return a value from a `useEffect` arrow by accident: `window.scrollTo()` returns a Promise in current Chrome, and React then crashes calling it as cleanup.
- Components copied from other projects may use tokens that don't exist here (`bg-brand`): Tailwind drops them silently.
- `data/images/` (seed photos) is in git; `data/uploads/` is not. Keep the `/data/uploads/` rule in `.gitignore` anchored to the root.
- Many files in `data/images` do not show what their name says. Check the picture before using one in the seed, and run `npm run db:check-images`.
- `.env`, `database.sqlite` and `scripts/legacy/` API keys must never be pushed or published.
- `scripts/legacy/` is the old image and seed tooling, kept for reference. Its relative paths are not maintained.
- Account: `/dashboard/account` (`src/pages/dashboard/Account.tsx`, also for admins) edits the session user through `PATCH /api/auth/me`, `POST /api/auth/me/password` (rate limited; a wrong current password is a 400, never a 401, so it does not end the session) and `/api/auth/me/avatar`. Call `setUser` from `useAuth` with the response so the sidebar updates. While impersonating, email and password changes are refused (403) and every write is audited.
