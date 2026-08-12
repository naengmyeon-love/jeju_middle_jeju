# 스토리보드 B안 — 코미디형

## 연출 방향

- 연출 콘셉트: 표정, 타이밍, 반전, 효과음을 강조한 연출
- 목표 감정: 웃음, 놀라움, 반전 재미
- 총 길이: 15초
- 장면 수: 5장면 (A안보다 컷을 하나 더 쪼갠다)
- 타이밍: 코미디 리듬으로 재배분 (2.5초 · 2.5초 · 2초 빠른 컷 → 3초 정적 → 5초 마무리)
- 카메라 기조: 로우앵글·클로즈업·하이앵글을 섞어 앵글 변화를 크게 준다
- 전환 기조: 점프컷, 사고 직후 정적(비트 멈춤)으로 웃음 포인트를 만든다

| 장면 | 시간 | 화면 구성 | 캐릭터 행동·표정 | 대사·자막 | 카메라 | 효과음·음악 | 생성 프롬프트 |
|---|---:|---|---|---|---|---|---|
| 1 | 0~2.5초 | 냉장고를 아래에서 올려다본 구도. 부라봉이 손잡이를 잡고 있다 | 신난 얼굴로 입을 벌린다 | `"다들 자는 새벽이 제일 꿀맛이다봉~"` / 하단 중앙 자막 | 로우앵글 풀샷 | 두근거리는 짧은 음(미지정) / 경쾌한 BGM | `prompts/b1.txt` |
| 2 | 2.5~5초 | 귤이 화면 위에서 터지듯 쏟아진다 | 두 팔을 번쩍 들어 올린다 | 대사 없음 / **강조 자막 `우르르르르!`** 화면 상단 | 정면 풀샷 | 귤 쏟아지는 강조음(미지정) / BGM 급전환 | `prompts/b2.txt` |
| 3 | 5~7초 | 귤 더미에 머리까지 파묻힌 부라봉의 얼굴 | 놀란 반짝이는 눈, 벌어진 입 | `"우와앗! 귤 폭포다봉?!"` / 하단 중앙 자막 | 정면 클로즈업 | 짧은 타격음(미지정) / BGM 정지 | `prompts/b3.txt` |
| 4 | 7~10초 | 부엌 입구에 선 고르방을 아래에서 올려다본 상반신 | 인자하게 웃으며 뭉툭한 손을 든다 | `"아이고, 이게 무슨 귤르르 사태야~"` / 하단 중앙 자막 | 로우앵글 버스트샷 | 정적 3초(미지정) / 무음 | `prompts/b4.txt` |
| 5 | 10~15초 | 귤 바다를 위에서 내려다본 구도. 두 캐릭터가 그 한가운데 | 고르방은 귤을 집고, 부라봉은 감은 눈으로 웃는다 | `"사고 아니라 야식이다봉!"` / 하단 중앙 자막 | 하이앵글 풀샷 (키 순서 고르방 > 부라봉) | 귤 까는 소리(미지정) / BGM 복귀·마무리 | `prompts/b5.txt` |

## 장면 이미지 생성 프롬프트

프롬프트는 전부 `unsorted/scripts/build-pongdang-prompt.mjs` 조립기가 만들었고 정지 이미지 입력 게이트를 통과했다.
아래에는 장면마다 달라지는 `[SCENE]`과 `[COMPOSITION]`만 적는다. 전문과 실행 명령은 각 `prompts/*.txt`에 있다.

### 장면 1 — `prompts/b1.txt`

```text
[SCENE]
BOO RABONG grips the refrigerator door handle with one short arm, mouth open in excited anticipation.
Background is the dark kitchen of a Jeju stone house before dawn, faint dark sky through the window.

[COMPOSITION]
low-angle full shot, vertical 9:16 framing, the single character inside the safe area, plain uncluttered background
one single uninterrupted frame filling the whole canvas, one camera angle, one moment in time
```

### 장면 2 — `prompts/b2.txt`

```text
[SCENE]
a heap of tangerines bursts out of the open refrigerator over BOO RABONG who throws both short arms up.
Background is the dark kitchen of a Jeju stone house before dawn, lit by the glow from inside the open refrigerator.

[COMPOSITION]
front-facing full shot, vertical 9:16 framing, the single character inside the safe area, plain uncluttered background
one single uninterrupted frame filling the whole canvas, one camera angle, one moment in time
```

### 장면 3 — `prompts/b3.txt`

```text
[SCENE]
BOO RABONG is buried up to the head in scattered tangerines with startled sparkling eyes and an open mouth.
Background is the dark kitchen of a Jeju stone house before dawn, the open refrigerator glowing at the side.

[COMPOSITION]
front-facing close-up, vertical 9:16 framing, the single character inside the safe area, plain uncluttered background
one single uninterrupted frame filling the whole canvas, one camera angle, one moment in time
```

### 장면 4 — `prompts/b4.txt`

```text
[SCENE]
GO LEBANG stands in the kitchen doorway with a kind smile and one blunt hand raised.
Background is the dark kitchen of a Jeju stone house before dawn, the open refrigerator glowing at the side and tangerines scattered on the floor.

[COMPOSITION]
low-angle bust shot, vertical 9:16 framing, the single character inside the safe area, plain uncluttered background
one single uninterrupted frame filling the whole canvas, one camera angle, one moment in time
```

### 장면 5 — `prompts/b5.txt`

```text
[SCENE]
GO LEBANG sits beside BOO RABONG on the tangerine-covered floor holding one tangerine, while BOO RABONG hugs tangerines with eyes fully closed in a happy smile.
Background is the dark kitchen of a Jeju stone house before dawn, the open refrigerator glowing at the side.

[COMPOSITION]
high-angle full shot, vertical 9:16 framing, all 2 characters inside the safe area, plain uncluttered background
one single uninterrupted frame filling the whole canvas, one camera angle, one moment in time
```

## 장면별 이미지 보드

### 장면 1 · 00:00~00:02.5

**이미지 생성 대기** — `storyboard/images/b/scene-01.png` 미생성

- **스토리:** 로우앵글로 냉장고를 크게 보여 "뭔가 벌어질 것 같다"는 긴장을 만든다. 짧게 끊어 다음 컷의 폭발을 준비한다.
- **화면:** 고르방의 집 부엌, 아래에서 올려다본 냉장고
- **캐릭터:** 부라봉 단독. 신난 얼굴, 벌어진 입(갈매기 형태 유지)
- **대사·자막:** "다들 자는 새벽이 제일 꿀맛이다봉~" / 하단 중앙 안전 영역
- **카메라:** 로우앵글 풀샷
- **효과음·음악:** 미지정 — 담당자 확인 필요
- **영상 생성 프롬프트:** `prompts/b1.txt` 기반. 영상 단계에서 "손잡이를 확 잡아당긴다"는 빠른 동작 지시를 추가한다
- **이미지 생성 기록:** 레퍼런스 page-08 · page-09 · page-10, 모델 `nano_banana_flash`, 9:16, 2k. **미실행 (사유: 아래 참조)**

### 장면 2 · 00:02.5~00:05

**이미지 생성 대기** — `storyboard/images/b/scene-02.png` 미생성

- **스토리:** 사고가 터지는 순간. 대사를 빼고 의성어 자막과 효과음만 남겨 타이밍으로 웃긴다.
- **화면:** 화면 위쪽에서 귤이 터지듯 쏟아진다
- **캐릭터:** 두 팔을 번쩍 든 자세
- **대사·자막:** 대사 없음 / 강조 자막 `우르르르르!` 화면 상단 안전 영역
- **카메라:** 정면 풀샷
- **효과음·음악:** 미지정 — 담당자 확인 필요
- **영상 생성 프롬프트:** `prompts/b2.txt` 기반. 영상 단계에서 "귤이 한꺼번에 튀어나온다"는 폭발적 동작 지시를 추가한다
- **이미지 생성 기록:** 레퍼런스 page-08 · page-09 · page-10, 모델 `nano_banana_flash`, 9:16, 2k. **미실행**

### 장면 3 · 00:05~00:07

**이미지 생성 대기** — `storyboard/images/b/scene-03.png` 미생성

- **스토리:** 얼굴만 남기고 파묻힌 결과를 클로즈업으로 확정한다. A안·C안에 없는 표정 중심 컷이다.
- **화면:** 귤 더미 위로 얼굴만 보이는 구도
- **캐릭터:** 놀란 반짝이는 눈(평소보다 살짝 큼, p10), 벌어진 입
- **대사·자막:** "우와앗! 귤 폭포다봉?!" / 하단 중앙 안전 영역
- **카메라:** 정면 클로즈업
- **효과음·음악:** 미지정 — 담당자 확인 필요
- **영상 생성 프롬프트:** `prompts/b3.txt` 기반. 영상 단계에서 "귤 하나가 머리 위에 마지막으로 떨어진다"는 동작 지시를 추가한다
- **이미지 생성 기록:** 레퍼런스 page-08 · page-09 · page-10, 모델 `nano_banana_flash`, 9:16, 2k. **미실행**

### 장면 4 · 00:07~00:10

**이미지 생성 대기** — `storyboard/images/b/scene-04.png` 미생성

- **스토리:** 소리를 듣고 나타난 고르방을 로우앵글로 크게 잡아 "혼날 것 같은" 압박을 만들고, 대사로 그 예상을 뒤집는다. B안의 반전 포인트다.
- **화면:** 부엌 입구, 아래에서 올려다본 상반신
- **캐릭터:** 고르방 단독. 인자한 웃음, 눈썹 끝 둥글게, 뭉툭한 손
- **대사·자막:** "아이고, 이게 무슨 귤르르 사태야~" / 하단 중앙 안전 영역
- **카메라:** 로우앵글 버스트샷
- **효과음·음악:** 정적 — 실제 처리 미지정, 담당자 확인 필요
- **영상 생성 프롬프트:** `prompts/b4.txt` 기반. 영상 단계에서 "고르방이 고개를 천천히 젓는다"는 동작 지시를 추가한다
- **이미지 생성 기록:** 레퍼런스 page-11 · page-12 · page-13, 모델 `nano_banana_flash`, 9:16, 2k. **미실행**
- **비고:** 이 컷은 고르방 단독이므로 단체 페이지(page-03·05·07)를 첨부하지 않는다. 대신 앞뒤 컷의 키 차이는 장면 5에서 확인한다.

### 장면 5 · 00:10~00:15

**이미지 생성 대기** — `storyboard/images/b/scene-05.png` 미생성

- **스토리:** 하이앵글로 귤 바다 전체를 보여주며 사고의 규모를 웃음으로 마무리한다.
- **화면:** 위에서 내려다본 귤 바닥과 두 캐릭터
- **캐릭터:** 고르방은 귤을 집고, 부라봉은 완전히 감은 눈으로 웃는다. 키 순서 고르방 > 부라봉
- **대사·자막:** "사고 아니라 야식이다봉!" / 하단 중앙 안전 영역
- **카메라:** 하이앵글 풀샷
- **효과음·음악:** 미지정 — 담당자 확인 필요
- **영상 생성 프롬프트:** `prompts/b5.txt` 기반. 영상 단계에서 "부라봉이 귤을 하나 고르방에게 건넨다"는 동작 지시를 추가한다
- **이미지 생성 기록:** 레퍼런스 page-03 · page-05 · page-07 · page-08 · page-09 · page-10 · page-11 · page-12 · page-13, 모델 `nano_banana_flash`, 9:16, 2k. **미실행**

## 이미지 미생성 사유

`storyboard-a.md`의 사유와 동일하다. `higgsfield` CLI 실행이 이 세션의 권한 검사에서 승인 대기로 거부됐고, 제작·비용 승인도 아직 `not_requested` 상태다.
프롬프트 조립과 입력 게이트는 5개 장면 전부 통과했다. placeholder 이미지는 넣지 않았다.
