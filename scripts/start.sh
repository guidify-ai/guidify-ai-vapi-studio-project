#!/usr/bin/env bash
# yarn start — Docker + ngrok; seeds project UUID from config/project.identity.json
set -euo pipefail

ROOT="$(CDPATH="" cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-9999}"
NGROK_API="${NGROK_API:-http://127.0.0.1:4040}"
IDENTITY_FILE="${ROOT}/config/project.identity.json"

if [[ ! -f "$IDENTITY_FILE" ]]; then
  echo "Missing ${IDENTITY_FILE}" >&2
  echo "Run: yarn ensure-project-uuid   (or yarn mint-identity)" >&2
  exit 1
fi

read_identity() {
  python3 -c '
import json, pathlib, sys
d = json.loads(pathlib.Path("config/project.identity.json").read_text())
for key in ("id", "slug", "name"):
    if not str(d.get(key, "")).strip():
        sys.exit(f"project.identity.json missing {key}")
print(str(d["id"]).strip().lower())
print(str(d["slug"]).strip())
print(str(d["name"]).strip())
'
}
IDENTITY_LINES="$(read_identity)"
PROJECT_UUID="$(printf '%s\n' "$IDENTITY_LINES" | sed -n '1p')"
PROJECT_SLUG="$(printf '%s\n' "$IDENTITY_LINES" | sed -n '2p')"
PROJECT_NAME="$(printf '%s\n' "$IDENTITY_LINES" | sed -n '3p')"

if ! command -v ngrok >/dev/null 2>&1; then
  echo "ngrok is required on PATH for yarn start." >&2
  exit 1
fi

bash "$ROOT/scripts/ensure-docker.sh"

if [[ ! -f .env ]]; then
  echo ">> No .env — copying .env.example"
  cp .env.example .env
fi

if [[ ! -f docker-compose.yaml && ! -f docker-compose.yml ]]; then
  echo "Missing docker-compose.yaml" >&2
  exit 1
fi

PROJECT_UUID="$PROJECT_UUID" python3 -c '
import os
from pathlib import Path
uuid = os.environ["PROJECT_UUID"]
path = Path(".env")
lines = path.read_text().splitlines() if path.exists() else []
out, seen = [], False
for line in lines:
    if line.startswith("PROJECT_UUID="):
        out.append(f"PROJECT_UUID={uuid}"); seen = True
    else:
        out.append(line)
if not seen:
    out.append(f"PROJECT_UUID={uuid}")
path.write_text("\n".join(out) + "\n")
'

echo ">> Project ${PROJECT_NAME} (${PROJECT_SLUG}) id=${PROJECT_UUID}"
echo ">> App boot upserts this UUID into the projects table (create or exist)"
docker compose up -d --build

echo ">> Waiting for health on http://localhost:${PORT}/health"
for _ in $(seq 1 90); do
  if curl -sf "http://localhost:${PORT}/health" >/dev/null; then
    echo ">> App is healthy (project row seeded)"
    break
  fi
  sleep 1
done
curl -sf "http://localhost:${PORT}/health" >/dev/null || {
  echo "App failed to become healthy" >&2
  docker compose logs app --tail 60 >&2 || true
  exit 1
}

cleanup() {
  if [[ -n "${NGROK_PID:-}" ]] && kill -0 "$NGROK_PID" 2>/dev/null; then
    kill "$NGROK_PID" 2>/dev/null || true
    wait "$NGROK_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo ">> Starting ngrok http ${PORT}"
ngrok http "$PORT" --log=stdout &
NGROK_PID=$!

public_url=""
for _ in $(seq 1 40); do
  if ! kill -0 "$NGROK_PID" 2>/dev/null; then
    echo "ngrok exited early" >&2
    exit 1
  fi
  payload="$(curl -sf "${NGROK_API}/api/tunnels" 2>/dev/null || true)"
  if [[ -n "$payload" ]]; then
    public_url="$(
      printf '%s' "$payload" | python3 -c '
import json, sys
data = json.load(sys.stdin)
https = [t.get("public_url") for t in data.get("tunnels", []) if str(t.get("public_url", "")).startswith("https://")]
print(https[0] if https else "")
'
    )"
    [[ -n "$public_url" ]] && break
  fi
  sleep 0.5
done

upsert_public_base_url() {
  local url="$1"
  PUBLIC_URL="$url" python3 -c '
import os
from pathlib import Path
url = os.environ["PUBLIC_URL"]
path = Path(".env")
lines = path.read_text().splitlines()
found = False
out = []
for line in lines:
    if line.startswith("PUBLIC_BASE_URL="):
        out.append(f"PUBLIC_BASE_URL={url}"); found = True
    else:
        out.append(line)
if not found:
    out.append(f"PUBLIC_BASE_URL={url}")
path.write_text("\n".join(out) + "\n")
'
}

echo
if [[ -z "$public_url" ]]; then
  echo ">> Could not read ngrok public URL; set PUBLIC_BASE_URL in .env manually."
  echo "App: http://localhost:${PORT}"
else
  echo ">> ngrok public URL: ${public_url}"
  upsert_public_base_url "$public_url"
  PUBLIC_BASE_URL="$public_url" docker compose up -d app
  echo
  echo "Project:                ${PROJECT_NAME} (${PROJECT_SLUG})"
  echo "Project UUID:           ${PROJECT_UUID}"
  echo "Webhook endpoint:       ${public_url}/${PROJECT_UUID}/vapi/webhook"
  echo "Conversation endpoint:  ${public_url}/${PROJECT_UUID}/vapi/chat/completions"
  echo
fi

echo ">> ngrok is running (Ctrl+C stops ngrok; Docker stack keeps running — yarn stop)"
wait "$NGROK_PID"
