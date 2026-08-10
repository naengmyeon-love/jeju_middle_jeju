# 플랫폼 연결 기준

플랫폼 API와 정책은 바뀔 수 있으므로 실제 게시 직전에 아래 공식 문서를 다시 확인한다.
문서와 연결 도구가 충돌하면 공식 문서를 우선한다.

## YouTube Shorts

- 공식 업로드: YouTube Data API `videos.insert`
- 공식 문서: https://developers.google.com/youtube/v3/docs/videos/insert
- 인증: 승인된 채널의 OAuth 2.0과 업로드 권한
- 확인 사항: 채널 ID, 제목·설명·태그, 공개 범위, 예약 시각, 처리 상태
- 주의: 심사되지 않은 API 프로젝트는 공개 범위가 제한될 수 있다. 이 제한을 우회하지 않는다.

## Instagram Reels

- 공식 게시: Instagram Platform Content Publishing
- 공식 문서: https://developers.facebook.com/docs/instagram-platform/content-publishing/
- 인증: 게시 권한이 있는 연결 계정과 유효한 액세스 토큰
- 확인 사항: Instagram 사용자 ID, 릴스 미디어 컨테이너, 캡션, 커버, 처리 상태
- 주의: API가 요구하는 접근 가능한 영상 URL과 계정 유형을 공식 문서에서 확인한다.

## TikTok

- 공식 게시: Content Posting API Direct Post
- 공식 문서: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
- 대안: Content Posting API Upload(사용자가 TikTok에서 게시를 완료하는 초안 흐름)
- 공식 문서: https://developers.tiktok.com/doc/content-posting-api-reference-upload-video
- 인증: 승인된 TikTok 사용자의 OAuth와 `video.publish` 또는 `video.upload` 범위
- 확인 사항: creator info, 허용된 공개 범위, 캡션, 상업성·AI 생성 표시, 게시 처리 상태
- 주의: 심사되지 않은 클라이언트의 공개 제한을 우회하지 않는다.

## 공통 연결 규칙

- 연결된 도구에서 계정 식별자를 읽어 승인 기록과 비교한다.
- 비밀번호, OAuth 토큰, 쿠키를 프로젝트 파일에 저장하지 않는다.
- 브라우저 자동화는 플랫폼 약관과 현재 승인 범위를 충족하고 사용자가 해당 계정에 직접
  로그인한 경우에만 사용한다.
- 공식 API·연결 도구가 없는 상태를 성공으로 보고하지 않는다.
