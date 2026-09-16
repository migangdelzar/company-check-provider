import { describe, expect, test } from "bun:test";
import { createCompanyIndex } from "../src/lookup/index.js";
import { createScenarioEngine } from "../src/scenarios/index.js";
import { createProviderApp } from "../src/transport/index.js";
import { FreeCompanyContract, PremiumCompanyContract, lookupContract } from "../src/transport/contract.js";
import freeFixtures from "../src/config/fixtures/free.json" with { type: "json" };
import premiumFixtures from "../src/config/fixtures/premium.json" with { type: "json" };

const configuration = (tier: "free" | "premium", fixtures: unknown[]) => ({
  tier, fixtures, schedule: { rules: [], sequences: [] },
}) as never;

async function response(tier: "free" | "premium") {
  const config = configuration(tier, tier === "free" ? freeFixtures : premiumFixtures);
  const app = createProviderApp(config, createCompanyIndex(config), createScenarioEngine(config));
  try { return await app.inject({ method: "GET", url: "/lookup?cin=" + (tier === "free" ? "CJQUNXGW" : "F8OY0O0W") }); }
  finally { await app.close(); }
}

describe("provider HTTP contract", () => {
  test("FREE response has the documented snake_case schema", async () => {
    const result = await response("free");
    expect(result.statusCode).toBe(200);
    const payload = lookupContract.parse(result.json());
    expect(payload.companies).toHaveLength(1);
    expect(FreeCompanyContract.parse(payload.companies[0])).toBeTruthy();
  });

  test("PREMIUM response has the documented camelCase schema", async () => {
    const result = await response("premium");
    expect(result.statusCode).toBe(200);
    const payload = lookupContract.parse(result.json());
    expect(payload.companies).toHaveLength(1);
    const company = PremiumCompanyContract.parse(payload.companies[0]);
    expect(company.fullAddress).toBe(premiumFixtures[0].fullAddress);
    expect(company).not.toHaveProperty("address");
  });

  test("rejects responses with cross-tier or missing address fields", () => {
    expect(() => FreeCompanyContract.parse({ cin: "x", name: "x", registration_date: "2024-01-01", is_active: true })).toThrow();
    expect(() => PremiumCompanyContract.parse({ companyIdentificationNumber: "x", companyName: "x", registrationDate: "2024-01-01", address: "x", isActive: true })).toThrow();
  });
});
