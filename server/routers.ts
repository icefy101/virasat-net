import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { addDocument, createClaim, createUserWithPassword, getAsset, getClaim, getUserByEmail, listAssets, listClaims, listDocuments, listNotifications, listScenarios, saveScenario, updateClaim, updateUserProfile } from "./db";
import { investmentRates } from "./virasatMock";

const regulatorSchema = z.enum(["RBI", "EPFO", "IRDAI", "SEBI", "LIC"]);
const claimStatusSchema = z.enum(["NOT_STARTED", "IN_PROGRESS", "DOCUMENTS_PENDING", "AI_VERIFICATION", "READY_TO_SUBMIT", "SUBMITTED", "CLAIMED", "REJECTED"]);

const BCRYPT_ROUNDS = 10;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    // Self-hosted signup/login: replaces the Manus OAuth flow, which depends
    // on Manus's own private auth backend and can't be run outside Manus.
    // Issues the exact same signed-JWT session cookie the OAuth flow used to
    // (via sdk.createSessionToken), so protectedProcedure and everything
    // downstream needs no changes at all.
    signup: publicProcedure
      .input(z.object({ name: z.string().trim().min(2).max(160), email: z.string().trim().toLowerCase().email().max(320), password: z.string().min(8).max(128) }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists" });
        const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
        const user = await createUserWithPassword({ name: input.name, email: input.email, passwordHash });
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not create your account. Please try again." });
        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name ?? "", expiresInMs: ONE_YEAR_MS });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { id: user.id, name: user.name, email: user.email };
      }),
    login: publicProcedure
      .input(z.object({ email: z.string().trim().toLowerCase().email().max(320), password: z.string().min(1).max(128) }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        const passwordOk = user?.passwordHash ? await bcrypt.compare(input.password, user.passwordHash) : false;
        if (!user || !passwordOk) throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect email or password" });
        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name ?? "", expiresInMs: ONE_YEAR_MS });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { id: user.id, name: user.name, email: user.email };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  assets: router({
    list: protectedProcedure.input(z.object({ regulator: regulatorSchema.optional() }).optional()).query(({ ctx, input }) => listAssets(ctx.user.id, input?.regulator)),
    byId: protectedProcedure.input(z.object({ assetId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const asset = await getAsset(ctx.user.id, input.assetId);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" });
      return asset;
    }),
    byRegulator: protectedProcedure.input(z.object({ regulator: regulatorSchema })).query(({ ctx, input }) => listAssets(ctx.user.id, input.regulator)),
  }),

  dashboard: router({
    snapshot: protectedProcedure.query(async ({ ctx }) => {
      const [assetRows, claimRows] = await Promise.all([listAssets(ctx.user.id), listClaims(ctx.user.id)]);
      const claimedStatuses = new Set(["CLAIMED", "SUBMITTED"]);
      const pendingStatuses = new Set(["IN_PROGRESS", "DOCUMENTS_PENDING", "AI_VERIFICATION", "READY_TO_SUBMIT"]);
      const regulators = regulatorSchema.options.map(regulator => {
        const rows = assetRows.filter(asset => asset.regulator === regulator);
        return { regulator, assetCount: rows.length, totalValue: rows.reduce((sum, asset) => sum + asset.amount, 0), status: rows.some(asset => pendingStatuses.has(asset.status)) ? "In progress" : rows.some(asset => claimedStatuses.has(asset.status)) ? "Claimed" : "Not started" };
      });
      const assetById = new Map(assetRows.map(asset => [asset.id, asset]));
      const progressByStatus: Record<string, number> = { NOT_STARTED: 8, IN_PROGRESS: 24, DOCUMENTS_PENDING: 36, AI_VERIFICATION: 58, READY_TO_SUBMIT: 92, SUBMITTED: 100, CLAIMED: 100, REJECTED: 0 };
      const claimActivity = claimRows.map(claim => {
        const asset = assetById.get(claim.assetId);
        return { id: claim.id, regulatorId: claim.regulator.toLowerCase(), assetLabel: asset ? `${asset.provider} · ${asset.type}` : `${claim.regulator} claim`, amount: asset?.amount ?? 0, status: claim.status, progress: progressByStatus[claim.status] ?? 0, lastUpdated: claim.updatedAt, documentsCount: 0, documentsTotal: 4 };
      });
      return {
        user: { name: ctx.user.name, email: ctx.user.email },
        claimActivity,
        totalAssets: assetRows.length,
        claimedValue: assetRows.filter(asset => claimedStatuses.has(asset.status)).reduce((sum, asset) => sum + asset.amount, 0),
        pendingClaims: claimRows.filter(claim => pendingStatuses.has(claim.status)).length,
        unclaimedValue: assetRows.filter(asset => !claimedStatuses.has(asset.status)).reduce((sum, asset) => sum + asset.amount, 0),
        regulators,
      };
    }),
  }),

  claims: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const [claimRows, assetRows] = await Promise.all([listClaims(ctx.user.id), listAssets(ctx.user.id)]);
      const assetById = new Map(assetRows.map(asset => [asset.id, asset]));
      const progressByStatus: Record<string, number> = { NOT_STARTED: 8, IN_PROGRESS: 24, DOCUMENTS_PENDING: 36, AI_VERIFICATION: 58, READY_TO_SUBMIT: 92, SUBMITTED: 100, CLAIMED: 100, REJECTED: 0 };
      return claimRows.map(claim => {
        const asset = assetById.get(claim.assetId);
        return { ...claim, regulatorId: claim.regulator.toLowerCase(), assetLabel: asset ? `${asset.provider} · ${asset.type}` : `${claim.regulator} claim`, amount: asset?.amount ?? 0, progress: progressByStatus[claim.status] ?? 0, documentsCount: 0, documentsTotal: 4 };
      });
    }),
    byId: protectedProcedure.input(z.object({ claimId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const claim = await getClaim(ctx.user.id, input.claimId);
      if (!claim) throw new TRPCError({ code: "NOT_FOUND", message: "Claim not found" });
      return claim;
    }),
    create: protectedProcedure.input(z.object({ assetId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const asset = await getAsset(ctx.user.id, input.assetId);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found" });
      return createClaim(ctx.user.id, asset);
    }),
    update: protectedProcedure.input(z.object({ claimId: z.number().int().positive(), status: claimStatusSchema, notes: z.string().max(2000).optional() })).mutation(({ ctx, input }) => updateClaim(ctx.user.id, input.claimId, input.status, input.notes)),
    addDocument: protectedProcedure.input(z.object({ claimId: z.number().int().positive(), type: z.string().min(1).max(80), filename: z.string().min(1).max(255) })).mutation(async ({ ctx, input }) => {
      const claim = await getClaim(ctx.user.id, input.claimId);
      if (!claim) throw new TRPCError({ code: "NOT_FOUND", message: "Claim not found" });
      return addDocument(ctx.user.id, input.claimId, { type: input.type, filename: input.filename, verificationStatus: "UPLOADED" });
    }),
    parseDocument: protectedProcedure.input(z.object({ claimId: z.number().int().positive(), filename: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const claim = await getClaim(ctx.user.id, input.claimId);
      if (!claim) throw new TRPCError({ code: "NOT_FOUND", message: "Claim not found" });
      return { verificationStatus: "VERIFIED" as const, extractedFields: { account_provider: null, account_number_masked: null, asset_type: null, nominee_name: null, current_value: null }, mismatches: [], parser: "mock-adapter" as const };
    }),
    prepare: protectedProcedure.input(z.object({ claimId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const claim = await getClaim(ctx.user.id, input.claimId);
      if (!claim) throw new TRPCError({ code: "NOT_FOUND", message: "Claim not found" });
      const documents = await listDocuments(ctx.user.id, input.claimId);
      if (documents.some(document => document.verificationStatus === "MISMATCH" || document.verificationStatus === "REJECTED")) throw new TRPCError({ code: "BAD_REQUEST", message: "Resolve document verification issues before preparing the claim" });
      const updated = await updateClaim(ctx.user.id, input.claimId, "READY_TO_SUBMIT", "Claim packet prepared; submission remains self-reported.");
      return { claim: updated, documentCount: documents.length, regulatorSubmission: "not_performed" as const };
    }),
    markSubmitted: protectedProcedure.input(z.object({ claimId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const claim = await getClaim(ctx.user.id, input.claimId);
      if (!claim) throw new TRPCError({ code: "NOT_FOUND", message: "Claim not found" });
      const updated = await updateClaim(ctx.user.id, input.claimId, "SUBMITTED", "Self-reported submission recorded.");
      return { claim: updated, submittedAt: new Date(), regulatorSubmission: "not_performed" as const };
    }),
  }),

  documents: router({
    list: protectedProcedure.query(({ ctx }) => listDocuments(ctx.user.id)),
    byClaim: protectedProcedure.input(z.object({ claimId: z.number().int().positive() })).query(({ ctx, input }) => listDocuments(ctx.user.id, input.claimId)),
  }),

  profile: router({
    // Reads whatever this user has actually saved. A user who hasn't completed
    // profile setup yet gets nulls back, not another user's placeholder data —
    // the frontend already renders a sensible label ("Not set") for null fields.
    get: protectedProcedure.query(({ ctx }) => ({ name: ctx.user.name, email: ctx.user.email, phone: ctx.user.phone ?? null, maskedPan: ctx.user.maskedPan ?? null, state: ctx.user.state ?? null })),
    update: protectedProcedure
      .input(z.object({
        name: z.string().min(2).max(160).optional(),
        phone: z.string().max(32).optional(),
        // Only ever accept an already-masked PAN (e.g. "ABCDE****F") — the
        // product's own design never shows or needs the unmasked number, so
        // we never ask for or store one.
        maskedPan: z.string().max(16).optional(),
        state: z.string().max(64).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const updated = await updateUserProfile(ctx.user.id, input);
        return { name: updated?.name ?? ctx.user.name, email: ctx.user.email, phone: updated?.phone ?? null, maskedPan: updated?.maskedPan ?? null, state: updated?.state ?? null };
      }),
  }),

  notifications: router({
    list: protectedProcedure.query(({ ctx }) => listNotifications(ctx.user.id)),
  }),

  fintwin: router({
    simulate: protectedProcedure.input(z.object({ amount: z.number().int().positive().max(100000000), investmentType: z.enum(["FD", "PPF", "MUTUAL_FUND"]), years: z.number().int().min(1).max(50) })).query(({ input }) => {
      const rate = investmentRates[input.investmentType];
      return { rate, label: "Illustrative projection, not financial advice.", values: Array.from({ length: input.years + 1 }, (_, year) => ({ year, value: Math.round(input.amount * Math.pow(1 + rate, year)) })) };
    }),
    scenarios: protectedProcedure.query(({ ctx }) => listScenarios(ctx.user.id)),
    saveScenario: protectedProcedure.input(z.object({ name: z.string().min(1).max(160), amount: z.number().int().positive(), investmentType: z.string().min(1), years: z.number().int().positive(), projectedValue: z.number().int().positive() })).mutation(({ ctx, input }) => saveScenario(ctx.user.id, input)),
  }),
});

export type AppRouter = typeof appRouter;
