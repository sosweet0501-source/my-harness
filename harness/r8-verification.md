# R8 · 검증과 리뷰

> 게이트: [r5-gates.md](r5-gates.md) · 역할: [r6-roles.md](r6-roles.md) · 오케스트레이터: [r7-orchestrator.md](r7-orchestrator.md)

## 판정 스크립트

- Node.js로 외부 패키지 없이 만든다.
- `harness/scripts/check-g1.mjs`, `harness/scripts/check-g3.mjs`
- 실행: `node harness/scripts/check-g3.mjs runs/{run}`
- 종료 코드: 통과 0, 실패 1

## 노드 데이터 형식

판정 스크립트가 Figma REST API로 추출하는 노드 데이터는 노드마다 아래 필드만 담은 평평한 배열이다. rules.json의 규칙은 전부 이 필드만으로 검사한다.

- 추출 대상: G1은 `design/s3-keyscreens.json`, G3은 `design/s4-screens.json`에 적힌 파일 키와 프레임 ID
- 인증: 환경 변수 `FIGMA_TOKEN`
- 숨김 노드(visible=false)는 뺀다.

- `id`, `name`, `type`, `frame`(소속 프레임명), `parents`(상위 레이어명 목록)
- `width`, `height`
- `fills`, `strokes`: `#rrggbb` / `rgba(r,g,b,a)` / 페인트 종류(IMAGE, GRADIENT_* …)
- `cornerRadius`: 네 모서리 배열, `effects`(그림자 종류)
- `textStyles`(텍스트만): 기본 스타일과 부분 스타일마다 `fontFamily`, `fontWeight`, `letterSpacing`, `textCase`
- `characters`(텍스트만)
- `itemSpacing`, `padding`: 오토 레이아웃일 때만. space-between이면 itemSpacing은 검사하지 않는다.

## 스크립트 자체 검증

- `harness/fixtures/`에 샘플을 둔다.
  - `clean.json`: 깨끗한 샘플 1개. 예외 규칙(스퀴클, segmented 활성 그림자, badge-overlay rgba, 필 모서리)을 일부러 포함한다.
  - `violations.json`: 규칙(G1-*, G3-*, R-*, S-*)마다 1개 이상, clean.json을 조금 바꿔 딱 그 규칙만 어긴 샘플 24개
- 위반 샘플은 전부 걸리고, 깨끗한 샘플은 위반 0건이 나와야 스크립트를 쓸 수 있다.
- 실행: `node harness/scripts/test.mjs`

## 리뷰

1. 문서 교차 검토 (CLAUDE.md 초안 전): r2~r7 문서끼리 파일 경로, 게이트 ID, 복귀 지점이 서로 맞는지 확인하고 어긋난 곳을 보고한다.
2. 파일럿 1회 (하네스를 만든 뒤): "홈" 화면 하나로 S1~S5를 실제로 돌려 보고, 막힌 곳을 `harness/runs/{run}/pilot-notes.md`에 기록한다.
