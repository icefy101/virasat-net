import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Core user table backing the scaffold's Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  maskedPan: varchar("maskedPan", { length: 16 }),
  state: varchar("state", { length: 64 }),
  // Self-hosted email+password auth (replaces the Manus OAuth dependency).
  // Nullable: a user created any other way simply has no password set.
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  regulator: varchar("regulator", { length: 16 }).notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 3 }).default("INR").notNull(),
  accountNumberMasked: varchar("accountNumberMasked", { length: 64 }).notNull(),
  provider: varchar("provider", { length: 160 }).notNull(),
  nomineeName: varchar("nomineeName", { length: 160 }),
  discoveredDate: timestamp("discoveredDate").notNull(),
  status: mysqlEnum("status", ["NOT_STARTED", "IN_PROGRESS", "DOCUMENTS_PENDING", "AI_VERIFICATION", "READY_TO_SUBMIT", "SUBMITTED", "CLAIMED", "REJECTED"]).default("NOT_STARTED").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const claims = mysqlTable("claims", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  assetId: int("assetId").notNull().references(() => assets.id),
  regulator: varchar("regulator", { length: 16 }).notNull(),
  status: mysqlEnum("status", ["NOT_STARTED", "IN_PROGRESS", "DOCUMENTS_PENDING", "AI_VERIFICATION", "READY_TO_SUBMIT", "SUBMITTED", "CLAIMED", "REJECTED"]).default("NOT_STARTED").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  submittedAt: timestamp("submittedAt"),
});

export const claimDocuments = mysqlTable("claimDocuments", {
  id: int("id").autoincrement().primaryKey(),
  claimId: int("claimId").notNull().references(() => claims.id),
  userId: int("userId").notNull().references(() => users.id),
  type: varchar("type", { length: 80 }).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  verificationStatus: mysqlEnum("verificationStatus", ["UPLOADED", "PROCESSING", "VERIFIED", "MISMATCH", "REJECTED"]).default("UPLOADED").notNull(),
  extractedFields: json("extractedFields"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  title: varchar("title", { length: 160 }).notNull(),
  detail: text("detail").notNull(),
  tone: varchar("tone", { length: 24 }).default("info").notNull(),
  claimId: int("claimId"),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const fintwinScenarios = mysqlTable("fintwinScenarios", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  name: varchar("name", { length: 160 }).notNull(),
  amount: int("amount").notNull(),
  investmentType: varchar("investmentType", { length: 32 }).notNull(),
  years: int("years").notNull(),
  projectedValue: int("projectedValue").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type Claim = typeof claims.$inferSelect;
export type ClaimDocument = typeof claimDocuments.$inferSelect;
export type FintwinScenario = typeof fintwinScenarios.$inferSelect;
