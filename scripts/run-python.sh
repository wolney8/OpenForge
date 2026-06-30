#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" == "Darwin" ]] && arch -arm64 /usr/bin/true >/dev/null 2>&1; then
  exec arch -arm64 .venv/bin/python "$@"
fi

exec .venv/bin/python "$@"
