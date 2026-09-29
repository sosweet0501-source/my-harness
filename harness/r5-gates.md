# R5 · 게이트

> 파이프라인: [r3-pipeline.md](r3-pipeline.md) · 산출물: [r4-artifacts.md](r4-artifacts.md) · 판정 기준: [story-service.md](../docs/story-service.md)

사람이 승인하는 곳은 G2 한 곳이다. G1과 G3는 스크립트가 판정한다.

## G1 · 키스크린 확인 (스크립트)

4개를 모두 만족하면 통과한다.

| ID | 조건 | 검사 대상 |
|---|---|---|
| G1-1 | 키스크린 프레임이 2개 이상 3개 이하 | `design/s3-keyscreens.json` |
| G1-2 | 모든 프레임이 정확히 390×844 | `design/s3-keyscreens.json` |
| G1-3 | 모든 프레임 이름이 `s2/s2-screen-spec.md`의 화면명과 일치 | 두 파일 비교 |
| G1-4 | 대상 화면마다 유저스토리가 1개 이상 연결됨 | `s2/s2-screen-spec.md` |

유저스토리 5개 전체의 연결 여부는 여러 실행을 합산해 `harness/coverage.json`에서 센다. (G1 통과 조건은 아니다)

## G2 · 컨셉 컨펌 (사람)

`g2-approval.md`에 아래 4줄을 적는다.

```
결과: 승인|반려
승인자:
날짜:
코멘트:
```

스크립트는 `결과: 승인` 줄이 있는지만 확인한다. 있으면 S4로 넘어간다.

## G3 · 가이드 위반 검토 (스크립트)

아래 규칙을 모두 검사해 위반이 0건이면 통과한다. 규칙 값의 SSOT는 `harness/rules.json`이다.

### 완성 화면 검사

| ID | 조건 |
|---|---|
| G3-screens | `s2/s2-screen-spec.md`의 `## 화면:` 전부가 `design/s4-screens.json`의 프레임으로 있고, 설계서에 없는 프레임은 없다. 목록에서 화면을 빼거나 이름을 바꿔 검사를 피하지 못하게 한다 |
| G3-size | 완성 화면 프레임이 전부 390×844 |

### 디자인 규칙 (design.md에서 뽑음)

| ID | 규칙 |
|---|---|
| R-radius | 모서리는 0 / 16 / 24 / 9999px만 허용. 아이콘은 30% 예외 |
| R-color | 채움색과 테두리색 모두 #141414 · #262626 · #707070 · #adadad · #ffffff · #f3f3f3 · #f0f0f0 · #e0e0e0 · #0066ff 외 금지. `rgba(115,115,115,0.56)`은 `badge-overlay` 레이어에서만 허용 |
| R-accent | #0066ff는 화면당 2개 이하, 버튼 채움색으로는 금지 |
| R-spacing | 간격은 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px만 허용 |
| R-font | Pretendard만, 굵기 300 / 400 / 600 / 700만 허용 |
| R-tracking | 자간 0만 허용 |
| R-shadow | 그림자 0개. segmented 활성 상태 1곳만 예외 |
| R-caps | 대문자 변환(uppercase) 금지 |

### 서비스 규칙 (story-service "어기면 안 되는 것"에서 뽑음)

| ID | 조건 | 근거 |
|---|---|---|
| S-A1 | 화면 안의 텍스트에 이메일·전화번호·주민번호 형식 문자열이 0개 (정규식으로 검사. 더미 텍스트 포함) | A: 개인정보 금지 |
| S-A2 | 판매 신청이 들어간 화면에는 "검수 대기" 상태 표시가 1개 이상 있어야 함 | A: 검수 통과 필수 |
| S-B1 | 내 자산 등록 화면의 공개 범위 기본 선택값이 "비공개" | B: 기본 비공개 |

S-A2와 S-B1은 해당 화면이 이번 실행 대상일 때만 검사한다.

## 이름 규칙

스크립트는 이름으로만 요소를 알아볼 수 있으므로 아래 규칙을 지킨다. 지키지 않으면 해당 게이트 검사를 할 수 없다.

- Figma 레이어 이름은 design.md 컴포넌트명으로 시작한다. (예: `button-primary`, `segmented-control-active`, `app-icon-squircle`, `badge-overlay`)
- 공개 범위 선택지는 선택 상태를 이름에 넣는다. (예: `visibility-option/selected=비공개`)
- `s2-screen-spec.md`는 화면마다 `## 화면: 홈` 줄과 `스토리: 1, 3` 줄을 둔다.
- 프레임 이름은 `## 화면:` 뒤의 이름과 똑같이 짓는다.

이름 규칙에 따른 검사 방법:

| 규칙 | 알아보는 방법 |
|---|---|
| R-accent 버튼 채움색 | 이름이 `button-`으로 시작하는 레이어 |
| R-shadow 예외 | 이름이 `segmented-control-active`로 시작하는 레이어 |
| R-radius 예외 | 이름이 `app-icon-squircle`로 시작하는 레이어의 모서리 = 너비 × 0.3 |
| S-A2 판매 신청 화면 | "판매 신청" 텍스트가 들어간 프레임 |
| S-B1 내 자산 등록 화면 | 프레임 이름이 "내 자산 등록"인 화면의 `visibility-option/selected=` 값 |
| G1-3 화면명 일치 | 프레임 이름 = `## 화면:` 뒤의 이름 |

## design.md 충돌 정리

design.md 안에서 서로 부딪히는 부분은 Don'ts를 우선해 아래처럼 정리한다.

- `ex-modal-card`, `ex-toast`의 그림자는 위반으로 본다.
- `ex-data-table-cell`의 mono-caps는 금지한다.
- `{colors.on-primary}`는 #ffffff로 둔다.
- featured 요금제는 canvas-soft 배경을 따른다. `ex-pricing-tier-featured`의 반전 배경은 쓰지 않는다.

## 실패 시

- R3에서 정한 복귀 지점으로 돌아간다.
- 단계당 재시도는 최대 3회다. 넘으면 멈추고 사람에게 넘긴다.
