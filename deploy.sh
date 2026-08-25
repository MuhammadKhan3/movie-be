#!/usr/bin/env bash
set -euo pipefail

SERVICE=backend
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="${COMPOSE_DIR:-$SCRIPT_DIR}"

cd "$COMPOSE_DIR"

if [[ ! -f .env ]]; then
  echo "Missing $COMPOSE_DIR/.env" >&2
  exit 1
fi

set -a
source .env
set +a

: "${BACKEND_IMAGE:?BACKEND_IMAGE is missing from .env}"
: "${FRONTEND_IMAGE:?FRONTEND_IMAGE is missing from .env}"
: "${JWT_SECRET:?JWT_SECRET is missing from .env}"

echo "Deploying $SERVICE: $BACKEND_IMAGE"
docker compose --env-file .env pull "$SERVICE"
docker compose --env-file .env up -d --force-recreate --remove-orphans "$SERVICE"
docker compose --env-file .env ps
