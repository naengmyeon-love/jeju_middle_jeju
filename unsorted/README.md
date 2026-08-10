# unsorted — 하네스 정의가 아닌 것들

`spec.md / skills / shared / agents / data / hooks / role-table.md / workflow.md` 중
어디에도 해당하지 않는 것을 모아 둔 곳이다. **전부 실제 파일이며 심볼릭 링크가 아니다.**

| 폴더 | 무엇인가 | 왜 하네스 밖인가 |
|---|---|---|
| `scripts/` | 프롬프트 조립·계약 동기화·게이트·영상 생성 | 에이전트가 아니라 도구 |
| `outputs/` | 실제 제작 이력 (프로젝트 4건) | 하네스 정의가 아니라 결과 |
| `generated/` | Higgsfield 영상 출력 (`higgsfield.config.json`의 `outputDir`) | 결과물 |
| `character-references/` | 캐릭터 가이드라인 원본 PNG·PDF | 참조 자산. `shared/references/`와 페이지 26장이 동일하다 |
| `higgsfield-skills/` | Higgsfield 범용 스킬 7개 | 퐁당 파이프라인 소속이 아님 |
| `workflow-web/` | Next.js 웹앱 `pongdang-shortform-studio` | 별도 앱. **자체 git 레포**라 상위에서 추적하지 않는다 |
| `temp/` | 임시 파일 | git 추적 제외 |
| `codex-staging/` | Codex 작업 잔여물 | 도구 잔여물 |
| `legacy-pongdangpongdang/` | **재편 전 구조의 잔여물** | 아래 참조 |

## legacy-pongdangpongdang/ — 정리 판단이 필요한 것

재편 과정에서 `pongdangpongdang/`의 알맹이는 전부 승격됐다.

| 원래 위치 | 승격된 곳 |
|---|---|
| `pongdang-skills-v2/skills/` | `skills/` |
| `pongdang-skills-v2/shared/shared/` | `shared/` |
| `epongdang-spec.md` | `spec.md` |
| `guides/` | `data/` |
| `캐릭터_가이드라인_작업용/` | `unsorted/character-references/` |
| `webapp/` | `unsorted/workflow-web/` |

남은 것은 아래와 같고, **어떻게 할지 정하지 않아 그대로 두었다.**

- **`webapp-spec/`** — 웹앱 설계 문서 6종 1,234줄.
  `01-core-users` · `02-workflow` · `03-screen-structure` · `04-wireframes` ·
  `05-ui-design` · `06-frontend-prototype`. 하네스 밖이지만 **버리면 안 되는 자산이다.**
- `pongdang-skills-v2.zip`, `pongdang-skills-v2-2.5.1.zip` — 스킬 배포 zip.
  압축을 푼 내용이 이미 `skills/`로 승격됐으므로 **중복이다.**
- `output/`, `project-output/` — `unsorted/outputs/`와 별개인 옛 산출물 폴더
- `references/` — `shared/references/`와 내용이 겹칠 수 있다 (PDF 중복)
- `제주애퐁당 캐릭터 사용 메뉴얼.pdf` — `shared/references/` 안에도 같은 PDF가 있다
- `spec.md` — **0바이트 빈 파일.** 실제 스펙은 루트 `spec.md`(구 `epongdang-spec.md`)
- `pongdang-skills-v2/.codex-plugin/plugin.json` — Codex 플러그인 매니페스트
- `*.webloc` — 브라우저 북마크

## 경로 규칙

`unsorted/scripts/*.mjs`는 프로젝트 루트를 `resolve(import.meta.dirname, "../..")`로 계산한다.
**스크립트를 다른 깊이로 옮기면 이 값을 함께 고쳐야 한다.**

`shared/`는 `unsorted`가 아니다. `skills/*/SKILL.md`가 `../../shared/references/...`
상대 경로로 참조하기 때문에 **루트 바로 아래 있어야 한다.** 옮기면 스킬 11개가 전부 깨진다.
