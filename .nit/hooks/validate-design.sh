#!/usr/bin/env bash
set -euo pipefail

# Validates inputs for nit:design skill.
# Checks: phase/task numbers valid, TASK.md exists + structure, status not done.

INPUT=$(cat)
ARGS=$(echo "$INPUT" | jq -r '.tool_input.args // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
NIT_DIR="${CWD}/.nit"

PHASE=$(echo "$ARGS" | awk '{print $1}')
TASK=$(echo "$ARGS" | awk '{print $2}')

if [[ -z "$PHASE" || -z "$TASK" ]]; then
  echo "Missing arguments. Usage: /nit:design <phase> <task>
Example: /nit:design 1 2" >&2
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

TASK_FILE="${NIT_DIR}/phases/PHASE-${PHASE}/tasks/TASK-$(printf '%03d' "${TASK}")/TASK.md"
if [[ ! -f "$TASK_FILE" ]]; then
  echo "TASK.md not found at ${TASK_FILE}.
Run /nit:tasks ${PHASE} first." >&2
  exit 2
fi

for tag in task meta id type status user-story acceptance-criteria criterion; do
  if ! grep -q "<${tag}>" "$TASK_FILE" 2>/dev/null && ! grep -q "<${tag} " "$TASK_FILE" 2>/dev/null; then
    echo "Invalid structure in ${TASK_FILE}: missing <${tag}> element." >&2
    exit 2
  fi
done

TYPE=$(grep -oP '<type>\K[^<]+' "$TASK_FILE" 2>/dev/null | head -1 | xargs)
if [[ -n "$TYPE" ]] && ! echo "backend frontend devops qa" | grep -qw "$TYPE"; then
  echo "Invalid <type> value '${TYPE}' in ${TASK_FILE}.
Allowed values: backend, frontend, devops, qa" >&2
  exit 2
fi

STATUS=$(grep -oP '<status>\K[^<]+' "$TASK_FILE" 2>/dev/null | head -1 | xargs)
if [[ "$STATUS" == "done" ]]; then
  echo "Task ${TASK} in phase ${PHASE} is already complete (status: done)." >&2
  exit 2
fi

exit 0
