---
name: pongdang-pipeline
description: "퐁당패밀리 공식 IP 숏폼의 입력 검증, 공식 가이드 주입, 기획안, 시나리오, 스토리보드 3안, 자동 검수, 제작·비용 승인, 영상 생성, 영상 검수, 최종 승인, 선택적 외부 배포와 제작 이력 기록을 순서대로 조정한다. '퐁당패밀리 숏폼 전체 진행해줘', '기획부터 영상·배포까지 만들어줘', '파이프라인 실행해줘'처럼 여러 제작 단계를 한 번에 요청할 때 사용한다."
---

# 퐁당패밀리 숏폼 파이프라인

## 원칙

- 캐릭터가 포함된 결과물을 만들기 전에 `../../shared/references/WORKFLOW_GUIDE.md`를 읽는다.
- 공식 PDF와 관련 캐릭터의 소개·턴어라운드·사용 규칙 페이지를 실제 화면으로 확인한다.
- 기준 우선순위는 공식 PDF/페이지 PNG → `../../shared/guides/character-guide.md`와 `.json` → 사용자 입력 → 생성 결과다.
- 유료 영상 호출 전 제작·비용 승인을 받고, 영상 생성 후 별도의 최종 승인을 받는다.
- 외부 배포 전 플랫폼·계정·공개 범위·시각·영상 해시를 포함한 별도의 배포 승인을 받는다.
- 승인되지 않은 결과물을 외부 공개하지 않는다.
- 모든 경로는 `project-output/`을 기준으로 기록한다.

## 실행 순서

1. `plan-generator`로 필수 입력을 검증하고 `input/request.json`, `planning/plan.md`를 만든다.
2. `guide-injector`로 가이드 버전과 실제 확인한 원본 페이지를 기록한다.
3. `scenario-generator`로 `planning/scenario.md`를 만든다.
4. `storyboard-generator`로 A/B/C 3안의 문서와 장면별 PNG 이미지를 만들고 Markdown에 함께 삽입한다. 장면 프롬프트는 `higgsfield-prompt-builder`로 조립하고, 공식 페이지 PNG를 레퍼런스로 반드시 첨부한다.
5. `auto-reviewer`로 문서, 장면 이미지와 최종 프롬프트를 검수하여 `review/planning-review.md`를 만든다.
6. 담당자에게 스토리보드 선택, 공식 레퍼런스, 예상 크레딧, 생성 클립 수, 재생성 상한을 제시한다.
7. 담당자의 명시적 제작·비용 승인을 `approval-logger`로 기록한다.
8. 승인 조건이 모두 참일 때만 `video-generator`를 실행한다. 실제 영상 도구/API가 없으면 호출하지 말고 연결 필요 상태를 기록한다.
9. `auto-reviewer`로 `video/draft.mp4`를 검수하여 `review/video-review.md`를 만든다. 실패한 클립만 재생성한다.
10. 담당자의 명시적 최종 영상 판정을 `approval-logger`로 기록한다.
11. 최종 승인일 때만 승인된 파일을 `video/final.mp4`로 확정한다.
12. 사용자가 배포까지 요청한 경우에만 `content-publisher`로 플랫폼별 배포안을 만든다.
13. `approval-logger`로 별도의 명시적 배포 승인을 기록한 뒤 승인 범위에만 게시한다.
14. 플랫폼별 원격 ID, 게시 URL, 처리 상태와 오류를 `production-log.json`에 기록한다.

## 중단 조건

- 필수 입력 누락
- 공식 가이드 또는 관련 원본 페이지 미확인
- 자동 검수 실패 또는 확인 필요 항목의 담당자 미확인
- 스토리보드 미선택
- 최종 프롬프트·공식 레퍼런스 미승인
- 예상 비용·크레딧 미기록 또는 제작 승인 누락
- 영상 생성 도구/API 미연결
- 저작권이 확인되지 않은 자산 포함
- 배포 대상 계정 미연결 또는 승인 계정과 연결 계정 불일치
- 배포 승인 후 영상·문안·공개 범위·예약 시각 변경

중단 시 이미 만든 무료 문서 산출물은 유지하고 원인과 다음 조치를 기록한다. 승인을 추정하지 않는다.

## 공통 데이터 계약

`../../shared/guides/production-log.schema.json`을 읽고 모든 단계가 같은
`project-output/metadata/production-log.json`을 갱신한다. 필수 상위 필드는 다음과 같다.

- `guide_applied`
- `reviews`
- `approvals.production`
- `approvals.final`
- `approvals.distribution`
- `costs`
- `model_versions`
- `artifact_versions`
- `errors`

기존 값을 덮어쓰지 말고 해당 단계의 필드만 병합한다.

## 완료 판정

명세의 필수 산출물, 60초 미만 MP4, 문서·영상 자동 검수, 두 승인 기록,
시간·비용 기록이 모두 존재할 때만 제작 완료라고 보고한다. 배포를 요청한 경우에는 승인된
모든 플랫폼의 상태가 `published` 또는 `scheduled`이고 원격 ID와 URL이 기록되어야 전체
파이프라인 완료라고 보고한다.
