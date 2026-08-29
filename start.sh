#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "==> Creating the database (safe to re-run)"
# Homebrew's MySQL/MariaDB grants passwordless root-equivalent access to the
# OS user who installed it (via unix_socket auth) — not to a literal 'root'
# login. Connecting as your own macOS username is the standard fix.
DB_ADMIN_USER="$(whoami)"
mysql -u "$DB_ADMIN_USER" <<'SQL'
CREATE DATABASE IF NOT EXISTS virasat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'virasat'@'localhost' IDENTIFIED BY '53cFzMVZOAiF4Antnqd4';
GRANT ALL PRIVILEGES ON virasat.* TO 'virasat'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "==> Installing dependencies (first run only, this takes a minute)"
pnpm install

echo "==> Applying database schema"
pnpm exec drizzle-kit migrate

echo "==> Starting Virasat on http://localhost:3000"
pnpm dev
