import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { assets, claimDocuments, claims, fintwinScenarios, notifications, InsertUser, User, users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { mockAssets, mockClaims, mockNotifications, mockScenarios } from "./virasatMock";

let _db: ReturnType<typeof drizzle> | null = null;

// Used only when DATABASE_URL is unset: the real DB assigns real autoincrement
// ids, but claims.byId / claims.update / documents.byClaim all validate their
// input as z.number().int().positive(), so the no-db fallback must hand back
// a real positive integer too (a string like "mock-3" would fail validation
// on the very next call). This counter is per-process and resets on restart;
// that's fine, since without a database nothing persists across a restart anyway.
let mockIdCounter = 900000;
function nextMockId() {
  mockIdCounter += 1;
  return mockIdCounter;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      const value = user[field] ?? null;
      values[field] = value;
      updateSet[field] = value;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  updateSet.lastSignedIn ??= new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

// In-memory fallback so signup/login still work end-to-end even if the real
// database is briefly unreachable during a demo — mirrors the same
// no-db-fallback pattern used everywhere else in this file. Real persistence
// (surviving a restart, being visible from another device) still needs
// DATABASE_URL pointed at a real MySQL/MariaDB instance.
const memoryUsersByOpenId = new Map<string, User>();

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return memoryUsersByOpenId.get(openId);
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return Array.from(memoryUsersByOpenId.values()).find(user => user.email === email);
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

// Self-hosted signup: creates a brand-new user with a locally generated
// openId (no external identity provider involved) and a bcrypt password
// hash. Rejects if the email is already taken — call getUserByEmail first.
export async function createUserWithPassword(input: { name: string; email: string; passwordHash: string }) {
  const openId = `local:${randomUUID()}`;
  const now = new Date();
  const db = await getDb();
  if (!db) {
    const user: User = {
      id: nextMockId(),
      openId,
      name: input.name,
      email: input.email,
      phone: null,
      maskedPan: null,
      state: null,
      passwordHash: input.passwordHash,
      loginMethod: "password",
      role: "user",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    };
    memoryUsersByOpenId.set(openId, user);
    return user;
  }
  await db.insert(users).values({ openId, name: input.name, email: input.email, passwordHash: input.passwordHash, loginMethod: "password", lastSignedIn: now });
  return getUserByOpenId(openId);
}

export async function updateUserProfile(userId: number, input: { name?: string; phone?: string; maskedPan?: string; state?: string }) {
  const db = await getDb();
  if (!db) return input;
  const updateSet: Record<string, unknown> = {};
  if (input.name !== undefined) updateSet.name = input.name;
  if (input.phone !== undefined) updateSet.phone = input.phone;
  if (input.maskedPan !== undefined) updateSet.maskedPan = input.maskedPan;
  if (input.state !== undefined) updateSet.state = input.state;
  if (Object.keys(updateSet).length === 0) return input;
  await db.update(users).set(updateSet).where(eq(users.id, userId));
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

export async function listAssets(userId: number, regulator?: string) {
  const db = await getDb();
  if (!db) return regulator ? mockAssets.filter(asset => asset.regulator === regulator) : mockAssets;
  return db.select().from(assets).where(regulator ? and(eq(assets.userId, userId), eq(assets.regulator, regulator)) : eq(assets.userId, userId)).orderBy(desc(assets.discoveredDate));
}

export async function getAsset(userId: number, assetId: number) {
  const db = await getDb();
  if (!db) return mockAssets.find(asset => asset.id === assetId);
  const result = await db.select().from(assets).where(and(eq(assets.userId, userId), eq(assets.id, assetId))).limit(1);
  return result[0];
}

export async function listClaims(userId: number) {
  const db = await getDb();
  if (!db) return mockClaims;
  return db.select().from(claims).where(eq(claims.userId, userId)).orderBy(desc(claims.updatedAt));
}

export async function getClaim(userId: number, claimId: number) {
  const db = await getDb();
  if (!db) return mockClaims.find(claim => claim.id === claimId);
  const result = await db.select().from(claims).where(and(eq(claims.userId, userId), eq(claims.id, claimId))).limit(1);
  return result[0];
}

export async function createClaim(userId: number, asset: { id: number; regulator: string }) {
  const db = await getDb();
  if (!db) return { id: nextMockId(), assetId: asset.id, regulator: asset.regulator, status: "IN_PROGRESS" as const };
  const result = await db.insert(claims).values({ userId, assetId: asset.id, regulator: asset.regulator, status: "IN_PROGRESS" }).$returningId();
  return { id: result[0]?.id, assetId: asset.id, regulator: asset.regulator, status: "IN_PROGRESS" as const };
}

export async function updateClaim(userId: number, claimId: number, status: typeof claims.$inferInsert.status, notes?: string) {
  const db = await getDb();
  if (!db) return { id: claimId, status, notes: notes ?? null };
  await db.update(claims).set({ status, notes }).where(and(eq(claims.userId, userId), eq(claims.id, claimId)));
  return getClaim(userId, claimId);
}

export async function listDocuments(userId: number, claimId?: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(claimDocuments).where(claimId ? and(eq(claimDocuments.userId, userId), eq(claimDocuments.claimId, claimId)) : eq(claimDocuments.userId, userId)).orderBy(desc(claimDocuments.createdAt));
}

export async function addDocument(userId: number, claimId: number, input: { type: string; filename: string; verificationStatus?: typeof claimDocuments.$inferInsert.verificationStatus; extractedFields?: Record<string, unknown> }) {
  const db = await getDb();
  if (!db) return { id: nextMockId(), claimId, userId, ...input, verificationStatus: input.verificationStatus ?? "UPLOADED" };
  const result = await db.insert(claimDocuments).values({ userId, claimId, type: input.type, filename: input.filename, verificationStatus: input.verificationStatus ?? "UPLOADED", extractedFields: input.extractedFields }).$returningId();
  return { id: result[0]?.id, claimId, userId, ...input, verificationStatus: input.verificationStatus ?? "UPLOADED" };
}

// Finds the most recent document of this type on a claim (used by
// parseDocument's real, rule-based checks below to look up what it just
// inserted via addDocument, and to spot duplicate uploads of the same type).
export async function findLatestDocument(userId: number, claimId: number, filters: { type?: string; filename?: string } = {}) {
  const docs = await listDocuments(userId, claimId);
  return docs.find(doc => (!filters.type || doc.type === filters.type) && (!filters.filename || doc.filename === filters.filename));
}

export async function updateDocumentVerification(userId: number, documentId: number, input: { verificationStatus: typeof claimDocuments.$inferInsert.verificationStatus; extractedFields?: Record<string, unknown> }) {
  const db = await getDb();
  if (!db) return { id: documentId, ...input };
  await db.update(claimDocuments).set({ verificationStatus: input.verificationStatus, extractedFields: input.extractedFields }).where(and(eq(claimDocuments.userId, userId), eq(claimDocuments.id, documentId)));
  const result = await db.select().from(claimDocuments).where(and(eq(claimDocuments.userId, userId), eq(claimDocuments.id, documentId))).limit(1);
  return result[0];
}

export async function listNotifications(userId: number) {
  const db = await getDb();
  if (!db) return mockNotifications;
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
}

export async function listScenarios(userId: number) {
  const db = await getDb();
  if (!db) return mockScenarios;
  return db.select().from(fintwinScenarios).where(eq(fintwinScenarios.userId, userId)).orderBy(desc(fintwinScenarios.createdAt));
}

export async function saveScenario(userId: number, input: { name: string; amount: number; investmentType: string; years: number; projectedValue: number }) {
  const db = await getDb();
  if (!db) return { id: nextMockId(), userId, ...input, createdAt: new Date() };
  const result = await db.insert(fintwinScenarios).values({ userId, ...input }).$returningId();
  return { id: result[0]?.id, userId, ...input, createdAt: new Date() };
}
