# 애퐁당패밀리 작업 필수 규칙

캐릭터가 등장하거나 캐릭터를 변형·배치·애니메이션·영상·이미지·상품·인쇄물·UI에 사용하는 모든 작업은 시작 전에 반드시 아래 파일을 읽는다.

- `shared/references/WORKFLOW_GUIDE.md`

해당 가이드와 원본 캐릭터 매뉴얼은 선택적 참고자료가 아니라 작업 제약조건이다. 관련 캐릭터의 소개, 턴어라운드, 사용 규칙 페이지를 실제로 확인하지 않은 상태에서 캐릭터 결과물을 만들지 않는다.

원본과 충돌하는 요청이나 불확실한 표현이 있으면 임의로 추측하지 말고 사용자에게 확인한다.

## 퐁당패밀리 숏폼 파이프라인

퐁당패밀리 숏폼의 전체 제작·검수 요청에는 설치된 경우 `$pongdang-pipeline` skill을 사용한다.
개별 단계 요청에는 `skills/` 아래의 대응 skill을 사용한다.
스킬이 실제로 호출되려면 `./install.sh` 로 `.claude/` 에 연결되어 있어야 한다.

- 전체 흐름: `pongdang-pipeline`
- 기획: `plan-generator`
- 시나리오: `scenario-generator`
- 스토리보드: `storyboard-generator`
- 가이드 주입: `guide-injector`
- 생성 프롬프트: `higgsfield-prompt-builder`
- 자동 검수: `auto-reviewer`
- 영상 생성: `video-generator`
- 외부 배포·예약: `content-publisher`
- 승인·이력: `approval-logger`

생성형 도구로 캐릭터 이미지·영상을 만들 때는 공식 페이지 PNG를 레퍼런스로 반드시 첨부하고, 프롬프트는 `higgsfield-prompt-builder`로 조립한다. 손으로 쓴 프롬프트로 캐릭터를 생성하지 않는다.

유료 영상 생성은 제작 승인 전 실행하지 않는다. 제작 승인과 최종 영상 승인은 별개의 기록으로 남긴다.
외부 배포는 최종 영상 승인과 별도의 명시적 배포 승인을 받은 뒤 실행한다.
