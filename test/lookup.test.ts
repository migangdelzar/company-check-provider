import { describe, expect, test } from 'bun:test';
import freeFixtures from '../src/config/fixtures/free.json' with { type: 'json' };
import premiumFixtures from '../src/config/fixtures/premium.json' with { type: 'json' };
import { createCompanyIndex, mapFreeCompany, mapPremiumCompany } from '../src/lookup/index.js';

const schedule = { rules: [], sequences: [] };

describe('company fixture mapping', () => {
  test('maps FREE snake_case fields to the canonical Company', () => {
    expect(mapFreeCompany(freeFixtures[0])).toEqual({
      cin: 'CJQUNXGW',
      name: 'Ramirez-Sanchez',
      registrationDate: '2023-06-09',
      address: '416 Mcdonald Gardens Suite 018, Garciashire, ME 95742',
      isActive: true,
    });
  });

  test('maps PREMIUM camelCase fields and fullAddress', () => {
    expect(mapPremiumCompany(premiumFixtures[0])).toEqual({
      cin: 'F8OY0O0W',
      name: 'Young, Gomez and Thompson',
      registrationDate: '2020-09-21',
      address: '5003 Ponce Vista, Port Jenniferborough, MT 45805',
      isActive: false,
    });
  });
});

describe('company index', () => {
  test('loads all supplied records and preserves fixture order', () => {
    const free = createCompanyIndex({ tier: 'free', fixtures: freeFixtures, schedule });
    const premium = createCompanyIndex({ tier: 'premium', fixtures: premiumFixtures, schedule });
    expect(free.companies).toHaveLength(33);
    expect(premium.companies).toHaveLength(50);
    expect(free.companies[0].cin).toBe(freeFixtures[0].cin);
    expect(premium.companies[0].cin).toBe(premiumFixtures[0].companyIdentificationNumber);
  });

  test('finds CIN fragments case-insensitively in fixture order', () => {
    const index = createCompanyIndex({ tier: 'free', fixtures: freeFixtures, schedule });
    expect(index.findByCinFragment('cJq').map((company) => company.cin)).toEqual(['CJQUNXGW']);
  });

  test('returns an empty result when no CIN contains the fragment', () => {
    const index = createCompanyIndex({ tier: 'premium', fixtures: premiumFixtures, schedule });
    expect(index.findByCinFragment('missing')).toEqual([]);
  });
});
