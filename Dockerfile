# syntax=docker/dockerfile:1

FROM oven/bun:1.3.9-alpine AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN bun run build

FROM oven/bun:1.3.9-alpine AS runtime

ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="company-check-provider" \
      org.opencontainers.image.description="Deterministic company-check provider simulator" \
      org.opencontainers.image.source="company-check-provider" \
      org.opencontainers.image.revision="$VCS_REF" \
      org.opencontainers.image.created="$BUILD_DATE"

ENV NODE_ENV=production \
    PORT=8081

WORKDIR /app

COPY --from=build --chown=bun:bun /app/package.json /app/bun.lock ./
COPY --from=build --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/dist ./dist
COPY --from=build --chown=bun:bun /app/src/config/scenarios ./config/scenarios

USER bun
EXPOSE 8081
HEALTHCHECK --interval=5s --timeout=2s --start-period=5s --retries=12 \
  CMD wget -q -O - http://127.0.0.1:8081/health/ready >/dev/null || exit 1

ENTRYPOINT ["bun", "dist/index.js"]
