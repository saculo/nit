#!/usr/bin/env bash
set -euo pipefail

# Validates inputs for nit:phases skill.
# Checks: prd/summary.json exists, is valid JSON, and all clarifications are answered.

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
NIT_DIR="${CWD}/.nit"

SUMMARY="${NIT_DIR}/prd/summary.json"
if [[ ! -f "$SUMMARY" ]]; then
  echo "prd/summary.json not found at ${SUMMARY}.
Run /nit:clarify first." >&2
  exit 2
fi

if ! jq -e . "$SUMMARY" >/dev/null 2>&1; then
  echo "prd/summary.json is not valid JSON at ${SUMMARY}. Re-run /nit:clarify." >&2
  exit 2
fi

# Every clarification must carry a non-empty answer.
if ! jq -e '(.clarifications // []) | all(.answer != null and .answer != "")' "$SUMMARY" >/dev/null 2>&1; then
  echo "prd/summary.json has unanswered clarifications (empty answer).
Complete /nit:clarify first." >&2
  exit 2
fi

exit 0
