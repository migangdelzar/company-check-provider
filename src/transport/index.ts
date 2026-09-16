import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
import type { Configuration } from "../config/schema.js";
import type { Company } from "../domain/company.js";
import type { CompanyIndex } from "../lookup/index.js";
import type { ScenarioAction, ScenarioEngine } from "../scenarios/index.js";

const querySchema = {
  type: "object",
  required: ["cin"],
  properties: { cin: { type: "string", minLength: 1 } },
  additionalProperties: false,
} as const;

const freeCompanySchema = {
  type: "object", required: ["cin", "name", "registration_date", "address", "is_active"],
  properties: { cin: { type: "string" }, name: { type: "string" }, registration_date: { type: "string", format: "date" }, address: { type: "string" }, is_active: { type: "boolean" } },
  additionalProperties: false,
} as const;

const premiumCompanySchema = {
  type: "object", required: ["companyIdentificationNumber", "companyName", "registrationDate", "fullAddress", "isActive"],
  properties: { companyIdentificationNumber: { type: "string" }, companyName: { type: "string" }, registrationDate: { type: "string", format: "date" }, fullAddress: { type: "string" }, isActive: { type: "boolean" } },
  additionalProperties: false,
} as const;

const lookupResponseSchema = (tier: Configuration["tier"]) => ({
  type: "object", required: ["companies"], additionalProperties: false,
  properties: { companies: { type: "array", items: tier === "free" ? freeCompanySchema : premiumCompanySchema } },
});

function responseFor(tier: Configuration["tier"], company: Company) {
  return tier === "free"
    ? { cin: company.cin, name: company.name, registration_date: company.registrationDate, address: company.address, is_active: company.isActive }
    : { companyIdentificationNumber: company.cin, companyName: company.name, registrationDate: company.registrationDate, fullAddress: company.address, isActive: company.isActive };
}

const wait = (delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs));

async function applyScenario(reply: FastifyReply, scenario: ScenarioAction) {
  if (scenario.kind === "timeout") await wait(scenario.delayMs);
  if (scenario.kind === "network-failure") {
    reply.raw.destroy();
    return true;
  }
  if (scenario.kind === "http-error") {
    reply.code(scenario.status).send({ error: "provider error" });
    return true;
  }
  if (scenario.kind === "malformed") {
    reply.send({ malformed: true });
    return true;
  }
  return false;
}

export function createProviderApp(
  configuration: Configuration,
  companyIndex: CompanyIndex & { readonly companies: readonly Company[] },
  scenarios: ScenarioEngine,
): FastifyInstance {
  const app = Fastify({ logger: true });
  const lookup = async (request: { Querystring: { cin: string } }, reply: FastifyReply) => {
    const query = request.Querystring.cin;
    if (await applyScenario(reply, scenarios.next(query))) return;
    reply.send({ companies: companyIndex.findByCinFragment(query).map((company) => responseFor(configuration.tier, company)) });
  };

  const lookupOptions = { schema: { querystring: querySchema, response: { 200: lookupResponseSchema(configuration.tier) } } };
  app.get("/lookup", lookupOptions, lookup);
  app.get("/company-check", lookupOptions, lookup);
  app.get("/health/live", async () => ({ status: "ok" }));
  app.get("/health/ready", async () => ({ status: "ok", tier: configuration.tier, companies: companyIndex.companies.length }));
  app.get("/health", async () => ({ status: "ok", tier: configuration.tier }));
  return app;
}
