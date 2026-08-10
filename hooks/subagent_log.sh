#!/usr/bin/env bash
# 서브에이전트 호출 로그
#
# Claude Code 훅에서 stdin 으로 JSON 이벤트를 받아 harness-example/hooks/subagent.log 에
# 한 줄씩 append 한다. 파이프라인 어느 단계가 어떤 에이전트를 언제 호출했는지 추적하는 용도.
#
# 이 스크립트는 관측만 한다. 종료 코드는 항상 0이며 파이프라인을 막지 않는다.

set -uo pipefail

hooks_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
log_file="${hooks_dir}/subagent.log"

payload="$(cat 2>/dev/null || true)"
timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

extract() {
  # jq 가 있으면 쓰고, 없으면 최소한의 grep 폴백을 쓴다
  local key="$1"
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$payload" | jq -r --arg k "$key" '.[$k] // ""' 2>/dev/null
  else
    printf '%s' "$payload" | grep -o "\"${key}\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" \
      | head -1 | sed 's/.*:[[:space:]]*"//; s/"$//'
  fi
}

event="$(extract hook_event_name)"
tool="$(extract tool_name)"
agent="$(extract subagent_type)"

printf '%s\tevent=%s\ttool=%s\tagent=%s\n' \
  "$timestamp" "${event:-unknown}" "${tool:-?}" "${agent:-?}" >> "$log_file"

exit 0
