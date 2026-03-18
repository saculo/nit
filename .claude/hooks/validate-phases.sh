#!/usr/bin/env bash
set -euo pipefail

# Validates inputs for nit:phases skill.
# Checks: PRD file exists, CLARIFICATIONS.md exists + structure + no empty answers.

INPUT=$(cat)
ARGS=$(echo "$INPUT" | jq -r '.tool_input.args // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
NIT_DIR="${CWD}/.nit"

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
  echo "PRD file not found. Provide the path: /nit:phases <path-to-prd>" >&2
  exit 2
fi

CLARIFICATIONS="${NIT_DIR}/CLARIFICATIONS.md"
if [[ ! -f "$CLARIFICATIONS" ]]; then
  echo "CLARIFICATIONS.md not found at ${CLARIFICATIONS}.
Run /nit:clarify first." >&2
  exit 2
fi

for tag in clarifications unknowns risks assumptions; do
  if ! grep -q "<${tag}>" "$CLARIFICATIONS" 2>/dev/null; then
    echo "Invalid structure in ${CLARIFICATIONS}: missing <${tag}> element." >&2
    exit 2
  fi
done

if grep -qP '<answer>\s*</answer>' "$CLARIFICATIONS" 2>/dev/null; then
  echo "CLARIFICATIONS.md has unanswered questions (empty <answer> tags).
Complete /nit:clarify first." >&2
  exit 2
fi

exit 0
