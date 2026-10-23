#!/bin/zsh
set -eu

runtime_directory="$(mktemp -d "${TMPDIR:-/tmp}/openforge-e2e.XXXXXX")"
api_pid=""
api_port="${OPENFORGE_E2E_API_PORT:-8010}"

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
export OPENFORGE_RUNTIME_API_ENDPOINT="http://127.0.0.1:$api_port"
export OPENFORGE_RUNTIME_ENVIRONMENT_SOURCE=run-isolated-e2e-api.sh
export OPENFORGE_RUNTIME_DATABASE_TARGET_EXPLICIT=true

if [[ "${OPENFORGE_E2E_SEED_SYNTHETIC:-false}" == "true" ]]; then
  PYTHONPATH="$PWD/apps/api/src:$PWD" ./scripts/run-python.sh -c \
    'from apps.api.tests.synthetic_setup import seed_synthetic_betting_context; seed_synthetic_betting_context()'
fi

./scripts/run-python.sh -m uvicorn openforge_api.main:app \
  --app-dir apps/api/src --host 127.0.0.1 --port "$api_port" &
api_pid=$!
wait "$api_pid"
