#!/bin/zsh
set -eu

runtime_directory="$(mktemp -d "${TMPDIR:-/tmp}/openforge-e2e.XXXXXX")"
api_pid=""

cleanup() {
  if [[ -n "$api_pid" ]]; then
    kill "$api_pid" 2>/dev/null || true
    wait "$api_pid" 2>/dev/null || true
  fi
  case "$runtime_directory" in
    "${TMPDIR:-/tmp}"/openforge-e2e.*) rm -rf -- "$runtime_directory" ;;
    *) print -u2 "Refusing to remove unexpected E2E runtime: $runtime_directory" ;;
  esac
}
trap cleanup EXIT INT TERM

export OPENFORGE_AUTH_REQUIRED=false
export OPENFORGE_DATABASE_MODE=local
export OPENFORGE_DATABASE_URL="sqlite:///$runtime_directory/e2e.sqlite3"
export OPENFORGE_RUNTIME_ROLE=test
export OPENFORGE_RUNTIME_DATABASE_IDENTITY=isolated-e2e
export OPENFORGE_RUNTIME_SOURCE_ROOT="$PWD"
export OPENFORGE_RUNTIME_SOURCE_REVISION="$(git rev-parse HEAD)"
export OPENFORGE_RUNTIME_FRONTEND_ENDPOINT=http://localhost:3010
export OPENFORGE_RUNTIME_API_ENDPOINT=http://127.0.0.1:8010
export OPENFORGE_RUNTIME_ENVIRONMENT_SOURCE=run-isolated-e2e-api.sh
export OPENFORGE_RUNTIME_DATABASE_TARGET_EXPLICIT=true

./scripts/run-python.sh -m uvicorn openforge_api.main:app \
  --app-dir apps/api/src --host 127.0.0.1 --port 8010 &
api_pid=$!
wait "$api_pid"
