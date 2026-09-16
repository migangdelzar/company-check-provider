import { describe, expect, test } from "bun:test";
import { createScenarioEngine } from "../src/scenarios/index.js";

const config = (tier: "free" | "premium", rules = []) => ({ tier, fixtures: [{ cin: "A", name: "A", registration_date: "2024-01-01", address: "A", is_active: true }], schedule: { rules, sequences: [] } }) as never;

describe("deterministic scenario engine", () => {
  test("uses the first matching rule in order and normalizes queries", () => {
    const engine = createScenarioEngine(config("free", [
      { order: 0, query: "  acme ", action: "http-error", statusCode: 503, delayMs: 0 },
      { order: 1, query: "acme", action: "malformed", delayMs: 0 },
    ]));
    expect(engine.next(" ACME ltd ")).toEqual({ kind: "http-error", status: 503 });
  });

  test("cycles default FREE and PREMIUM schedules", () => {
    const free = createScenarioEngine(config("free"));
    expect(Array.from({ length: 5 }, () => free.next("x")).filter((a) => a.kind === "http-error")).toHaveLength(2);
    const premium = createScenarioEngine(config("premium"));
    expect(Array.from({ length: 10 }, () => premium.next("x")).filter((a) => a.kind === "http-error")).toHaveLength(1);
  });

  test("supports timeout, network failure, and malformed actions", () => {
    const engine = createScenarioEngine(config("free", [
      { order: 0, query: "timeout", action: "timeout", delayMs: 250 },
      { order: 1, query: "abort", action: "network-failure", delayMs: 0 },
      { order: 2, query: "bad", action: "malformed", delayMs: 0 },
    ]));
    expect(engine.next("timeout")).toEqual({ kind: "timeout", delayMs: 250 });
    expect(engine.next("abort")).toEqual({ kind: "network-failure" });
    expect(engine.next("bad")).toEqual({ kind: "malformed" });
  });

  test("starts counters fresh for each engine instance", () => {
    const first = createScenarioEngine(config("free"));
    first.next("x");
    expect(createScenarioEngine(config("free")).next("x")).toEqual({ kind: "success" });
  });
});
