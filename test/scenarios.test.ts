import { describe, expect, test } from 'bun:test';
import type { Configuration } from '../src/config/schema.js';
import { loadConfiguration } from '../src/config/load.js';
import { createScenarioEngine } from '../src/scenarios/index.js';

const config = (
  tier: Configuration['tier'],
  rules: Configuration['schedule']['rules'] = []
): Configuration => ({
  tier,
  fixtures: [
    { cin: 'A', name: 'A', registration_date: '2024-01-01', address: 'A', is_active: true },
  ],
  schedule: { rules, sequences: [] },
});

describe('deterministic scenario engine', () => {
  test('uses the first matching rule in order and normalizes queries', () => {
    const engine = createScenarioEngine(
      config('free', [
        { order: 0, query: '  acme ', action: 'http-error', statusCode: 503, delayMs: 0 },
        { order: 1, query: 'acme', action: 'malformed', delayMs: 0 },
      ])
    );
    expect(engine.next(' ACME ltd ')).toEqual({ kind: 'http-error', status: 503 });
  });

  test('cycles default FREE and PREMIUM schedules', () => {
    const free = createScenarioEngine(loadConfiguration({ PROVIDER_TIER: 'free' }));
    expect(
      Array.from({ length: 5 }, () => free.next('x')).filter((a) => a.kind === 'http-error')
    ).toHaveLength(2);
    const premium = createScenarioEngine(loadConfiguration({ PROVIDER_TIER: 'premium' }));
    expect(
      Array.from({ length: 10 }, () => premium.next('x')).filter((a) => a.kind === 'http-error')
    ).toHaveLength(1);
  });

  test('supports timeout, network failure, and malformed actions', () => {
    const engine = createScenarioEngine(
      config('free', [
        { order: 0, query: 'timeout', action: 'timeout', delayMs: 250 },
        { order: 1, query: 'abort', action: 'network-failure', delayMs: 0 },
        { order: 2, query: 'bad', action: 'malformed', delayMs: 0 },
      ])
    );
    expect(engine.next('timeout')).toEqual({ kind: 'timeout', delayMs: 250 });
    expect(engine.next('abort')).toEqual({ kind: 'network-failure' });
    expect(engine.next('bad')).toEqual({ kind: 'malformed' });
  });

  test('starts counters fresh for each engine instance', () => {
    const first = createScenarioEngine(config('free'));
    first.next('x');
    expect(createScenarioEngine(config('free')).next('x')).toEqual({ kind: 'success' });
  });

  test('uses the configured version-controlled default sequence', () => {
    const configured = {
      ...config('free'),
      schedule: {
        rules: [],
        defaultSequence: 'retry',
        sequences: [
          {
            name: 'retry',
            actions: [
              { action: 'timeout', delayMs: 10 },
              { action: 'http-error', statusCode: 503, delayMs: 0 },
            ],
          },
        ],
      },
    } as Configuration;
    const engine = createScenarioEngine(configured);
    expect(engine.next('ACME')).toEqual({ kind: 'timeout', delayMs: 10 });
    expect(engine.next('ACME')).toEqual({ kind: 'http-error', status: 503 });
  });

  test('cycles a configured retry sequence deterministically across failures', () => {
    const configured = {
      ...config('free'),
      schedule: {
        rules: [],
        defaultSequence: 'retry',
        sequences: [
          {
            name: 'retry',
            actions: [
              { action: 'timeout', delayMs: 1 },
              { action: 'network-failure', delayMs: 0 },
              { action: 'malformed', delayMs: 0 },
              { action: 'http-error', statusCode: 503, delayMs: 0 },
            ],
          },
        ],
      },
    } as Configuration;
    const engine = createScenarioEngine(configured);
    expect(Array.from({ length: 4 }, () => engine.next('CIN'))).toEqual([
      { kind: 'timeout', delayMs: 1 },
      { kind: 'network-failure' },
      { kind: 'malformed' },
      { kind: 'http-error', status: 503 },
    ]);
  });
});
