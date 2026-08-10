#!/usr/bin/env bash
# 하네스 검증 스크립트
#
# 게이트가 "통과시켜야 할 것은 통과시키고, 막아야 할 것은 막는지"를 실행으로 확인한다.
# 게이트 자체가 고장 나면 파이프라인 전체의 안전장치가 무의미해지므로,
# 게이트를 검사하는 검사가 따로 필요하다.
#
# 사용법:
#   ./verify.sh          픽스처로 통과·차단 경로 검증 (자족적, 외부 산출물 불필요)
#   ./verify.sh --real   위 + outputs/ 의 실제 제작 이력까지 함께 판정
#
# 전부 기대대로면 exit 0, 하나라도 어긋나면 exit 1.

set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
gate="${here}/unsorted/scripts/check-production-gate.mjs"
fixtures="${here}/data/fixtures"

pass_count=0
fail_count=0

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node 가 필요합니다." >&2
  exit 1
fi

if [ ! -f "$gate" ]; then
  echo "ERROR: 게이트 스크립트를 찾지 못했습니다: $gate" >&2
  echo "  unsorted/scripts/check-production-gate.mjs 가 있는지 확인하십시오." >&2
  echo "  zip 은 반드시 링크를 실체화해서(rsync -aL) 만드십시오." >&2
  exit 1
fi

# expect <기대exit> <설명> <로그경로> [--stage X]
expect() {
  local want="$1"; shift
  local label="$1"; shift
  local out got
  out="$(node "$gate" "$@" 2>&1)"
  got=$?
  if [ "$got" -eq "$want" ]; then
    printf '  PASS  %-46s (exit %s)\n' "$label" "$got"
    pass_count=$((pass_count + 1))
  else
    printf '  FAIL  %-46s (기대 exit %s, 실제 %s)\n' "$label" "$want" "$got"
    printf '%s\n' "$out" | sed 's/^/        /'
    fail_count=$((fail_count + 1))
  fi
}

echo
echo "── 픽스처 검증 ───────────────────────────────────────────────"
expect 0 "통과 픽스처 / stage=video"   "${fixtures}/production-log.pass.json"  --stage video
expect 0 "통과 픽스처 / stage=final"   "${fixtures}/production-log.pass.json"  --stage final
expect 0 "통과 픽스처 / stage=publish" "${fixtures}/production-log.pass.json"  --stage publish
expect 1 "차단 픽스처 / stage=video"   "${fixtures}/production-log.block.json" --stage video
expect 1 "차단 픽스처 / stage=final"   "${fixtures}/production-log.block.json" --stage final
expect 1 "차단 픽스처 / stage=publish" "${fixtures}/production-log.block.json" --stage publish

echo
echo "── 인자 처리 ─────────────────────────────────────────────────"
expect 2 "잘못된 --stage 값은 거부"     "${fixtures}/production-log.pass.json"  --stage nonsense
expect 2 "없는 파일은 오류로 종료"       "${fixtures}/does-not-exist.json"

# 정지 이미지 입력 게이트.
#
# 왜 회귀 테스트가 필요한가: 이 게이트가 조용히 느슨해지면 아무도 모른다. 프롬프트는
# 정상적으로 조립되고, 명령도 성공하고, 청구도 되고, 결과만 가이드에서 벗어난다.
# 실패가 눈에 띄지 않는 종류라서 실행으로 고정해 둔다.
#
# 아래 입력은 전부 실제 사례다. 2026-08-11 nano_banana_flash 6회 생성분에서
# 분할 컷·캐릭터 중복을 만든 입력을 그대로 가져왔다.
echo
echo "── 정지 이미지 입력 게이트 ───────────────────────────────────"
builder="${here}/unsorted/scripts/build-pongdang-prompt.mjs"
builder_expect() {
  local want="$1" label="$2" scene="$3" camera="$4"
  local out got
  out="$(node "$builder" --characters boo-rabong --scene "$scene" --camera "$camera" 2>&1)"
  got=$?
  if [ "$got" -eq "$want" ]; then
    printf '  PASS  %-46s (exit %s)\n' "$label" "$got"
    pass_count=$((pass_count + 1))
  else
    printf '  FAIL  %-46s (기대 exit %s, 실제 %s)\n' "$label" "$want" "$got"
    printf '%s\n' "$out" | sed 's/^/        /'
    fail_count=$((fail_count + 1))
  fi
}

if [ -f "$builder" ]; then
  builder_expect 2 "샷 전환은 거부 (실제 2패널 사례)" \
    "BOO RABONG walks into the forest trail entrance." \
    "front-facing full shot tracking the character, transitioning to a face close-up"
  builder_expect 2 "카메라 이동 3연발은 거부 (3패널 사례)" \
    "BOO RABONG freezes and stares at a huge tree far ahead." \
    "shot starting from behind then panning toward the tree, cutting back to a close-up"
  builder_expect 2 "장면의 시간 흐름은 거부 (중복 사례)" \
    "BOO RABONG hops along, peeking into one patch of shade after another." \
    "side-facing medium shot"
  builder_expect 2 "샷 크기 2개는 거부" \
    "BOO RABONG sits under a tree." \
    "low-angle full shot and a close-up"
  builder_expect 2 "샷 크기 누락은 거부" \
    "BOO RABONG sits under a tree." \
    "low-angle"
  builder_expect 2 "분할 레이아웃 요청은 거부" \
    "BOO RABONG sits under a tree." \
    "medium shot, comic panels side by side"
  builder_expect 0 "단일 샷은 통과 (유일한 정상 생성 사례)" \
    "BOO RABONG lies flat on the ground in deep tree shade with a drowsy smile." \
    "low-angle full shot"
else
  echo "  SKIP  build-pongdang-prompt.mjs 를 찾지 못했습니다"
fi

# 훅은 관측만 한다. 어떤 입력에도 파이프라인을 막으면 안 된다.
echo
echo "── 훅 (관측 전용) ────────────────────────────────────────────"
hook="${here}/hooks/subagent_log.sh"
hook_expect() {
  local label="$1" payload="$2" env_path="${3:-$PATH}"
  local got
  printf '%s' "$payload" | PATH="$env_path" "$hook" >/dev/null 2>&1
  got=$?
  if [ "$got" -eq 0 ]; then
    printf '  PASS  %-46s (exit 0)\n' "$label"
    pass_count=$((pass_count + 1))
  else
    printf '  FAIL  %-46s (기대 exit 0, 실제 %s)\n' "$label" "$got"
    fail_count=$((fail_count + 1))
  fi
}

if [ -x "$hook" ]; then
  hook_expect "정상 페이로드에 exit 0"   '{"hook_event_name":"PreToolUse","tool_name":"Agent","subagent_type":"verify"}'
  hook_expect "jq 없는 환경에서도 exit 0" '{"hook_event_name":"PreToolUse","tool_name":"Agent","subagent_type":"verify"}' "/usr/bin:/bin"
  hook_expect "빈 입력에도 exit 0"       ''
  hook_expect "깨진 JSON 에도 exit 0"    '{not valid json'
else
  echo "  SKIP  hooks/subagent_log.sh 가 실행 가능하지 않습니다"
fi

if [ "${1:-}" = "--real" ]; then
  echo
  echo "── 실제 제작 이력 ────────────────────────────────────────────"
  echo "  (승인·앵커가 미기록인 프로젝트는 차단되는 것이 정상 동작이다)"
  while IFS= read -r log; do
    node "$gate" "$log" --stage video >/dev/null 2>&1
    printf '  exit=%s  %s\n' "$?" "${log#"${here}/"}"
  done < <(find -L "${here}/unsorted/outputs" -name "production-log.json" 2>/dev/null | sort)
fi

echo
echo "─────────────────────────────────────────────────────────────"
printf '통과 %s / 실패 %s\n' "$pass_count" "$fail_count"
echo

[ "$fail_count" -eq 0 ] || exit 1
exit 0
