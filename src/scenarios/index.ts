import type { Configuration } from '../config/schema.js';

export type ScenarioAction =
  | Readonly<{ kind: 'success' }>
  | Readonly<{ kind: 'http-error'; status: number }>
  | Readonly<{ kind: 'malformed' }>
  | Readonly<{ kind: 'timeout'; delayMs: number }>
  | Readonly<{ kind: 'network-failure' }>;

type Rule = Readonly<{ order: number; query: string; action: ScenarioAction }>;
type Cycle = Readonly<{ actions: readonly ScenarioAction[] }>;

const success = (): ScenarioAction => Object.freeze({ kind: 'success' });

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
function action(rule: Configuration['schedule']['rules'][number]): ScenarioAction {
  switch (rule.action) {
    case 'respond':
    case 'success':
      return Object.freeze({ kind: 'success' });
    case 'error':
    case 'http-error':
      return Object.freeze({ kind: 'http-error', status: rule.statusCode ?? 500 });
    case 'malformed':
      return Object.freeze({ kind: 'malformed' });
    case 'network-failure':
      return Object.freeze({ kind: 'network-failure' });
    case 'timeout':
      return Object.freeze({ kind: 'timeout', delayMs: rule.delayMs });
  }
}

function sequenceAction(
  spec: Configuration['schedule']['sequences'][number]['actions'][number]
): ScenarioAction {
  switch (spec.action) {
    case 'respond':
    case 'success':
      return Object.freeze({ kind: 'success' });
    case 'error':
    case 'http-error':
      return Object.freeze({ kind: 'http-error', status: spec.statusCode ?? 500 });
    case 'malformed':
      return Object.freeze({ kind: 'malformed' });
    case 'network-failure':
      return Object.freeze({ kind: 'network-failure' });
    case 'timeout':
      return Object.freeze({ kind: 'timeout', delayMs: spec.delayMs });
  }
}

export interface ScenarioEngine {
  next(query: string): ScenarioAction;
}

export function createScenarioEngine(configuration: Configuration): ScenarioEngine {
  const rules: readonly Rule[] = Object.freeze(
    configuration.schedule.rules
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((rule) =>
        Object.freeze({ order: rule.order, query: normalize(rule.query), action: action(rule) })
      )
  );
  const counters = new Map<string, number>();
  const configuredSequence = configuration.schedule.sequences.find(
    (sequence) => sequence.name === configuration.schedule.defaultSequence
  );
  const cycle: Cycle = Object.freeze({
    actions: Object.freeze(configuredSequence?.actions.map(sequenceAction) ?? [success()]),
  });
  const random = createRandom(configuration.schedule.seed ?? 0);
  const failureRate = configuration.schedule.failureRate ?? 0;
  return Object.freeze({
    next(query: string): ScenarioAction {
      const normalizedQuery = normalize(query);
      const rule = rules.find((candidate) => normalizedQuery.includes(candidate.query));
      if (rule) {
        const key = `${configuration.tier}\u0000${normalizedQuery}\u0000rule:${rule.order}`;
        counters.set(key, (counters.get(key) ?? 0) + 1);
        return rule.action;
      }
      if (failureRate > 0 && random() < failureRate) {
        return Object.freeze({ kind: 'http-error', status: 503 });
      }
      const key = `${configuration.tier}\u0000${normalizedQuery}\u0000default`;
      const index = counters.get(key) ?? 0;
      counters.set(key, index + 1);
      return cycle.actions[index % cycle.actions.length];
    },
  });
}
