# 스토리보드 B안 — 코미디형

## 연출 방향

- 연출 콘셉트: 표정, 타이밍, 반전, 효과음을 강조한 연출
- 목표 감정: 웃음, 놀라움, 반전 재미
- 총 길이: 15초
- 장면 수: 3장면
- 타이밍: 코미디 리듬으로 재배분 (4초 · 3초 · 8초). 사고 순간을 짧고 강하게 치고, 마지막 리액션을 길게 끌어 웃음을 유지한다
- 카메라 기조: 로우앵글로 냉장고를 과장 → 얼굴 클로즈업 → 하이앵글 부감. 앵글이 매 장면 바뀐다
- 전환 기조: 점프컷, 사고 직후 0.5초 프리즈

| 장면 | 시간 | 화면 구성 | 캐릭터 행동·표정 | 대사·자막 | 카메라 | 효과음·음악 | 생성 프롬프트 |
|---|---:|---|---|---|---|---|---|
| 1 | 0~4초 | 아래에서 올려다본 거대한 냉장고와 그 앞의 작은 부라봉 | 두 팔로 손잡이를 붙잡고 매달리듯 당긴다. 신난 미소 | `"쿨쿨 시간에 몰래 먹는 게 제일 맛있다봉~"` / 하단 자막 + 상단 강조 자막 **`살금살금`** | 로우앵글 풀샷 | 미지정(담당자 확인) / 경쾌한 코믹 BGM | `prompts/b1.txt` |
| 2 | 4~7초 | 부라봉 얼굴이 화면을 가득 채우고 귤이 볼 옆으로 우수수 지나간다 | 충격받은 표정, 반짝이는 큰 눈 | `"우와아앗, 귤 폭포다봉?!"` / 하단 자막 + 화면 중앙 강조 자막 **`우르르르!`** | 정면 클로즈업 (컷 끝에 0.5초 프리즈) | 미지정(담당자 확인) / 효과음 강조, BGM 순간 정지 | `prompts/b2.txt` |
| 3 | 7~15초 | 위에서 내려다본 귤 바다. 가슴까지 귤에 파묻힌 부라봉 | 눈을 완전히 감고 활짝 웃는다. 꼭지 이파리 옆에 귤 하나가 얹혀 있다 | `"이건 사고가 아니라 행운이다봉~"` / 하단 자막 + 상단 강조 자막 **`행복`** | 하이앵글 풀샷 | 미지정(담당자 확인) / BGM 복귀, 밝게 마무리 | `prompts/b3.txt` |

## 장면 이미지 생성 프롬프트

프롬프트는 `unsorted/scripts/build-pongdang-prompt.mjs` 조립기가 만들었고 정지 이미지 입력 게이트를 통과했다.
`[STYLE]` · `[CAST]` · `[NEGATIVE]` · `[OUTPUT]` 블록은 계약 파일에서 그대로 나오므로 A·B·C안 9장면 모두 동일하다.
아래에는 달라지는 `[SCENE]`과 `[COMPOSITION]`만 적는다. 전문과 실행 명령은 각 `prompts/*.txt`에 있다.

### 장면 1 — `prompts/b1.txt`

```text
[SCENE]
BOO RABONG looks up at the tall closed refrigerator door and grips the handle with both short arms, mouth curved in an excited grin.
Background is the dark kitchen of a Jeju stone house at midnight, plain simplified kitchen wall.

[COMPOSITION]
low-angle full shot, vertical 9:16 framing, the single character inside the safe area, plain uncluttered background
one single uninterrupted frame filling the whole canvas, one camera angle, one moment in time
```

### 장면 2 — `prompts/b2.txt`

```text
[SCENE]
The face of BOO RABONG fills the frame with a shocked expression and sparkling wide eyes as tangerines rain down past the cheeks.
Background is the glowing interior of an open refrigerator at midnight.

[COMPOSITION]
front-facing close-up, vertical 9:16 framing, the single character inside the safe area, plain uncluttered background
one single uninterrupted frame filling the whole canvas, one camera angle, one moment in time
```

### 장면 3 — `prompts/b3.txt`

```text
[SCENE]
BOO RABONG lies buried up to the chest in a mound of tangerines on the kitchen floor with eyes fully closed in a wide happy smile and one tangerine resting on top of the head beside the leaf sprig.
Background is the kitchen floor of a Jeju stone house at midnight covered in tangerines.

[COMPOSITION]
high-angle full shot, vertical 9:16 framing, the single character inside the safe area, plain uncluttered background
one single uninterrupted frame filling the whole canvas, one camera angle, one moment in time
```

## 장면별 이미지 보드

### 장면 1 · 00:00~00:04

**이미지 생성 대기** — `storyboard/images/b/scene-01.png` 미생성

- **스토리:** 로우앵글로 냉장고를 실제보다 크게 보여 1.5등신 부라봉의 작음과 무모함을 강조한다. 곧 벌어질 사고의 규모를 미리 암시한다.
- **화면:** 단순화한 부엌 벽, 화면을 세로로 채우는 냉장고 문
- **캐릭터:** 손잡이에 매달리듯 두 팔로 당기는 자세, 신난 미소
- **대사·자막:** "쿨쿨 시간에 몰래 먹는 게 제일 맛있다봉~" / 하단 중앙 + 상단 강조 자막 `살금살금`
- **카메라:** 로우앵글 풀샷
- **효과음·음악:** 미지정 — 담당자 확인 필요
- **영상 생성 프롬프트:** `prompts/b1.txt` 기반, 영상 단계에서 "부라봉이 체중을 실어 손잡이를 당긴다"는 동작 지시를 추가한다
- **이미지 생성 기록:** 레퍼런스 page-08 · page-09 · page-10, 모델 `nano_banana_flash`, 9:16, 2k. **미실행 (사유: 아래 참조)**

### 장면 2 · 00:04~00:07

**이미지 생성 대기** — `storyboard/images/b/scene-02.png` 미생성

- **스토리:** 사고 순간을 3초로 짧게 치고 표정 하나로 웃음을 만든다. B안의 핵심 컷이다.
- **화면:** 열린 냉장고 내부의 밝은 빛이 배경 전체
- **캐릭터:** 얼굴 클로즈업, 충격받은 반짝이는 눈. 세로눈·정원 이탈을 쓰지 않는다
- **대사·자막:** "우와아앗, 귤 폭포다봉?!" / 하단 중앙 + 중앙 강조 자막 `우르르르!`
- **카메라:** 정면 클로즈업. 컷 끝 0.5초 프리즈
- **효과음·음악:** 미지정 — 담당자 확인 필요 (효과음 강조 지점)
- **영상 생성 프롬프트:** `prompts/b2.txt` 기반, 영상 단계에서 "귤이 얼굴 앞을 빠르게 스쳐 떨어진다"는 동작 지시를 추가한다
- **이미지 생성 기록:** 레퍼런스 page-08 · page-09 · page-10, 모델 `nano_banana_flash`, 9:16, 2k. **미실행**
- **주의:** 클로즈업은 실측상 눈 흰자·동공 분리가 생기기 쉬운 구도다. 생성 후 p10과 1:1 대조에서 눈이 단색 채움 정원인지 최우선으로 확인한다.

### 장면 3 · 00:07~00:15

**이미지 생성 대기** — `storyboard/images/b/scene-03.png` 미생성

- **스토리:** 8초를 통째로 리액션에 쓴다. 사고를 행운으로 뒤집는 반전이 웃음의 마무리다.
- **화면:** 부감으로 본 귤 바다
- **캐릭터:** 가슴까지 귤에 파묻힌 채 감은 눈으로 활짝 웃는다. 머리 위 꼭지 이파리 옆에 귤 하나
- **대사·자막:** "이건 사고가 아니라 행운이다봉~" / 하단 중앙 + 상단 강조 자막 `행복`
- **카메라:** 하이앵글 풀샷
- **효과음·음악:** 미지정 — 담당자 확인 필요
- **영상 생성 프롬프트:** `prompts/b3.txt` 기반, 영상 단계에서 "부라봉이 귤 속에서 팔을 살짝 흔든다"는 동작 지시를 추가한다
- **이미지 생성 기록:** 레퍼런스 page-08 · page-09 · page-10, 모델 `nano_banana_flash`, 9:16, 2k. **미실행**
- **담당자 확인 필요:** 머리 위에 귤을 얹는 표현은 공식 소품 규정이 없는 신규 연출이다. 부라봉의 꼭지 이파리를 가리지 않는 선에서만 사용하며, 사용 여부를 담당자가 확정해야 한다.

## 이미지 미생성 사유

이번 세션에서 `higgsfield` CLI 실행이 권한 승인 대기 상태로 거부되어 호출 자체가 불가능했다.
프롬프트 조립과 사전 게이트는 모두 통과했으므로, 실행 권한이 열리면 `prompts/*.txt` 안의 명령을 그대로 실행하면 된다.
임의 placeholder 이미지는 넣지 않았다. 상세는 `metadata/production-log.json`의 `errors` 항목에 기록했다.
