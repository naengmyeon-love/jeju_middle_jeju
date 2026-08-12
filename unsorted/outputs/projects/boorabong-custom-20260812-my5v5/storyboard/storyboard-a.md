# 스토리보드 A안 — 기본형

## 연출 방향

- 연출 콘셉트: 캐릭터와 대사가 명확하게 전달되는 안정적 연출
- 목표 감정: 편안함, 상황 이해 용이
- 총 길이: 15초
- 장면 수: 3장면
- 타이밍: 시나리오 시간을 그대로 따름 (5초 · 5초 · 5초 균등)
- 카메라 기조: 정면 고정, 미디엄~풀샷 중심
- 전환 기조: 연속 동작과 부드러운 컷

| 장면 | 시간 | 화면 구성 | 캐릭터 행동·표정 | 대사·자막 | 카메라 | 효과음·음악 | 생성 프롬프트 |
|---|---:|---|---|---|---|---|---|
| 1 | 0~5초 | 어두운 부엌 정면. 화면 중앙에 냉장고, 그 앞에 부라봉 | 짧은 팔을 위로 뻗어 문손잡이를 잡는다. 기대에 찬 웃는 표정 | `"쿨쿨 시간에 몰래 먹는 게 제일 맛있다봉~"` / 하단 중앙 자막 | 정면 고정 미디엄샷 | 미지정(담당자 확인) / 가벼운 배경 BGM | `prompts/a1.txt` |
| 2 | 5~10초 | 냉장고 문이 열리고 내부 불빛이 화면을 채운다. 귤이 부라봉 쪽으로 쏟아진다 | 두 팔을 벌려 막으려 한다. 놀란 반짝이는 눈(p10 허용 범위) | `"우와아앗, 귤 폭포다봉?!"` / 하단 중앙 자막 | 정면 고정 풀샷 | 미지정(담당자 확인) / BGM 유지 | `prompts/a2.txt` |
| 3 | 10~15초 | 바닥에 귤이 흩어진 부엌. 열린 냉장고 불빛이 남아 있다 | 귤 더미 가운데 앉아 두 팔로 귤을 안는다. 완전히 감은 눈으로 웃는다 | `"이건 사고가 아니라 행운이다봉~"` / 하단 중앙 자막 | 정면 고정 미디엄샷 | 미지정(담당자 확인) / BGM 마무리 | `prompts/a3.txt` |

## 장면 이미지 생성 프롬프트

9개 장면 프롬프트는 모두 `unsorted/scripts/build-pongdang-prompt.mjs` 조립기가 만들었고 정지 이미지 입력 게이트를 통과했다.
`[STYLE]` · `[CAST]` · `[NEGATIVE]` · `[OUTPUT]` 블록은 계약 파일에서 그대로 나오므로 9장면 모두 동일하다.
아래에는 안·장면마다 달라지는 `[SCENE]`과 `[COMPOSITION]`만 적는다. 전문과 실행 명령은 각 `prompts/*.txt`에 있다.

### 장면 1 — `prompts/a1.txt`

```text
[SCENE]
BOO RABONG stands in front of a closed refrigerator and reaches one short arm up toward the door handle with an eager smiling expression.
Background is the dark kitchen of a Jeju stone house at midnight, faint moonlight from a window.

[COMPOSITION]
front-facing medium shot, vertical 9:16 framing, the single character inside the safe area, plain uncluttered background
one single uninterrupted frame filling the whole canvas, one camera angle, one moment in time
```

### 장면 2 — `prompts/a2.txt`

```text
[SCENE]
BOO RABONG holds the open refrigerator door while a heap of tangerines pours out and spreads both short arms wide with startled sparkling eyes.
Background is the dark kitchen of a Jeju stone house at midnight, lit by the glow from inside the open refrigerator.

[COMPOSITION]
front-facing full shot, vertical 9:16 framing, the single character inside the safe area, plain uncluttered background
one single uninterrupted frame filling the whole canvas, one camera angle, one moment in time
```

### 장면 3 — `prompts/a3.txt`

```text
[SCENE]
BOO RABONG sits on the kitchen floor in the middle of a pile of scattered tangerines, hugging tangerines with both short arms, eyes fully closed in a happy smile.
Background is the dark kitchen of a Jeju stone house at midnight, the open refrigerator glowing behind.

[COMPOSITION]
front-facing medium shot, vertical 9:16 framing, the single character inside the safe area, plain uncluttered background
one single uninterrupted frame filling the whole canvas, one camera angle, one moment in time
```

## 장면별 이미지 보드

### 장면 1 · 00:00~00:05

**이미지 생성 대기** — `storyboard/images/a/scene-01.png` 미생성

- **스토리:** 모두 잠든 한밤중, 야식이 당긴 부라봉이 냉장고 앞에 서서 문손잡이에 손을 뻗는다. 문을 여는 동작이 다음 장면의 사고를 유발한다.
- **화면:** 고르방의 집 부엌, 창으로 들어오는 옅은 달빛
- **캐릭터:** 부라봉 단독. 기대에 찬 웃는 표정, 기본 눈 정원 유지
- **대사·자막:** "쿨쿨 시간에 몰래 먹는 게 제일 맛있다봉~" / 하단 중앙 안전 영역
- **카메라:** 정면 고정 미디엄샷 (영상에서는 손잡이 쪽으로 아주 느린 클로즈업 가능)
- **효과음·음악:** 미지정 — 담당자 확인 필요
- **영상 생성 프롬프트:** `prompts/a1.txt`의 프롬프트를 기반으로 하되, 영상 단계에서 "부라봉이 손잡이를 잡고 천천히 당긴다"는 동작 지시를 추가한다
- **이미지 생성 기록:** 레퍼런스 page-08 · page-09 · page-10, 모델 `nano_banana_flash`, 9:16, 2k. **미실행 (사유: 아래 참조)**

### 장면 2 · 00:05~00:10

**이미지 생성 대기** — `storyboard/images/a/scene-02.png` 미생성

- **스토리:** 문이 열리자 쌓아둔 귤이 균형을 잃고 쏟아진다. 이 장면이 콘텐츠의 핵심 사건이다.
- **화면:** 열린 냉장고 불빛이 부라봉과 바닥을 비춘다
- **캐릭터:** 두 팔을 벌려 막으려는 자세, 놀란 반짝이는 눈
- **대사·자막:** "우와아앗, 귤 폭포다봉?!" / 하단 중앙 안전 영역
- **카메라:** 정면 고정 풀샷
- **효과음·음악:** 미지정 — 담당자 확인 필요
- **영상 생성 프롬프트:** `prompts/a2.txt` 기반, 영상 단계에서 "귤이 위에서 아래로 연속으로 쏟아진다"는 동작 지시를 추가한다
- **이미지 생성 기록:** 레퍼런스 page-08 · page-09 · page-10, 모델 `nano_banana_flash`, 9:16, 2k. **미실행**

### 장면 3 · 00:10~00:15

**이미지 생성 대기** — `storyboard/images/a/scene-03.png` 미생성

- **스토리:** 귤 더미에 파묻힌 부라봉이 오히려 즐거워한다. 사고가 행운으로 뒤집히며 끝난다.
- **화면:** 바닥 가득한 귤, 열린 냉장고의 잔광
- **캐릭터:** 귤을 안고 완전히 감은 눈으로 웃는다 (감은 눈은 뜬 눈보다 가로로 조금 더 길다, p10)
- **대사·자막:** "이건 사고가 아니라 행운이다봉~" / 하단 중앙 안전 영역
- **카메라:** 정면 고정 미디엄샷
- **효과음·음악:** 미지정 — 담당자 확인 필요
- **영상 생성 프롬프트:** `prompts/a3.txt` 기반, 영상 단계에서 "부라봉이 귤을 끌어안으며 살짝 몸을 흔든다"는 동작 지시를 추가한다
- **이미지 생성 기록:** 레퍼런스 page-08 · page-09 · page-10, 모델 `nano_banana_flash`, 9:16, 2k. **미실행**

## 이미지 미생성 사유

이번 세션에서 `higgsfield` CLI 실행이 권한 승인 대기 상태로 거부되어 호출 자체가 불가능했다.
프롬프트 조립과 사전 게이트는 모두 통과했으므로, 실행 권한이 열리면 `prompts/*.txt` 안의 명령을 그대로 실행하면 된다.
임의 placeholder 이미지는 넣지 않았다. 상세는 `metadata/production-log.json`의 `errors` 항목에 기록했다.
