# 스토리보드 C안 — 감성형 / 세계관 확장형

## 연출 방향

- 연출 콘셉트: 캐릭터 관계와 퐁당패밀리 세계관을 강조한 연출
- 목표 감정: 따뜻함, 공감, 세계관 몰입
- 총 길이: 15초
- 장면 수: 3장면 (컷을 줄이고 각 컷을 길게 가져간다)
- 타이밍: 여백을 살린 느린 페이스 (6초 · 4초 · 5초)
- 카메라 기조: 환경 샷과 와이드 샷. 캐릭터를 작게 두고 고르방의 집이라는 공간을 함께 보여준다
- 전환 기조: 부드러운 디졸브, 같은 공간을 유지하는 환경 연속성

| 장면 | 시간 | 화면 구성 | 캐릭터 행동·표정 | 대사·자막 | 카메라 | 효과음·음악 | 생성 프롬프트 |
|---|---:|---|---|---|---|---|---|
| 1 | 0~6초 | 새벽 부엌 전체가 보이는 환경 샷. 부라봉은 화면 안에서 작게 걸어간다 | 조용히 냉장고 쪽으로 걸어간다. 작게 신난 미소 | `"다들 자는 새벽이 제일 꿀맛이다봉~"` / 하단 중앙 자막 | 설정 샷(establishing shot) | 새벽의 정적, 시계 소리(미지정) / 잔잔한 BGM | `prompts/c1.txt` |
| 2 | 6~10초 | 열린 냉장고 불빛이 어두운 부엌 전체를 물들인다. 귤이 부라봉 주변으로 쏟아진다 | 두 팔을 벌린 채 멈춰 선다. 반짝이는 눈 | `"우와앗! 귤 폭포다봉?!"` / 하단 중앙 자막 | 정면 와이드샷 | 귤 쏟아지는 소리(미지정) / BGM 조금 밝게 | `prompts/c2.txt` |
| 3 | 10~15초 | 위에서 내려다본 부엌 전체. 귤이 흩어진 바닥에 두 캐릭터가 나란히 앉아 있다. 창밖 하늘이 옅게 밝아온다 | 둘 다 조용히 웃으며 귤을 먹는다 | `"아이고, 이게 무슨 귤르르 사태야~"` → `"사고 아니라 야식이다봉!"` / 하단 중앙 자막 | 하이앵글 와이드샷 (키 순서 고르방 > 부라봉) | 귤 까는 소리, 새벽 새소리(미지정) / 감성 BGM | `prompts/c3.txt` |

## 장면 이미지 생성 프롬프트

프롬프트는 전부 `unsorted/scripts/build-pongdang-prompt.mjs` 조립기가 만들었고 정지 이미지 입력 게이트를 통과했다.
장면 3의 초안 `--scene`에 쓴 `side by side` 표현은 조립기가 분할 레이아웃으로 판정해 거부했다. 우회하지 않고 `sits beside` 로 다시 써서 통과시켰다.
아래에는 장면마다 달라지는 `[SCENE]`과 `[COMPOSITION]`만 적는다. 전문과 실행 명령은 각 `prompts/*.txt`에 있다.

### 장면 1 — `prompts/c1.txt`

```text
[SCENE]
BOO RABONG walks quietly toward the closed refrigerator across the empty kitchen with a small excited smile.
Background is the dark kitchen of a Jeju stone house before dawn, faint dark sky through the window.

[COMPOSITION]
establishing shot, vertical 9:16 framing, the single character inside the safe area, plain uncluttered background
one single uninterrupted frame filling the whole canvas, one camera angle, one moment in time
```

### 장면 2 — `prompts/c2.txt`

```text
[SCENE]
tangerines pour out of the open refrigerator around BOO RABONG who stands still with both short arms spread and sparkling eyes.
Background is the dark kitchen of a Jeju stone house before dawn, lit by the glow from inside the open refrigerator.

[COMPOSITION]
front-facing wide shot, vertical 9:16 framing, the single character inside the safe area, plain uncluttered background
one single uninterrupted frame filling the whole canvas, one camera angle, one moment in time
```

### 장면 3 — `prompts/c3.txt`

```text
[SCENE]
GO LEBANG sits beside BOO RABONG among scattered tangerines on the kitchen floor, both smiling calmly.
Background is the dark kitchen of a Jeju stone house before dawn, the open refrigerator glowing at the side and the sky through the window turning faintly blue.

[COMPOSITION]
high-angle wide shot, vertical 9:16 framing, all 2 characters inside the safe area, plain uncluttered background
one single uninterrupted frame filling the whole canvas, one camera angle, one moment in time
```

## 장면별 이미지 보드

### 장면 1 · 00:00~00:06

**이미지 생성 대기** — `storyboard/images/c/scene-01.png` 미생성

- **스토리:** 사건보다 공간을 먼저 보여준다. 모두 잠든 고르방의 집이라는 무대를 6초 동안 충분히 깔아, 뒤의 사고가 "이 집의 일상"으로 읽히게 한다.
- **화면:** 고르방의 집 부엌 전체, 창밖은 아직 어두운 새벽
- **캐릭터:** 부라봉 단독. 화면 안에서 작게, 조용히 걸어간다
- **대사·자막:** "다들 자는 새벽이 제일 꿀맛이다봉~" / 하단 중앙 안전 영역
- **카메라:** 설정 샷 (영상에서는 아주 느린 접근 가능)
- **효과음·음악:** 미지정 — 담당자 확인 필요
- **영상 생성 프롬프트:** `prompts/c1.txt` 기반. 영상 단계에서 "부라봉이 발끝으로 조용히 걸어간다"는 느린 동작 지시를 추가한다
- **이미지 생성 기록:** 레퍼런스 page-08 · page-09 · page-10, 모델 `nano_banana_flash`, 9:16, 2k. **미실행 (사유: 아래 참조)**

### 장면 2 · 00:06~00:10

**이미지 생성 대기** — `storyboard/images/c/scene-02.png` 미생성

- **스토리:** 어두웠던 공간이 냉장고 불빛으로 한 번에 물든다. 사고를 놀람이 아니라 빛의 변화로 보여주는 것이 C안의 차별점이다.
- **화면:** 열린 냉장고 불빛이 부엌 전체에 퍼진다
- **캐릭터:** 두 팔을 벌린 채 멈춰 선 부라봉, 반짝이는 눈
- **대사·자막:** "우와앗! 귤 폭포다봉?!" / 하단 중앙 안전 영역
- **카메라:** 정면 와이드샷
- **효과음·음악:** 미지정 — 담당자 확인 필요
- **영상 생성 프롬프트:** `prompts/c2.txt` 기반. 영상 단계에서 "귤이 천천히 굴러 화면 밖으로 퍼진다"는 느린 동작 지시를 추가한다
- **이미지 생성 기록:** 레퍼런스 page-08 · page-09 · page-10, 모델 `nano_banana_flash`, 9:16, 2k. **미실행**

### 장면 3 · 00:10~00:15

**이미지 생성 대기** — `storyboard/images/c/scene-03.png` 미생성

- **스토리:** 고르방이 등장하는 순간과 함께 앉는 순간을 한 컷으로 합쳐 여운을 길게 가져간다. 창밖 하늘이 밝아오며 "새벽이 지나간다"는 시간 감각을 남긴다. page-05의 긍정 관계를 화면 그 자체로 보여주는 장면이다.
- **화면:** 위에서 내려다본 부엌 전체, 귤이 흩어진 바닥, 옅게 밝아오는 창
- **캐릭터:** 고르방과 부라봉이 나란히 앉아 조용히 웃는다. 키 순서 고르방 > 부라봉
- **대사·자막:** "아이고, 이게 무슨 귤르르 사태야~" → "사고 아니라 야식이다봉!" / 하단 중앙 안전 영역, 두 줄을 순차 노출
- **카메라:** 하이앵글 와이드샷
- **효과음·음악:** 미지정 — 담당자 확인 필요
- **영상 생성 프롬프트:** `prompts/c3.txt` 기반. 영상 단계에서 "고르방이 부라봉에게 귤을 하나 까서 건넨다"는 느린 동작 지시를 추가한다
- **이미지 생성 기록:** 레퍼런스 page-03 · page-05 · page-07 · page-08 · page-09 · page-10 · page-11 · page-12 · page-13, 모델 `nano_banana_flash`, 9:16, 2k. **미실행**

## 세계관 확장 범위 점검

- 확장한 것: 새벽이라는 시간대, 고르방의 집 부엌이라는 실내 공간, 새벽이 밝아오는 창밖.
- 확장하지 않은 것: 부라봉의 기억상실 이전 과거, 두 캐릭터의 혈연·연애 관계, 공식 6인 외 인물, 할머니의 귤밭.
- page-05 관계 극성을 그대로 유지했다. 부정 관계를 훈훈하게 바꾼 부분이 없다 (등장 2인은 원래 긍정 관계다).

## 이미지 미생성 사유

`storyboard-a.md`의 사유와 동일하다. `higgsfield` CLI 실행이 이 세션의 권한 검사에서 승인 대기로 거부됐고, 제작·비용 승인도 아직 `not_requested` 상태다.
프롬프트 조립과 입력 게이트는 3개 장면 전부 통과했다. placeholder 이미지는 넣지 않았다.
