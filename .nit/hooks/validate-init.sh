#!/usr/bin/env bash
set -euo pipefail

# Validates inputs for nit:init skill.
# Checks: we're in a git repo.

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

if ! git -C "$CWD" rev-parse --git-dir &>/dev/null; then
  echo "Not a git repository. nit requires a git repository.
Run 'git init' first." >&2
  exit 2
fi

exit 0
