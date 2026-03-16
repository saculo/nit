#!/usr/bin/env bash
set -euo pipefail

# Validates inputs for nit:phase-summary skill.
# Checks: phase number valid, PHASE.md exists, all tasks have REVIEW.md with approved verdict.

INPUT=$(cat)
ARGS=$(echo "$INPUT" | jq -r '.tool_input.args // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
NIT_DIR="${CWD}/.nit"

PHASE="$ARGS"
if [[ -z "$PHASE" ]]; then
  echo "Missing phase number. Usage: /nit:phase-summary <phase-number>" >&2
  exit 2
fi
if ! [[ "$PHASE" =~ ^[0-9]+$ ]]; then
  echo "Invalid phase number: '${PHASE}'. Must be a positive integer." >&2
  exit 2
fi

PHASE_DIR="${NIT_DIR}/phases/PHASE-${PHASE}"
PHASE_FILE="${PHASE_DIR}/PHASE.md"

if [[ ! -f "$PHASE_FILE" ]]; then
  echo "PHASE.md not found at ${PHASE_FILE}.
Run /nit:phases first." >&2
  exit 2
fi

# Check PHASE.md structure
for tag in phase meta id title milestone status success-criteria; do
  if ! grep -q "<${tag}>" "$PHASE_FILE" 2>/dev/null; then
    echo "Invalid structure in ${PHASE_FILE}: missing <${tag}> element." >&2
    exit 2
  fi
done

STATUS=$(grep -oP '<status>\K[^<]+' "$PHASE_FILE" 2>/dev/null | head -1 | xargs)
if [[ "$STATUS" == "done" ]]; then
  echo "Phase ${PHASE} is already complete (status: done). Summary already exists." >&2
  exit 2
fi
if [[ "$STATUS" == "draft" ]]; then
  echo "Phase ${PHASE} has not started yet (status: draft)." >&2
  exit 2
fi

# Check that tasks directory exists and has tasks
TASKS_DIR="${PHASE_DIR}/tasks"
if [[ ! -d "$TASKS_DIR" ]]; then
  echo "No tasks directory found for phase ${PHASE}.
Run /nit:tasks ${PHASE} first." >&2
  exit 2
fi

# Check each task has a REVIEW.md
MISSING_REVIEWS=""
for task_dir in "$TASKS_DIR"/TASK-*/; do
  [[ -d "$task_dir" ]] || continue
  task_name=$(basename "$task_dir")
  if [[ ! -f "${task_dir}/REVIEW.md" ]]; then
    MISSING_REVIEWS="${MISSING_REVIEWS}  ${task_name}: missing REVIEW.md\n"
  fi
done

if [[ -n "$MISSING_REVIEWS" ]]; then
  echo -e "Not all tasks in phase ${PHASE} have been reviewed:\n${MISSING_REVIEWS}Complete all reviews before running phase summary." >&2
  exit 2
fi

exit 0
