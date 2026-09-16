import type { Company } from '../domain/company.js';
import type { Configuration } from '../config/schema.js';

type FreeFixture = {
  cin: string;
  name: string;
  registration_date: string;
  address: string;
  is_active: boolean;
};

type PremiumFixture = {
  companyIdentificationNumber: string;
  companyName: string;
  registrationDate: string;
  fullAddress: string;
  isActive: boolean;
};

export interface CompanyIndex {
  findByCinFragment(fragment: string): readonly Company[];
}

export function mapFreeCompany(fixture: FreeFixture): Company {
  return Object.freeze({
    cin: fixture.cin,
    name: fixture.name,
    registrationDate: fixture.registration_date,
    address: fixture.address,
    isActive: fixture.is_active,
  });
}

export function mapPremiumCompany(fixture: PremiumFixture): Company {
  return Object.freeze({
    cin: fixture.companyIdentificationNumber,
    name: fixture.companyName,
    registrationDate: fixture.registrationDate,
    address: fixture.fullAddress,
    isActive: fixture.isActive,
  });
}

export function createCompanyIndex(
  configuration: Configuration
): CompanyIndex & { readonly companies: readonly Company[] } {
  const companies = Object.freeze(
    configuration.tier === 'free'
      ? configuration.fixtures.map((fixture) => mapFreeCompany(fixture as FreeFixture))
      : configuration.fixtures.map((fixture) => mapPremiumCompany(fixture as PremiumFixture))
  );
  const normalized = companies.map((company) => company.cin.toLocaleLowerCase());

  return Object.freeze({
    companies,
    findByCinFragment(fragment: string): readonly Company[] {
      const normalizedFragment = fragment.toLocaleLowerCase();
      return companies.filter((_, index) => normalized[index].includes(normalizedFragment));
    },
  });
}
