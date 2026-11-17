# 2026. 가족과 함께하는 AI수학투어 — 미션 웹앱

만든 곳: 순천수학교육체험센터

- 가족 화면: `index.html` — 오전/오후 → 학교 → 학생 이름 → 비밀번호 4자리로 로그인
- 관리자 화면: `admin.html` — 팀 관리 · 진행 현황 · 문제 설정 · 결과·자료

## 처음 한 번 설정

### 1. Firebase (webapp-hub 프로젝트를 함께 써요)
Firebase 콘솔 → **webapp-hub** 프로젝트에서

1. **Authentication → 로그인 방법**에서 두 가지를 **사용 설정**해요.
   - **익명** (가족 기기가 쓰는 방식)
   - **이메일/비밀번호** (관리자 로그인)
2. **Authentication → 사용자 → 사용자 추가**
   - 이메일: `pwoong99@ai.jne.kr`, 비밀번호: 관리자 비밀번호 (관리자 화면에서 Google 계정으로 로그인해도 돼요)
   - 다른 사람이 같은 이메일로 먼저 가입하지 못하게, 앱을 공개하기 **전에** 만들어 두세요.
3. **Firestore Database → 규칙**에 이 저장소의 `firestore.rules`를 **통째로 붙여 넣고 게시**해요.
   - 웹앱 모음 페이지(apps) 규칙이 그대로 들어 있고, 그 아래에 `mathTour_` 규칙이 더해져 있어요.
4. **Authentication → 설정 → 승인된 도메인**에 `pwoong99.github.io`가 있는지 확인해요.

### 2. AI 꽃 세기 (Google Apps Script)
1. script.google.com에서 새 프로젝트를 만들고 `gas/Code.gs` 내용을 붙여 넣어요.
2. 프로젝트 설정 → **스크립트 속성**에 추가해요.
   - `GEMINI_API_KEY` = Google AI Studio의 Gemini API 키 (Gemini Project)
   - `GEMINI_MODEL` = `gemini-2.5-flash` (선택)
3. **배포 → 새 배포 → 웹 앱**으로 배포해요. 실행 사용자는 **나**, 액세스 권한은 **모든 사용자**로 해요.
4. 웹 앱 주소(`…/exec`)를 관리자 화면 **문제 설정 → AI 꽃 세기 Apps Script 웹앱 주소**에 넣고 **연결 시험**을 누른 뒤 저장해요.

AI 호출이 안 되면 가족 화면에 「다른 AI 앱으로 센 수」를 직접 적는 칸이 열려요.

### 2-1. Code.gs 자동 배포 (GitHub Actions)
`gas/` 폴더가 바뀌어 main에 올라오면 `.github/workflows/deploy-gas.yml`이 Apps Script에 코드를 올리고,
**같은 웹 앱 주소로 새 버전을 배포**해요. 스크립트 ID는 `.clasp.json`, 배포 ID는 워크플로 파일에 들어 있어요.
저장소 Settings → Secrets and variables → Actions에 아래 1개만 있으면 돼요.
- `CLASPRC_JSON` — PC에서 `npx @google/clasp@2.4.2 login` 후 생긴 `.clasprc.json` 파일 내용
그리고 https://script.google.com/home/usersettings 에서 「Google Apps Script API」를 사용으로 켜 둬요.

### 3. GitHub Pages
저장소 Settings → Pages → Branch: `main` / `(root)`
- 가족용 주소: `https://pwoong99.github.io/ai-math-tour/` (QR로 만들어 나눠 주세요)
- 관리자 주소: `https://pwoong99.github.io/ai-math-tour/admin.html`

## 행사 전 체크리스트
1. 관리자 화면 → 오전팀/오후팀 탭에서 팀을 등록해요. 여러 팀은 「학교, 이름」 줄로 붙여 넣고, 비밀번호는 랜덤으로 만들어요.
2. **명단 사진으로 저장**을 눌러 로그인 명단을 받아요.
3. 문제 설정에서 확인할 것: 암호 문제(암호문·열쇠·정답), 꽃밭 넓이(㎡), 펜토미노 퍼즐, 시간 공개 여부를 정하고 **설정 저장**을 눌러요.
4. 연습으로 풀어 본 뒤 **결과·자료 → 답 초기화**를 해요. 팀 명단은 남아요.

## 데이터 (Firestore 컬렉션)
| 컬렉션 | 내용 | 읽기 |
|---|---|---|
| `mathTour_config/main` | 문제 목록·순서·설정 | 접속한 사람 |
| `mathTour_schools/{am,pm}` | 로그인 화면 학교 목록 | 접속한 사람 |
| `mathTour_logins/{열쇠}` | 로그인 확인용 (학교·이름·비밀번호를 섞은 값) | 열쇠를 아는 사람만 1개씩 |
| `mathTour_sessions/{기기}` | 기기 ↔ 팀 연결 | 본인 기기·관리자 |
| `mathTour_teams` | A팀… 이름, 진행 상황 | 접속한 사람 |
| `mathTour_teamsPrivate` | 학교·학생 이름·비밀번호 | 관리자만 |
| `mathTour_answers` | 팀별 답(모두의 답) | 접속한 사람 |
| `mathTour_private` | 만족도·펜토미노 걸린 시간 | 관리자만 (시간은 공개 설정 시 가족도) |

## 파일
- `js/fb.js` — Firebase 설정·공통 함수
- `js/questions.js` — 기본 미션 11개, 펜토미노 조각
- `js/puzzles.js` — 펜토미노 퍼즐 책자 18문제 모양
- `js/inputs.js` — 미션별 입력 화면
- `js/peek.js` — 미션별 모두의 답 화면
- `js/widgets.js` — 시저 암호판, 사진 자르기, 펜토미노 판
- `js/cert.js` — 수료증·명단 그림
- `js/app.js` / `js/admin.js` — 가족 화면 / 관리자 화면
- `gas/Code.gs` — AI 꽃 세기 중계 (Apps Script에 붙여 넣는 파일)
- `firestore.rules` — webapp-hub 전체 보안 규칙
