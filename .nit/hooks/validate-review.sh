#!/usr/bin/env bash
set -euo pipefail

# Validates inputs for nit:review skill.
# Checks: all 4 artifacts exist + structure, status is in-progress or rework.

INPUT=$(cat)
ARGS=$(echo "$INPUT" | jq -r '.tool_input.args // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
NIT_DIR="${CWD}/.nit"

PHASE=$(echo "$ARGS" | awk '{print $1}')
TASK=$(echo "$ARGS" | awk '{print $2}')

if [[ -z "$PHASE" || -z "$TASK" ]]; then
  echo "Missing arguments. Usage: /nit:review <phase> <task>
Example: /nit:review 1 2" >&2
  exit 2
fi
if ! [[ "$PHASE" =~ ^[0-9]+$ ]]; then
  echo "Invalid phase number: '${PHASE}'. Must be a positive integer." >&2
  exit 2
fi
if ! [[ "$TASK" =~ ^[0-9]+$ ]]; then
  echo "Invalid task number: '${TASK}'. Must be a positive integer." >&2
  exit 2
fi

TASK_DIR="${NIT_DIR}/phases/PHASE-${PHASE}/tasks/TASK-$(printf '%03d' "${TASK}")"
TASK_FILE="${TASK_DIR}/TASK.md"
DESIGN_FILE="${TASK_DIR}/DESIGN.md"
STEPS_FILE="${TASK_DIR}/STEPS.md"
IMPL_FILE="${TASK_DIR}/IMPLEMENTATION.md"

# File existence
if [[ ! -f "$TASK_FILE" ]]; then
  echo "TASK.md not found at ${TASK_FILE}." >&2
  exit 2
fi
if [[ ! -f "$DESIGN_FILE" ]]; then
  echo "DESIGN.md not found at ${DESIGN_FILE}.
Run /nit:design ${PHASE} ${TASK} first." >&2
  exit 2
fi
if [[ ! -f "$STEPS_FILE" ]]; then
  echo "STEPS.md not found at ${STEPS_FILE}.
Run /nit:implement ${PHASE} ${TASK} first." >&2
  exit 2
fi
if [[ ! -f "$IMPL_FILE" ]]; then
  echo "IMPLEMENTATION.md not found at ${IMPL_FILE}.
Implementation is not complete. Run /nit:implement ${PHASE} ${TASK} first." >&2
  exit 2
fi

# TASK.md structure
for tag in task meta acceptance-criteria criterion definition-of-done; do
  if ! grep -q "<${tag}>" "$TASK_FILE" 2>/dev/null && ! grep -q "<${tag} " "$TASK_FILE" 2>/dev/null; then
    echo "Invalid structure in ${TASK_FILE}: missing <${tag}> element." >&2
    exit 2
  fi
done

STATUS=$(grep -oP '<status>\K[^<]+' "$TASK_FILE" 2>/dev/null | head -1 | xargs)
if [[ "$STATUS" == "draft" || "$STATUS" == "ready" ]]; then
  echo "Task ${TASK} in phase ${PHASE} has not been implemented yet (status: ${STATUS}).
Run /nit:implement ${PHASE} ${TASK} first." >&2
  exit 2
fi

# DESIGN.md structure
for tag in design type summary key-decisions decision; do
  if ! grep -q "<${tag}>" "$DESIGN_FILE" 2>/dev/null && ! grep -q "<${tag} " "$DESIGN_FILE" 2>/dev/null; then
    echo "Invalid structure in ${DESIGN_FILE}: missing <${tag}> element." >&2
    exit 2
  fi
done

# STEPS.md structure
for tag in steps implementation-steps step acceptance-criteria-check dod-check; do
  if ! grep -q "<${tag}>" "$STEPS_FILE" 2>/dev/null && ! grep -q "<${tag} " "$STEPS_FILE" 2>/dev/null; then
    echo "Invalid structure in ${STEPS_FILE}: missing <${tag}> element." >&2
    exit 2
  fi
done

# IMPLEMENTATION.md structure
for tag in implementation summary files-changed file self-check; do
  if ! grep -q "<${tag}>" "$IMPL_FILE" 2>/dev/null && ! grep -q "<${tag} " "$IMPL_FILE" 2>/dev/null; then
    echo "Invalid structure in ${IMPL_FILE}: missing <${tag}> element." >&2
    exit 2
  fi
done

# Warn (not block) if steps are pending
if grep -qP 'status="pending"' "$STEPS_FILE" 2>/dev/null; then
  echo "Warning: STEPS.md has pending items — implementation may be incomplete."
fi

exit 0
