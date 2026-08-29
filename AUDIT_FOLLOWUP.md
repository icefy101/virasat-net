# Virasat — Wiring + Security Follow-Up (round 2 prep)

Scope, per your instruction: fix the two flagged code issues (Claim Assist not wired to the real backend, and the stack-claims mismatch), tighten security as far as it's reasonably worth going for a hackathon, and don't touch the visual theme. Nothing in this pass touches CSS, colors, fonts, or layout — every screenshot below is pixel-identical to before.

I don't have access to Swami/Nikki's live Manus instance (no OAuth server, no database in this sandbox), so everything here was built and verified as far as it's possible to without that — full detail in "What I could and couldn't verify" below. Nothing is riskier to your live copy than before: this is a separate set of file changes for you to review and hand back, your running copy on their laptops was never touched.

## 1. Claim Assist is now really wired to the backend

**What was broken:** `ClaimAssist.tsx` never called your tRPC API — it only ever talked to a client-side mock service. Worse, `AppShell.tsx`'s "Start new claim" button always opened one of five hardcoded fake claim IDs, regardless of what asset you picked. So even turning on the `VITE_USE_BACKEND` flag wouldn't have helped — the flow that starts a claim didn't check it at all.

**What's fixed**, behind the existing `VITE_USE_BACKEND` flag (same pattern already used by Dashboard/Claims/FinTwin):

- `AppShell.tsx` — "Start new claim" now pulls your real discovered assets (`assets.list`) and calls `claims.create` for real, landing on `/claims/<real-numeric-id>/assist`.
- `ClaimAssist.tsx` — when opened with a real numeric claim id, it loads the real claim + real asset (`claims.byId`, `assets.byId`), and every action (upload a document, continue to review, prepare, mark submitted) calls the real mutations (`claims.addDocument`, `claims.parseDocument`, `claims.prepare`, `claims.markSubmitted`) instead of the mock service.
- **Every one of those real calls is wrapped so a failure falls back to the exact same mock/demo behavior as before** — nothing can leave a juror looking at a broken screen. I verified this by literally running the app with the flag on and no backend reachable (see below): it degrades silently and looks identical.
- Fixed a real latent bug while I was in there: `server/db.ts`'s no-database fallback was returning claim/document ids as strings like `"mock-3"`, but the API's own input validation requires a positive integer for those ids — so the very first time this fallback path got exercised for real, it would have thrown. Now it hands back real integers.
- `profile.get`/`profile.update` no longer return the same hardcoded PAN and state for every single user — I added real `phone`, `maskedPan`, `state` columns to the `users` table (migration included, see below) and wired them through properly. A user who hasn't set a profile yet gets `null` back (which the UI already renders sensibly), not another user's placeholder data.

**What this deliberately does NOT include:** the login screen (`Auth` component) is still a fully mock UI — clicking Login/Create account just navigates client-side, no real OAuth call. I left this alone on purpose. Wiring it up blind, without a live OAuth server to test against, risks turning a snappy one-click demo login into a redirect that might not resolve correctly on stage. That's a call for whoever's driving the live demo to make once this is tested against a real Manus deployment — flagging it clearly rather than guessing.

**Migration to apply on the real database:** `drizzle/0001_mysterious_hiroim.sql` (generated via `drizzle-kit generate`, additive-only — three new nullable columns on `users`, nothing destructive):
```sql
ALTER TABLE `users` ADD `phone` varchar(32);
ALTER TABLE `users` ADD `maskedPan` varchar(16);
ALTER TABLE `users` ADD `state` varchar(64);
```
Run `pnpm db:push` (or apply that SQL directly) against the real database before relying on profile data being genuinely per-user.

## 2. The architecture-claims mismatch (Postgres/RLS, Python/FastAPI/Gemini) — recommendation: don't chase it

I looked hard at what it would take to make the code match the deck's claims literally (migrate MySQL → Postgres with Row-Level Security, stand up a real Python/FastAPI/Gemini document-verification service) and I don't think it's worth attempting this close to the round. That's a full data-layer migration plus a new service, on a stack that currently works — high chance of breaking something that's fine today, for zero visible difference in the demo.

The version of "worth doing" for this item is what's in §3 below: make the *actual* security posture (app-level scoping, auth, headers) as strong as it can reasonably be, so that if a juror digs into "how is access actually controlled," the honest answer is a good one — even though it's not literally "Postgres RLS." I'd treat the specific tech-stack wording mismatch as a talking-point issue, not a code issue, at this point: "MySQL via Drizzle, with every query scoped to the signed-in user" is a fine answer to defend live; a half-finished Postgres migration two days before a round is not.

## 3. Security hardening — done

Added, all self-contained and verified not to break anything (dev server still boots clean, no header regressions, iframe embedding preserved):

- **`helmet`** middleware for standard security headers (HSTS, `X-Content-Type-Options: nosniff`, `X-DNS-Prefetch-Control: off`, `X-Download-Options`, `X-Permitted-Cross-Domain-Policies`, `Cross-Origin-Opener-Policy`, `Referrer-Policy`). I deliberately left CSP, frame-options (`X-Frame-Options`), and cross-origin-resource-policy **off** — this app is designed to be embedded in an iframe by the Manus platform, and a default-locked CSP would break Vite's dev scripts and the platform preview outright. Verified via `curl -I` that the real headers are present and nothing else changed.
- **Rate limiting** (`express-rate-limit`): 30 requests/15min on `/api/oauth/*` (blunts brute-force login attempts), 300 requests/min on `/api/trpc/*` (blunts basic API abuse). Both generous enough that normal use — including the app's own batched tRPC calls — is unaffected.
- **Audited every procedure in `routers.ts` for auth gating** — confirmed every data-bearing route uses `protectedProcedure` (which throws `UNAUTHORIZED` if there's no valid session) except the two that should be public (`auth.me`, `auth.logout`). No gaps found.
- **Audited `server/db.ts`'s query-scoping** — every function takes `userId` and filters by it (`eq(table.userId, userId)`) before returning rows. This is the "RLS-equivalent" I mentioned in §2 — solid, just enforced in the query layer rather than the database.
- **CSRF/cookie posture — flagging as an accepted risk, not fixed:** the session cookie is set with `sameSite: "none"`, which is required for the app to work embedded in the Manus platform's iframe (a stricter `sameSite` would silently break login/session persistence there), but it does widen CSRF exposure somewhat. The OAuth callback itself already has real CSRF protection (nonce cookie checked against `state`). I didn't touch this — changing it would need testing against the real embed, which I can't do here, and getting it wrong risks breaking login entirely.
- **Not done, and I don't think worth doing:** full OWASP-style input fuzzing, a WAF, or building actual malware/virus scanning on uploaded documents. Zod already validates every input shape at the API boundary; going further has a poor effort-to-benefit ratio for a hackathon demo.

## 4. What I could and couldn't verify

I don't have a live OAuth server or database, so I could not test a real end-to-end login → claim → submit flow. What I *did* verify, concretely:

- `pnpm exec tsc --noEmit` — clean, no type errors anywhere in the changed files.
- `drizzle-kit generate` — the new schema diffs cleanly into a migration with no conflicts.
- Ran the dev server and loaded `/home`, `/claims`, `/claims/:id/assist`, `/fintwin` with the **default** config (`VITE_USE_BACKEND` unset) — screenshots pixel-identical to before every change. Nothing regressed for the demo as it exists today.
- Ran it again with **`VITE_USE_BACKEND=true` and no real backend reachable** (worst case — exactly what would happen if this got deployed with the flag on but OAuth/DB not yet configured): the real tRPC calls fire, get a `401`, and every page falls back to mock data silently. No crash, no blank screen, no redirect loop, no broken login flow — the final URL stayed on the page the user was on. Screenshots confirm this looks completely normal.
- Clicked through the real "Start new claim" flow in that same worst-case setup: it correctly falls back to a working mock claim, no console errors beyond the expected `401`s.

**What still needs testing on Swami/Nikki's live Manus box, before anyone relies on this in front of a jury:**
1. Apply the migration (`drizzle/0001_mysterious_hiroim.sql` or `pnpm db:push`).
2. Set `VITE_USE_BACKEND=true` in the Manus environment config and rebuild.
3. Actually log in for real, click "Start new claim," upload a document, step through to "Ready," and confirm a row genuinely appears in the `claims` and `claimDocuments` tables — that's the one thing I structurally cannot confirm from here.
4. If step 3 shows anything unexpected, the safest move given the timeline is to just flip `VITE_USE_BACKEND` back to unset — every page reverts to exactly today's mock-only behavior with zero other changes needed, since the fallback path is the same code that's been running all along.
