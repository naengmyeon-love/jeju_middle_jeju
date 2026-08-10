# unsorted — 하네스 구조에 들어가지 않는 것들

`spec.md / skills / agents / data / role-table.md / workflow.md / hooks` 중 어디에도
해당하지 않는 폴더를 모아 분류한 곳이다.

**모두 원본을 가리키는 심볼릭 링크다.** 복사본이 아니므로 원본과 내용이 갈라질 일이 없고,
여기서 수정하면 원본이 수정된다.

| 링크 | 원본 | 왜 하네스 밖인가 |
|---|---|---|
| `character-references/` | `pongdangpongdang/캐릭터_가이드라인_작업용/` | 이미지·PDF 원본 에셋. 데이터가 아니라 참조 자산 |
| `scripts/` | `scripts/` | 빌드·동기화·게이트 스크립트. 에이전트가 아니라 도구 |
| `workflow-web/` | `pongdangpongdang/webapp/` | 별도 웹 앱 `pongdang-shortform-studio` (475MB, node_modules 포함) |
| `higgsfield-skills/` | `.agents/skills/` | Higgsfield 범용 스킬 7개. 퐁당 파이프라인 소속이 아님 |
| `outputs/` | `project-output/` | 실행 산출물. 하네스 정의가 아니라 결과 |
| `generated/` | `generated/` | Higgsfield 영상 출력 (`higgsfield.config.json`의 `outputDir`) |
| `temp/` | `tmp/` | 임시 파일 (git 추적 제외) |
| `codex-staging/` | `.codex-staging/` | Codex 작업 잔여물 |

## 복사본 하네스와 다른 점

`애퐁당패밀리 복사본/`의 하네스에는 `assets/`와 `archives/` 링크가 있지만
**현재 폴더에는 두 디렉터리가 없어서 링크를 만들지 않았다.**
반대로 `generated/`와 `codex-staging/`은 현재 폴더에만 있어 새로 추가했다.

## 아직 분류되지 않은 것

다음은 현재 폴더에 있으나 하네스 어디에도 연결하지 않았다. 정리 여부는 별도 판단이 필요하다.

- `pongdangpongdang/pongdang-skills-v2.zip`, `pongdang-skills-v2-2.5.1.zip` — 스킬 배포 zip. 압축을 푼 `pongdang-skills-v2/`가 이미 `skills/`로 링크돼 있어 중복이다
- `pongdangpongdang/output/`, `pongdangpongdang/project-output/` — 루트 `project-output/`과 이름이 겹치는 별개 산출물 폴더
- `pongdangpongdang/references/`, `pongdangpongdang/guides/` — `shared/references`, `data/`와 내용이 겹칠 수 있다
- `pongdangpongdang/spec.md` — **0바이트 빈 파일**. 실제 스펙은 `epongdang-spec.md`
- `pongdangpongdang/webapp-spec/` — 웹앱 스펙 문서
- `pongdangpongdang/*.webloc` — 브라우저 북마크

## 참고

`../shared/`도 심볼릭 링크지만 unsorted 가 아니다.
`skills/*/SKILL.md`가 `../../shared/references/...` 상대 경로로 참조하기 때문에
**경로 앵커로서 harness-example 바로 아래 있어야 한다.** 옮기면 11개 스킬의 경로가 전부 깨진다.

현재 폴더는 `pongdang-skills-v2/shared/` 안에 `shared/`가 한 겹 더 있어서
링크 대상이 `pongdang-skills-v2/shared/shared`다. 복사본과 다르니 주의한다.
