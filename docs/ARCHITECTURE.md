# QuickCatalog — Architecture & Configuration Guidelines

Output of Prompt 1 (Phase 1). This is a planning/reference document — no
application code yet. It defines the folder structure, database design, and
configuration conventions that every later phase should follow.

## 1. Repository layout

Two independently deployable services (matches Prompt 21's DigitalOcean App
Platform layout: separate frontend + backend components against one managed
MongoDB).

```
Quickcatalog/
├── backend/                 Express API
│   └── src/
│       ├── config/          env loader, db connection, third-party SDK setup
│       ├── models/          Mongoose schemas (one file per collection)
│       ├── controllers/     request handlers, one file per resource
│       ├── routes/          route definitions, one file per resource
│       ├── middleware/      auth, error handling, rate limiting, validation
│       ├── services/        email (Brevo), storage (DO Spaces), AI parsing
│       └── utils/           shared helpers (slugify, token gen, etc.)
├── frontend/                Next.js PWA
│   ├── pages/
│   │   ├── auth/            login, signup, verify-email, password reset
│   │   ├── dashboard/       vendor-facing app (catalogs, products, etc.)
│   │   ├── public/          public catalog pages ([catalogSlug])
│   │   └── admin/           super admin panel
│   ├── components/          shared UI components
│   ├── hooks/                custom React hooks
│   ├── utils/                 shared frontend helpers (api client, formatters)
│   ├── styles/                 global Tailwind/CSS
│   └── public/                 static assets, PWA icons, manifest.json
└── docs/                      architecture & planning docs (this file)
```

Each service gets its own `package.json`, `.env`, and deploy pipeline —
scaffolded in later prompts (Prompt 2 for frontend, Prompt 3 for backend).

## 2. MongoDB collection design

All vendor-owned collections carry `vendorId` for tenant scoping. All
`_id` fields are Mongo ObjectIds unless noted.

### `users` (vendors)
| Field | Type | Notes |
|---|---|---|
| email | String | unique, lowercase, indexed |
| mobileNo | String | |
| password | String | bcrypt hash |
| businessName | String | |
| businessType | String | dropdown-controlled |
| industry | String | dropdown-controlled |
| logo | String | DO Spaces URL |
| status | String | `unverified` \| `verified` \| `inactive` |
| subscriptionType | String | `free` \| `paid` |
| subscriptionExpiresAt | Date | null for free tier |
| otp / otpExpiresAt | String / Date | email verification |
| resetPasswordTokenHash / resetPasswordExpiresAt | String / Date | forgot-password flow |
| createdAt | Date | |

### `catalogs`
| Field | Type | Notes |
|---|---|---|
| vendorId | ObjectId → users | indexed |
| name | String | |
| description | String | |
| slug | String | **globally unique** (it's the public URL path), indexed |
| qrCode | String | DO Spaces URL to generated PNG |
| createdAt / updatedAt | Date | |

### `products`
| Field | Type | Notes |
|---|---|---|
| catalogId | ObjectId → catalogs | indexed |
| name | String | |
| description | String | rich text (HTML from ReactQuill) |
| price | Number | single price, no variants |
| unit | String | pieces, kg, meters, ... |
| minimumOrderQuantity | Number | |
| images | [String] | up to 3 DO Spaces URLs |
| video | String | URL or embed code |
| categoryId | ObjectId → categories | nullable |
| specifications | Map<String,String> | key = specification name, value = product-specific value |
| createdAt / updatedAt | Date | |

### `categories`
| Field | Type | Notes |
|---|---|---|
| vendorId | ObjectId → users | indexed |
| name | String | unique per vendor |
| description | String | |

### `specifications`
| Field | Type | Notes |
|---|---|---|
| vendorId | ObjectId → users | indexed |
| name | String | unique per vendor, e.g. "Size" |
| type | String | predefined enum or `custom` |

### `enquiries`
| Field | Type | Notes |
|---|---|---|
| catalogId | ObjectId → catalogs | indexed |
| vendorId | ObjectId → users | indexed, denormalized for fast dashboard queries |
| visitorName / visitorEmail / visitorMobile | String | required, validated |
| productsOrdered | [{ productId, name, price, quantity }] | snapshot at enquiry time |
| status | String | `new` \| `resolved` (optional tracking) |
| createdAt | Date | |

### `analytics`
| Field | Type | Notes |
|---|---|---|
| catalogId | ObjectId → catalogs | indexed |
| vendorId | ObjectId → users | indexed |
| visitorId | String | anonymous ID from browser storage |
| visitorIp | String | |
| visitorLocation | { country, region } | resolved via geolocation lookup |
| device | String | mobile \| desktop \| tablet |
| source | String | direct \| referral \| social |
| timestamp | Date | indexed for date-range queries |

### `supportTickets`
| Field | Type | Notes |
|---|---|---|
| vendorId | ObjectId → users | indexed |
| subject | String | |
| message | String | initial message |
| replies | [{ author, message, createdAt }] | admin ↔ vendor thread |
| status | String | `open` \| `closed` |
| createdAt | Date | |

**Indexes to create early:** `users.email` (unique), `catalogs.slug`
(unique), `catalogs.vendorId`, `products.catalogId`, `enquiries.vendorId`,
`analytics.catalogId` + `analytics.timestamp` (compound, for date-range
aggregation).

## 3. Backend configuration guidelines

**Database connection** (`config/db.js`): single Mongoose connection
created once at server boot, exported and reused — no per-request
connections. Fail fast (exit process) if the initial connection fails.

**JWT authentication**: access token (7-day expiry) + refresh token
(30-day expiry), both issued on login and stored as `httpOnly`, `secure`,
`sameSite=lax` cookies — never returned in a JSON body. A single
`verifyToken` middleware attaches `req.user`; a second `authorize(role)`
middleware distinguishes vendor vs. super-admin routes (admin has its own
login endpoint and token, per Prompt 17). Refresh happens via a dedicated
`/api/auth/refresh` endpoint called by the frontend on 401.

**Error handling**: one centralized `errorHandler` middleware at the end
of the middleware chain. Route handlers throw or call `next(err)`;
nothing formats error responses inline. Consistent shape:
`{ success: false, message, errors? }`. A small `AppError` class carries
`statusCode` + `message` for expected errors (validation, not-found,
unauthorized); anything else is logged and returned as a generic 500.

**CORS**: whitelist exactly the known frontend origins (dashboard app URL,
admin app URL if separate) via `CLIENT_URL`/`ADMIN_URL` env vars,
`credentials: true` (required for cookie-based auth). No wildcard origins
in production.

**Rate limiting**: two tiers via `express-rate-limit`.
- Global: generous limit on all `/api/*` routes.
- Strict: tighter limit on `/api/auth/*` (login/signup/OTP) and on the
  public, unauthenticated routes (`/api/public/*`,
  `/api/analytics/track`) since those have no auth to fall back on for
  abuse prevention.

## 4. Frontend configuration guidelines

- Next.js with TypeScript, Pages Router (matches the page paths used
  throughout the prompt set, e.g. `pages/dashboard/catalogs/[catalogId]`).
- API calls go through a single typed API client (`utils/api.ts`,
  scaffolded in a later prompt) that reads `NEXT_PUBLIC_API_URL` and
  attaches credentials so the httpOnly auth cookie is sent.
- Auth state lives in a React context, hydrated from a `/api/users/profile`
  call on load; a `withAuth` wrapper component protects `/dashboard/*` and
  `/admin/*` routes client-side (server-side guards are enforced by the
  backend regardless).
- Tailwind CSS for styling; mobile-first responsive breakpoints since the
  public catalog page and PWA are the primary mobile surfaces.

## 5. Environment variables

See `backend/.env.example` and `frontend/.env.example` for the full list.
Categories: server/runtime, MongoDB, JWT secrets, Brevo, DigitalOcean
Spaces, Razorpay, Stripe, AI provider (catalog parsing), admin
credentials, rate limiting, geolocation.

## 6. What's still open (from initial review)

These aren't blocking Prompt 1, but should be settled before the phases
that depend on them:
- **Image upload handler**: confirmed as direct multipart upload through
  the Express API → Sharp → DigitalOcean Spaces (not client-side
  presigned URLs). Revisit if upload volume becomes a bottleneck.
- **AI provider for catalog parsing** (Prompt 9): env vars scaffolded for
  both Anthropic and OpenAI — pick one before Phase 4.
- **Admin auth model** (Prompt 17): env-based single admin credential
  (`ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH`) rather than a separate `admins`
  collection, since the spec calls for a single super admin, not a team.
- **MongoDB hosting**: cloud hosting (Digitalocean/Vercel/etc.) is
  deliberately deferred — this project is being built and run locally
  first. See §7 for the local MongoDB setup.
- **Geolocation provider** for analytics IP → location lookup — needed
  before Phase 8.

## 7. Local development environment

Everything runs on this machine, no cloud dependency:

| Service | How it runs | Port |
|---|---|---|
| Frontend (Next.js) | `npm run dev` in `frontend/` | 3010 |
| Backend (Express) | `npm run dev` in `backend/` | 5000 |
| MongoDB | `scripts\start-mongo.cmd` (repo root) | 27017 |

**MongoDB specifics** (Windows, this machine):
- Installed as a **portable zip**, not the MSI installer — the MSI's
  "install as a Windows service" option requires admin rights this
  session couldn't grant (UAC needs an interactive click).
- Pinned to **v6.0.14**, not the latest (8.3.4) — 8.3.4 segfaults
  immediately on this machine (`STATUS_ACCESS_VIOLATION`), almost
  certainly because it needs a newer Visual C++ Redistributable than
  what's installed (`v14.28`, ~VS2019), and installing a newer one also
  needs admin rights. 6.0.14 matches the installed runtime and runs
  cleanly. Worth revisiting if the VC++ Redistributable ever gets
  updated — could move to a current MongoDB version then.
- Binaries: `C:\Users\HP\mongodb\mongodb-win32-x86_64-windows-6.0.14\`
- Data directory: `C:\Users\HP\mongodb-data\db`
- Since it's not a Windows service, **it does not start automatically on
  boot or login** — run `scripts\start-mongo.cmd` (or the equivalent
  `mongod.exe --dbpath ... --port 27017` command) before starting the
  backend each session.
