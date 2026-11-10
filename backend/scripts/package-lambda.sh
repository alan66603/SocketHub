#!/usr/bin/env bash
# Build backend/lambda.zip: app source + production node_modules (no .env, no terraform).
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

cp -R "$BACKEND_DIR"/{controllers,models,routes,services} "$STAGE"/
cp "$BACKEND_DIR"/{server.js,lambda.js,package.json,package-lock.json} "$STAGE"/

(cd "$STAGE" && npm ci --omit=dev --no-audit --no-fund >/dev/null)

rm -f "$BACKEND_DIR/lambda.zip"
(cd "$STAGE" && zip -qr "$BACKEND_DIR/lambda.zip" .)
echo "Built $BACKEND_DIR/lambda.zip ($(du -h "$BACKEND_DIR/lambda.zip" | cut -f1))"
