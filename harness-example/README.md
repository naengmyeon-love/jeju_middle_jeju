# harness-example

퐁당패밀리 숏폼 파이프라인을 하네스(harness) 구조로 재배치한 뷰다.
**기존 프로젝트 구조는 그대로 두고**, 여기서는 심볼릭 링크와 새로 쓴 정의 문서만 사용한다.

```
harness-example/
├── spec.md          → pongdangpongdang/epongdang-spec.md          (링크)
├── skills/          → pongdangpongdang/pongdang-skills-v2/skills  (링크, 11개)
├── shared/          → pongdang-skills-v2/shared/shared            (링크, 경로 앵커)
├── agents/          11개 에이전트 정의                              (신규)
├── data/            가이드 JSON·스키마                              (링크)
│   └── fixtures/    게이트 검증용 픽스처 2개                         (신규)
├── role-table.md    스킬↔에이전트↔산출물 대응표                     (신규)
├── workflow.md      17단계 흐름과 승인 게이트                        (신규)
├── install.sh       agents·skills 를 .claude/ 에 연결               (신규)
├── verify.sh        게이트 통과·차단 경로 자동 검증                   (신규)
├── hooks/           서브에이전트 호출 로깅                           (신규)
└── unsorted/        하네스에 안 들어가는 폴더 8개                    (링크)
```

## 설치와 검증

```bash
./install.sh    # agents 11개 + skills 11개를 <프로젝트루트>/.claude/ 에 연결
./verify.sh     # 게이트가 통과시킬 것은 통과시키고 막을 것은 막는지 확인
```

`install.sh` 없이는 `agents/`와 `skills/`가 문서로만 존재하고 **실제로 호출되지 않는다.**
`install.sh --check`로 설치 상태만 확인할 수 있고, 만들어지는 것은 전부 심볼릭 링크라 되돌릴 수 있다.

`verify.sh`는 `check-production-gate.mjs`를 픽스처로 8가지 경우에 대해 실행해
통과(exit 0)·차단(exit 1)·인자 오류(exit 2)를 각각 확인한다. `--real`을 붙이면
`unsorted/outputs/`의 실제 제작 이력까지 함께 판정한다.
**게이트가 고장 나면 파이프라인 전체의 안전장치가 무의미해지므로, 게이트를 검사하는 검사를 둔다.**

`data/fixtures/*.json`은 **검증용 합성 데이터이며 실제 제작 이력이 아니다.**
파일 안 `_fixture` 필드에 그 사실이 적혀 있다. 실제 이력은 `unsorted/outputs/`에 있다.

## 링크와 신규 파일

- **링크** — `spec.md`, `skills/`, `shared/`, `data/*`, `unsorted/*`
  원본을 가리킨다. 여기서 고치면 원본이 고쳐지고, 원본이 바뀌면 여기도 바뀐다.
  복사본이 아니므로 **두 벌을 따로 관리할 일이 없다.**
- **신규** — `agents/*`, `role-table.md`, `workflow.md`, `hooks/*`,
  `install.sh`, `verify.sh`, `data/fixtures/*`, 이 README
  원본에 대응 파일이 없어서 기존 SKILL.md와 AGENTS.md 내용을 근거로 새로 작성했다.

## 이 프로젝트에서 달라진 점

같은 하네스를 `애퐁당패밀리 복사본/`에도 만든 적이 있다. 이 폴더는 **현재 작업 폴더 기준**이라
링크 대상 이름이 다음과 같이 다르다. 두 폴더를 오갈 때 혼동하지 않도록 적어 둔다.

| 하네스 경로 | 복사본에서 | 현재 폴더에서 |
|---|---|---|
| `shared/` | `pongdang-skills-v2/shared` | `pongdang-skills-v2/shared/shared` (한 겹 더 중첩) |
| `unsorted/outputs/` | `outputs/` | `project-output/` |
| `unsorted/workflow-web/` | `pongdang-workflow-web/` | `pongdangpongdang/webapp/` |
| `unsorted/temp/` | `temp/` | `tmp/` |
| `unsorted/generated/` | 없음 | `generated/` (Higgsfield 영상 출력) |
| `unsorted/codex-staging/` | 없음 | `.codex-staging/` |
| `unsorted/assets/`·`archives/` | 있음 | **없음** (링크 생성 안 함) |

`scripts/check-production-gate.mjs`는 현재 폴더에 없어서 복사본에서 가져왔다.
`verify.sh`가 이 파일에 의존하므로 없으면 검증이 전부 실패한다.

## 배포용 zip 을 만들 때

이 폴더의 내용 대부분은 심볼릭 링크다. **그냥 압축하면 링크가 깨져 스킬 11개와 스펙이 통째로 사라진다.**
반드시 링크를 실체화(`rsync -aL`)한 뒤 압축한다.

```bash
rsync -aL --safe-links --exclude='.DS_Store' --exclude='node_modules/' \
  --exclude='unsorted/workflow-web/' --exclude='unsorted/temp/' \
  --exclude='unsorted/codex-staging/' --exclude='unsorted/generated/' \
  --exclude='unsorted/outputs/**/*.png' --exclude='unsorted/outputs/**/*.mp4' \
  harness-example/ /tmp/stage/harness-example/ && (cd /tmp/stage && zip -rqX harness.zip harness-example)
```

압축 후에는 **다른 폴더에 풀어 `./verify.sh`가 8/8 통과하는지 확인한다.**
스토리보드 PNG 한 장이 8~9MB라 그대로 담으면 크게 불어난다. `unsorted/workflow-web/`은
node_modules 포함 475MB라 반드시 제외한다.

## 읽는 순서

1. `workflow.md` — 무엇이 어떤 순서로 일어나는가
2. `role-table.md` — 누가 무엇을 맡고, 누가 무엇을 못 하는가
3. `agents/pongdang-pipeline-orchestrator.md` — 위임 구조
4. `skills/<name>/SKILL.md` — 단계별 실제 절차 (**진실 공급원**)

`agents/*.md`는 위임과 경계만 정의한다. 절차가 충돌하면 언제나 `SKILL.md`가 이긴다.

## hooks 적용

`hooks/settings.json`은 예시다. Claude Code가 자동으로 읽지 않는다.
적용하려면 `hooks` 블록을 프로젝트 루트 `.claude/settings.json`에 병합하고,
`chmod +x harness-example/hooks/subagent_log.sh`를 실행한다.

현재 프로젝트 `.claude/`에는 `launch.json`만 있고 `settings.json`이 없다.
병합이 아니라 새로 만들어야 한다.

## 아직 비어 있는 것

이미지 예시의 `data/여행정보_모음_파일.csv`에 해당하는 **표 형식 데이터가 이 프로젝트에는 없다.**
현재 `data/`에는 가이드 JSON과 로그 스키마만 링크되어 있다.
