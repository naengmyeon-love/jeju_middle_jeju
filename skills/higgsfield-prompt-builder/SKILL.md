---
name: higgsfield-prompt-builder
description: "퐁당패밀리 캐릭터를 Higgsfield로 이미지·영상 생성할 때, 공식 가이드라인을 구조적으로 강제하는 프롬프트를 조립한다. 공식 페이지 PNG를 레퍼런스로 고정하고, 캐릭터별 잠금 문장과 금지 항목을 정해진 블록 순서로 직렬화하며, 사전 게이트와 생성 후 대조 검수를 수행한다. '힉스필드 프롬프트 짜줘', '이미지 생성 프롬프트 만들어줘', '캐릭터 프롬프트 뽑아줘', '가이드 지켜서 생성해줘' 요청 시 사용한다. storyboard-generator와 video-generator는 생성 프롬프트를 직접 쓰지 말고 이 스킬을 통해 만든다."
---

# 퐁당패밀리 Higgsfield 프롬프트 빌더

## 왜 이 스킬이 필요한가

텍스트 프롬프트만으로는 캐릭터 가이드라인을 지킬 수 없다. 생성 모델은 문장을 참고할 뿐
제약으로 취급하지 않는다. 준수는 문장이 아니라 **구조**로 강제한다.

1. **레퍼런스 고정** — 공식 페이지 PNG를 반드시 첨부한다. 외형의 근거는 텍스트가 아니라 이미지다.
2. **문장 잠금** — 캐릭터 서술은 창작하지 않고 `character-guide.json`의 `lock_en`을 그대로 붙인다.
3. **금지의 명시** — 각 캐릭터의 `forbidden`을 NEGATIVE 블록에 빠짐없이 옮긴다.
4. **게이트** — 조건이 하나라도 어긋나면 호출하지 않는다.
5. **사후 대조** — 생성 결과를 다시 열어 `forbidden`과 1:1로 대조한다.

이 다섯 가지 중 하나라도 빠지면 "가이드를 지켰다"고 보고하지 않는다.

## 데이터 원본

계약 파일은 이 스킬 안에 있다. 먼저 이것을 읽는다.

- `references/image-generation-contract.json` → **이 스킬의 계약.** `image_generation` 블록이 들어 있다
- `../../shared/references/pages/page-NN.png` → 레퍼런스 이미지 실체
- `../../shared/guides/character-guide.json` → 있으면 대조용. 계약 파일과 다르면 계약 파일을 따르고 불일치를 보고한다
- `../../shared/references/WORKFLOW_GUIDE.md` → 있으면 참고

계약 파일은 `character-guide.json`에서 `scripts/sync-prompt-contract.mjs`로 생성된다. 직접 고치지 않는다.

### 계약을 읽지 못하면 중단한다

`references/image-generation-contract.json`을 읽지 못하면 **프롬프트를 만들지 않고 중단한다.**

이때 아래 행동을 하지 않는다. 전부 계약 위반이다.

- 이 문서의 예시 프롬프트를 복사해서 쓰기
- `character-guide` skill의 서술을 요약해 외형 문장을 만들기
- 기억이나 일반적인 캐릭터 스타일로 외형을 채우기

계약이 없으면 만들 수 없는 것이 맞다. "그래도 조립은 가능하다"고 판단하지 않는다.
중단 사유와 없는 파일 경로를 그대로 보고하고 멈춘다.

## 0단계: 조립은 손이 아니라 스크립트로 한다

이 문서가 설명하는 조립 규칙을 **실행하는 주체는 스크립트다.**

```bash
node unsorted/scripts/build-pongdang-prompt.mjs \
  --characters boo-rabong \
  --scene "..." --background "..." --camera "low-angle full shot" --command
```

이 스크립트가 계약을 읽고, 레퍼런스 존재를 확인하고, `lock_en`과 `forbidden_en`을 붙이고,
실행 명령까지 출력한다. 아래 1~4단계는 **스크립트가 무엇을 하는지에 대한 설명**이지
사람이나 에이전트가 손으로 따라 할 절차가 아니다.

손으로 조립한 프롬프트로 캐릭터를 생성하지 않는다. 스크립트가 거부하면 그것이 결론이다.
거부를 우회해 `higgsfield generate create`를 직접 부르는 것은 계약 위반이다.

## 1단계: 입력 수집

장면 하나당 다음을 확정한다. 비어 있으면 담당자에게 묻고, 추측으로 채우지 않는다.

| 항목 | 예 |
|---|---|
| 등장 캐릭터 | 부라봉, 호꼬 |
| 행동 | 부라봉이 호꼬에게 귤을 내민다 |
| 표정 | 부라봉 웃는 눈, 호꼬 기본 |
| 배경 | 고르방의 집 마당 |
| 카메라 | `front-facing medium shot` — 앵글 하나 + 샷 하나 |
| 안 | A / B / C |

### 카메라와 장면은 "한 순간"만 받는다 (스크립트가 강제)

스토리보드의 카메라 칸은 **영상 연출 지시**다. 그대로 옮기면 안 된다.
정지 이미지 모델은 지시 하나당 컷 하나를 그리기 때문이다.

2026-08-11 `nano_banana_flash` 6회 실측에서 상관이 4/4로 정확했다.

| 넘긴 카메라 지시 | 나온 결과 |
|---|---|
| `full shot tracking` → `transitioning to a face close-up` | **2패널** |
| `starting from behind` → `panning` → `cutting back to a close-up` | **3패널** |
| `tracking shot following` + 장면에 "one patch after another" | **부라봉 2마리** |
| `low-angle full shot` | 정상 |

NEGATIVE 블록으로는 막을 수 없다. 이미지 모델에서 **긍정 지시가 부정 지시를 이긴다.**
`no comic panels, no split frames`를 넣고 생성한 결과도 그대로 2패널이 나왔다.
그래서 통제 지점을 네거티브가 아니라 **입력**에 둔다.

- `--camera`는 샷 크기를 **정확히 하나** 포함해야 한다.
  `extreme close-up, establishing shot, medium close-up, close-up, bust shot, medium shot, full shot, wide shot`
- 이동·전환 표현은 거부된다: 트래킹, 패닝, 틸트, 줌, 돌리, 크레인, 핸드헬드, 전환, 컷백, `then`
- `--scene`은 한 순간만 받는다. `then`, `after another`, `moments later` 같은 시간 흐름은 거부된다.
- 두 순간이 모두 필요하면 **장면을 둘로 나눠** 각각 생성한다.

거부 메시지는 걸린 표현을 전부 나열한다. 한 번에 고쳐서 재시도한다.

## 2단계: 레퍼런스 이미지 확정 (필수 게이트)

등장 캐릭터마다 `image_generation.characters.<id>.reference_pages`의 PNG 경로를 만든다.

```text
../../shared/references/pages/page-08.png   # 부라봉 소개
../../shared/references/pages/page-09.png   # 부라봉 턴어라운드
../../shared/references/pages/page-10.png   # 부라봉 사용 규칙
```

- 2인 이상이면 `page-03`, `page-05`, `page-07`을 추가한다.
- 파일이 실제로 존재하는지 확인하고, `view_image`로 열어 눈으로 본다.
- 하나라도 없거나 열리지 않으면 **생성하지 않고** 중단 사유를 기록한다.
- 직전 승인 장면 이미지가 있으면 연속성용으로 함께 첨부한다. 공식 원본과 충돌하면 공식 원본을 따른다.

## 3단계: 프롬프트 조립

블록 순서를 바꾸지 않는다. 각 블록은 한 줄로 이어 쓴다.

```text
[STYLE]
{image_generation.style_lock_en}

[CAST]
{등장 캐릭터마다 characters.<id>.lock_en 을 그대로, 쉼표가 아닌 줄바꿈으로 나열}
{2인 이상이면: height order from tallest to shortest: 고르방 > 양퐁당 > 부라봉 > 구애구 > 냥냥이 > 호꼬}

[SCENE]
{행동, 표정, 배경을 영어로 한 문장씩. 캐릭터 외형은 다시 서술하지 않는다.}

[COMPOSITION]
{카메라 구도}, vertical 9:16 framing, characters inside the safe area, plain uncluttered background

[NEGATIVE]
{global_negative_en 전체}
{등장 캐릭터마다 characters.<id>.forbidden 을 영어로 옮긴 항목 전체}

[OUTPUT]
single still image, no text anywhere in the image
```

### 절대 규칙

- `lock_en`을 요약·의역·번역하지 않는다. 문자 그대로 복사한다.
- 외형 서술을 SCENE 블록에 다시 쓰지 않는다. 중복 서술은 모델이 원본에서 이탈하는 주된 원인이다.
- 색상은 서술형만 쓴다. 공식 HEX가 미확보이므로 **HEX 값을 만들어 넣지 않는다**.
- `allowed_variation`에 없는 표정·자세·의상이 필요하면 생성 전에 담당자에게 확인한다.
- 영상 컷에서 배경·조명 문장은 **직전 컷과 동일한 문자열**을 쓴다. 같은 장소인데 문장을 다시 쓰면 컷마다 톤이 흔들린다. 배경이 실제로 바뀌는 컷에서만 새 문장을 쓰고 그때부터 다시 고정한다.
- 영상 컷 프롬프트의 SCENE 블록 마지막에 **끝 포즈 지시**를 한 문장 넣는다. 스토리보드 `끝 포즈` 칸을 그대로 옮긴다. 예: `The cut ends with BOO RABONG standing still, facing front, eyes open.` 이 프레임이 다음 컷의 시작 이미지가 되므로 중간 동작으로 끝내지 않는다.

### 예시 — 부라봉과 호꼬 2인 컷

> 아래는 **조립 결과가 어떻게 생겼는지 보여주는 예시일 뿐**이다.
> 여기서 문자열을 가져다 쓰지 않는다. 값은 매번 계약 파일에서 읽는다.
> 계약을 읽지 못해 이 예시를 참고하고 싶어졌다면, 그것이 중단해야 한다는 신호다.

```text
[STYLE]
flat 2D Korean kawaii mascot illustration, thick uniform dark-brown outline, flat fill colours with no gradient shading, simple rounded shapes, plain background, official character-sheet style

[CAST]
BOO RABONG: orange Hallabong citrus character, round citrus head fused with the body, one green leaf sprig on top of the head, two large round orange blush cheeks, base eyes are perfect circles, upper lip is an upside-down seagull curve (three-stroke shape), small pale-yellow tongue, white diaper-like lower garment, short stubby limbs, about 1.5 head-to-body proportion, front view wider than side view, small gap between eyes and mouth
HOKKO: small white baby deer fawn, long soft drooping ears, round pink blush cheeks, small pink spots on the forehead, NO visible mouth in the normal state, a slight rounded bump where antlers would grow but antlers are not drawn, tiny short tail, the smallest character of the cast
height order: BOO RABONG is clearly taller than HOKKO

[SCENE]
BOO RABONG holds out a tangerine toward HOKKO with smiling closed eyes.
HOKKO sits on all fours and looks up.
Background is the yard of a Jeju stone house in daytime.

[COMPOSITION]
front-facing medium shot, vertical 9:16 framing, characters inside the safe area, plain uncluttered background

[NEGATIVE]
no text, no letters, no captions, no speech bubbles, no watermark, no logo
no additional or invented characters outside the official six
no realistic rendering, no 3D render, no photographic style
no anatomy or proportion changes, no restyling, no redesign
no mirrored/flipped character markings
no price, sale or promotional copy
no third-party IP or trademarks
no vertical or slit eyes on BOO RABONG
no pointed centre on BOO RABONG's mouth
no change to BOO RABONG's 1.5 head-to-body proportion
no antlers drawn on HOKKO
no visible mouth on HOKKO outside eating
no spoken dialogue for HOKKO
no long bipedal standing pose for HOKKO

[OUTPUT]
single still image, no text anywhere in the image
```

## 4단계: 호출

모델은 레퍼런스 구동 캐릭터 모델을 쓴다. 실사 얼굴용 Soul ID는 **사용하지 않는다.**

```bash
higgsfield generate create nano_banana_2 \
  --prompt "$(cat prompt.txt)" \
  --image ../../shared/references/pages/page-08.png \
  --image ../../shared/references/pages/page-09.png \
  --image ../../shared/references/pages/page-10.png \
  --image ../../shared/references/pages/page-20.png \
  --image ../../shared/references/pages/page-21.png \
  --image ../../shared/references/pages/page-22.png \
  --aspect_ratio 9:16 \
  --wait
```

- 어려운 컷(3인 이상, 복잡한 자세)은 `nano_banana_pro`로 올린다.
- 장면 하나당 호출 하나다. 여러 장면이나 여러 안을 한 호출로 묶지 않는다.
- `higgsfield` CLI가 없거나 인증이 만료되면 호출하지 말고 연결 필요 상태로 기록한다.
- 유료 호출은 `approval-logger`의 제작·비용 승인 이후에만 한다.

### 영상 컷 호출 (video-generator 전용)

영상은 컷마다 **start image를 반드시 붙인다.** 텍스트만으로 컷을 시작하지 않는다.

| 컷 | start image |
|---|---|
| 컷 1 | 승인된 공식 레퍼런스 기반 고정 시작 이미지 |
| 컷 N (N≥2) | 직전 컷의 실제 마지막 프레임 `project-output/video/frames/scene-{NN}-last.png` |

start frame을 받는 모델만 쓴다.

| 모델 | 지원 |
|---|---|
| `kling3_0` | `start_image` + `end_image` (양쪽 고정이 필요한 컷) |
| `seedance_2_0` | `start_image` — 모션이 큰 컷 |
| `grok_video_v15` | `start_image` 하나만, 2~15초 |

```bash
npm run higgsfield:video -- kling3_0 \
  --prompt "$(cat prompt.txt)" \
  --start-image project-output/video/frames/scene-01-last.png \
  --aspect_ratio 9:16
```

마지막 프레임 추출은 손으로 하지 않는다. `node unsorted/scripts/extract-last-frame.mjs --clip ...`를 쓴다.
프레임 파일이 없거나 열리지 않으면 그 컷을 생성하지 않는다.

Extender로 앞 클립을 이어 늘리는 것은 기본 경로가 아니다. 스토리보드 `연결` 칸에
사유와 함께 `extender`로 표시된 컷에만 쓴다.

## 5단계: 사전 게이트

`image_generation.preflight_gate`를 그대로 체크리스트로 쓴다. 하나라도 미충족이면 호출하지 않는다.

- [ ] 등장 캐릭터별 소개·턴어라운드·사용 규칙 페이지를 실제로 확인했는가
- [ ] 레퍼런스 이미지 경로가 모두 존재하는가
- [ ] `lock_en` 문자열을 변형 없이 그대로 사용했는가
- [ ] `forbidden` 항목이 NEGATIVE 블록에 모두 들어갔는가
- [ ] 단체 컷이면 키 순서와 `page-07`을 첨부했는가
- [ ] 미확보 항목(HEX·로고·배경 목록)을 임의로 채우지 않았는가
- [ ] 유료 호출이면 제작·비용 승인이 기록되어 있는가
- [ ] 영상 컷 N≥2이면 직전 컷의 마지막 프레임 파일이 실제로 존재하고, `view_image`로 열어 모션 블러·눈 감김·중간 동작이 없음을 확인했는가
- [ ] 영상 컷의 배경·조명 문장이 직전 컷과 동일한 문자열인가 (배경이 바뀌는 컷은 예외)
- [ ] 영상 컷 프롬프트에 끝 포즈 지시가 들어갔는가

## 6단계: 생성 후 대조 검수

결과 이미지를 `view_image`로 열고, 등장 캐릭터의 `forbidden` 항목을 **하나씩** 대조한다.
기억이 아니라 해당 캐릭터의 사용 규칙 페이지를 나란히 놓고 본다.

| 캐릭터 | 최우선 확인 |
|---|---|
| 부라봉 | 눈이 정원인가, 세로눈이 아닌가, 입 가운데가 뾰족하지 않은가, 1.5등신인가 |
| 고르방 | 옆모습 모자가 뒤로 기울었는가, 손끝·발끝이 뭉툭한가, 눈썹 끝이 둥근가 |
| 양퐁당 | 동백이 우측인가, 수경이 앞으로 기울었는가, 좌우 반전이 아닌가 |
| 냥냥이 | 눈 반점이 좌측인가, 꼬리 무늬가 약 1/5인가 |
| 호꼬 | 뿔이 그려지지 않았는가, 평상시 입이 없는가 |
| 구애구 | 머리에서 등까지 무늬가 이어지는가, 얼굴·신체 비율이 그대로인가 |
| 단체 | 키 순서가 `page-07`과 일치하는가 |

위반이 있으면 **한 번에 한 가지 수정사항만** 지시해 해당 이미지만 재생성한다.
여러 항목을 한꺼번에 고치라고 하면 다른 항목이 깨진다.

재생성 상한에 도달했는데도 위반이 남으면 그 장면을 `가이드 위반 — 담당자 확인 필요`로 표시하고
승인 요청에 포함하지 않는다.

## 기록

`project-output/metadata/production-log.json`에 장면별로 남긴다.

- 사용한 레퍼런스 페이지 번호
- 사용한 모델명과 프롬프트 전문
- 사전 게이트 통과 여부
- 사후 대조 결과와 재생성 횟수
- 미해결 위반 항목

## 중단 조건

- `references/image-generation-contract.json`을 읽지 못함 (예시나 기억으로 대체하지 않는다)
- 레퍼런스 페이지 PNG 누락 또는 열람 실패
- `lock_en`에 없는 외형을 요구하는 지시
- `allowed_variation` 밖의 표정·자세·의상 요구
- 공식 HEX·로고·배경 목록을 지정하라는 요구 (미확보 항목)
- 제작·비용 승인 없이 유료 호출 요구
- 영상 컷 N≥2인데 직전 컷의 마지막 프레임이 없거나 열리지 않음 (공식 레퍼런스로 대체해 이어붙이지 않는다)
