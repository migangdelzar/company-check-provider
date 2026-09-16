import { readFileSync } from "node:fs";
import freeFixtures from "./fixtures/free.json" with { type: "json" };
import premiumFixtures from "./fixtures/premium.json" with { type: "json" };
import { validateConfiguration, type Configuration } from "./schema.js";

const defaultSchedule = {
  rules: [],
  defaultSequence: "default",
  sequences: [{ name: "default", actions: [{ action: "respond", delayMs: 0 }] }],
};

function loadSchedule(path: string | undefined): unknown {
  if (!path) return defaultSchedule;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`PROVIDER_SCENARIO_FILE: cannot read ${path}`, { cause: error });
  }
}

export function loadConfiguration(
  env: Record<string, string | undefined> = process.env,
): Configuration {
  const tier = env.PROVIDER_TIER;
  if (tier !== "free" && tier !== "premium")
    throw new Error(
      `PROVIDER_TIER: must be one of: free, premium (received ${tier ?? "undefined"})`,
    );
  return validateConfiguration({
    tier,
    fixtures: tier === "free" ? freeFixtures : premiumFixtures,
    schedule: loadSchedule(env.PROVIDER_SCENARIO_FILE),
  });
}
