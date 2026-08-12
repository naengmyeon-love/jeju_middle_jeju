---
name: video-generator
description: "담당자가 선택한 스토리보드 1안을 기반으로 퐁당패밀리 숏폼 영상을 생성하고 MP4(.mp4)로 출력한다. 60초 미만, 9:16(1080×1920) 제약을 강제하고, 스토리보드의 장면별 생성 프롬프트로 영상 생성 AI 도구/API를 호출하며, 캐릭터 외형이 훼손된 장면의 부분 재생성과 API 오류 기록을 지원한다. '영상 만들어줘', '영상 생성해줘', 'MP4 출력해줘' 요청 시 사용한다. 생성 전 guide-injector 실행이 필수이며, 생성 후 auto-reviewer 영상 검수와 approval-logger 담당자 최종 승인을 거쳐야 한다."
---

# 퐁당패밀리 숏폼 영상 생성기

## 역할
담당자가 선택한 스토리보드(A/B/C안 중 1안)를 입력으로 받아, 장면별 생성 프롬프트로 영상 생성 AI 도구/API를 호출하고 **60초 미만의 MP4 영상**을 출력한다. 생성된 영상은 초안이며, `auto-reviewer` 영상 검수와 `approval-logger` 담당자 최종 승인을 통과하기 전까지 외부에 공개하지 않는다.

## 전제 조건

생성을 시작하기 전에 다음을 확인한다. 하나라도 충족되지 않으면 생성을 시작하지 않는다.

- [ ] 담당자가 스토리보드 1안을 선택했고, 선택 결과가 `project-output/review/approval-log.md`와 `approvals.production.selected_storyboard`에 기록되어 있는가
- [ ] 선택된 스토리보드가 기획 단계 자동 검수(`project-output/review/planning-review.md`)를 통과했는가
- [ ] `guide-injector`를 실행해 **영상 생성 단계 프롬프트**(공식 외형·색상 서술·기술 규칙)가 주입되었는가
- [ ] 모든 장면의 최종 프롬프트와 공식 레퍼런스 이미지가 사전 검수를 통과했는가
- [ ] 캐릭터마다 공식 PDF에서 추출한 승인 레퍼런스 또는 공식 원화를 그대로 사용한 고정 시작 이미지가 준비되었는가
- [ ] 담당자가 예상 Higgsfield 크레딧과 생성 대상 클립 목록을 확인하고 **비용 사용을 명시적으로 승인**했는가
- [ ] `production-log.json`의 `approvals.production.status`가 `approved`, `explicit`와 `cost_usage_approved`가 모두 `true`인가

위 항목을 모두 충족하기 전에는 테스트 생성을 포함한 Higgsfield 유료 호출을 금지한다. 텍스트 프롬프트만으로 캐릭터를 새로 생성하지 않는다.

장면별 최종 프롬프트는 `higgsfield-prompt-builder`로 조립한 결과만 사용한다. 손으로 쓰거나 스토리보드 문장을 그대로 넘기지 않는다. 그 스킬의 사전 게이트를 통과하지 못한 장면은 생성 대상에서 제외한다.

## 핵심 흐름

### 1단계: 선택된 스토리보드 로드

`project-output/storyboard/storyboard-{a,b,c}.md` 중 담당자가 선택한 파일을 읽고 장면별 정보를 추출한다:
- 시간 구간, 화면 구성, 캐릭터 행동·표정, 대사·자막, 카메라, 효과음·음악, **생성 프롬프트**

### 2단계: 가이드 주입 확인

`guide-injector`의 영상 생성 단계 프롬프트가 각 장면의 생성 프롬프트에 반영되었는지 확인한다:
- 캐릭터 외형은 `character-guide` §4의 O/X 규칙과 1:1 대응
- 색상은 서술형 표기만 사용 (공식 HEX 미확보 — 임의 생성 금지)
- 다중 캐릭터 컷의 키 순서: 고르방 > 양퐁당 > 부라봉 > 구애구 > 냥냥이 > 호꼬
- 무늬 방향 고정: 양퐁당 동백 우측, 냥냥이 눈 반점 좌측, 좌우 반전 불가

### 3단계: 장면별 영상 생성 — 컷 체인

기획안에 기록된 **사용 가능한 생성형 AI 도구/API**로 장면 단위 클립을 생성한다.
컷은 순서대로 하나씩 만든다. 여러 컷을 동시에 생성하지 않는다 — 컷 N의 결과가 컷 N+1의 입력이다.

#### 연결 방식: 이전 컷 마지막 프레임 → 다음 컷 start image

| 컷 | start image |
|---|---|
| 컷 1 | 승인된 공식 레퍼런스 기반 고정 시작 이미지 (character-guide §3.2) |
| 컷 N (N≥2) | **컷 N-1의 실제 마지막 프레임** `video/frames/scene-{NN}-last.png` |

Extender로 앞 클립을 이어 늘리는 것을 기본으로 삼지 않는다. 생성이 누적되면 외형·색상이
서서히 이탈하는데, 컷마다 프레임을 물려 새로 시작하면 열화가 누적되지 않고 실패한 컷만
다시 만들 수 있다.

절차는 컷마다 다음을 반복한다.

1. 컷 N의 프롬프트를 `higgsfield-prompt-builder`로 조립한다 (직접 쓰지 않는다)
2. start image를 붙여 클립을 생성하고 `project-output/video/clips/scene-{NN}.mp4`로 저장한다
3. 마지막 프레임을 뽑는다 — 손으로 ffmpeg를 부르지 않고 스크립트를 쓴다

```bash
node unsorted/scripts/extract-last-frame.mjs \
  --clip project-output/video/clips/scene-01.mp4
# → project-output/video/frames/scene-01-last.png
```

4. 추출한 PNG를 `view_image`로 **열어서 눈으로 확인한다.** 모션 블러, 눈 감김, 중간 동작,
   프레임 밖으로 잘린 캐릭터가 보이면 그 프레임을 다음 컷에 물리지 않는다 (아래 예외 처리)
5. 확인한 PNG를 컷 N+1의 start image로 넘긴다

#### Extender 예외

한 동작이 컷 경계를 가로질러야 해서 프레임을 물리면 오히려 끊겨 보이는 구간에 한해 허용한다.
아래 **세 조건을 모두** 만족할 때만 쓴다.

- [ ] 동작 연속성이 필수인 구간인가 (같은 동작이 두 컷에 걸쳐 이어지는가)
- [ ] 이어붙일 두 컷의 길이 합이 8초 이하인가
- [ ] 담당자가 스토리보드 `연결` 칸에 `extender`로 표시하고 사유를 적었는가

예외를 쓴 컷 번호와 사유를 `production-log.json`에 기록한다. 표시가 없는 컷에 임의로
Extender를 쓰지 않는다.

#### 그 밖의 규칙

- 사용한 도구·모델명·버전·생성 조건을 `project-output/metadata/production-log.json`의 `model_versions`에 기록한다
- 컷마다 `production-log.json`의 `video_clips` 배열에 한 항목을 남긴다. 게이트가 `--stage final`에서 검사하므로, 빠지면 최종 승인으로 넘어가지 못한다

```jsonc
{
  "id": "scene-02",
  "path": "project-output/video/clips/scene-02.mp4",
  "model": "kling3_0",
  "prompt": "…조립된 프롬프트 전문…",
  "link": "start-frame",              // 기본값. 예외일 때만 "extender"
  "start_image": "project-output/video/frames/scene-01-last.png",
  "last_frame": "project-output/video/frames/scene-02-last.png",
  "prev": "scene-01",                 // 첫 컷이면 대신 "first": true
  "duration_seconds": 4,
  "postcheck": { "status": "passed", "violations": [] }
}
```

- 첫 컷은 `"first": true`와 공식 레퍼런스 경로를 넣는다. 첫 컷의 `start_image`가 `frames/`를 가리키면 게이트가 막는다
- `link`가 `extender`이면 `extender_reason`이 반드시 있어야 한다. 없으면 게이트가 막는다
- 컷 N(N≥2)의 `start_image`는 `-last.png`로 끝나야 한다. 공식 레퍼런스로 중간 컷을 시작하면 게이트가 막는다
- TTS 사용 시 호꼬에게는 음성 대사를 생성하지 않는다 (의성어·효과음·자막만 허용)
- 생성 전 모델별 예상 크레딧과 승인 시각을 `approvals.production`과 `costs`에 기록한다

#### 부분 재생성 — 체인 전파 상한 1

컷 K를 재생성하면 컷 K의 마지막 프레임이 바뀌므로 **컷 K+1까지만** 다시 만든다.

1. 컷 K 재생성 → `clips/scene-{K}.mp4` 교체
2. `extract-last-frame.mjs`로 프레임 재추출 → `frames/scene-{K}-last.png` 교체
3. 컷 K+1만 재생성
4. **컷 K+2 이후는 재생성하지 않는다**

K+2 이후는 K+1의 새 마지막 프레임에서 다시 시작하므로 연결이 유지된다. 상한 없이 전파하면
컷 하나 실패에 뒤 클립 전체가 유료 재호출된다. 검수에서 K+2 이후 경계가 실제로 튄 것이
확인된 경우에만, 그 컷 번호를 기록하고 담당자 확인을 받아 한 칸 더 확장한다.
정상 클립은 다시 호출하지 않는다.

### 4단계: 클립 결합 및 길이 검증

장면 클립을 스토리보드 순서대로 결합하고 다음을 검증한다:

- [ ] 총 길이가 **60초 미만**인가 — 60초 이상이면 자동으로 재편집(장면 단축·컷 조정)하거나 재생성을 요청한다
- [ ] 화면 비율이 **9:16**, 해상도가 **1080×1920**(기본)인가
- [ ] 영상과 음성이 정상 재생되는가
- [ ] 자막이 화면 밖으로 잘리지 않는가
- [ ] 대사와 입 모양·장면 타이밍이 지나치게 어긋나지 않는가
- [ ] **컷 경계에서 캐릭터 위치·크기·색조·배경이 튀지 않는가** (컷 전환 지점을 하나씩 본다)

### 5단계: MP4 출력

검증을 통과한 영상을 `project-output/video/draft.mp4`로 저장한다. 담당자 최종 승인 후에만 동일한 승인본을 `project-output/video/final.mp4`로 확정한다.

### 6단계: 후속 검수 연계

1. `auto-reviewer`를 실행해 영상 검수(`project-output/review/video-review.md`)를 수행한다
2. 검수 통과 시 `approval-logger`로 담당자 최종 승인을 요청한다
3. 승인 전까지 영상을 외부에 공개하거나 게시하지 않는다
4. 배포 요청이 있으면 최종 승인 후 `content-publisher`에 전달하고 별도의 배포 승인을 받는다

## 예외 처리

| 상황 | 처리 |
|---|---|
| 영상 생성 API 오류 | 오류 원인과 재시도 가능 여부를 `production-log.json`에 기록 |
| 캐릭터 외형이 크게 달라진 장면 | 전체 재생성이 아니라 **해당 장면만 재생성**한다. 장면 번호를 기록. 재생성 후 프레임 재추출과 다음 컷 재생성까지만 전파 |
| 마지막 프레임 추출 실패 | 다음 컷을 생성하지 않는다. 클립 경로와 스크립트 오류를 `errors`에 기록하고 해당 컷을 먼저 재생성한다. 공식 레퍼런스로 대체해 이어붙이지 않는다 |
| 추출한 프레임이 모션 블러·눈 감김·중간 동작 | 그 프레임을 물리지 않는다. **해당 컷을 끝 포즈 지시와 함께 재생성**한다. 프레임을 보정하거나 앞쪽 프레임을 대신 뽑아 쓰지 않는다 (클립의 실제 끝과 달라져 경계가 튄다) |
| Extender 예외 조건 미충족인데 요청됨 | Extender를 쓰지 않고 마지막 프레임 방식으로 진행한다. 요청 사유를 기록하고 담당자에게 스토리보드 `연결` 칸 표시를 요청한다 |
| 총 길이 60초 이상 | 자동 재편집 또는 재생성 요청. 60초 미만이 될 때까지 출력하지 않음 |
| 저작권 위험 요소 감지 (음원·폰트·이미지) | 대체 가능한 음원·폰트·이미지를 제안하고 교체 후 진행 |
| 스토리보드 선택 기록 없음 | 생성을 시작하지 않고 담당자 선택을 먼저 요청 |
| 검수 실패 항목 존재 | 영상 생성 또는 최종 출력을 중단하고 수정 후 재검수 |

## 산출물

- `project-output/video/clips/scene-{NN}.mp4` — 컷별 클립
- `project-output/video/frames/scene-{NN}-last.png` — 컷별 마지막 프레임 (다음 컷의 start image)
- `project-output/video/draft.mp4` — 담당자 승인 전 초안
- `project-output/video/final.mp4` — 담당자 최종 승인 후 확정본
- `project-output/metadata/production-log.json` 내 `model_versions`, `timings.video_generation_duration_seconds`, `costs` 필드와 컷별 연결 방식·start image 출처

## 가이드라인
- 저작권이 확인되지 않은 음악·폰트·이미지·음성을 사용하지 않는다.
- 직접적인 상품 판매·구매 유도 요소를 영상에 포함하지 않는다.
- 장면 간 전환은 스토리보드에 명시된 방식(페이드, 점프컷, 디졸브 등)을 따른다.
- 컷 연결의 기본은 직전 컷의 실제 마지막 프레임이다. 공식 원본과 충돌하면 공식 원본을 따르고, 이탈이 보이면 그 컷을 재생성한다.
- 생성 시간과 API 비용을 측정하여 `production-log.json`에 기록한다.
