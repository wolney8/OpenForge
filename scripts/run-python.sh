#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
python_path="${OPENFORGE_PYTHON:-$repository_root/.venv/bin/python}"

# Git worktrees share the repository metadata but do not normally share ignored
# files such as .venv. Fall back to the primary checkout's environment when the
# current worktree has no local interpreter.
if [[ ! -x "$python_path" ]] && command -v git >/dev/null 2>&1; then
  common_directory="$(git -C "$repository_root" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
  if [[ -n "$common_directory" ]]; then
    shared_python="$(dirname "$common_directory")/.venv/bin/python"
    if [[ -x "$shared_python" ]]; then
      python_path="$shared_python"
    fi
  fi
fi

if [[ ! -x "$python_path" ]]; then
  echo "OpenForge Python environment not found. Create .venv or set OPENFORGE_PYTHON." >&2
  exit 127
fi

if [[ "$(uname -s)" == "Darwin" ]] && arch -arm64 /usr/bin/true >/dev/null 2>&1; then
  exec arch -arm64 "$python_path" "$@"
fi

exec "$python_path" "$@"
