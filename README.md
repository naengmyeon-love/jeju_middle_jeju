# 애퐁당패밀리

## 공개 제작 현황 보드

GitHub Pages 배포용 정적 웹앱은 [`web/`](web/)에 있다. 실제 `production-log.json`과 공개 가능한
산출물만 빌드 시점에 수집하며, 유료 생성·승인·외부 게시 기능은 포함하지 않는다. 최초 Pages 설정,
비밀값 처리, 모델 실행 이력 기록 방법은 [GitHub Pages 배포 절차](docs/github-pages-deployment.md)를 따른다.

퐁당패밀리 공식 IP 숏폼 제작 파이프라인. 프로젝트 루트가 곧 하네스(harness) 구조다.

```
애퐁당패밀리/
├── spec.md          제품 스펙
├── skills/          단계별 실제 절차 11개 (진실 공급원)
├── shared/          guides/ · references/  ← SKILL.md 가 ../../shared/ 로 참조
├── agents/          에이전트 정의 11개
├── data/            character-guide.json · 로그 스키마
│   └── fixtures/    게이트 검증용 합성 데이터 2개
├── hooks/           서브에이전트 호출 로깅
├── role-table.md    스킬↔에이전트↔산출물 대응표
├── workflow.md      17단계 흐름과 승인 게이트
├── install.sh       agents·skills 를 .claude/ 에 연결
├── verify.sh        게이트 통과·차단 경로 자동 검증
└── unsorted/        하네스 정의가 아닌 것들 (도구·산출물·에셋·웹앱)
```

## 설치와 검증

```bash
./install.sh    # agents 11개 + skills 11개를 .claude/ 에 연결
./verify.sh     # 게이트가 통과시킬 것은 통과시키고 막을 것은 막는지 확인
```

`install.sh` 없이는 `agents/`와 `skills/`가 문서로만 존재하고 **실제로 호출되지 않는다.**
`install.sh --check`로 설치 상태만 확인할 수 있고, 만들어지는 것은 전부 심볼릭 링크라 되돌릴 수 있다.

`verify.sh`는 `unsorted/scripts/check-production-gate.mjs`를 픽스처로 실행해
통과(exit 0)·차단(exit 1)·인자 오류(exit 2)를 확인한다. `--real`을 붙이면
`unsorted/outputs/`의 실제 제작 이력까지 함께 판정한다.
**게이트가 고장 나면 파이프라인 전체의 안전장치가 무의미해지므로, 게이트를 검사하는 검사를 둔다.**

`data/fixtures/*.json`은 **검증용 합성 데이터이며 실제 제작 이력이 아니다.**
파일 안 `_fixture` 필드에 그 사실이 적혀 있다. 실제 이력은 `unsorted/outputs/`에 있다.

## 읽는 순서

1. `workflow.md` — 무엇이 어떤 순서로 일어나는가
2. `role-table.md` — 누가 무엇을 맡고, 누가 무엇을 못 하는가
3. `agents/pongdang-pipeline-orchestrator.md` — 위임 구조
4. `skills/<name>/SKILL.md` — 단계별 실제 절차 (**진실 공급원**)

`agents/*.md`는 위임과 경계만 정의한다. 절차가 충돌하면 언제나 `SKILL.md`가 이긴다.
작업 시 반드시 지켜야 할 제약은 `AGENTS.md`에 있다.

## npm 스크립트

```bash
npm run verify           # ./verify.sh
npm run sync:contract    # character-guide.json → 스킬 안 계약 사본 동기화
npm run higgsfield:video # 영상 생성 (유료, 승인 후에만)
```

## unsorted/

하네스 정의(`spec.md / skills / shared / agents / data / hooks / role-table.md / workflow.md`)에
해당하지 않는 것을 모아 둔 곳이다. 자세한 내용은 `unsorted/README.md` 참조.

특히 `unsorted/legacy-pongdangpongdang/`은 **재편 전 구조의 잔여물**이라 정리 판단이 필요하다.
여기에 웹앱 설계 문서 `webapp-spec/`(①핵심사용자 ~ ⑥프론트구현, 1,234줄)가 들어 있다.

## hooks 적용

`hooks/settings.json`은 예시다. Claude Code가 자동으로 읽지 않는다.
적용하려면 `hooks` 블록을 `.claude/settings.json`에 병합하고
`chmod +x hooks/subagent_log.sh`를 실행한다.
현재 `.claude/`에는 `launch.json`만 있어서 `settings.json`은 새로 만들어야 한다.

## 알려진 문제

- `skills/higgsfield-prompt-builder/references/image-generation-contract.json`이
  원본과 **어긋나 있다**(`model_routing` 블록 누락). `npm run sync:contract`로 갱신한다.
- `unsorted/scripts/build-pongdang-prompt.mjs`의 기본 모델값이 `nano_banana_2`인데
  **이 job_type은 존재하지 않는다.** 올바른 값은 `nano_banana_flash`
  (`higgsfield model list --json`으로 확인).
