#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
PORT="${PORT:-8787}"
BACKEND_LOG="${BACKEND_LOG:-/tmp/almost-backend.log}"
TUNNEL_LOG="${TUNNEL_LOG:-/tmp/almost-backend-tunnel.log}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd npm
require_cmd curl
require_cmd openssl
require_cmd ssh

mkdir -p "${BACKEND_DIR}/certs"

if [[ ! -f "${BACKEND_DIR}/certs/AppleRootCA-G2.cer" ]]; then
  curl -fsSL https://www.apple.com/certificateauthority/AppleRootCA-G2.cer -o "${BACKEND_DIR}/certs/AppleRootCA-G2.cer"
fi
if [[ ! -f "${BACKEND_DIR}/certs/AppleRootCA-G3.cer" ]]; then
  curl -fsSL https://www.apple.com/certificateauthority/AppleRootCA-G3.cer -o "${BACKEND_DIR}/certs/AppleRootCA-G3.cer"
fi

if [[ ! -f "${BACKEND_DIR}/.env" ]]; then
  APP_SESSION_SECRET="$(openssl rand -hex 32)"
  APPLE_WEBHOOK_SECRET="$(openssl rand -hex 32)"
  cat > "${BACKEND_DIR}/.env" <<EOF
PORT=${PORT}
NODE_ENV=production
APP_SHARED_SECRET=
APP_SESSION_SECRET=${APP_SESSION_SECRET}
APP_SESSION_TTL_MS=300000
CORS_ORIGINS=
WEBHOOK_QUERY_SECRET_ENABLED=0
WEBHOOK_SHARED_SECRET=
APPLE_VALIDATION_ENABLED=0
APPLE_ENVIRONMENT=production
APPLE_BUNDLE_ID=com.sasarei.almostclean
APPLE_ISSUER_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=""
APPLE_APPLE_ID=
APPLE_WEBHOOK_SECRET=${APPLE_WEBHOOK_SECRET}
APPLE_WEBHOOK_VERIFY_SIGNATURE=1
APPLE_WEBHOOK_REQUIRE_VERIFIED=1
APPLE_WEBHOOK_ONLINE_CHECKS=0
APPLE_ROOT_CA_PATHS=./certs/AppleRootCA-G3.cer,./certs/AppleRootCA-G2.cer
GOOGLE_VALIDATION_ENABLED=0
GOOGLE_PACKAGE_NAME=com.sasarei.almostclean
GOOGLE_SERVICE_ACCOUNT_JSON=
GOOGLE_RTDN_SECRET=
EOF
fi

APPLE_WEBHOOK_SECRET="$(
  awk -F= '/^APPLE_WEBHOOK_SECRET=/{print $2}' "${BACKEND_DIR}/.env" | tr -d '\r' | tr -d '\n'
)"
APP_SESSION_SECRET="$(
  awk -F= '/^APP_SESSION_SECRET=/{print $2}' "${BACKEND_DIR}/.env" | tr -d '\r' | tr -d '\n'
)"

if [[ -z "${APP_SESSION_SECRET}" ]]; then
  APP_SESSION_SECRET="$(openssl rand -hex 32)"
  {
    echo "APP_SESSION_SECRET=${APP_SESSION_SECRET}"
    echo "APP_SESSION_TTL_MS=300000"
  } >> "${BACKEND_DIR}/.env"
fi

if [[ -z "${APPLE_WEBHOOK_SECRET}" ]]; then
  echo "APPLE_WEBHOOK_SECRET is missing in ${BACKEND_DIR}/.env" >&2
  exit 1
fi

(
  cd "${BACKEND_DIR}"
  npm run start
) >"${BACKEND_LOG}" 2>&1 &
BACKEND_PID=$!

cleanup() {
  if kill -0 "${BACKEND_PID}" >/dev/null 2>&1; then
    kill "${BACKEND_PID}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${TUNNEL_PID:-}" ]] && kill -0 "${TUNNEL_PID}" >/dev/null 2>&1; then
    kill "${TUNNEL_PID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

for _ in {1..30}; do
  if curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
  echo "Backend failed to start. See ${BACKEND_LOG}" >&2
  exit 1
fi

ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R "80:localhost:${PORT}" nokey@localhost.run >"${TUNNEL_LOG}" 2>&1 &
TUNNEL_PID=$!

TUNNEL_URL=""
for _ in {1..30}; do
  TUNNEL_URL="$(
    awk '/tunneled with tls termination/ {print $1}' "${TUNNEL_LOG}" | tail -n 1 | tr -d '\r'
  )"
  if [[ -n "${TUNNEL_URL}" ]]; then
    break
  fi
  sleep 1
done

if [[ -z "${TUNNEL_URL}" ]]; then
  echo "Tunnel URL not detected. See ${TUNNEL_LOG}" >&2
  exit 1
fi

if [[ "${TUNNEL_URL}" != http://* && "${TUNNEL_URL}" != https://* ]]; then
  TUNNEL_URL="https://${TUNNEL_URL}"
fi

echo "Backend health URL: ${TUNNEL_URL}/health"
echo "Apple webhook URL: ${TUNNEL_URL}/v1/webhooks/apple"
echo "Apple webhook header: x-apple-webhook-secret: ${APPLE_WEBHOOK_SECRET}"
echo "Google RTDN webhook URL: ${TUNNEL_URL}/v1/webhooks/google/rtdn"
echo
echo "Keep this terminal open while testing."

wait "${TUNNEL_PID}"
