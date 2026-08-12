# GitHub Pages 배포 절차

`web/`은 GitHub Pages에서 동작하는 공개 상태·실행 진입 보드다. GitHub Actions가 빌드할 때
`unsorted/outputs/projects/*/metadata/production-log.json`과 공개 가능한 결과물 문서를 읽어
스냅샷으로 만든다. 따라서 페이지는 실제 이력의 공개 시점 상태를 보여 주지만, 브라우저에서
브라우저 자체는 비밀키를 보유하지 않는다. **새 제작 실행**은 인증된 GitHub Issue Form으로
넘어가며, 이후 실행과 승인은 GitHub Actions 및 보호 환경에서 처리한다.

## 실행 흐름

1. Pages의 **새 제작 실행**을 눌러 GitHub Issue Form을 제출한다.
2. `queue-pipeline-request.yml`이 요청자의 저장소 쓰기 권한과 폼 표식을 검사하고
   `pipeline-request` 라벨을 붙인다.
3. Timely의 `pongdang-pipeline-agent` 자동화가 매시 정각 큐를 확인한다. Solar Pro 4로
   기획안 A/B/C, 시나리오, 스토리보드 A/B/C 문안만 만들고 PR과 실행 이력을 남긴다.
4. Timely가 `timely-complete` 라벨을 붙이면 `claude-pipeline-handoff.yml`이 Claude Code를
   실행한다. Claude는 공식 가이드 적용, 프롬프트 조립, 검수, 카피와 승인 준비를 담당하며
   Higgsfield를 호출하지 않고 제작·비용 승인 지점에서 멈춘다.
5. 담당자가 별도로 `Approved Higgsfield generation` workflow를 실행하고
   `higgsfield-production` 환경을 승인해야 유료 생성이 가능하다. 로그의 명시 승인 필드와
   비용·클립·재생성 상한이 모두 기록된 뒤에도 서버 게이트를 다시 통과해야 한다.
6. 영상 검수 후 `Approved final video` workflow와 `final-video-approval` 환경에서 별도 최종
   승인을 해야 `final.mp4`가 확정된다. 외부 게시 승인은 여전히 별도다.

## 최초 설정

1. 이 저장소를 GitHub에 올린다. 이 저장소의 기본·배포 브랜치는 `master`다.
2. GitHub 저장소의 **Settings → Pages → Build and deployment**에서 **GitHub Actions**를
   publishing source로 선택한다.
3. **Settings → Secrets and variables → Actions**에 `CLAUDE_CODE_OAUTH_TOKEN`을 저장하고,
   `CLAUDE_MODEL`은 Repository variable로 모델명을 저장한다. `higgsfield-production` 환경에는
   로컬 CLI의 전체 자격 증명 JSON을 `HIGGSFIELD_CREDENTIALS_JSON` secret으로, 선택된 billing
   workspace ID를 `HIGGSFIELD_WORKSPACE_ID` variable로 저장한다. Pages workflow에는 이 값을 전달하지 않는다.
4. **Settings → Environments**에서 `higgsfield-production`, `final-video-approval` 환경을 만들고
   Required reviewers를 설정한다. `external-distribution`은 외부 플랫폼 게시를 연결할 때 별도로 설정한다.
5. 승인된 변경을 기본 브랜치에 push한다. 일반 제작 이력 변경은 push만으로 Pages 배포가 시작되지 않는다.
6. `Approved final video`가 성공하면 `Deploy public production status`가 자동으로 실행되어
   명시적으로 최종 승인된 `final.mp4`를 Pages에 공개한다. 필요하면 Actions 탭에서 수동 재배포할 수 있다.
7. 완료된 작업의 `github-pages` 환경 URL이 제출용 공개 링크다.
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
산출물의 비밀값 패턴 검사를 수행한다. 산출물이 바뀌면 이력을 commit한 후 승인받아 기본 브랜치에
push한다. 최종 영상 승인 워크플로가 성공하면 공개 스냅샷도 자동 갱신된다. 영상 이외의 이력만
갱신할 때는 GitHub Actions의 **Run workflow**로 수동 배포한다.

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

공개 Pages workflow와 정적 산출물에는 API 키를 전달하지 않는다. Claude Code에는
`CLAUDE_CODE_OAUTH_TOKEN`, 유료 생성 job에는 보호 환경의 `HIGGSFIELD_CREDENTIALS_JSON`, 외부 플랫폼에는
보호 환경의 `PUBLISH_*`만 환경변수로 주입한다. Timely는 기존 워크스페이스의 GitHub 커넥터를
사용하며 키를 저장소로 복사하지 않는다. 값은 코드, 이력 파일, 정적 산출물, 로그에 기록하지 않는다.

유료 Higgsfield 생성은 `approvals.production`의 명시적 비용 승인을 통과하기 전에는 실행하지 않는다.
명시적으로 최종 승인된 영상은 읽기 전용 Pages 플레이어에 공개할 수 있다. YouTube·Instagram·TikTok
등 외부 플랫폼 게시은 이와 별개로 `approvals.distribution` 승인 및 publish gate를 통과한 뒤에만
실행한다. Pages의 실행 링크는 GitHub의 인증·승인 화면으로 이동할 뿐 비밀키나 직접 실행 권한을 갖지 않는다.

현재 저장소에는 실제 플랫폼 게시 커넥터가 없으므로 `external-distribution`은 연결 필요 상태에서
멈춘다. YouTube/Instagram/TikTok 게시를 활성화하려면 플랫폼별 `PUBLISH_*` secret과 publisher
adapter를 추가한 뒤 별도 검증·배포 승인을 받아야 한다. 연결되지 않은 게시를 성공으로 꾸미지 않는다.
