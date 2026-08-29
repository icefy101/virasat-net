# Virasat Full-Stack Architecture

## Decision

Virasat now uses the managed full-stack scaffold already attached to this project: **Manus OAuth for authentication, Drizzle/MySQL for relational persistence, tRPC for typed server contracts, and S3 helpers for file bytes when storage is enabled**. This keeps the implementation deployable inside the current project rather than introducing a second runtime.

The supplied brief names Supabase Auth, Supabase, MongoDB, Gemini, and FAISS. Those are treated as future adapters, not mandatory runtime dependencies for the first hackathon build. The current authentication source of truth is the scaffold’s `ctx.user`, and every user-owned procedure is protected by `protectedProcedure`. The current data layer keeps financial assets, claims, document metadata, verification state, and FinTwin scenarios in Drizzle tables. A future Mongo/FAISS adapter can be introduced behind the same service boundary for flexible extraction and retrieval workloads.

## Contract Boundary

| Product responsibility | Current full-stack implementation | Future adapter point |
| --- | --- | --- |
| Authentication | Manus OAuth session cookie / bearer fallback; `ctx.user.id` | Supabase Auth token verifier if the project later moves auth providers |
| User/profile | Existing `users` table plus protected profile procedure | Supabase profile repository |
| Assets | `assets` table with mock fallback when DB is unavailable | MongoDB extraction repository or regulator adapters |
| Claims | `claims` table scoped by authenticated user | Regulator-specific workflow adapters |
| Documents | `claimDocuments` metadata table; bytes remain out of the database | S3 storage helper and optional object lifecycle policy |
| AI verification | Deterministic mock parser contract for the demo | Isolated Gemini service returning validated Pydantic/Zod-shaped JSON |
| Retrieval/RAG | Not enabled in the prototype | FAISS index service over approved, non-sensitive corpus |
| FinTwin | Server-side illustrative projection procedure | Product-approved assumptions and scenario persistence |

## Minimum tRPC Surface

The following procedures are the typed equivalent of the requested API surface. They are intentionally small and user-scoped.

| tRPC procedure | Intended API meaning | Auth |
| --- | --- | --- |
| `assets.list`, `assets.byId`, `assets.byRegulator` | `GET /api/assets*` | Protected |
| `dashboard.snapshot` | `GET /api/dashboard` | Protected |
| `claims.list`, `claims.byId`, `claims.create`, `claims.update` | `GET/POST/PATCH /api/claims*` | Protected |
| `claims.addDocument`, `claims.parseDocument`, `claims.prepare`, `claims.markSubmitted` | `POST /api/claims/:id/*` | Protected |
| `documents.list`, `documents.byClaim` | `GET /api/documents*` | Protected |
| `profile.get`, `profile.update` | `GET/PATCH /api/profile` | Protected |
| `notifications.list` | `GET /api/notifications` | Protected |
| `fintwin.simulate`, `fintwin.scenarios`, `fintwin.saveScenario` | `POST/GET /api/fintwin/*` | Protected |

All identifiers and lookups are checked against `ctx.user.id`; clients never provide a trusted `user_id`. Claim submission only records the user’s self-reported state and never calls RBI, EPFO, IRDAI, SEBI, LIC, or another regulator.

## Frontend Fallback

The existing visual prototype remains usable without a configured database or external credentials. Its `DataService` interface keeps the UI independent from persistence. `MockDataService` remains the default for demo stability, while `ApiDataService` is the planned adapter for tRPC-backed data. This permits a gradual migration page by page rather than coupling the hackathon presentation to an unavailable third-party credential.

## Configuration

No new secret is required for the mock-backed full-stack path. The managed scaffold already provides `DATABASE_URL`, `JWT_SECRET`, and Manus OAuth environment variables. Gemini, MongoDB, Supabase, and FAISS should only be enabled after the team decides which external services will be used and provides their credentials through the project secret manager. No credentials are committed to the repository.

The dashboard reads the authenticated backend snapshot when `VITE_USE_BACKEND=true` is present at build time. When the variable is absent or set to any value other than `true`, the existing typed mock service remains active so the presentation environment stays stable. Enabling the backend path assumes that the managed database is reachable through `DATABASE_URL` and that the user is authenticated through the scaffold’s Manus OAuth session or bearer fallback. The backend rejects unauthenticated calls and scopes all reads and mutations to the authenticated `ctx.user.id`.
