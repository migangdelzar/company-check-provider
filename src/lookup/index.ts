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
  companyFullAddress: string;
  isActive: boolean;
};

export interface CompanyIndex {
  findByCin(cin: string): Company | undefined;
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
    address: fixture.companyFullAddress,
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
  const byCin = new Map(companies.map((company) => [company.cin.toUpperCase(), company]));

  return Object.freeze({
    companies,
    findByCin(cin: string): Company | undefined {
      return byCin.get(cin.trim().toUpperCase());
    },
  });
}
