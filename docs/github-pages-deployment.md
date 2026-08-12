# GitHub Pages 배포 절차

`web/`은 GitHub Pages에서 동작하는 정적 공개 상태 보드다. GitHub Actions가 빌드할 때
`unsorted/outputs/projects/*/metadata/production-log.json`과 공개 가능한 결과물 문서를 읽어
스냅샷으로 만든다. 따라서 페이지는 실제 이력의 공개 시점 상태를 보여 주지만, 브라우저에서
파이프라인을 실행하거나 승인·배포를 기록하지 않는다.

## 최초 설정

1. 이 저장소를 GitHub에 올린다. 기본 브랜치가 `main` 또는 `master`여야 한다.
2. GitHub 저장소의 **Settings → Pages → Build and deployment**에서 **GitHub Actions**를
   publishing source로 선택한다.
3. 기본 브랜치에 push하면 `.github/workflows/deploy-pages.yml`이 실행된다.
4. 완료된 `Deploy public production status` 작업의 `github-pages` 환경 URL이 제출용 공개 링크다.
   일반적으로 `https://<owner>.github.io/<repository>/` 형태다.

GitHub Pages의 사용자 지정 Actions 배포는 build job에서 Pages artifact를 올리고, 별도 deploy
job이 해당 artifact를 배포해야 한다. 이 저장소의 workflow도 그 권한 경계(`pages: write`,
`id-token: write`)를 따른다. [GitHub Pages 공식 문서](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## 검증과 갱신

로컬에서 다음을 실행한다.

```bash
npm ci --prefix web
npm run verify --prefix web
npm run pages:web
```

`verify`는 타입 검사, 모델 역할 정책 테스트, 실제 제작 이력 스냅샷 생성, 정적 빌드, 공개
산출물의 비밀값 패턴 검사를 수행한다. 산출물이 바뀌면 이력을 commit한 후 기본 브랜치에 push하거나
GitHub Actions의 **Run workflow**를 실행해 공개 스냅샷을 갱신한다.

`npm run pages:web`은 `http://127.0.0.1:4173`에서 공개 상태 보드를 연다. 기존 운영용
제작실 UI는 별도이며, 저장소 루트에서 `npm run web`으로 실행한다.

## 모델 실행 이력 기록

새 실행은 완료 직후 프로젝트의 `production-log.json`에 기록한다. 실행 ID는 프로젝트 안에서
중복될 수 없고, 결과 파일은 해당 프로젝트 폴더 안에 실제 존재해야 한다.

```bash
node scripts/record-model-run.mjs \
  --project <project-id> \
  --agent "Timely Agent" \
  --model "Solar Pro 4" \
  --stage scenario \
  --run-id run_20260812_001 \
  --started-at 2026-08-12T09:00:00+09:00 \
  --finished-at 2026-08-12T09:03:12+09:00 \
  --status succeeded \
  --output planning/scenario.md \
  --adopted true
```

역할 정책은 `config/model-policy.json`이 단일 기준이다.

- Timely Agent 작업 공간은 [upstage-jnu/timely-agent](https://timelyai.io/upstage-jnu/timely-agent)이며,
  **Solar Pro 4**로 기획안 3종, 시나리오, 스토리보드 문안만 기록할 수 있다. GitHub 커넥터는
  이 세 종류의 결과물을 저장하는 외부 실행 경로일 뿐이며, 공개 Pages나 GitHub Actions에서
  Timely를 호출하지 않는다.
- Claude Code는 Harness, 캐릭터 가이드, Higgsfield 이미지·영상, 장면 검수, 카피, 승인·배포 흐름을
  담당한다. 이력에는 실제 사용한 Claude 모델명을 기록한다.

기존 `model_versions`는 설정 메모로 표시하되, 실행 시각·ID가 없으므로 실행 이력으로 꾸미지 않는다.

## 비밀값과 승인 경계

공개 Pages workflow와 정적 산출물에는 API 키를 전달하지 않는다. Timely·Higgsfield·외부 플랫폼
작업을 수행하는 **비공개 실행 환경**에만 GitHub Secrets를 환경변수로 주입한다. Timely 연결에는
`TIMELY_AGENT_API_KEY`, Higgsfield에는 `HIGGSFIELD_API_KEY`, 외부 플랫폼에는 `PUBLISH_*`를
사용한다. 값은 코드, 이력 파일, 정적 산출물, 로그에 기록하지 않는다.

유료 Higgsfield 생성은 `approvals.production`의 명시적 비용 승인을 통과하기 전에는 실행하지 않는다.
외부 게시은 최종 영상 승인과 별개인 `approvals.distribution` 승인 및 publish gate를 통과한 뒤에만
실행한다. Pages는 두 행위를 실행할 권한이나 버튼을 갖지 않는다.
