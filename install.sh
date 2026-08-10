#!/usr/bin/env bash
# 하네스 설치 스크립트
#
# agents/ 와 skills/ 를 Claude Code 가 실제로 읽는 위치(<프로젝트루트>/.claude/)에 연결한다.
# 정의 파일이 agents/ skills/ 에만 있으면 문서로만 존재할 뿐 호출되지 않는다.
#
# 사용법:
#   ./install.sh            설치 (이미 있으면 갱신)
#   ./install.sh --check    설치 상태만 확인하고 아무것도 바꾸지 않는다
#
# 이 스크립트는 되돌릴 수 있다. 만들어진 것은 전부 심볼릭 링크이며,
# 원본 파일을 수정하거나 삭제하지 않는다.

set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="${here}"          # 하네스가 프로젝트 루트 자체다
claude_dir="${root}/.claude"

check_only=0
[ "${1:-}" = "--check" ] && check_only=1

link_all() {
  local kind="$1"        # agents | skills
  local pattern="$2"     # *.md | */
  local src_dir="${here}/${kind}"
  local dst_dir="${claude_dir}/${kind}"
  local n=0 missing=0

  if [ ! -d "$src_dir" ]; then
    echo "  SKIP  ${kind}/ 가 없습니다: ${src_dir}"
    return 0
  fi

  [ "$check_only" -eq 0 ] && mkdir -p "$dst_dir"

  for path in "${src_dir}"/${pattern}; do
    [ -e "$path" ] || continue
    local name
    name="$(basename "$path")"
    local dst="${dst_dir}/${name}"

    if [ "$check_only" -eq 1 ]; then
      if [ -e "$dst" ]; then n=$((n + 1)); else missing=$((missing + 1)); fi
      continue
    fi

    # -n 은 기존 링크를 따라 들어가지 않고 링크 자체를 교체한다 (디렉터리 링크에 필수)
    ln -sfn "../../${kind}/${name}" "$dst"
    n=$((n + 1))
  done

  if [ "$check_only" -eq 1 ]; then
    printf '  %-8s 설치됨 %s개 / 누락 %s개\n' "$kind" "$n" "$missing"
    [ "$missing" -eq 0 ] || return 1
  else
    printf '  %-8s %s개 연결 → .claude/%s/\n' "$kind" "$n" "$kind"
  fi
  return 0
}

echo
if [ "$check_only" -eq 1 ]; then
  echo "── 설치 상태 확인 ────────────────────────────────────────────"
else
  echo "── 하네스 설치 ───────────────────────────────────────────────"
  echo "  프로젝트 루트: ${root}"
fi

rc=0
link_all agents "*.md" || rc=1
link_all skills "*/"   || rc=1

if [ "$check_only" -eq 0 ]; then
  chmod +x "${here}/verify.sh" "${here}/hooks/subagent_log.sh" 2>/dev/null
  echo
  echo "  훅은 자동 적용되지 않는다. 쓰려면 hooks/settings.json 의 hooks 블록을"
  echo "  ${claude_dir}/settings.json 에 병합한다."
  echo
  echo "  다음: ./verify.sh 로 게이트가 살아 있는지 확인한다."
fi
echo

exit $rc
