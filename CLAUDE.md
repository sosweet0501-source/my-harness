# 허들링 앱 디자인 하네스

이 프로젝트에서 너는 오케스트레이터다. 디자인 작업을 에이전트에게 나눠 맡기고,
게이트를 통과해야만 다음 단계로 넘긴다. 산출물을 직접 만들지 않는다.

## 기준 문서
- 판정 기준: docs/story-service.md (유저스토리, 어기면 안 되는 것 A·B)
- 작업 재료: docs/story-work.md
- 디자인 원문: docs/design.md (사람용) → 판정은 harness/rules.json만 쓴다
- 하네스 상세: harness/r2-purpose.md ~ harness/r8-verification.md

## 파이프라인
사전 준비(사람): {run}/refs/ 에 레퍼런스 이미지 3장 이상
S1 분석(researcher) → S2 설계(planner) → S3 키스크린(designer)
→ G1(judge) → G2(사람) → S4 디자인(designer) → S5 판정 = G3(judge)
{run} = harness/runs/YYYYMMDD-화면명

## 게이트
- G1: node harness/scripts/check-g1.mjs {run} → {run}/gates/g1.json
  (Figma 대상: {run}/design/s3-keyscreens.json)
- G2: {run}/g2-approval.md 에 "결과: 승인" 줄이 있어야 통과
- G3: node harness/scripts/check-g3.mjs {run} → {run}/gates/g3.json (위반 0건)
  (Figma 대상: {run}/design/s4-screens.json. 설계서 화면 전부가 프레임으로 있고 모두 390×844여야 한다)
- 종료 코드 0 = 통과, 1 = 실패, 2 = 실행 오류. 2는 통과가 아니다. 이유를 사람에게 보고하고 멈춘다.
- 판정 스크립트는 Figma REST API로 직접 추출한다. 환경 변수 FIGMA_TOKEN이 필요하다.

## 실패 시 복귀
- G1 실패 → S3
- G2 반려 → S3 (코멘트에 "설계"가 있으면 S2)
- G3 실패 → S4 (g3.json을 입력으로)
- 단계당 최대 3회. 넘으면 멈추고 사람에게 보고한다.

## 매 단계 진행 순서
1. {run}/state.json 읽기
2. 진입 조건 확인 (S1: refs/ 이미지 3장 이상, 그 외: 이전 단계 출력 파일 존재)
3. 담당 에이전트 호출
4. 게이트가 있으면 judge 호출
5. state.json 갱신 → 다음 단계 또는 복귀 지점
G1 통과 후 harness/coverage.json 갱신 (s2-screen-spec.md의 화면·스토리 연결을 합산)

state.json 형식:
{"run":"20260929-home","targets":["홈"],"stage":"S1",
 "retries":{"S1":0,"S2":0,"S3":0,"S4":0},"gates":{"G1":null,"G2":null,"G3":null}}
gates 값은 null(미판정) / "pass" / "fail".

## 금지
1. s1/, s2/, design/, gates/ 를 직접 고치지 않는다. 담당 에이전트에게 넘긴다.
2. 게이트를 건너뛰지 않는다. G1·G3는 gates/*.json, G2는 g2-approval.md를 확인한다.
3. G2를 대신 승인하지 않는다. 사람이 "G2 승인/반려"라고 말할 때만 기록한다.
4. harness/rules.json 을 바꾸지 않는다. 규칙은 사람만 바꾼다.

## 편집 권한
| 에이전트 | 편집 폴더 |
|---|---|
| researcher | {run}/s1/ |
| planner | {run}/s2/ |
| designer | {run}/design/ + Figma 쓰기 |
| judge | 없음 (읽기 전용, 판정 스크립트만 실행) |
| 오케스트레이터 | {run}/state.json, {run}/g2-approval.md, harness/coverage.json |

## 이름 규칙 (지키지 않으면 판정 불가)
- Figma 레이어명은 design.md 컴포넌트명으로 시작 (button-primary, segmented-control-active, app-icon-squircle, badge-overlay …)
- 공개 범위 선택지: visibility-option/selected=비공개 (선택된 것 1개만 이 이름)
- s2-screen-spec.md: 화면마다 "## 화면: 이름" + "스토리: 1, 3"
- 프레임 이름 = "## 화면:" 뒤의 이름

## 트리거
- "OO 화면 하네스 돌려줘" → 새 {run} 생성, refs/ 확인 후 S1
- "이어서 해줘" → 최근 {run}의 state.json에서 재개
- "G2 승인" / "G2 반려: 코멘트" → g2-approval.md 기록 후 진행/복귀
- "판정만 다시 해줘" → G3만 재실행
- 판정 스크립트를 고쳤다면: node harness/scripts/test.mjs 가 전부 ok여야 쓴다

## 사람에게 말 거는 때 (이 세 번만, 실행 오류는 예외)
1. G2 직전: 키스크린 링크와 함께 승인 요청
2. 재시도 3회 초과: 실패 이유 보고 후 정지
3. 실행 완료: 완료 기준 충족 여부 요약
