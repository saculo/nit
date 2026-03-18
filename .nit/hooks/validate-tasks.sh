#!/usr/bin/env bash
set -euo pipefail

# Validates inputs for nit:tasks skill.
# Checks: phase number valid, PHASE.md exists + structure, status not done.

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

PHASE_FILE="${NIT_DIR}/phases/PHASE-${PHASE}/PHASE.md"
if [[ ! -f "$PHASE_FILE" ]]; then
  echo "PHASE.md not found at ${PHASE_FILE}.
Run /nit:phases first." >&2
  exit 2
fi

for tag in phase meta id title milestone status business-value scope draft-tasks success-criteria; do
  if ! grep -q "<${tag}>" "$PHASE_FILE" 2>/dev/null; then
    echo "Invalid structure in ${PHASE_FILE}: missing <${tag}> element." >&2
    exit 2
  fi
done

STATUS=$(grep -oP '<status>\K[^<]+' "$PHASE_FILE" 2>/dev/null | head -1 | xargs)
if [[ "$STATUS" == "done" ]]; then
  echo "Phase ${PHASE} is already complete (status: done)." >&2
  exit 2
fi

exit 0
