# Running Virasat with a real backend (no Manus needed)

This replaces Manus's login and database with things you fully own: a real
MySQL-compatible database on your own machine, and real email+password login.
I built, ran, and tested this exact flow end-to-end in a sandbox before
handing it back — signup, login, starting a real claim, uploading a document,
and marking it submitted all genuinely wrote to a real database. Screenshots
of that run are attached alongside this file.

## What you need to install

Just three things — nothing exotic, nothing Manus-specific:

1. **Node.js** (v20 or newer). Check with `node -v`.
2. **pnpm** — `npm install -g pnpm` if you don't have it.
3. **MariaDB** (a fully compatible, open-source drop-in for MySQL — the code
   already expects a MySQL-flavored database, this just gives it one to talk
   to). Install it:
   - **macOS:** `brew install mariadb && brew services start mariadb`
   - **Ubuntu/Debian:** `sudo apt-get install mariadb-server && sudo service mariadb start`
   - **Windows:** install MySQL Community Server instead (from mysql.com) — functionally identical for this app.

Nothing else. No Manus account, no Docker, no cloud service required — this
all runs on your laptop.

## One-time setup

```bash
# 1. Create the database and a user for the app (run once)
mysql -u root <<'EOF'
CREATE DATABASE virasat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'virasat'@'localhost' IDENTIFIED BY 'pick-a-real-password-here';
GRANT ALL PRIVILEGES ON virasat.* TO 'virasat'@'localhost';
FLUSH PRIVILEGES;
EOF

# 2. Install dependencies
pnpm install

# 3. Copy the env template and fill in DATABASE_URL with the password you just picked
cp .env.example .env
# edit .env: set DATABASE_URL=mysql://virasat:pick-a-real-password-here@127.0.0.1:3306/virasat
# also set VITE_USE_BACKEND=true, and a JWT_SECRET (any long random string)

# 4. Apply the database schema (creates all tables, including the new
#    passwordHash/phone/maskedPan/state columns on users)
DATABASE_URL="mysql://virasat:pick-a-real-password-here@127.0.0.1:3306/virasat" pnpm exec drizzle-kit migrate

# 5. Run it
pnpm dev
```

Open `http://localhost:3000`, click **Create an account**, sign up for real.
That's it — login, claims, documents, everything now genuinely round-trips
through your own database.

## Seeding demo data for a live pitch

A brand-new real signup starts with zero discovered assets (correctly — it's
a real account, not the mock demo). For a jury demo where you want the
dashboard to show real numbers, seed one account after it signs up:

```bash
DATABASE_URL="mysql://virasat:pick-a-real-password-here@127.0.0.1:3306/virasat" \
  pnpm exec tsx scripts/seed-demo-data.ts your-demo-account@example.com
```

This inserts the same six realistic demo assets (and matching claims) the
mock data used to show, but as real rows tied to that real signed-in user.
Safe to run once; it skips itself if that user already has assets.

## Deploying this (so it's reachable from somewhere other than your laptop)

Any host that can run a Node.js app plus a MySQL database works — Railway,
Render, Fly.io, a DigitalOcean droplet, etc. all have free or cheap tiers
that fit a hackathon. The two things any of them need from you are the same
environment variables in `.env.example` (`DATABASE_URL`, `JWT_SECRET`,
`VITE_USE_BACKEND=true`) and a build step: `pnpm build` then `pnpm start`.
I didn't pick one for you since that's a real infra decision (cost, who
owns the account, how long you need it up) — happy to walk through any
specific option once you've picked one.

## What I verified myself, for real

- Installed MariaDB, created the database, applied every migration.
- Signed up a brand-new account through the actual UI — the row appeared in
  the real `users` table, password properly hashed (never stored in plain text).
- Logged in with that account on a fresh page load — the session cookie
  persisted correctly (this required one real fix: the cookie's
  `sameSite: "none"` setting, needed only for Manus's old iframe embedding,
  was silently getting dropped by the browser over plain HTTP. Changed to
  `sameSite: "lax"`, which is both correct for a standalone site and works
  without HTTPS for local testing).
- Seeded demo assets, clicked "Start new claim" for real, got a real claim
  row with a real auto-incrementing ID.
- Uploaded a document — a real row appeared in `claimDocuments`.
- Stepped through Verify → Review → Ready, hit "Mark as submitted" — the
  claim's status in the real database changed to `SUBMITTED`.
- Confirmed the UI is visually 100% unchanged throughout — every screenshot
  in this handoff is pixel-identical to the mock version, just with real
  data and a real signed-in name in the top bar instead of "Ananya".
