#!/usr/bin/env bash
set -euo pipefail

# Validates inputs for nit:brownfield-orchestrate skill.
# Checks: .nit/ exists, repo has committed code, brownfield mode confirmed.

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
NIT_DIR="${CWD}/.nit"

if [[ ! -d "$NIT_DIR" ]]; then
  echo ".nit/ directory not found. Run /nit:init first." >&2
  exit 2
fi

# Check repo has committed code
if ! git -C "$CWD" log --oneline -1 &>/dev/null; then
  echo "Repository has no commits. Brownfield analysis requires existing code." >&2
  exit 2
fi

# Check config for brownfield mode if config exists
CONFIG="${NIT_DIR}/config/nit.yaml"
if [[ -f "$CONFIG" ]]; then
  MODE=$(grep -oP 'mode:\s*\K\S+' "$CONFIG" 2>/dev/null | head -1)
  if [[ -n "$MODE" && "$MODE" != "brownfield" ]]; then
    echo "Project mode is '${MODE}', not brownfield.
Brownfield analysis is only for existing codebases." >&2
    exit 2
  fi
fi

exit 0
