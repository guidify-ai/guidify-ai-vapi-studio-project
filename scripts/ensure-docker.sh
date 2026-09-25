#!/usr/bin/env bash
set -euo pipefail
docker info >/dev/null 2>&1 || { echo "Docker required" >&2; exit 1; }
