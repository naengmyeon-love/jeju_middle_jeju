# 스토리보드 C안 — 감성형 / 세계관 확장형

## 연출 방향

- 연출 콘셉트: 고르방의 집이라는 무대와 한밤중의 공기를 살린 연출
- 목표 감정: 따뜻함, 세계관 몰입, 잔잔한 웃음
- 총 길이: 15초
- 장면 수: 3장면
- 타이밍: 여백을 살린 느린 페이스 (6초 · 5초 · 4초). 오프닝을 길게 두어 집의 정적을 먼저 보여준다
- 카메라 기조: 전 장면 와이드. 인물보다 공간을 먼저 읽히게 한다
- 전환 기조: 부드러운 디졸브, 조명 변화로 연결 (어둠 → 냉장고 빛 → 잔광)

> 세계관 확장 범위 — 이번 편은 부라봉 단독이며 다른 공식 캐릭터를 등장시키지 않는다.
> "가족이 잠든 집"은 page-03 기본 세계관에 이미 있는 설정이므로 새 설정을 만들지 않았다.
> 부라봉의 기억상실 이전 과거를 암시하는 연출도 넣지 않았다.

| 장면 | 시간 | 화면 구성 | 캐릭터 행동·표정 | 대사·자막 | 카메라 | 효과음·음악 | 생성 프롬프트 |
|---|---:|---|---|---|---|---|---|
| 1 | 0~6초 | 넓고 어두운 부엌 전경. 창으로 든 푸른 달빛. 냉장고 앞에 작게 선 부라봉 | 짧은 팔 하나를 손잡이 쪽으로 올린다. 조용한 기대 | `"쿨쿨 시간에 몰래 먹는 게 제일 맛있다봉~"` / 하단 자막 | 와이드샷 | 미지정(담당자 확인) / 잔잔한 BGM | `prompts/c1.txt` |
| 2 | 6~11초 | 열린 냉장고의 따뜻한 빛이 어두운 부엌을 채운다. 귤이 바닥으로 퍼진다 | 눈을 크게 뜨고 쏟아지는 귤을 바라본다 | `"우와아앗, 귤 폭포다봉?!"` / 하단 자막 | 로우앵글 와이드샷 | 미지정(담당자 확인) / BGM 고조 | `prompts/c2.txt` |
| 3 | 11~15초 | 부엌 바닥 전체에 흩어진 귤. 그 한가운데 앉은 부라봉 | 눈을 감고 조용히 웃는다 | `"이건 사고가 아니라 행운이다봉~"` / 하단 자막 | 하이앵글 와이드샷 | 미지정(담당자 확인) / BGM 여운 | `prompts/c3.txt` |

## 장면 이미지 생성 프롬프트

프롬프트는 `unsorted/scripts/build-pongdang-prompt.mjs` 조립기가 만들었고 정지 이미지 입력 게이트를 통과했다.
`[STYLE]` · `[CAST]` · `[NEGATIVE]` · `[OUTPUT]` 블록은 계약 파일에서 그대로 나오므로 A·B·C안 9장면 모두 동일하다.
아래에는 달라지는 `[SCENE]`과 `[COMPOSITION]`만 적는다. 전문과 실행 명령은 각 `prompts/*.txt`에 있다.

### 장면 1 — `prompts/c1.txt`

```text
[SCENE]
BOO RABONG is a small figure standing alone at the closed refrigerator in a quiet sleeping house, one short arm raised toward the handle.
Background is the wide dark kitchen of a Jeju stone house at midnight with cool blue moonlight through the window.

[COMPOSITION]
wide shot, vertical 9:16 framing, the single character inside the safe area, plain uncluttered background
one single uninterrupted frame filling the whole canvas, one camera angle, one moment in time
```

### 장면 2 — `prompts/c2.txt`

```text
[SCENE]
Warm light from the open refrigerator floods the dark kitchen while tangerines spill across the floor around BOO RABONG, whose eyes are wide with wonder.
Background is the wide dark kitchen of a Jeju stone house at midnight.

[COMPOSITION]
low-angle wide shot, vertical 9:16 framing, the single character inside the safe area, plain uncluttered background
one single uninterrupted frame filling the whole canvas, one camera angle, one moment in time
```

### 장면 3 — `prompts/c3.txt`

```text
[SCENE]
BOO RABONG sits quietly at the centre of tangerines scattered across the whole kitchen floor with eyes fully closed in a gentle smile.
Background is the wide kitchen of a Jeju stone house at midnight, the open refrigerator casting a soft warm glow.

[COMPOSITION]
high-angle wide shot, vertical 9:16 framing, the single character inside the safe area, plain uncluttered background
one single uninterrupted frame filling the whole canvas, one camera angle, one moment in time
```

## 장면별 이미지 보드

### 장면 1 · 00:00~00:06

**이미지 생성 대기** — `storyboard/images/c/scene-01.png` 미생성

- **스토리:** 가족이 모두 잠든 고르방의 집을 먼저 보여주고, 그 정적 속 작은 부라봉으로 시선을 옮긴다. 6초의 여백이 뒤에 올 소동과 대비를 만든다.
- **화면:** 넓은 부엌 전경, 창으로 든 차가운 푸른 달빛
- **캐릭터:** 냉장고 앞에 작게 선 부라봉. 팔 하나를 손잡이 쪽으로 올린 조용한 기대
- **대사·자막:** "쿨쿨 시간에 몰래 먹는 게 제일 맛있다봉~" / 하단 중앙 안전 영역
- **카메라:** 와이드샷
- **효과음·음악:** 미지정 — 담당자 확인 필요
- **영상 생성 프롬프트:** `prompts/c1.txt` 기반, 영상 단계에서 "부라봉이 아주 천천히 손을 올린다"는 동작 지시를 추가한다
- **이미지 생성 기록:** 레퍼런스 page-08 · page-09 · page-10, 모델 `nano_banana_flash`, 9:16, 2k. **미실행 (사유: 아래 참조)**
- **담당자 확인 필요:** 부엌의 창·가구 등 구체적 인테리어는 공식 배경 설정집이 미확보 상태라 최소한으로만 지시했다.

### 장면 2 · 00:06~00:11

**이미지 생성 대기** — `storyboard/images/c/scene-02.png` 미생성

- **스토리:** 냉장고 빛이 어둠을 밀어내는 순간을 조명 변화로 보여준다. 사고를 소란이 아니라 장면 전환의 계기로 쓴다.
- **화면:** 따뜻한 냉장고 빛이 채운 어두운 부엌, 바닥으로 퍼지는 귤
- **캐릭터:** 눈을 크게 뜨고 바라보는 부라봉 (p10 허용 범위 내 반짝이는 눈)
- **대사·자막:** "우와아앗, 귤 폭포다봉?!" / 하단 중앙 안전 영역
- **카메라:** 로우앵글 와이드샷
- **효과음·음악:** 미지정 — 담당자 확인 필요
- **영상 생성 프롬프트:** `prompts/c2.txt` 기반, 영상 단계에서 "귤이 바닥으로 천천히 퍼져 나간다"는 동작 지시를 추가한다
- **이미지 생성 기록:** 레퍼런스 page-08 · page-09 · page-10, 모델 `nano_banana_flash`, 9:16, 2k. **미실행**

### 장면 3 · 00:11~00:15

**이미지 생성 대기** — `storyboard/images/c/scene-03.png` 미생성

- **스토리:** 어질러진 부엌 전체를 한 프레임에 담아 소동의 결과를 보여주고, 그 한가운데서 만족한 부라봉으로 마무리한다.
- **화면:** 귤이 흩어진 부엌 바닥 전경, 냉장고의 부드러운 잔광
- **캐릭터:** 귤 한가운데 앉아 눈을 감고 조용히 웃는다
- **대사·자막:** "이건 사고가 아니라 행운이다봉~" / 하단 중앙 안전 영역
- **카메라:** 하이앵글 와이드샷
- **효과음·음악:** 미지정 — 담당자 확인 필요
- **영상 생성 프롬프트:** `prompts/c3.txt` 기반, 영상 단계에서 "귤 하나가 굴러와 부라봉 옆에 멈춘다"는 동작 지시를 추가한다
- **이미지 생성 기록:** 레퍼런스 page-08 · page-09 · page-10, 모델 `nano_banana_flash`, 9:16, 2k. **미실행**

## 이미지 미생성 사유

이번 세션에서 `higgsfield` CLI 실행이 권한 승인 대기 상태로 거부되어 호출 자체가 불가능했다.
프롬프트 조립과 사전 게이트는 모두 통과했으므로, 실행 권한이 열리면 `prompts/*.txt` 안의 명령을 그대로 실행하면 된다.
임의 placeholder 이미지는 넣지 않았다. 상세는 `metadata/production-log.json`의 `errors` 항목에 기록했다.

## 3안 차별화 검증

| 항목 | A안 | B안 | C안 |
|---|---|---|---|
| 카메라 | 정면 미디엄 → 정면 풀 → 정면 미디엄 | 로우앵글 풀 → 정면 클로즈업 → 하이앵글 풀 | 와이드 → 로우앵글 와이드 → 하이앵글 와이드 |
| 시간 배분 | 5 / 5 / 5 | 4 / 3 / 8 | 6 / 5 / 4 |
| 전환 | 연속 동작·부드러운 컷 | 점프컷 + 0.5초 프리즈 | 디졸브 + 조명 변화 |
| 자막 | 대사 자막만 | 대사 자막 + 강조 자막 3개 | 대사 자막만, 느린 노출 |
| 목표 감정 | 이해 용이 | 웃음·반전 | 몰입·여운 |
| 화면 주체 | 캐릭터와 행동 | 표정 | 공간과 빛 |

- [x] A·B·C안의 카메라 구도가 서로 다른가 — 앵글·샷 크기 9개 조합이 모두 다르다
- [x] 장면 구성(시간 배분, 전환 방식)이 다른가 — 5/5/5, 4/3/8, 6/5/4
- [x] 연출 의도가 명확히 구분되는가
- [x] 효과음·BGM 방향이 각 콘셉트에 부합하는가 — 단, 오디오 사용 여부 자체가 미확정이라 방향만 기재했다
- [x] 생성 프롬프트가 각 연출 방향에 맞게 다른가 — `[SCENE]`·`[COMPOSITION]`이 9개 모두 다르다
- [ ] 장면 이미지의 구도·표정·배경 연출이 각 안에 맞게 실제로 다른가 — **확인 불가.** 이미지가 아직 생성되지 않았다
- [x] 단순 문장 치환이 아닌가 — 시간 배분·앵글·화면 주체가 구조적으로 다르다
