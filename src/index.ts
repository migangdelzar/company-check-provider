import { loadConfiguration } from "./config/load.js";
import { createCompanyIndex } from "./lookup/index.js";
import { createScenarioEngine } from "./scenarios/index.js";
import { createProviderApp } from "./transport/index.js";

const configuration = loadConfiguration();
const companyIndex = createCompanyIndex(configuration);
const app = createProviderApp(configuration, companyIndex, createScenarioEngine(configuration));
await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 8081) });

let shuttingDown = false;
process.once("SIGTERM", async () => {
  if (shuttingDown) return;
  shuttingDown = true;
  await app.close();
});
