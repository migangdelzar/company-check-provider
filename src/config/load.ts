import { readFileSync } from 'node:fs';
import freeFixtures from './fixtures/free.json' with { type: 'json' };
import premiumFixtures from './fixtures/premium.json' with { type: 'json' };
import freeSchedule from './scenarios/free.json' with { type: 'json' };
import premiumSchedule from './scenarios/premium.json' with { type: 'json' };
import { validateConfiguration, type Configuration } from './schema.js';

function loadSchedule(path: string | undefined, tier: 'free' | 'premium'): unknown {
  if (!path) return tier === 'free' ? freeSchedule : premiumSchedule;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`PROVIDER_SCENARIO_FILE: cannot read ${path}`, { cause: error });
  }
}

export function loadConfiguration(
  env: Record<string, string | undefined> = process.env
): Configuration {
  const tier = env.PROVIDER_TIER;
  if (tier !== 'free' && tier !== 'premium')
    throw new Error(
      `PROVIDER_TIER: must be one of: free, premium (received ${tier ?? 'undefined'})`
    );
  return validateConfiguration({
    tier,
    fixtures: tier === 'free' ? freeFixtures : premiumFixtures,
    schedule: loadSchedule(env.PROVIDER_SCENARIO_FILE, tier),
  });
}
