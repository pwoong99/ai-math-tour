// 미션 문제 정의 — 기본 문제(활동지 순서)와 관리자가 추가하는 문제 형식
// 관리자 화면에서 순서·숨김·제목·안내 글을 바꾸면 mathTour_config/main 에 저장돼요.

export const BUILTIN = {
  euler: {
    title: "오일러와 한붓그리기",
    icon: "✏️",
    activity: true,
    desc: "점에 모인 선이 짝수 개면 짝수점, 홀수 개면 홀수점이에요. 홀수점이 0개 또는 2개면 한붓그리기를 할 수 있고, 3개 이상이면 할 수 없어요. 아래 도형은 한붓그리기가 가능할까요?"
  },
  cipher: {
    title: "스페이스 암호 해독",
    icon: "🛸",
    activity: true,
    desc: "우주 탐험대가 보낸 비밀 편지가 시저 암호로 잠겨 있어요. 암호판을 돌려 원래 문장을 찾아보세요."
  },
  latin: {
    title: "라틴방진 스마트톡 만들기",
    icon: "🐢",
    activity: true,
    desc: "가로줄·세로줄에 같은 색이 한 번씩만 들어가게 설계한 우리 가족 스마트톡을 사진으로 찍어 올려 주세요."
  },
  food: {
    title: "동물 친구 웰빙 계산기",
    icon: "🦊",
    activity: true,
    desc: "사막여우 1마리에게 하루 먹이 150g을 줄 때, 4마리가 함께 지내면 하루에 필요한 먹이는 모두 몇 g일까요? (1 : 150 = 4 : □)"
  },
  stride: {
    title: "내 보폭으로 재어보는 산책로",
    icon: "👣",
    activity: true,
    desc: "1보는 오른발에서 다시 오른발이 닿을 때까지의 길이예요. 4보 길이 ÷ 4 = 내 1보! 내 보폭으로 구한 거리와 GPS 앱 거리를 비교해 보세요."
  },
  quadrat: {
    title: "방형구법과 국화꽃 송이 맞히기",
    icon: "🌼",
    activity: true,
    desc: "20cm × 20cm 방형구 안의 꽃을 세고, 방형구 25개 = 1㎡ 라는 사실을 이용해 넓은 꽃밭 전체의 꽃 수를 어림해요."
  },
  fibo: {
    title: "자연 속 피보나치 수와 황금비",
    icon: "🌻",
    activity: true,
    desc: "1, 1, 2, 3, 5, 8, 13 … 꽃잎 수에도 피보나치 수가 숨어 있어요. 식물 인식 AI로 이름을 찾고 꽃잎 수를 세어 보세요."
  },
  pento: {
    title: "펜토미노 퍼즐",
    icon: "🧩",
    activity: true,
    desc: "실물 펜토미노 조각으로 먼저 퍼즐을 풀고, 같은 모양으로 아래 판에도 놓아 보세요. 빈칸 없이 모두 채우면 통과예요!"
  },
  fun: {
    title: "가장 재미있었던 활동",
    icon: "🎉",
    desc: "오늘 재미있었던 활동을 모두 골라 주세요. (여러 개 고를 수 있어요)"
  },
  scale: {
    title: "오늘 활동 만족도",
    icon: "⭐",
    desc: "오늘 사용한 앱과 데이터 모으기 활동이 수학을 이해하는 데 도움이 되고 즐거웠나요? (이 답은 선생님만 볼 수 있어요)"
  },
  comment: {
    title: "소감 한마디",
    icon: "💌",
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

export const DEFAULT_QUESTIONS = [
  "euler", "cipher", "latin", "food", "stride", "quadrat", "fibo", "pento", "fun", "scale", "comment"
].map((k) => ({ id: "q_" + k, kind: k, hidden: false }));

export const DEFAULT_CONFIG = {
  questions: DEFAULT_QUESTIONS,
  cipher: {
    text: "AI PSZI QEXL",
    key: "?",
    hint: "열쇠를 몰라요! 힌트: 원래 첫 글자 W가 암호에서는 A로 바뀌었어요. 몇 칸 밀었을까요?",
    answer: "WE LOVE MATH",
    answerK: 4
  },
  quadratArea: 20,      // 주최측이 알려 주는 꽃밭 영역 넓이(㎡)
  pentoPuzzle: 7,       // PUZZLES 번호 (기본: 4조각 ① 우주선)
  pentoTimePublic: false,
  // AI 꽃 세기 Apps Script 웹앱 주소 (관리자 화면에서 바꿀 수 있어요)
  gasUrl: "https://script.google.com/macros/s/AKfycbyt01DVZvpM_9gmX4aNmFDlQXtAExeKE7Pt01fOgaXbbSf03cRKBt0fzrQB_6F9u58/exec"
};

export function withDefaults(cfg) {
  const c = { ...DEFAULT_CONFIG, ...(cfg || {}) };
  c.cipher = { ...DEFAULT_CONFIG.cipher, ...(cfg?.cipher || {}) };
  if (!Array.isArray(c.questions) || !c.questions.length) c.questions = DEFAULT_QUESTIONS;
  if (!c.gasUrl) c.gasUrl = DEFAULT_CONFIG.gasUrl; // 비워 두면 기본 주소를 써요
  return c;
}

export const isBuiltin = (q) => !!BUILTIN[q.kind];
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
