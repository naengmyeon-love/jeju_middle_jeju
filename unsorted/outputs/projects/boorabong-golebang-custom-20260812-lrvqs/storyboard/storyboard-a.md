# 스토리보드 A안 — 기본형

## 연출 방향

- 연출 콘셉트: 캐릭터와 대사가 명확하게 전달되는 안정적 연출
- 목표 감정: 편안함, 상황 이해 용이
- 총 길이: 15초
- 장면 수: 4장면
- 타이밍: 시나리오 시간을 그대로 따름 (4초 · 4초 · 4초 · 3초)
- 카메라 기조: 정면 고정, 미디엄~풀샷 중심
- 전환 기조: 연속 동작과 부드러운 컷

| 장면 | 시간 | 화면 구성 | 캐릭터 행동·표정 | 대사·자막 | 카메라 | 효과음·음악 | 생성 프롬프트 |
|---|---:|---|---|---|---|---|---|
| 1 | 0~4초 | 어두운 새벽 부엌 정면. 화면 중앙에 닫힌 냉장고, 그 앞에 부라봉 | 까치발로 서서 짧은 팔을 위로 뻗어 문손잡이를 잡는다. 기대에 찬 웃는 표정 | `"다들 자는 새벽이 제일 꿀맛이다봉~"` / 하단 중앙 자막 | 정면 고정 미디엄샷 | 발소리·문 실링 소리(미지정) / 조용한 BGM | `prompts/a1.txt` |
| 2 | 4~8초 | 냉장고 문이 열리고 내부 불빛이 화면을 채운다. 귤이 부라봉 쪽으로 쏟아진다 | 두 팔을 벌려 막으려 한다. 놀란 반짝이는 눈(p10 허용 범위) | `"우와앗! 귤 폭포다봉?!"` / 하단 중앙 자막 | 정면 고정 풀샷 | 귤 쏟아지는 강조음(미지정) / BGM 밝게 전환 | `prompts/a2.txt` |
| 3 | 8~12초 | 귤로 뒤덮인 바닥. 화면 왼쪽 부엌 입구에 고르방, 오른쪽 바닥에 부라봉 | 고르방은 뭉툭한 손을 들고 인자하게 웃는다. 부라봉은 겁먹은 눈(평소 사이즈에 주름) | `"아이고, 이게 무슨 귤르르 사태야~"` / 하단 중앙 자막 | 정면 고정 풀샷 (키 순서 고르방 > 부라봉) | 정적 + 발소리 한 번(미지정) / BGM 잠시 낮춤 | `prompts/a3.txt` |
| 4 | 12~15초 | 귤 더미 위에 나란히 앉은 두 캐릭터. 열린 냉장고 잔광 | 고르방은 귤을 하나 집고, 부라봉은 귤을 안고 완전히 감은 눈으로 웃는다 | `"사고 아니라 야식이다봉!"` / 하단 중앙 자막 | 정면 고정 미디엄샷 | 귤 까는 소리(미지정) / BGM 마무리 | `prompts/a4.txt` |

## 장면 이미지 생성 프롬프트

12개 장면 프롬프트(A 4 · B 5 · C 3)는 모두 `unsorted/scripts/build-pongdang-prompt.mjs` 조립기가 만들었고 정지 이미지 입력 게이트를 통과했다.
`[STYLE]` · `[CAST]` · `[NEGATIVE]` · `[OUTPUT]` 블록은 계약 파일에서 그대로 나오므로 손으로 쓰지 않았다.
아래에는 장면마다 달라지는 `[SCENE]`과 `[COMPOSITION]`만 적는다. 전문과 실행 명령은 각 `prompts/*.txt`에 있다.

### 장면 1 — `prompts/a1.txt`

```text
[SCENE]
BOO RABONG stands on tiptoe in front of a closed refrigerator and reaches one short arm up toward the door handle with an eager smiling expression.
Background is the dark kitchen of a Jeju stone house before dawn, faint dark sky through the window.

[COMPOSITION]
front-facing medium shot, vertical 9:16 framing, the single character inside the safe area, plain uncluttered background
one single uninterrupted frame filling the whole canvas, one camera angle, one moment in time
```

### 장면 2 — `prompts/a2.txt`

```text
[SCENE]
BOO RABONG spreads both short arms wide while a heap of tangerines pours out of the open refrigerator over him, eyes startled and sparkling.
Background is the dark kitchen of a Jeju stone house before dawn, lit by the glow from inside the open refrigerator.

[COMPOSITION]
front-facing full shot, vertical 9:16 framing, the single character inside the safe area, plain uncluttered background
one single uninterrupted frame filling the whole canvas, one camera angle, one moment in time
```

### 장면 3 — `prompts/a3.txt`

```text
[SCENE]
GO LEBANG stands in the kitchen doorway with a kind smile and one blunt hand raised, while BOO RABONG sits buried in the pile of tangerines on the floor and looks up at him with frightened wrinkled eyes.
Background is the dark kitchen of a Jeju stone house before dawn, the open refrigerator glowing at the side and tangerines scattered on the floor.

[COMPOSITION]
front-facing full shot, vertical 9:16 framing, all 2 characters inside the safe area, plain uncluttered background
one single uninterrupted frame filling the whole canvas, one camera angle, one moment in time
```

### 장면 4 — `prompts/a4.txt`

```text
[SCENE]
GO LEBANG sits on the kitchen floor holding one tangerine with a kind smile, while BOO RABONG beside him hugs tangerines with both short arms and eyes fully closed in a happy smile.
Background is the dark kitchen of a Jeju stone house before dawn, the open refrigerator glowing at the side and tangerines scattered on the floor.

[COMPOSITION]
front-facing medium shot, vertical 9:16 framing, all 2 characters inside the safe area, plain uncluttered background
one single uninterrupted frame filling the whole canvas, one camera angle, one moment in time
```

## 장면별 이미지 보드

### 장면 1 · 00:00~00:04

**이미지 생성 대기** — `storyboard/images/a/scene-01.png` 미생성

- **스토리:** 모두 잠든 새벽, 야식이 당긴 부라봉이 부엌으로 내려와 냉장고 손잡이에 팔을 뻗는다. 이 동작이 다음 장면의 사고를 유발한다.
- **화면:** 고르방의 집 부엌, 창밖은 아직 어두운 새벽
- **캐릭터:** 부라봉 단독. 기대에 찬 웃는 표정, 기본 눈 정원 유지
- **대사·자막:** "다들 자는 새벽이 제일 꿀맛이다봉~" / 하단 중앙 안전 영역
- **카메라:** 정면 고정 미디엄샷 (영상에서는 손잡이 쪽으로 아주 느린 접근 가능)
- **효과음·음악:** 미지정 — 담당자 확인 필요
- **영상 생성 프롬프트:** `prompts/a1.txt` 기반. 영상 단계에서 "부라봉이 손잡이를 잡고 천천히 당긴다"는 동작 지시를 추가한다
- **이미지 생성 기록:** 레퍼런스 page-08 · page-09 · page-10, 모델 `nano_banana_flash`, 9:16, 2k. **미실행 (사유: 아래 참조)**

### 장면 2 · 00:04~00:08

**이미지 생성 대기** — `storyboard/images/a/scene-02.png` 미생성

- **스토리:** 문이 열리자 쌓아둔 귤이 균형을 잃고 쏟아진다. 콘텐츠의 핵심 사건이다.
- **화면:** 열린 냉장고 불빛이 부라봉과 바닥을 비춘다
- **캐릭터:** 두 팔을 벌려 막으려는 자세, 놀란 반짝이는 눈
- **대사·자막:** "우와앗! 귤 폭포다봉?!" / 하단 중앙 안전 영역
- **카메라:** 정면 고정 풀샷
- **효과음·음악:** 미지정 — 담당자 확인 필요
- **영상 생성 프롬프트:** `prompts/a2.txt` 기반. 영상 단계에서 "귤이 위에서 아래로 연속으로 쏟아진다"는 동작 지시를 추가한다
- **이미지 생성 기록:** 레퍼런스 page-08 · page-09 · page-10, 모델 `nano_banana_flash`, 9:16, 2k. **미실행**

### 장면 3 · 00:08~00:12

**이미지 생성 대기** — `storyboard/images/a/scene-03.png` 미생성

- **스토리:** 소리를 듣고 나온 고르방이 현장을 본다. 혼날 줄 알았던 부라봉에게 고르방은 아재개그를 던진다. 관계의 긍정 극성(page-05)을 그대로 보여주는 장면이다.
- **화면:** 귤로 뒤덮인 바닥, 왼쪽 부엌 입구의 고르방
- **캐릭터:** 고르방 인자한 웃음(눈썹 끝 둥글게), 부라봉 겁먹은 눈. 키 순서 고르방 > 부라봉
- **대사·자막:** "아이고, 이게 무슨 귤르르 사태야~" / 하단 중앙 안전 영역
- **카메라:** 정면 고정 풀샷
- **효과음·음악:** 미지정 — 담당자 확인 필요
- **영상 생성 프롬프트:** `prompts/a3.txt` 기반. 영상 단계에서 "고르방이 문틀에 손을 짚고 고개를 젓는다"는 동작 지시를 추가한다
- **이미지 생성 기록:** 레퍼런스 page-03 · page-05 · page-07 · page-08 · page-09 · page-10 · page-11 · page-12 · page-13, 모델 `nano_banana_flash`, 9:16, 2k. **미실행**

### 장면 4 · 00:12~00:15

**이미지 생성 대기** — `storyboard/images/a/scene-04.png` 미생성

- **스토리:** 둘이 귤 더미에 앉아 새벽 야식을 함께 먹는다. 사고가 행운으로 뒤집히며 끝난다.
- **화면:** 바닥 가득한 귤, 열린 냉장고의 잔광
- **캐릭터:** 고르방은 귤을 집고, 부라봉은 완전히 감은 눈으로 웃는다 (감은 눈은 뜬 눈보다 가로로 조금 더 길다, p10)
- **대사·자막:** "사고 아니라 야식이다봉!" / 하단 중앙 안전 영역
- **카메라:** 정면 고정 미디엄샷
- **효과음·음악:** 미지정 — 담당자 확인 필요
- **영상 생성 프롬프트:** `prompts/a4.txt` 기반. 영상 단계에서 "부라봉이 귤을 끌어안으며 몸을 흔든다"는 동작 지시를 추가한다
- **이미지 생성 기록:** 레퍼런스 page-03 · page-05 · page-07 · page-08 · page-09 · page-10 · page-11 · page-12 · page-13, 모델 `nano_banana_flash`, 9:16, 2k. **미실행**

## 이미지 미생성 사유

이번 세션에서 `higgsfield` CLI 실행이 권한 승인 대기 상태로 거부되어 호출 자체가 불가능했다. 비대화형 세션이라 승인 프롬프트에 응답할 수 없다.
또한 유료 호출은 `higgsfield-prompt-builder` 5단계 사전 게이트상 제작·비용 승인 기록 이후에만 허용되며, 현재 승인은 `not_requested` 상태다.
프롬프트 조립과 입력 게이트는 전부 통과했으므로, 승인과 실행 권한이 모두 열리면 `prompts/*.txt` 안의 명령을 장면당 한 번씩 실행하면 된다.
임의 placeholder 이미지는 넣지 않았다. 상세는 `metadata/production-log.json`의 `errors` 항목에 기록했다.
