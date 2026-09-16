import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import type { Configuration } from '../config/schema.js';
import type { Company } from '../domain/company.js';
import type { CompanyIndex } from '../lookup/index.js';
import type { ScenarioAction, ScenarioEngine } from '../scenarios/index.js';

const querySchema = {
  type: 'object',
  required: ['query'],
  properties: { query: { type: 'string', minLength: 1 } },
  additionalProperties: false,
} as const;

const freeCompanySchema = {
  type: 'object',
  required: ['cin', 'name', 'registration_date', 'address', 'is_active'],
  properties: {
    cin: { type: 'string' },
    name: { type: 'string' },
    registration_date: { type: 'string', format: 'date' },
    address: { type: 'string' },
    is_active: { type: 'boolean' },
  },
  additionalProperties: false,
} as const;

const premiumCompanySchema = {
  type: 'object',
  required: [
    'companyIdentificationNumber',
    'companyName',
    'registrationDate',
    'fullAddress',
    'isActive',
  ],
  properties: {
    companyIdentificationNumber: { type: 'string' },
    companyName: { type: 'string' },
    registrationDate: { type: 'string', format: 'date' },
    fullAddress: { type: 'string' },
    isActive: { type: 'boolean' },
  },
  additionalProperties: false,
} as const;

const lookupResponseSchema = (
  tier: Configuration['tier']
): {
  type: 'array';
  items: typeof freeCompanySchema | typeof premiumCompanySchema;
} => ({
  type: 'array',
  items: tier === 'free' ? freeCompanySchema : premiumCompanySchema,
});

function responseFor(
  tier: Configuration['tier'],
  company: Company
):
  | {
      cin: string;
      name: string;
      registration_date: string;
      address: string;
      is_active: boolean;
    }
  | {
      companyIdentificationNumber: string;
      companyName: string;
      registrationDate: string;
      fullAddress: string;
      isActive: boolean;
    } {
  return tier === 'free'
    ? {
        cin: company.cin,
        name: company.name,
        registration_date: company.registrationDate,
        address: company.address,
        is_active: company.isActive,
      }
    : {
        companyIdentificationNumber: company.cin,
        companyName: company.name,
        registrationDate: company.registrationDate,
        fullAddress: company.address,
        isActive: company.isActive,
      };
}

const wait = (delayMs: number): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, delayMs));
type LookupRoute = { Querystring: { query: string } };

async function applyScenario(reply: FastifyReply, scenario: ScenarioAction): Promise<boolean> {
  if (scenario.kind === 'timeout') await wait(scenario.delayMs);
  if (scenario.kind === 'network-failure') {
    reply.raw.destroy();
    return true;
  }
  if (scenario.kind === 'http-error') {
    reply.code(scenario.status).send({ error: 'provider error' });
    return true;
  }
  if (scenario.kind === 'malformed') {
    reply.send({ malformed: true });
    return true;
  }
  return false;
}

export function createProviderApp(
  configuration: Configuration,
  companyIndex: CompanyIndex & { readonly companies: readonly Company[] },
  scenarios: ScenarioEngine
): FastifyInstance {
  const app = Fastify({ logger: true });
  const lookup = async (
    request: FastifyRequest<LookupRoute>,
    reply: FastifyReply
  ): Promise<void> => {
    const query = request.query.query;
    if (await applyScenario(reply, scenarios.next(query))) return;
    reply.send(
      companyIndex
        .findByCinFragment(query)
        .map((company) => responseFor(configuration.tier, company))
    );
  };

  const lookupOptions = {
    schema: {
      querystring: querySchema,
      response: { 200: lookupResponseSchema(configuration.tier) },
    },
  };
  const endpoint = configuration.tier === 'free' ? '/free-third-party' : '/premium-third-party';
  app.get<LookupRoute>(endpoint, lookupOptions, lookup);
  app.get('/health/live', async () => ({ status: 'ok' }));
  app.get('/health/ready', async () => ({
    status: 'ok',
    tier: configuration.tier,
    companies: companyIndex.companies.length,
  }));
  app.get('/health', async () => ({ status: 'ok', tier: configuration.tier }));
  return app;
}
