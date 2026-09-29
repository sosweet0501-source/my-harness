# R4 · 산출물

> 파이프라인: [r3-pipeline.md](r3-pipeline.md)

## 실행 폴더

- 하네스를 실행할 때마다 `harness/runs/YYYYMMDD-화면명/` 폴더를 하나 만든다. (예: `harness/runs/20260929-home/`)
- 레퍼런스도 실행마다 달라지므로 `refs/`는 실행 폴더 안에 둔다.

## 단계별 파일 (모두 실행 폴더 안에 생김)

에이전트마다 편집 폴더가 1개씩이다. 자세한 내용은 [r6-roles.md](r6-roles.md)에 있다.

| 단계 | 파일 | 형식 | 쓰는 쪽 |
|---|---|---|---|
| 사전 준비 | `refs/경쟁사_화면명.png` | 이미지 3장 이상 | 사람 |
| S1 분석 | `s1/s1-analysis.md` | 레퍼런스별 "반영할 부분" 목록 | researcher |
| S2 설계 | `s2/s2-screen-spec.md` | 화면별 구성 + 연결된 유저스토리 번호 | planner |
| S3 키스크린 | `design/s3-keyscreens.json` | Figma 파일 URL, 프레임 ID, 크기, 추출한 노드 데이터 | designer |
| G1 판정 | `gates/g1.json` | 조건별 통과/실패 | 판정 스크립트 |
| G2 컨펌 | `g2-approval.md` | 승인/반려, 승인자, 날짜, 코멘트 | 오케스트레이터 |
| S4 디자인 | `design/s4-tokens.json`, `design/s4-screens.json` | 토큰 정의, 화면 노드 데이터 | designer |
| S5 판정 (G3) | `gates/g3.json` | 위반 목록 (규칙 ID, 노드 ID, 실제값, 허용값) | 판정 스크립트 |
| 상태 | `state.json` | 현재 단계, 재시도 횟수, 게이트 통과 여부 | 오케스트레이터 |

## 실행을 합산하는 파일

- `harness/coverage.json`: 유저스토리 1~5가 어느 실행의 어느 화면에 연결됐는지 합산한다. G1 통과 후 오케스트레이터가 갱신한다.

## 규칙 SSOT

- 파일: `harness/rules.json`
- design.md에서 스크립트가 셀 수 있는 규칙만 뽑아 담는다.
- design.md는 사람이 읽는 원문으로 두고, 판정 스크립트는 rules.json만 읽는다.
- design.md가 바뀌면 rules.json부터 고친다.
- 규칙 내용은 R5에서 정한다.

## 재개

- 실행 폴더마다 `state.json`을 둔다.
- 기록 항목: 현재 단계, 단계별 재시도 횟수, 게이트 통과 여부
- 다시 실행하면 마지막으로 통과한 게이트 다음 단계부터 시작한다.
- 재시도 한도(단계당 3회)도 이 파일로 센다.
