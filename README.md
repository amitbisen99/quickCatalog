# QuickCatalog

B2B SaaS catalog management platform. Vendors build product catalogs
(manually or via AI-assisted Excel/PDF import), share them via link/QR
code, and receive buyer enquiries.

- `backend/` — Node.js + Express API, MongoDB
- `frontend/` — Next.js + TypeScript PWA
- `docs/ARCHITECTURE.md` — architecture, DB schema, and configuration
  guidelines (start here)

Built in phases following `QuickCatalog_Development_Prompts` — see
`docs/ARCHITECTURE.md` §6 for open decisions to confirm before later
phases.

## Local ports

This machine also runs the **Nahca** project (`C:\xampp\htdocs\Nahca`),
which claims port 3000 for its own Next.js app. QuickCatalog uses
non-conflicting ports so both can run at the same time:

| Service | Port |
|---|---|
| QuickCatalog frontend (Next.js) | 3010 |
| QuickCatalog backend (Express) | 5000 |
| Nahca web (Next.js) | 3000 |
| Nahca api (Express) | 4000 |
| Nahca cms (Strapi) | 1337 |

Databases don't conflict either: QuickCatalog uses MongoDB (default
27017), Nahca uses XAMPP's MySQL (default 3306).

## Running locally

Three things need to be running, in this order:

1. **MongoDB**: `scripts\start-mongo.cmd` (leave the window open — it's
   not installed as a service, see `docs/ARCHITECTURE.md` §7 for why)
2. **Backend**: `cd backend && npm run dev` → `http://localhost:5000`
3. **Frontend**: `cd frontend && npm run dev` → `http://localhost:3010`
