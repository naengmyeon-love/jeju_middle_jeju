# 워크플로우

`skills/pongdang-pipeline/SKILL.md`의 17단계를 하네스 관점에서 정리한 것이다.
단계 내부 규칙은 각 SKILL.md가 진실 공급원이며, 충돌하면 SKILL.md를 따른다.

## 전체 흐름

```
담당자 요청
   │
   ├─ 1  plan-generator ──────────── input/request.json, planning/plan.md
   ├─ 2  guide-injector ─────────── guide_applied
   ├─ 3  scenario-generator ─────── planning/scenario.md
   │
   ├─ 4  앵커 컷 생성 ────────────── higgsfield-prompt-builder
   │     └─ ▣ 담당자 앵커 승인 ← 승인 전 장면 컷 금지
   │
   ├─ 5  storyboard-generator ───── storyboard-{a,b,c}.md + 장면 PNG
   ├─ 6  auto-reviewer ──────────── review/planning-review.md
   ├─ 7  담당자에게 선택지 제시 ──── 안, 레퍼런스, 예상 크레딧, 클립 수, 재생성 상한
   │
   ├─ 8  ▣ 제작·비용 승인 ────────── approvals.production
   ├─ 9  ◆ 게이트 --stage video ──── exit 1 이면 되돌아간다
   ├─ 10 video-generator ────────── video/draft.mp4     ← 첫 유료 호출
   ├─ 11 auto-reviewer ──────────── review/video-review.md
   ├─ 12 ◆ 게이트 --stage final
   │
   ├─ 13 ▣ 최종 영상 승인 ────────── approvals.final
   ├─ 14 확정 ───────────────────── video/final.mp4
   │
   └─ 배포를 요청한 경우에만
      ├─ 15 content-publisher ───── 플랫폼별 배포안
      ├─ 16 ▣ 배포 승인 ─────────── approvals.distribution
      │     ◆ 게이트 --stage publish
      └─ 17 게시 ────────────────── 원격 ID, URL, 상태
```

`▣` = 담당자의 명시적 승인이 필요한 지점 (3개, 서로 대체 불가)
`◆` = 자동 게이트. `unsorted/scripts/check-production-gate.mjs` exit 0 이어야 통과

## 세 개의 승인

| 승인 | 무엇을 허락하는가 | 없으면 |
|---|---|---|
| 제작·비용 승인 | 유료 영상 생성 호출 | 10단계 실행 금지 |
| 최종 영상 승인 | `final.mp4` 확정 | 14단계 실행 금지 |
| 배포 승인 | 외부 플랫폼 게시 | 17단계 실행 금지 |

승인을 추정하지 않는다. 하나의 승인이 다른 승인을 대신하지 않는다.

## 캐릭터 결과물의 불변 규칙

1. 캐릭터가 등장하는 결과물을 만들기 전 `shared/references/WORKFLOW_GUIDE.md`를 읽는다.
2. 관련 캐릭터의 소개·턴어라운드·사용 규칙 페이지를 **실제 화면으로** 확인한다.
3. 손으로 쓴 프롬프트로 캐릭터를 생성하지 않는다 — 반드시 `higgsfield-prompt-builder`로 조립한다.
4. 모델에 보내는 레퍼런스는 `unsorted/character-references/refs/`의 캐릭터 크롭이다.
   매뉴얼 페이지 전체는 사람 검수용이며 모델에 보내지 않는다.
5. 기준 우선순위: 공식 PDF/페이지 PNG → `data/character-guide.*` → 사용자 입력 → 생성 결과

## 중단 시 처리

중단 조건에 걸리면 이미 만든 **무료 문서 산출물은 유지**하고,
원인과 다음 조치를 `production-log.json`의 `errors`에 기록한 뒤 담당자에게 보고한다.
승인을 추정해서 진행하지 않는다.

## 완료 판정

제작 완료: 필수 산출물 + 60초 미만 MP4 + 문서·영상 검수 + 승인 2건 + 시간·비용 기록이 모두 존재.
전체 완료(배포 포함): 승인된 모든 플랫폼 상태가 `published` 또는 `scheduled`이고 원격 ID·URL이 기록됨.
