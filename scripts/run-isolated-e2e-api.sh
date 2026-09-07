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

./scripts/run-python.sh -m uvicorn openforge_api.main:app \
  --app-dir apps/api/src --host 127.0.0.1 --port 8010 &
api_pid=$!
wait "$api_pid"
