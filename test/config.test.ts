import { describe, expect, test } from 'bun:test';
import { loadConfiguration } from '../src/config/load.js';
import { validateConfiguration } from '../src/config/schema.js';
const record = {
  cin: 'A',
  name: 'A',
  registration_date: '2024-01-01',
  address: 'A',
  is_active: true,
};
const config = (
  schedule: unknown
): { tier: string; fixtures: (typeof record)[]; schedule: unknown } => ({
  tier: 'free',
  fixtures: [record],
  schedule,
});
const premiumConfig = (
  schedule: unknown
): { tier: string; fixtures: object[]; schedule: unknown } => ({
  tier: 'premium',
  fixtures: [{}],
  schedule,
});
describe('provider configuration', () => {
  test('rejects missing tier', () => expect(() => loadConfiguration({})).toThrow('PROVIDER_TIER'));
  test('loads an explicit scenario file', () =>
    expect(
      loadConfiguration({
        PROVIDER_TIER: 'free',
        PROVIDER_SCENARIO_FILE: 'src/config/scenarios/free.json',
      }).schedule.defaultSequence
    ).toBe('default'));
  test('rejects malformed FREE fixture with a field path', () =>
    expect(() =>
      validateConfiguration({
        tier: 'free',
        fixtures: [{}],
        schedule: { rules: [], sequences: [] },
      })
    ).toThrow('fixtures.0.cin'));
  test('rejects malformed PREMIUM fixture with a field path', () =>
    expect(() => validateConfiguration(premiumConfig({ rules: [], sequences: [] }))).toThrow(
      'fixtures.0.companyIdentificationNumber'
    ));
  test('rejects invalid status code', () =>
    expect(() =>
      validateConfiguration(
        config({
          rules: [{ order: 0, query: 'x', action: 'error', statusCode: 99 }],
          sequences: [],
        })
      )
    ).toThrow('statusCode'));
  test('rejects invalid action', () =>
    expect(() =>
      validateConfiguration(
        config({ rules: [{ order: 0, query: 'x', action: 'nope' }], sequences: [] })
      )
    ).toThrow('action'));
  test('rejects duplicate rule ordering', () =>
    expect(() =>
      validateConfiguration(
        config({
          rules: [
            { order: 0, query: 'x', action: 'respond' },
            { order: 0, query: 'y', action: 'respond' },
          ],
          sequences: [],
        })
      )
    ).toThrow('duplicate rule ordering'));
  test('rejects malformed sequence', () =>
    expect(() =>
      validateConfiguration(config({ rules: [], sequences: [{ name: 'bad', actions: [] }] }))
    ).toThrow('actions'));
});
