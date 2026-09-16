# Company Check Provider

This repository is an independently deployable Bun 1.3 provider simulator. Keep
Fastify as the HTTP adapter, Zod as the configuration and contract boundary,
and the supplied fixture and scenario shapes unchanged.

## Rules

- Use `bun`, never Node or npm, for scripts and dependency changes.
- Keep public functions and exported callbacks explicitly typed.
- Do not use explicit `any`; narrow unknown input with Zod or a type guard.
- Use async/await for asynchronous work and inject dependencies at owned
  boundaries, such as the provider app's index and scenario engine.
- Preserve deterministic scenario configuration, fixture order, provider routes,
  and all health routes.
- Format with `bun run format:check` and lint with `bun run lint`.

The domain and scenario code remain framework-free. Fastify-specific schemas and
handlers belong in `src/transport`; configuration parsing belongs in
`src/config`. This separation is intentional and avoids speculative wrappers.
