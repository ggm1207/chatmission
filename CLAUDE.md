# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

중학생 대상 일회성 교육용 웹서비스. 학생이 10개의 디지털 관계 상황(개인정보, AI 오정보, 합성 이미지, AI 의존, 공감, 자신감, 경계 설정, 별명, 단체방 괴롭힘 2종)에서 가상 인물과 자유롭게 대화하며 각 방의 미션 3개를 순서대로 해결한다. 로그인·DB·쿠키·localStorage 없이 대화는 브라우저 메모리에만 존재한다.

의존성 패키지가 전혀 없는 순수 Node.js(`node:` 빌트인만 사용) + 바닐라 JS 프론트엔드다. `npm install` 불필요. Node.js 20 이상.

## 명령어

```bash
npm run dev          # 로컬 서버 실행 (http://127.0.0.1:4175)
npm test             # node --test 로 전체 테스트 (test/mission.test.mjs)
npm run check:secrets # 공개 파일에 sk-* 키나 gh 토큰이 없는지 검사
npm run build:pages  # public/scenarios.json + public/config.js 생성 (Pages 배포용)
```

단일 테스트 실행: `node --test --test-name-pattern "one strong turn" test/mission.test.mjs`

API 키 설정: `.env.local`에 `OPENAI_API_KEY=`, `OPENAI_MODEL`(기본 `gpt-5.5`), `HOST`, `PORT`. 서버만 읽으며 `.gitignore`에 포함. `git add -f .env.local` 절대 금지.

## 핵심 아키텍처

### 세 가지 실행 모드 (같은 UI, 다른 판정 엔진)

판정 로직이 모드별로 분리되어 있고 **동일한 응답 형식**(`{ mode, messages, missions, coachNote }`)을 반환한다:

1. **GPT 모드** — `server.mjs`에 `OPENAI_API_KEY`가 있을 때. `lib/openai.mjs`가 OpenAI Responses API(Structured Outputs)를 호출.
2. **데모 모드** — 로컬 서버에 키가 없을 때. `lib/demo.mjs`가 정규식 기반으로 서버에서 판정.
3. **정적 데모 모드** — GitHub Pages(서버 없음). `public/static-demo.js`가 브라우저에서 정규식으로 판정. `public/app.js`의 `initialize()`가 `/api/*` 호출 실패 시 `./scenarios.json`을 불러와 이 모드로 폴백.

`public/app.js`는 세 모드를 모두 처리한다. `state.mode`가 `gpt`/`demo`이면 `/api/chat`을 POST하고, `static-demo`이면 `buildStaticDemoResponse()`를 직접 호출한다.

### 미션 판정의 2단계 구조 (가장 중요)

GPT 모드의 핵심 설계: **모델은 최종 상태를 정하지 않는다.** 모델은 각 미션의 *증거 플래그*(`attempted`, `studentEvidence`, `assistantEvidence`, `criteriaMet`)와 발화 품질(`turnAssessment`)만 반환하고, **최종 `completed`/`insufficient`/`pending` 상태는 서버의 `lib/mission-policy.mjs`의 `enforceMissionPolicy()`가 결정한다.** 이 정책은 GPT·데모 모드가 공유한다.

`enforceMissionPolicy()`가 강제하는 불변식:
- 미션은 순서대로만 진행(`activeMissionIndex` = 첫 미완료 미션). 활성 미션 이후는 미리 완료 불가.
- **한 발화당 최대 1개 미션만 새로 완료**(`newlyCompleted` 가드).
- `mission.requiresReason`이면 학생이 이유를 직접 표현해야 함(`turnAssessment.reasoned`).
- `mission.requiresAssistantConfirmation`이면 가상 인물의 명시적 인정/약속이 있어야 함(`analysis.assistantEvidence`).
- 욕설/조작 시도는 모델 응답과 무관하게 `assessStudentTurn()`이 로컬에서 차단(`localAssessment.acceptable`).

이 불변식들은 `test/mission.test.mjs`로 검증되며, 미션 로직을 바꿀 때 반드시 통과해야 한다.

### 안전 파이프라인 (`server.mjs` → `handleChat`)

요청 처리 순서: 동일 출처 검사 → 본문 크기 제한(18KB) → 시나리오·세션 검증 → 레이트 리밋(IP+세션, 10분당 24회) → `lib/safety.mjs`의 `checkSensitiveInput()`(공백/길이/위기표현/욕설/개인정보 정규식 차단) → 모드별 판정. GPT 모드는 추가로 `lib/openai.mjs`의 `moderateInput()`(OpenAI Moderation API)을 통과해야 한다. 위기 표현(`crisisPatterns`)은 역할극을 중단하고 성인 연결을 안내한다.

OpenAI 호출은 `store: false`, 세션 ID를 SHA-256 해시한 `safety_identifier`를 사용해 대화 원문이 보존되지 않게 한다.

### 시나리오 데이터 (`lib/scenarios.mjs`)

10개 시나리오의 단일 출처. 각 시나리오: `title`/`context`/`role`/`characters`(단체방은 2명)/`initialMessages`/`missions`/`demo.replies`. 각 미션: `rubric`(GPT 판정 기준), `requiresReason`, `requiresAssistantConfirmation`, `hint`(학생용), `prerequisites`.

`getPublicScenarios()`는 `rubric` 등 내부 판정 기준을 **제외**하고 학생 화면용 필드만 노출한다(`/api/scenarios`와 `build:pages`가 사용). **rubric을 클라이언트로 보내지 않는 것이 의도된 설계**다.

판정용 정규식은 세 곳에 중복 존재한다 — `lib/demo.mjs`(서버 데모, attempt/strong 2단계), `public/static-demo.js`(정적 데모), `public/profanity-filter.js`(욕설, 서버 `safety.mjs`가 import). 시나리오나 미션을 추가/수정하면 이 세 곳과 `lib/scenarios.mjs`를 함께 갱신해야 한다.

## 배포 (GitHub Pages)

`main` 푸시 시 `.github/workflows/pages.yml`이 `npm test → check:secrets → build:pages`를 거쳐 `public/`을 배포한다. 정적 호스팅이라 서버가 없으므로 기본은 정적 데모 모드. GitHub Actions Variable `API_BASE_URL`(공개 URL, 키 아님)을 설정하면 외부 백엔드의 GPT 모드를 사용하고, 백엔드는 `ALLOWED_ORIGIN`으로 교차 출처를 제한한다.
