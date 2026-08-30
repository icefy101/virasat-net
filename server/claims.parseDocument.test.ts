import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Covers the real, rule-based claims.parseDocument logic that replaced the
// old hardcoded "mock-adapter" stub (see routers.ts). No DATABASE_URL is set
// in this test environment, so these exercise the code paths that don't
// depend on a persisted claimDocuments row (file-type validation, and
// cross-referencing the claim against its real — even if mock-backed —
// asset record) rather than the duplicate-document/MISMATCH path, which
// needs a real database to have a prior document row to compare against.

function makeCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "test",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  } satisfies TrpcContext;
}

describe("claims.parseDocument", () => {
  it("rejects a file type that can't plausibly be a claim document", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.claims.parseDocument({ claimId: 201, filename: "malware.exe" });

    expect(result.verificationStatus).toBe("REJECTED");
    expect(result.parser).toBe("rule-based-v1");
    expect(result.mismatches).toContain("file_type");
    expect((result.extractedFields as { reason?: string }).reason).toMatch(/unsupported file type/i);
  });

  it("verifies a valid upload and returns the claim's real asset data, not fabricated nulls", async () => {
    const caller = appRouter.createCaller(makeCtx());
    // Claim 201 (mock fallback) is tied to asset 101 — State Bank of India.
    const result = await caller.claims.parseDocument({ claimId: 201, filename: "bank-statement.pdf" });

    expect(result.verificationStatus).toBe("VERIFIED");
    expect(result.parser).toBe("rule-based-v1");
    expect(result.extractedFields.account_provider).toBe("State Bank of India");
    expect(result.extractedFields.account_number_masked).toBe("XXXX XXXX 2847");
    expect(result.extractedFields.asset_type).toBe("Bank Deposit");
  });

  it("throws NOT_FOUND for a claim that doesn't belong to the caller", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.claims.parseDocument({ claimId: 999999, filename: "statement.pdf" })).rejects.toThrow();
  });
});
