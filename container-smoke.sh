#!/usr/bin/env bash
set -euo pipefail

IMAGE="${1:-company-check-provider:task-5}"
NETWORK="company-check-provider-smoke-$RANDOM"
FREE_CONTAINER="company-check-provider-free-$RANDOM"
PREMIUM_CONTAINER="company-check-provider-premium-$RANDOM"
FREE_PORT="${FREE_PORT:-18081}"
PREMIUM_PORT="${PREMIUM_PORT:-18082}"

cleanup() {
  docker rm -f "$FREE_CONTAINER" "$PREMIUM_CONTAINER" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker network create "$NETWORK" >/dev/null
docker run -d --name "$FREE_CONTAINER" --network "$NETWORK" -p "$FREE_PORT:8081" \
  --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m --security-opt no-new-privileges \
  -e PROVIDER_TIER=free "$IMAGE" >/dev/null
docker run -d --name "$PREMIUM_CONTAINER" --network "$NETWORK" -p "$PREMIUM_PORT:8081" \
  --read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m --security-opt no-new-privileges \
  -e PROVIDER_TIER=premium "$IMAGE" >/dev/null

wait_ready() {
  local port="$1"
  for _ in $(seq 1 30); do
    if curl --fail --silent "http://127.0.0.1:$port/health/ready" >/dev/null; then return 0; fi
    sleep 1
  done
  echo "provider on port $port did not become ready" >&2
  return 1
}

check_lookup() {
  local port="$1" expected_field="$2"
  curl --fail --silent "http://127.0.0.1:$port/lookup?cin=CJQUNXGW" | grep -q "\"$expected_field\""
}

wait_ready "$FREE_PORT"
wait_ready "$PREMIUM_PORT"
check_lookup "$FREE_PORT" "registration_date"
check_lookup "$PREMIUM_PORT" "companyIdentificationNumber"

for _ in 1 2 3; do curl --fail --silent "http://127.0.0.1:$FREE_PORT/lookup?cin=smoke" >/dev/null; done
if curl --silent --show-error --fail "http://127.0.0.1:$FREE_PORT/lookup?cin=smoke" >/dev/null; then
  echo "free scenario did not produce the expected HTTP 503" >&2
  exit 1
fi

for _ in $(seq 1 9); do curl --fail --silent "http://127.0.0.1:$PREMIUM_PORT/lookup?cin=smoke" >/dev/null; done
if curl --silent --show-error --fail "http://127.0.0.1:$PREMIUM_PORT/lookup?cin=smoke" >/dev/null; then
  echo "premium scenario did not produce the expected HTTP 503" >&2
  exit 1
fi

echo "container smoke checks passed for free and premium tiers"
