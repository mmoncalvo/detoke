# AGENTS.md

## Project Overview

Detoke is a directory of neighborhood businesses with online catalogs: each business has a page with products, hours, map and gallery, and orders go through WhatsApp. Single-app repo: Vite + React 19 frontend, Express 4 backend (SQLite by default, Postgres with `DATABASE_URL`).

## Commands

- `npm run dev` — dev server (`tsx watch server.ts`, port 3000, Vite middleware mode)
- `npm run build` — Vite production build to `dist/`
- `npm start` — production server (`NODE_ENV=production`, serves `dist/`)
- `npm run lint` — **typecheck only** (`tsc --noEmit`)
- `npm test` — API tests (vitest + supertest, temporary SQLite)
- `npm run db:seed` — **wipes the database** and loads `server/data/seed/*.json`

Run `npm run lint` and `npm test` before any commit.

## Architecture

```
server.ts           → Express entry point (API + Vite middleware in dev, dist/ in production)
server/config.ts    → The only place that reads process.env
server/db.ts        → Sequelize init, initDb({ reset? })
server/app.ts       → createApp(): cors, json, morgan, /data static, /api routes, error handling
server/models/      → User, Product, Category (sequelize-typescript decorators)
server/routes/      → auth, users, products, categories, search
server/middleware/  → requireAuth (JWT Bearer), errorHandler (also asyncHandler, HttpError)
server/services/    → upload (multer), seed, response (ok helper)
shared/types.ts     → Types shared by server and web (@shared alias)
src/                → React SPA (pages/, components/, context/), react-router v7
src/api.ts          → Fetch client; returns the raw { success, data } JSON
```

**Key patterns:**
- API responses are always `{ success, data }` or `{ success: false, error }`, errors in Spanish.
- URLs are in Spanish (`/api/usuarios`, `/api/productos`, `/api/categorias`) and stay that way.
- Express 4 does not catch async errors: wrap every async handler in `asyncHandler`, and throw `HttpError` or let zod throw.
- A user is a business (`businessName`, `slug`, `whatsapp`); there is no separate business model.
- `images`, `horario` and `galeria` are JSON stored as text.

## Gotchas

- The existing `database.sqlite` uses tables `Users`/`Products`/`Categories` with camelCase columns: never enable `underscored`.
- Association property names (`User`, `Category`, `Products`) are the JSON keys the web reads. Don't rename them.
- `tsx` (esbuild) doesn't emit decorator metadata: always pass an explicit `DataType` to `@Column`.
- `data/` (images and uploads) is not in git. `server/data/seed/` is: keep the `/data/` rule in `.gitignore` anchored to the root.
- `.env`, `database.sqlite` and `scripts/legacy/` API keys must never be pushed or published.
- `scripts/legacy/` is the old image and seed tooling, kept for reference. Its relative paths are not maintained.
