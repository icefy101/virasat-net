// Seeds a signed-up user's account with realistic demo assets (and a couple
// of in-progress claims), so a live demo doesn't show an empty "₹0 discovered"
// dashboard right after a brand-new real signup. Run against a real database
// (DATABASE_URL must be set) for a user who has already signed up once.
//
// Usage:
//   DATABASE_URL=... npx tsx scripts/seed-demo-data.ts you@example.com
//
// Safe to re-run: it skips seeding if that user already has any assets.
import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { assets, claims, users } from "../drizzle/schema";

const DEMO_ASSETS: Array<{ regulator: string; type: string; amount: number; accountNumberMasked: string; provider: string; nomineeName: string | null; discoveredDate: Date; status: "NOT_STARTED" | "IN_PROGRESS" | "DOCUMENTS_PENDING" | "READY_TO_SUBMIT" | "CLAIMED" }> = [
  { regulator: "RBI", type: "Bank Deposit", provider: "State Bank of India", accountNumberMasked: "XXXX XXXX 2847", amount: 482500, nomineeName: null, discoveredDate: new Date("2024-03-12"), status: "IN_PROGRESS" },
  { regulator: "RBI", type: "Bank Deposit", provider: "HDFC Bank", accountNumberMasked: "XXXX XXXX 1172", amount: 612000, nomineeName: "Anita Sharma", discoveredDate: new Date("2022-08-08"), status: "DOCUMENTS_PENDING" },
  { regulator: "EPFO", type: "EPF", provider: "EPFO — Pune", accountNumberMasked: "MH/PUN/••••/4412", amount: 1242000, nomineeName: "Rohan Sharma", discoveredDate: new Date("2023-03-31"), status: "DOCUMENTS_PENDING" },
  { regulator: "IRDAI", type: "Insurance", provider: "Max Life Insurance", accountNumberMasked: "POL •••• 7305", amount: 540000, nomineeName: "Anita Sharma", discoveredDate: new Date("2020-06-18"), status: "NOT_STARTED" },
  { regulator: "SEBI", type: "Mutual Fund", provider: "Mirae Asset", accountNumberMasked: "FOLIO •••• 3381", amount: 892000, nomineeName: "Rohan Sharma", discoveredDate: new Date("2023-09-30"), status: "CLAIMED" },
  { regulator: "LIC", type: "LIC Policy", provider: "LIC Jeevan Anand", accountNumberMasked: "POL •••• 6621", amount: 523000, nomineeName: "Anita Sharma", discoveredDate: new Date("2024-01-11"), status: "READY_TO_SUBMIT" },
];

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: DATABASE_URL=... npx tsx scripts/seed-demo-data.ts you@example.com");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — this script only writes to a real database, never the mock fallback.");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    console.error(`No user found with email ${email} — sign up in the app first, then re-run this.`);
    process.exit(1);
  }

  const existing = await db.select().from(assets).where(eq(assets.userId, user.id)).limit(1);
  if (existing.length > 0) {
    console.log(`User ${email} (id ${user.id}) already has assets — skipping seed. Nothing changed.`);
    return;
  }

  for (const asset of DEMO_ASSETS) {
    const [inserted] = await db.insert(assets).values({ userId: user.id, ...asset }).$returningId();
    if ((asset.status === "IN_PROGRESS" || asset.status === "DOCUMENTS_PENDING") && inserted?.id) {
      await db.insert(claims).values({ userId: user.id, assetId: inserted.id, regulator: asset.regulator, status: asset.status });
    }
  }

  console.log(`Seeded ${DEMO_ASSETS.length} demo assets (and matching in-progress claims) for ${email} (user id ${user.id}).`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
