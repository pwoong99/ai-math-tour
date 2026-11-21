import { PUZZLES } from "./puzzles.js?v=3.20";
// 미션 문제 정의 — 기본 문제(활동지 순서)와 관리자가 추가하는 문제 형식
// 관리자 화면에서 순서·숨김·제목·안내 글을 바꾸면 mathTour_config/main 에 저장돼요.

// 장소 (워크북 코스 순서)
export const PLACES = {
  p1: { no: "①", name: "습지센터 공연장", color: "#3a7bd5" },
  p2: { no: "②", name: "어린이동물원", color: "#e07b1f" },
  p3: { no: "③", name: "스페이스 허브", color: "#8e5cd9" },
  p4: { no: "④", name: "한국정원", color: "#17795a" },
  end: { no: "⑤", name: "마무리", color: "#c2577e" }
};
export const PLACE_ORDER = ["p1", "p2", "p3", "p4", "end"];

export const BUILTIN = {
  euler: {
    title: "오일러와 한붓그리기", code: "1-1", place: "p1", icon: "✏️", activity: true,
    desc: "한 점에 모인 선이 짝수 개면 짝수점, 홀수 개면 홀수점이에요. 모든 점이 짝수점이면 어느 점에서 시작해도, 홀수점이 딱 2개면 한 홀수점에서 출발해 다른 홀수점에서 끝나는 한붓그리기를 할 수 있어요. 홀수점이 4개 이상이면 할 수 없어요."
  },
  cipher: {
    title: "스페이스 암호 해독", code: "1-2", place: "p1", icon: "🛸", activity: true,
    desc: "우주 탐험대가 보낸 비밀 편지가 시저 암호로 잠겨 있어요. 작은 원의 ▲(A)를 큰 원의 열쇠(KEY) 글자에 맞춘 뒤, 암호 글자를 찾아 원래 글자로 바꿔 보세요."
  },
  latin: {
    title: "라틴방진 스마트톡 만들기", code: "1-3", place: "p1", icon: "🐢", activity: true,
    desc: "라틴방진은 가로줄·세로줄에 같은 숫자(또는 색)가 딱 한 번씩만 들어가는 방진이에요. 숫자로 연습한 뒤, 색으로 바꾸어 우리 가족 스마트톡을 설계해요."
  },
  sign: {
    title: "동물 안내판 속 숫자 보물 찾기", code: "2-1", place: "p2", icon: "🦎", activity: true,
    desc: "동물 안내판을 찾아 가족과 함께 숫자를 읽고 빈칸을 채워 봐요. 안내판이 잘 안 보이면 사진을 찍어 함께 읽어요."
  },
  food: {
    title: "동물 친구 웰빙 계산기", code: "2-2", place: "p2", icon: "🦊", activity: true,
    desc: "비 a : b 에서 b로 나눈 값이 비율이에요. 비율이 같은 두 비를 '='로 이은 식이 비례식이고, (안쪽 두 항의 곱) = (바깥쪽 두 항의 곱)이에요. 사막여우 1마리의 하루 먹이는 150g이에요."
  },
  stride: {
    title: "내 보폭으로 재어보는 산책로", code: "3-1", place: "p3", icon: "👣", activity: true,
    desc: "1보는 한쪽 발이 떨어졌다가 '같은 발'이 다시 닿을 때까지, 즉 두 걸음의 길이예요. 평소 걸음으로 5보(10걸음)를 걷고 거리 ÷ 5 = 내 1보! 걸은 보수(x)와 거리(y)는 y = 1보 × x 로 대응해요."
  },
  quadrat: {
    title: "방형구법과 AI로 국화꽃 세기", code: "3-2", place: "p3", icon: "🌼", activity: true,
    desc: "20cm × 20cm 방형구 안의 꽃을 직접 세고 AI에게도 세어 달라고 해요. 방형구 25개 = 1m × 1m = 1㎡ 이니까, 틀 안 꽃 수 × 25 = 1㎡당 꽃 수예요."
  },
  area: {
    title: "스페이스 허브 잔디밭에 국화를 심는다면?", code: "3-3", place: "p3", icon: "📐", activity: true,
    desc: "스페이스 허브의 긴 초록 잔디밭에 국화를 심는다면 몇 송이를 심을 수 있을까요? 측정 앱, 지도 앱, 내 보폭 세 가지 방법으로 잔디밭 넓이를 재고, 앞에서 구한 방형구법의 1㎡당 꽃 수를 활용해 어림해요."
  },
  fibo: {
    title: "자연 속 피보나치 수 (솔방울)", code: "4-1", place: "p4", icon: "🌲", activity: true,
    desc: "1, 1, 2, 3, 5, 8, 13, 21 … 앞의 두 수를 더하면 바로 뒤의 수가 되는 피보나치 수열! 솔방울을 뒤집어 아래쪽에서 보면 비늘이 시계 방향과 시계 반대 방향으로 나선을 만들어요. 나선이 몇 줄인지 세어 봐요."
  },
  golden: {
    title: "황금비율자로 황금비 찾기", code: "4-1", place: "p4", icon: "📏", activity: true,
    desc: "이웃한 피보나치 수의 비는 점점 황금비 1 : 1.618에 가까워져요. 가족 몸과 정원 속에서 1 : 1.618에 가까운 짝꿍을 찾아봐요. 정확히 1.618이 아니라 「약 1.6」이면 충분해요."
  },
  pento: {
    title: "펜토미노 퍼즐", code: "4-2", place: "p4", icon: "🧩", activity: true,
    desc: "실물 펜토미노 조각으로 먼저 퍼즐을 풀고, 같은 모양으로 아래 판에도 놓아 보세요. 돌리고(회전), 뒤집고(대칭), 밀어서(이동) 빈칸 없이 모두 채우면 완성!"
  },
  fun: {
    title: "가장 재미있었던 활동", place: "end", icon: "🎉",
    desc: "오늘 재미있었던 활동을 모두 골라 주세요. (여러 개 고를 수 있어요)"
  },
  scale: {
    title: "오늘 활동 만족도", place: "end", icon: "⭐",
    desc: "오늘 사용한 앱과 데이터 모으기 활동이 수학을 이해하는 데 도움이 되고 즐거웠나요? (이 답은 선생님만 볼 수 있어요)"
  },
  comment: {
    title: "소감 한마디", place: "end", icon: "💌",
    desc: "가족과 함께한 AI수학투어 소감이나 하고 싶은 말을 자유롭게 남겨 주세요."
  }
};

// 관리자가 추가할 수 있는 문제 형식
export const CUSTOM_KINDS = {
  number: "숫자 입력",
  text: "글 입력",
  choice: "하나 고르기",
  photo: "사진 올리기"
};

// 문제 구성 판 — 워크북이 바뀌어 미션 구성이 크게 달라지면 올려요 (예전 설정은 새 구성으로 자동 전환)
export const Q_VERSION = 2;
export const DEFAULT_QUESTIONS = [
  "euler", "cipher", "latin", "sign", "food", "stride", "quadrat", "area", "fibo", "golden", "pento", "fun", "scale", "comment"
].map((k) => ({ id: "q_" + k, kind: k, hidden: false }));

// 스페이스 암호 문제 (워크북 활동 1-2) — 열쇠는 작은 원의 A를 맞추는 큰 원의 글자
export const DEFAULT_CIPHERS = [
  { key: "C", text: "UVCT", answer: "STAR" },
  { key: "D", text: "VSDFH KXE", answer: "SPACE HUB" },
  { key: "F", text: "RFYM YTZW", answer: "MATH TOUR" },
  { key: "H", text: "ZBUJOLVU IHF", answer: "SUNCHEON BAY" },
  { key: "?", text: "AI PSZI QEXL", answer: "WE LOVE MATH", answerKey: "E", hint: "열쇠를 몰라요! 힌트: 첫 글자 W가 암호에서는 A로 바뀌었어요. KEY가 뭘까요?" }
];

export const DEFAULT_CONFIG = {
  questions: DEFAULT_QUESTIONS,
  qVersion: Q_VERSION,
  ciphers: DEFAULT_CIPHERS,
  pentoPuzzles: [...Array(18).keys()], // 가족이 고를 수 있는 퍼즐 번호 (기본: 18개 모두)
  pentoMode: "group",   // group: 서로 다른 조각 수 묶음 N개 / count: 아무 퍼즐이나 N개
  pentoGroupNeed: 3,    // group 방식: 서로 다른 조각 수 묶음을 몇 가지 해야 통과하는지
  pentoNeed: 3,         // count 방식에서 통과에 필요한 퍼즐 수
  pentoTimePublic: false, // 「팀별 발자취」에 가족별 걸린 시간 보여 주기
  pentoTimerShow: true,   // 가족 화면 펜토미노 미션에 타이머 보여 주기
  lawnArea: 1400,         // 스페이스 허브 초록 잔디밭의 실제 넓이(㎡, 175m × 8m) — 가족이 답을 낸 뒤 비교용으로 보여 줘요
  startPw: 1121,          // 선생님이 처음 나눠 주는 비밀번호 (이 번호로 로그인하면 바꾸라고 안내해요)
  // AI 꽃 세기 Apps Script 웹앱 주소 (관리자 화면에서 바꿀 수 있어요)
  gasUrl: "https://script.google.com/macros/s/AKfycbyt01DVZvpM_9gmX4aNmFDlQXtAExeKE7Pt01fOgaXbbSf03cRKBt0fzrQB_6F9u58/exec"
};

export function withDefaults(cfg) {
  const c = { ...DEFAULT_CONFIG, ...(cfg || {}) };
  if (!Array.isArray(c.ciphers) || !c.ciphers.length) c.ciphers = DEFAULT_CIPHERS;
  if (!Array.isArray(c.questions) || !c.questions.length) c.questions = DEFAULT_QUESTIONS;
  // 예전 구성(새 워크북 이전)이면 새 미션 구성으로 바꾸고, 관리자가 추가한 미션은 마무리 앞에 그대로 둬요
  if ((Number(cfg?.qVersion) || 1) < Q_VERSION) {
    const custom = c.questions.filter((q) => !BUILTIN[q.kind]).map((q) => ({ place: "p4", ...q }));
    const base = DEFAULT_QUESTIONS.map((q) => ({ ...q }));
    const at = base.findIndex((q) => q.kind === "fun");
    base.splice(at, 0, ...custom);
    c.questions = base;
  }
  if (!c.gasUrl) c.gasUrl = DEFAULT_CONFIG.gasUrl; // 비워 두면 기본 주소를 써요
  return c;
}

export const isBuiltin = (q) => !!BUILTIN[q.kind];

// 펜토미노 퍼즐의 조각 수 (2~8)
export const pzGroup = (i) => (PUZZLES[i]?.pieces || "").length;

// 펜토미노 설정
//  mode "group": 서로 다른 조각 수 묶음(2조각, 3조각 …)에서 퍼즐을 하나씩, 모두 need가지 완성하면 통과
//  mode "count": 아무 퍼즐이나 need개 완성하면 통과
//  어느 방식이든 퍼즐은 잠기지 않아요 — 여러 퍼즐에 마음껏 도전할 수 있어요
export function pentoSettings(cfg) {
  let list = Array.isArray(cfg?.pentoPuzzles) && cfg.pentoPuzzles.length ? cfg.pentoPuzzles.map(Number) : [...Array(18).keys()];
  list = [...new Set(list)].filter((i) => i >= 0 && i < 18).sort((a, b) => a - b);
  const mode = cfg?.pentoMode === "count" ? "count" : "group";
  const groupsAvail = [...new Set(list.map(pzGroup))].length;
  const need = mode === "group"
    ? Math.max(1, Math.min(groupsAvail, Number(cfg?.pentoGroupNeed) || 3))
    : Math.max(1, Math.min(list.length, Number(cfg?.pentoNeed) || 3));
  return { list, need, mode };
}

// 진행 상황: 몇 개 채웠는지, 통과했는지, 해결한 조각 수 묶음
export function pentoProgress(solved, st) {
  const done = Object.keys(solved || {}).map(Number).filter((i) => st.list.includes(i));
  const doneGroups = [...new Set(done.map(pzGroup))];
  const count = st.mode === "group" ? doneGroups.length : done.length;
  return { count, need: st.need, passed: count >= st.need, doneGroups, done };
}
// 펜토미노 답 → { 퍼즐번호: { grid } } (예전 한 문제 방식 답도 읽어요)
export function pentoSolved(d) {
  if (!d) return {};
  if (d.solved && typeof d.solved === "object") return d.solved;
  if (Array.isArray(d.grid) && d.puzzle != null) return { [d.puzzle]: { grid: d.grid } };
  return {};
}
export const qPlace = (q) => { const k = q.place || BUILTIN[q.kind]?.place; return PLACES[k] ? k : "p4"; };
export const qCode = (q) => q.code ?? BUILTIN[q.kind]?.code ?? "";
export const qTitle = (q) => q.title || BUILTIN[q.kind]?.title || "새 문제";
export const qDesc = (q) => (q.desc ?? BUILTIN[q.kind]?.desc) || "";
export const qIcon = (q) => BUILTIN[q.kind]?.icon || ({ number: "🔢", text: "📝", choice: "☑️", photo: "📷" }[q.kind] || "❓");
export const visibleQs = (cfg) => withDefaults(cfg).questions.filter((q) => !q.hidden);
// "가장 재미있었던 활동"에서 고를 수 있는 활동 (활동 문제 + 관리자가 추가한 문제)
export const funOptions = (cfg) => visibleQs(cfg).filter((q) => BUILTIN[q.kind]?.activity || !isBuiltin(q));

// 펜토미노 12조각
export const PIECES = {
  F: [[0, 1], [0, 2], [1, 0], [1, 1], [2, 1]],
  I: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
  L: [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1]],
  N: [[0, 1], [1, 1], [2, 0], [2, 1], [3, 0]],
  P: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0]],
  T: [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]],
  U: [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]],
  V: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
  W: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]],
  X: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]],
  Y: [[0, 1], [1, 0], [1, 1], [2, 1], [3, 1]],
  Z: [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]]
};
export const PIECE_COLORS = {
  F: "#F47C7C", I: "#F9C74F", L: "#2EC4B6", N: "#9B8AFB", P: "#F78FB3", T: "#5AA9F0",
  U: "#FF9F43", V: "#A3D9A5", W: "#E58BEB", X: "#7BD389", Y: "#C08552", Z: "#C3A5FF"
};

// 시저 암호: 열쇠 글자(KEY) → 몇 칸 밀었는지 (A=0, B=1 …)
export const keyShift = (k) => { const ch = String(k || "").trim().toUpperCase(); return /^[A-Z]$/.test(ch) ? ch.charCodeAt(0) - 65 : null; };
export const caesar = (t, sh) => String(t || "").toUpperCase().replace(/[A-Z]/g, (ch) => String.fromCharCode((ch.charCodeAt(0) - 65 + sh + 260) % 26 + 65));
export const normText = (t) => String(t || "").toUpperCase().replace(/\s+/g, " ").trim();
// 피보나치 수인지
export const FIBS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
