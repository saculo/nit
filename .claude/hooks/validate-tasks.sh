#!/usr/bin/env bash
set -euo pipefail

# Validates inputs for nit:tasks skill.
# Checks: phase number valid, phase.json exists + valid JSON, status not done.

INPUT=$(cat)
ARGS=$(echo "$INPUT" | jq -r '.tool_input.args // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
NIT_DIR="${CWD}/.nit"

PHASE="$ARGS"
if [[ -z "$PHASE" ]]; then
  echo "Missing phase number. Usage: /nit:tasks <phase-number>" >&2
  exit 2
fi
if ! [[ "$PHASE" =~ ^[0-9]+$ ]]; then
  echo "Invalid phase number: '${PHASE}'. Must be a positive integer." >&2
  exit 2
fi

PHASE_FILE="${NIT_DIR}/phases/PHASE-${PHASE}/phase.json"
if [[ ! -f "$PHASE_FILE" ]]; then
  echo "phase.json not found at ${PHASE_FILE}.
Run /nit:phases first." >&2
  exit 2
fi

if ! jq -e . "$PHASE_FILE" >/dev/null 2>&1; then
  echo "phase.json is not valid JSON at ${PHASE_FILE}. Re-run /nit:phases." >&2
  exit 2
fi

STATUS=$(jq -r '.status // empty' "$PHASE_FILE")
if [[ "$STATUS" == "done" ]]; then
  echo "Phase ${PHASE} is already complete (status: done)." >&2
  exit 2
fi

exit 0
