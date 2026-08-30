// Seeds the four hackathon demo accounts (demo1-4@virasat.app) with distinct,
// differentiated asset portfolios so each account tells a different part of
// the product story during a live walkthrough:
//   demo1 — "Just Discovered": a lean, early-stage record, mostly untouched
//   demo2 — "Active Claim": a claim mid-workflow across several statuses
//   demo3 — "Large Portfolio": a big multi-regulator estate, high values
//   demo4 — "Completed Journey": claims all the way through to CLAIMED
//
// Run against a real database (DATABASE_URL must be set) for accounts that
// have already signed up once.
//
// Usage:
//   DATABASE_URL=... npx tsx scripts/seed-demo-accounts.ts
//
// Safe to re-run: skips any account that already has assets.
import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { assets, claims, users } from "../drizzle/schema";

type AssetSeed = {
  regulator: string;
  type: string;
  amount: number;
  accountNumberMasked: string;
  provider: string;
  nomineeName: string | null;
  discoveredDate: Date;
  status: "NOT_STARTED" | "IN_PROGRESS" | "DOCUMENTS_PENDING" | "AI_VERIFICATION" | "READY_TO_SUBMIT" | "SUBMITTED" | "CLAIMED" | "REJECTED";
};

const ACCOUNTS: Array<{ email: string; assets: AssetSeed[] }> = [
  {
    email: "demo1@virasat.app", // "Just Discovered"
    assets: [
      { regulator: "RBI", type: "Bank Deposit", provider: "Punjab National Bank", accountNumberMasked: "XXXX XXXX 5502", amount: 185000, nomineeName: null, discoveredDate: new Date("2025-11-02"), status: "NOT_STARTED" },
      { regulator: "EPFO", type: "EPF", provider: "EPFO — Chennai", accountNumberMasked: "TN/CHN/••••/2291", amount: 640000, nomineeName: null, discoveredDate: new Date("2025-10-21"), status: "NOT_STARTED" },
      { regulator: "RBI", type: "Bank Deposit", provider: "Axis Bank", accountNumberMasked: "XXXX XXXX 8834", amount: 95000, nomineeName: null, discoveredDate: new Date("2025-12-01"), status: "IN_PROGRESS" },
    ],
  },
  {
    email: "demo2@virasat.app", // "Active Claim"
    assets: [
      { regulator: "RBI", type: "Bank Deposit", provider: "ICICI Bank", accountNumberMasked: "XXXX XXXX 3310", amount: 320500, nomineeName: "Meera Iyer", discoveredDate: new Date("2024-05-14"), status: "IN_PROGRESS" },
      { regulator: "EPFO", type: "EPF", provider: "EPFO — Bengaluru", accountNumberMasked: "KA/BLR/••••/7765", amount: 980000, nomineeName: "Arjun Iyer", discoveredDate: new Date("2023-11-09"), status: "DOCUMENTS_PENDING" },
      { regulator: "IRDAI", type: "Insurance", provider: "HDFC Life", accountNumberMasked: "POL •••• 4432", amount: 410000, nomineeName: "Meera Iyer", discoveredDate: new Date("2022-07-30"), status: "READY_TO_SUBMIT" },
      { regulator: "SEBI", type: "Mutual Fund", provider: "SBI Mutual Fund", accountNumberMasked: "FOLIO •••• 9012", amount: 675000, nomineeName: "Arjun Iyer", discoveredDate: new Date("2025-01-18"), status: "NOT_STARTED" },
    ],
  },
  {
    email: "demo3@virasat.app", // "Large Portfolio"
    assets: [
      { regulator: "RBI", type: "Bank Deposit", provider: "State Bank of India", accountNumberMasked: "XXXX XXXX 1187", amount: 1240000, nomineeName: "Kavya Reddy", discoveredDate: new Date("2023-02-19"), status: "DOCUMENTS_PENDING" },
      { regulator: "RBI", type: "Bank Deposit", provider: "Bank of Baroda", accountNumberMasked: "XXXX XXXX 4456", amount: 360000, nomineeName: null, discoveredDate: new Date("2024-09-06"), status: "NOT_STARTED" },
      { regulator: "EPFO", type: "EPF", provider: "EPFO — Hyderabad", accountNumberMasked: "TS/HYD/••••/3387", amount: 1820000, nomineeName: "Kavya Reddy", discoveredDate: new Date("2022-12-24"), status: "IN_PROGRESS" },
      { regulator: "IRDAI", type: "Insurance", provider: "LIC Jeevan Umang", accountNumberMasked: "POL •••• 1120", amount: 750000, nomineeName: "Vikram Reddy", discoveredDate: new Date("2025-03-11"), status: "NOT_STARTED" },
      { regulator: "SEBI", type: "Mutual Fund", provider: "Nippon India MF", accountNumberMasked: "FOLIO •••• 5543", amount: 2290000, nomineeName: "Kavya Reddy", discoveredDate: new Date("2023-06-28"), status: "READY_TO_SUBMIT" },
      { regulator: "LIC", type: "LIC Policy", provider: "LIC New Endowment", accountNumberMasked: "POL •••• 8801", amount: 515000, nomineeName: "Vikram Reddy", discoveredDate: new Date("2024-04-02"), status: "DOCUMENTS_PENDING" },
    ],
  },
  {
    email: "demo4@virasat.app", // "Completed Journey"
    assets: [
      { regulator: "RBI", type: "Bank Deposit", provider: "Canara Bank", accountNumberMasked: "XXXX XXXX 6620", amount: 275000, nomineeName: "Devika Nair", discoveredDate: new Date("2021-10-05"), status: "CLAIMED" },
      { regulator: "EPFO", type: "EPF", provider: "EPFO — Kochi", accountNumberMasked: "KL/KCH/••••/5501", amount: 830000, nomineeName: "Devika Nair", discoveredDate: new Date("2021-08-17"), status: "CLAIMED" },
      { regulator: "SEBI", type: "Mutual Fund", provider: "ICICI Prudential MF", accountNumberMasked: "FOLIO •••• 7743", amount: 560000, nomineeName: "Arun Nair", discoveredDate: new Date("2024-02-14"), status: "READY_TO_SUBMIT" },
      { regulator: "LIC", type: "LIC Policy", provider: "LIC Jeevan Anand", accountNumberMasked: "POL •••• 9915", amount: 345000, nomineeName: "Arun Nair", discoveredDate: new Date("2021-05-22"), status: "CLAIMED" },
    ],
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — this script only writes to a real database, never the mock fallback.");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);

  for (const account of ACCOUNTS) {
    const [user] = await db.select().from(users).where(eq(users.email, account.email)).limit(1);
    if (!user) {
      console.log(`Skipping ${account.email} — no account found (sign up first).`);
      continue;
    }

    const existing = await db.select().from(assets).where(eq(assets.userId, user.id)).limit(1);
    if (existing.length > 0) {
      console.log(`${account.email} (id ${user.id}) already has assets — skipping. Nothing changed.`);
      continue;
    }

    for (const asset of account.assets) {
      const [inserted] = await db.insert(assets).values({ userId: user.id, ...asset }).$returningId();
      if (asset.status !== "NOT_STARTED" && inserted?.id) {
        await db.insert(claims).values({ userId: user.id, assetId: inserted.id, regulator: asset.regulator, status: asset.status });
      }
    }

    console.log(`Seeded ${account.assets.length} assets for ${account.email} (user id ${user.id}).`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
