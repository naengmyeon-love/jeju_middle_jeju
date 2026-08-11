# 스토리보드 C안 — 감성형 / 세계관 확장형

> **일러두기 (담당자 확인 전 임시안)**
> planning/scenario.md에서 "담당자 확인 필요"로 표시된 항목(대사, 자막, 배경음악, 효과음, 비자림 구체 촬영 구역)은 이 문서에서도 임시안을 그대로 유지한다. 확정 전까지 촬영·생성에 참고용으로만 사용한다.
>
> **세계관 확장 경고 유지:** 비자림은 공식 배경 목록(고르방의 집, 할머니의 귤밭)에 없는 확장 배경이다. 이 안에서도 비자림을 공식 배경으로 임의 편입하지 않고 "담당자 확인 필요" 상태를 그대로 유지한 채 연출한다. §5.4 관계 금지 항목은 부라봉 단독 등장이라 해당 사항 없음.

## 연출 방향

- 연출 콘셉트: 캐릭터와 제주 자연 세계관의 분위기를 강조하는 연출. 와이드·환경 샷으로 부라봉을 숲의 압도적 크기 속 작은 존재로 담아, 여백과 호흡을 살린다.
- 목표 감정: 따뜻함, 공감, 세계관 몰입
- 총 길이: 15초
- 장면 수: 3장면 (scenario.md의 3장면 구성을 그대로 따르되, 각 장면의 호흡을 느리게 늘여 여백을 확보)

## 연출 요약표

| 장면 | 시간 | 화면 구성 | 캐릭터 행동·표정 | 대사·자막 | 카메라(영상 연출) | 효과음·음악 | 생성 프롬프트(영상용, 참고 초안) |
|---|---:|---|---|---|---|---|---|
| 1 | 00:00~00:05 | 비자림 숲길 입구, 캐노피 사이로 햇살이 비치는 넓은 산책로 전경. 부라봉은 화면 속 작은 존재로 등장 | 지친 걸음으로 홀로 걷는 부라봉, 처진 눈과 늘어진 이파리 | `"더워서 축 늘어지겠다봉..."` / 상단 안전 영역, "무더위 속, 그늘을 찾아서" (감성적 세리프 폰트) | 슬로우 팬으로 숲 전경을 천천히 훑다가 부라봉에게 서서히 다가가는 느린 줌 | 매미 소리는 은은하게, 나뭇잎 스치는 바람 소리, 감성적인 잔잔한 BGM | Wide slow pan across a sunlit forest canopy revealing tiny BOO RABONG walking tired along the trail, slow push toward the character; flat 2D kawaii mascot style, gentle warm light |
| 2 | 00:05~00:10 | 안개 낀 듯 은은한 숲길, 저 멀리 거대한 비자나무가 다른 나무들 사이로 웅장하게 서 있는 전경 | 서늘함에 마음이 놓인 부라봉이 걸음을 멈추고 조용히 먼 나무를 바라본다. 눈이 커지며 경이로운 표정 | `"오예~ 시원해서 신난다봉!"` → `"어? 저게 뭐다봉?"` / 하단 안전 영역, "저 멀리, 심상치 않은 무언가가..." (감성적 세리프 폰트) | 슬로우 줌으로 나무를 향해 서서히 다가가며, 부라봉과 거대한 나무를 한 프레임에 담는 관계 시각화 | 숲속 새소리, 바람에 흔들리는 나뭇잎 소리, 잔잔한 BGM에 현악 레이어 추가 | BOO RABONG stands still gazing at a distant colossal tree in misty forest light, slow zoom emphasizing the scale between the tiny character and the ancient tree; flat 2D kawaii mascot style |
| 3 | 00:10~00:15 | 거대한 비자나무의 밑동, 이끼 낀 뿌리와 따뜻한 빛이 스며드는 지점. 나무와 부라봉의 관계를 담은 클로즈업 | 나무를 올려다보며 두 눈에 경이로움이 가득 차고, 입이 살짝 벌어진 채 잔잔한 감동의 표정으로 멈춘다 | `"이게... 나무다봉...?!"` (여운을 남기며 잦아드는 톤) / 하단 안전 영역, "그대로 얼음!" (감성적 세리프 폰트, 은은하게 페이드) | 로우앵글 슬로우 틸트업으로 나무의 웅장함을 보여준 뒤, 부라봉의 경이로운 표정으로 느리게 디졸브, 여백을 살린 정지 | 웅장하지만 잔잔한 숲 앰비언스, 감성적인 BGM이 서서히 고조되었다 여운으로 잦아듦 | BOO RABONG gazes up at a colossal ancient tree in warm dappled light, slow low-angle tilt up to the canopy then a gentle dissolve to the character's awed face, lingering still finish; flat 2D kawaii mascot style |

> "생성 프롬프트(영상용)" 칸은 슬로우 팬·줌·디졸브 등 **영상 연출 지시**가 포함된 초안이다. 정지 이미지 생성에는 이 문구를 쓰지 않았다. 실제 영상 생성 시 `video-generator` 단계에서 `higgsfield-prompt-builder`로 다시 조립해야 한다.

## 장면별 이미지 보드

### 장면 1 · 00:00~00:05

**이미지 생성 대기 — 아래 "이미지 생성 기록" 참고**

- **스토리:** 감성형 오프닝은 부라봉 한 명이 아니라 숲 전체의 분위기로 문을 연다. 넓은 캐노피와 산책로 속에서 부라봉을 작게 배치해, 제주 자연 세계관의 스케일을 먼저 보여준다.
- **화면:** 비자림 숲길 입구, 캐노피 사이로 햇살이 비치는 넓은 산책로 전경(구체 촬영 구역은 담당자 확인 필요).
- **캐릭터:** 지친 걸음으로 홀로 걷는 부라봉. 처진 눈, 늘어진 이파리.
- **대사·자막:** "더워서 축 늘어지겠다봉..." / 상단 안전 영역, "무더위 속, 그늘을 찾아서" (감성적 세리프 폰트)
- **정지 이미지 순간(선택 근거):** 걷는 동작 중 한 정지 순간만 골랐고, 배경 비중을 넓혀 환경 샷의 분위기를 살렸다.
- **카메라(정지 이미지용):** `wide establishing shot`
- **효과음·음악:** 은은한 매미 소리, 나뭇잎 스치는 바람 소리, 잔잔한 감성 BGM
- **영상 생성 프롬프트(참고 초안):** 위 요약표 1행 참고.
- **이미지 생성 기록:**
  - 레퍼런스: `shared/references/pages/page-08.png`, `page-09.png`, `page-10.png` — `view_image`로 확인 완료.
  - 조립 도구: `node unsorted/scripts/build-pongdang-prompt.mjs`.
  - 정지 이미지 입력 게이트: 통과 (샷 1개 `establishing shot`).
  - 조립된 프롬프트 [SCENE] 블록: `BOO RABONG walks alone along a quiet forest trail, small in the frame, tired drooping eyes beneath dappled sunlight filtering through the canopy. Background is a wide sunlit forest trail lined with tall trees, dappled light filtering through leaves.`
  - 실행 명령: `higgsfield generate create nano_banana_flash --prompt '...' --image 'shared/references/pages/page-08.png' --image 'shared/references/pages/page-09.png' --image 'shared/references/pages/page-10.png' --aspect_ratio 9:16 --resolution 2k --wait`
  - **생성 미실행 사유:** `metadata/production-log.json`의 `approvals.production.status`가 `not_requested`(제작·비용 승인 미기록)이며, 이번 세션에서 `higgsfield` CLI 직접 호출이 권한 정책상 차단됨(`This command requires approval`). 프롬프트 조립은 완료. 재생성 가능 여부: 가능 — 승인 및 CLI 실행 권한 확보 후 위 명령 실행.

### 장면 2 · 00:05~00:10

**이미지 생성 대기 — 아래 "이미지 생성 기록" 참고**

- **스토리:** 서늘함에 마음이 놓인 부라봉이 걸음을 멈추고 저 멀리 거대한 나무를 조용히 바라본다. 캐릭터와 세계관(거대한 자연)의 관계를 시각적으로 보여주는 장면.
- **화면:** 안개 낀 듯 은은한 숲길, 저 멀리 거대한 비자나무가 다른 나무들 사이로 웅장하게 서 있는 전경.
- **캐릭터:** 걸음을 멈추고 조용히 먼 나무를 바라보는 부라봉. 눈이 커지며 경이로운 표정.
- **대사·자막:** "오예~ 시원해서 신난다봉!" → "어? 저게 뭐다봉?" / 하단 안전 영역, "저 멀리, 심상치 않은 무언가가..." (감성적 세리프 폰트)
- **정지 이미지 순간(선택 근거):** "신남"과 "발견"의 흐름 대신, 조용히 멈춰서 원경을 바라보는 정적인 한 순간을 골라 감성형의 여백을 살렸다.
- **카메라(정지 이미지용):** `wide shot`
- **효과음·음악:** 숲속 새소리, 바람에 흔들리는 나뭇잎 소리, 현악이 더해진 잔잔한 BGM
- **영상 생성 프롬프트(참고 초안):** 위 요약표 2행 참고.
- **이미지 생성 기록:**
  - 레퍼런스: `page-08.png`, `page-09.png`, `page-10.png`.
  - 조립 도구: `node unsorted/scripts/build-pongdang-prompt.mjs`.
  - 정지 이미지 입력 게이트: 통과 (샷 1개 `wide shot`).
  - 조립된 프롬프트 [SCENE] 블록: `BOO RABONG stands still on the trail with eyes wide in quiet wonder, gazing toward an enormous ancient tree looming far ahead in misty forest light. Background is a misty forest trail where an enormous ancient tree towers in the distance among smaller trees.`
  - 실행 명령: `higgsfield generate create nano_banana_flash --prompt '...' --image 'shared/references/pages/page-08.png' --image 'shared/references/pages/page-09.png' --image 'shared/references/pages/page-10.png' --aspect_ratio 9:16 --resolution 2k --wait`
  - **생성 미실행 사유:** 장면 1과 동일. 재생성 가능 여부: 가능.

### 장면 3 · 00:10~00:15

**이미지 생성 대기 — 아래 "이미지 생성 기록" 참고**

- **스토리:** 감성형의 마무리는 거대한 나무 밑동에서 부라봉이 느끼는 경이로움을 따뜻한 빛과 함께 담아, 제주 자연 앞에서의 작은 존재감과 여운을 남긴다.
- **화면:** 거대한 비자나무의 밑동, 이끼 낀 뿌리와 따뜻한 빛이 스며드는 지점.
- **캐릭터:** 나무를 올려다보며 두 눈에 경이로움이 가득 차고, 입이 살짝 벌어진 채 잔잔한 감동의 표정으로 멈춘다.
- **대사·자막:** "이게... 나무다봉...?!" (여운을 남기며 잦아드는 톤) / 하단 안전 영역, "그대로 얼음!" (감성적 세리프 폰트)
- **정지 이미지 순간(선택 근거):** 올려다보며 경이로움이 차오르는 정지된 한 순간. A안·B안보다 가까운 클로즈업으로 표정의 온기를 강조했다.
- **카메라(정지 이미지용):** `close-up`
- **효과음·음악:** 웅장하지만 잔잔한 숲 앰비언스, 감성 BGM이 서서히 고조되었다 여운으로 잦아듦
- **영상 생성 프롬프트(참고 초안):** 위 요약표 3행 참고.
- **이미지 생성 기록:**
  - 레퍼런스: `page-08.png`, `page-09.png`, `page-10.png`.
  - 조립 도구: `node unsorted/scripts/build-pongdang-prompt.mjs`.
  - 정지 이미지 입력 게이트: 통과 (샷 1개 `close-up`).
  - 조립된 프롬프트 [SCENE] 블록: `BOO RABONG stands at the foot of a massive ancient tree with head tilted back, eyes wide with wonder and mouth gently open in awe, warm forest light glowing around. Background is the mossy base of a colossal centuries-old tree trunk with warm light filtering through the canopy.`
  - 실행 명령: `higgsfield generate create nano_banana_flash --prompt '...' --image 'shared/references/pages/page-08.png' --image 'shared/references/pages/page-09.png' --image 'shared/references/pages/page-10.png' --aspect_ratio 9:16 --resolution 2k --wait`
  - **생성 미실행 사유:** 장면 1과 동일. 재생성 가능 여부: 가능.

## 담당자 확인 필요 (이관)

1. 비자림 배경 사용 허용 범위와 구체적 촬영 구역 (C안은 환경·세계관 강조 특성상 특히 중요)
2. 대사·화면 자막 문구 확정
3. 배경음악·효과음 확정
4. **제작·비용 승인** — `metadata/production-log.json`의 `approvals.production`을 승인 처리해야 실제 Higgsfield 생성이 가능하다.
