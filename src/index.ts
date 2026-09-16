import Fastify from "fastify";
import { loadConfiguration } from "./config/load.js";
import { createCompanyIndex } from "./lookup/index.js";

const configuration = loadConfiguration();
const companyIndex = createCompanyIndex(configuration);
const app = Fastify({ logger: true });
app.get("/health", async () => ({ status: "ok", tier: configuration.tier }));
await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 8081) });
