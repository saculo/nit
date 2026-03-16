#!/usr/bin/env bash
set -euo pipefail

# Validates inputs for nit:orchestrate skill.
# Checks: PRD file exists.

INPUT=$(cat)
ARGS=$(echo "$INPUT" | jq -r '.tool_input.args // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

find_prd() {
  local prd_path="$1"
  if [[ -n "$prd_path" && -f "${CWD}/${prd_path}" ]]; then return 0; fi
  if [[ -n "$prd_path" && -f "$prd_path" ]]; then return 0; fi
  for candidate in "PRD.md" "prd.md"; do
    if [[ -f "${CWD}/${candidate}" ]]; then return 0; fi
  done
  local found
  found=$(find "$CWD" -maxdepth 1 \( -iname '*prd*' -o -iname '*requirements*' -o -iname '*spec*' \) -print -quit 2>/dev/null)
  if [[ -n "$found" ]]; then return 0; fi
  return 1
}

if ! find_prd "$ARGS"; then
  echo "PRD file not found. Provide the path: /nit:orchestrate <path-to-prd>" >&2
  exit 2
fi

exit 0
