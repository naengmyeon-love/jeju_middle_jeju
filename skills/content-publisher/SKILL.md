---
name: content-publisher
description: "최종 승인된 퐁당패밀리 숏폼 MP4를 YouTube Shorts, Instagram Reels, TikTok에 게시하거나 예약하고 플랫폼별 URL·상태·오류를 제작 이력에 기록한다. '영상 배포해줘', '쇼츠·릴스·틱톡에 올려줘', '게시 예약해줘', '배포 상태 확인해줘' 요청 시 사용한다. 최종 영상 승인과 별도의 명시적 배포 승인을 모두 확인하며, 승인되지 않은 계정·플랫폼·공개 범위에는 게시하지 않는다."
---

# 퐁당패밀리 콘텐츠 배포

## 원칙

- `project-output/video/final.mp4`만 배포한다. `draft.mp4`나 중간 클립을 게시하지 않는다.
- `reviews.video.status == "passed"`와 명시적 최종 영상 승인을 먼저 확인한다.
- 최종 영상 승인과 배포 승인을 분리한다. 최종 승인만으로 게시 권한을 추정하지 않는다.
- 플랫폼, 계정, 공개 범위, 게시 시각, 문안과 현재 영상 SHA-256을 포함한 명시적 배포 승인을 받는다.
- 승인된 범위를 넘어 다른 계정이나 플랫폼에 게시하지 않는다.
- OAuth 토큰·비밀번호를 파일이나 채팅에 기록하지 않는다. 연결된 공식 도구나 사용자가 직접 완료한 OAuth 연결만 사용한다.
- 같은 배포 키로 중복 게시하지 않는다. 응답이 불명확하면 재시도 전에 원격 게시물 존재 여부를 확인한다.
- 게시물 삭제·비공개 전환·교체는 별도의 명시적 요청 없이는 실행하지 않는다.

## 실행 순서

### 1. 입력과 가이드 확인

다음을 읽는다.

- `project-output/video/final.mp4`
- `project-output/review/video-review.md`
- `project-output/review/approval-log.md`
- `project-output/metadata/production-log.json`
- `../../shared/guides/production-log.schema.json`

캐릭터가 등장하는 영상이면 `../../shared/references/WORKFLOW_GUIDE.md`와 기록된
`guide_applied.verified_pages`를 확인한다. 배포 문안에서도 공식 캐릭터 이름·관계·세계관을
임의로 바꾸지 않는다.

### 2. 배포안 작성

플랫폼별로 다음 정보를 제시한다.

- 대상 플랫폼과 정확한 계정 식별자
- 제목 또는 캡션, 설명, 해시태그
- 공개 범위와 예약 시각(Asia/Seoul 및 ISO 8601 병기)
- 썸네일 또는 커버 프레임
- 광고·협찬·AI 생성 표시 등 플랫폼에서 요구하는 공개 항목
- 현재 `final.mp4`의 SHA-256

플랫폼별 최신 제약과 계정 요건은 게시 직전에 공식 문서로 다시 확인한다.
`references/platforms.md`를 읽어 공식 문서와 연결 방식을 선택한다.

### 3. 배포 승인 기록

`approval-logger`를 사용하여 `approvals.distribution`에 다음을 기록한다.

- `status: "approved"`
- `explicit: true`
- 승인 담당자와 승인 시각
- 승인된 플랫폼·계정·공개 범위·예약 시각
- 승인된 제목/캡션의 SHA-256
- 승인된 영상의 SHA-256

부분 수정·보류·폐기 상태에서는 게시하지 않는다. 승인 이후 파일이나 문안이 바뀌면 승인을
무효화하고 다시 요청한다.

### 4. 게시 전 결정적 검증

다음 명령으로 승인 상태와 파일 해시를 검증하고 게시 매니페스트를 만든다.

```bash
python3 scripts/prepare_publication.py \
  --project-root /absolute/path/to/project-output \
  --platform youtube \
  --platform instagram \
  --platform tiktok
```

명령이 실패하면 게시하지 않는다. 성공하면
`project-output/distribution/publication-manifest.json`의 계정, 문안, 공개 범위,
예약 시각, `idempotency_key`를 실제 게시 요청과 1:1로 사용한다.

### 5. 플랫폼 게시

공식 API 또는 연결된 공식 게시 도구를 우선 사용한다.

1. 승인된 계정이 현재 연결된 계정과 일치하는지 읽기 전용 호출로 확인한다.
2. 매니페스트와 원격 요청값을 비교한다.
3. 플랫폼별로 한 번씩 게시 또는 예약한다.
4. 원격 ID를 받은 즉시 `publications`에 `submitted` 상태로 기록한다.
5. 처리 상태를 조회하여 `published`, `scheduled`, `processing`, `failed` 중 하나로 갱신한다.
6. 게시 URL과 실제 공개 시각을 기록한다.

공식 API가 미연결이거나 앱 심사를 통과하지 못했다면 API를 우회하지 않는다. 가능한 경우
`draft` 또는 `private` 전송만 제안하고, 그렇지 않으면 `connection_required`로 중단한다.

### 6. 결과 기록

`project-output/metadata/production-log.json`의 기존 값을 보존하면서 다음만 병합한다.

- `outputs.publication_manifest`
- `approvals.distribution`
- `publications[]`
- `timings.distribution_duration_seconds`
- 배포 비용이 있으면 `costs`
- 실패 시 `errors[]`

각 `publications[]` 항목에는 플랫폼, 계정, 원격 ID, URL, 상태, 요청·공개 시각,
영상 SHA-256, 캡션 SHA-256, idempotency key를 기록한다.

## 실패와 재시도

- 네트워크 타임아웃: 원격 ID 또는 동일 콘텐츠가 존재하는지 확인한 뒤에만 재시도한다.
- 일부 플랫폼만 실패: 성공한 게시물을 유지하고 실패한 플랫폼만 재시도 승인을 확인한다.
- 처리 실패·저작권 경고: 공개하지 않고 오류 원문과 다음 조치를 기록한다.
- 예약 시각 경과: 임의로 즉시 공개하지 않고 새 시각을 승인받는다.
- 계정 불일치: 즉시 중단하고 현재 연결 계정과 승인 계정을 모두 표시한다.

## 완료 판정

승인된 모든 플랫폼이 `published` 또는 `scheduled`이고 각 원격 ID와 URL이 기록되었을 때만
배포 완료라고 보고한다. `processing`이나 `connection_required`는 완료가 아니다.
