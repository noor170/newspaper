#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "Docker Compose is required but was not found on this host." >&2
  exit 1
fi

echo "Fetching latest code from origin/main..."
git fetch origin main
git checkout main
git pull --ff-only origin main

echo "Stopping current containers..."
"${COMPOSE_CMD[@]}" down --remove-orphans

echo "Rebuilding application images..."
"${COMPOSE_CMD[@]}" build --no-cache

echo "Starting services in detached mode..."
"${COMPOSE_CMD[@]}" up -d

echo "Pruning dangling Docker images..."
docker image prune -f

echo "Deployment completed successfully."
