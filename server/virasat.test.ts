import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("virasat fintwin procedure", () => {
  it("returns a bounded illustrative projection with yearly values", async () => {
    const ctx = {
      user: {
        id: 42,
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

    const result = await appRouter.createCaller(ctx).fintwin.simulate({
      amount: 500000,
      investmentType: "MUTUAL_FUND",
      years: 10,
    });

    expect(result.label).toContain("not financial advice");
    expect(result.values).toHaveLength(11);
    expect(result.values[0]?.value).toBe(500000);
    expect(result.values.at(-1)?.value).toBeGreaterThan(500000);
  });
});
