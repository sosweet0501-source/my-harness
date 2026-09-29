# R6 · 역할

> 파이프라인: [r3-pipeline.md](r3-pipeline.md) · 산출물: [r4-artifacts.md](r4-artifacts.md) · 게이트: [r5-gates.md](r5-gates.md)

## 에이전트와 편집 폴더

`{run}` = `harness/runs/YYYYMMDD-화면명`

| 에이전트 | 담당 단계 | 편집 가능한 폴더 1개 | 그 밖의 폴더 |
|---|---|---|---|
| `researcher` | S1 분석 | `{run}/s1/` | 읽기만 |
| `planner` | S2 설계 | `{run}/s2/` | 읽기만 |
| `designer` | S3 키스크린, S4 디자인 | `{run}/design/` + Figma 쓰기 | 읽기만 |
| `judge` | G1, G3 | 없음 (읽기 전용) | 판정 스크립트만 실행 |
| 오케스트레이터 (CLAUDE.md) | 단계 순서, 재시도 관리 | `{run}/state.json`, `{run}/g2-approval.md`, `harness/coverage.json` | 읽기만 |

Figma에 쓸 수 있는 에이전트는 `designer` 하나뿐이다.

## 읽기 전용 판정자 (judge)

- 쓸 수 있는 도구: Read, Grep, Bash(판정 스크립트 실행만), Figma 읽기 도구
- Edit와 Write는 주지 않는다.
- 판정 결과(`{run}/gates/g1.json`, `{run}/gates/g3.json`)는 판정 스크립트가 쓴다.
- designer가 만든 노드 JSON은 믿지 않는다. 판정 스크립트가 Figma REST API로 노드를 직접 다시 추출해 검사한다.
  - 파일 키와 프레임 ID는 G1이면 `{run}/design/s3-keyscreens.json`, G3이면 `{run}/design/s4-screens.json`에서 읽는다.
  - Figma 접근에는 환경 변수 `FIGMA_TOKEN`(개인 액세스 토큰)을 쓴다. 토큰은 사람이 발급한다.
- judge는 스크립트를 실행하고 결과를 읽기만 한다.

## 자연어 트리거

| 이렇게 말하면 | 이렇게 동작 |
|---|---|
| "홈, 내 자산 화면 하네스 돌려줘" | 새 실행 폴더를 만들고 `refs/`를 확인한 뒤 S1 시작 |
| "이어서 해줘" | 가장 최근 실행의 `state.json`을 읽고 그 지점부터 재개 |
| "G2 승인" / "G2 반려: (코멘트)" | `g2-approval.md`에 기록하고 다음 단계 또는 복귀 지점으로 |
| "판정만 다시 해줘" | S4 결과를 대상으로 G3만 다시 실행 |

## 모델과 정의 위치

- 모든 에이전트는 메인 모델을 이어받는다.
- 에이전트 정의는 `.claude/agents/*.md`에 둔다.
