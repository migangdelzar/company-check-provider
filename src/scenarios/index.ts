import type { Configuration } from "../config/schema.js";

export type ScenarioAction =
  | Readonly<{ kind: "success" }>
  | Readonly<{ kind: "http-error"; status: number }>
  | Readonly<{ kind: "malformed" }>
  | Readonly<{ kind: "timeout"; delayMs: number }>
  | Readonly<{ kind: "network-failure" }>;

type Rule = Readonly<{ order: number; query: string; action: ScenarioAction }>;
type Cycle = Readonly<{ actions: readonly ScenarioAction[] }>;

const success = (): ScenarioAction => Object.freeze({ kind: "success" });
const httpError = (status: number): ScenarioAction => Object.freeze({ kind: "http-error", status });

const DEFAULT_CYCLES: Record<Configuration["tier"], Cycle> = {
  free: Object.freeze({ actions: Object.freeze([success(), success(), success(), httpError(503), httpError(503)]) }),
  premium: Object.freeze({ actions: Object.freeze(Array.from({ length: 10 }, (_, i) => i === 9 ? httpError(503) : success())) }),
};

function normalize(value: string): string { return value.trim().toLocaleLowerCase(); }
function action(rule: Configuration["schedule"]["rules"][number]): ScenarioAction {
  switch (rule.action) {
    case "respond": case "success": return Object.freeze({ kind: "success" });
    case "error": case "http-error": return Object.freeze({ kind: "http-error", status: rule.statusCode ?? 500 });
    case "malformed": return Object.freeze({ kind: "malformed" });
    case "network-failure": return Object.freeze({ kind: "network-failure" });
    case "timeout": return Object.freeze({ kind: "timeout", delayMs: rule.delayMs });
  }
}

export interface ScenarioEngine { next(query: string): ScenarioAction; }

export function createScenarioEngine(configuration: Configuration): ScenarioEngine {
  const rules: readonly Rule[] = Object.freeze(configuration.schedule.rules
    .slice().sort((a, b) => a.order - b.order)
    .map((rule) => Object.freeze({ order: rule.order, query: normalize(rule.query), action: action(rule) })));
  const counters = new Map<string, number>();
  const cycle = DEFAULT_CYCLES[configuration.tier];
  return Object.freeze({
    next(query: string): ScenarioAction {
      const normalizedQuery = normalize(query);
      const rule = rules.find((candidate) => normalizedQuery.includes(candidate.query));
      if (rule) {
        const key = `${configuration.tier}\u0000${normalizedQuery}\u0000rule:${rule.order}`;
        counters.set(key, (counters.get(key) ?? 0) + 1);
        return rule.action;
      }
      const key = `${configuration.tier}\u0000${normalizedQuery}\u0000default`;
      const index = counters.get(key) ?? 0;
      counters.set(key, index + 1);
      return cycle.actions[index % cycle.actions.length];
    },
  });
}
