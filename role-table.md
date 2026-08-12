# 역할표 (role table)

퐁당패밀리 숏폼 하네스의 스킬 ↔ 에이전트 ↔ 산출물 대응표.
절차의 진실 공급원은 언제나 `skills/<name>/SKILL.md`이며, 이 표는 **누가 무엇을 맡는지**만 정의한다.

## 오케스트레이터

| 스킬 | 에이전트 | 역할 |
|---|---|---|
| `pongdang-pipeline` | `pongdang-pipeline-orchestrator` | 17단계 전체 순서 조정, 게이트 실행, 위임 |

## 서브에이전트

| # | 스킬 | 에이전트 | 입력 | 산출물 |
|---|---|---|---|---|
| — | `character-guide` | `character-guide-subagent` | 캐릭터 질의 | (읽기 전용 SSOT) |
| 1 | `plan-generator` | `plan-generator-subagent` | 담당자 키워드·길이·비율 | `input/request.json`, `planning/plan.md` |
| 2 | `guide-injector` | `guide-injector-subagent` | 가이드 JSON, 등장 캐릭터 | `guide_applied` |
| 3 | `scenario-generator` | `scenario-generator-subagent` | `plan.md` | `planning/scenario.md` |
| 4·5 | `higgsfield-prompt-builder` | `higgsfield-prompt-builder-subagent` | 장면 정보, 계약 JSON | 생성 프롬프트, 앵커 컷 |
| 5 | `storyboard-generator` | `storyboard-generator-subagent` | `scenario.md`, 승인 앵커 | `storyboard-{a,b,c}.md` + 장면 PNG |
| 6·11 | `auto-reviewer` | `auto-reviewer-subagent` | 문서·이미지·영상 | `review/planning-review.md`, `review/video-review.md` |
| 8·13·16 | `approval-logger` | `approval-logger-subagent` | 담당자 의사 표시 | `approvals.{production,final,distribution}` |
| 10 | `video-generator` | `video-generator-subagent` | 선택된 스토리보드 | `video/draft.mp4` → `final.mp4` |
| 15 | `content-publisher` | `content-publisher-subagent` | `final.mp4`, 배포 승인 | 플랫폼별 URL·상태 |

## 권한 경계

| 행위 | 허용 에이전트 |
|---|---|
| 유료 생성 API 호출 | `video-generator-subagent`, `higgsfield-prompt-builder-subagent` (승인 후에만) |
| 승인 기록 작성 | `approval-logger-subagent` **만** |
| 외부 게시 | `content-publisher-subagent` **만** |
| 게이트 실행 | `pongdang-pipeline-orchestrator` **만** |
| 가이드 원본 수정 | 없음 — 담당자가 `data/character-guide.json`을 고치고 sync 스크립트 실행 |

## 공유 상태

모든 에이전트는 `outputs/project-output/metadata/production-log.json` 하나를 갱신한다.
스키마는 `data/production-log.schema.json`. **자기 필드만 병합하고 기존 값을 덮어쓰지 않는다.**

| 필드 | 쓰는 에이전트 |
|---|---|
| `guide_applied` | guide-injector |
| `anchors` | higgsfield-prompt-builder |
| `scene_images` | storyboard-generator, higgsfield-prompt-builder |
| `reviews` | auto-reviewer |
| `approvals.*` | approval-logger |
| `costs`, `model_versions`, `timings` | video-generator |
| `execution_history` | 실행한 Timely Agent 또는 Claude Code — `scripts/record-model-run.mjs` 정책 검증 후 기록 |
| `artifact_versions` | 각 산출 단계 |
| `errors` | 전체 |
