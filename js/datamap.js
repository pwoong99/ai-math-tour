// 우리가족 'AI투어 데이터 맵' — ★ 숫자 9개로 만드는 5장면 사진 (숫자 → 정리 → 그림 → 규칙 → 리포트)
import { PLACES, FIBS, pentoSolved } from "./questions.js?v=3.19";

const FONT = `"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
const W = 1080, H = 1350;
const INK = "#1f2a5c", SUB = "#4d5a80", GREEN = "#1f2a5c", ORANGE = "#e5484d", CREAM = "#fbfaf5", LINE = "#c9d2e6", YELLOW = "#ffd84d";

// ★ 데이터 맵에 쓰이는 숫자 9개 (최종 워크북 29쪽 체크리스트 순서)
const n0 = (v) => v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null;
export const STAR_ITEMS = [
  { k: "food", label: "사막여우 4마리의 하루 먹이량", short: "여우 4마리 먹이", unit: "g", place: "p2", get: (m) => m.food?.q1 },
  { k: "step", label: "내 1보 길이", short: "내 1보", unit: "cm", place: "p3", get: (m) => m.stride?.me1 },
  { k: "steps", label: "어린이동물원~스페이스 허브 구간, 내 걸음 보 수", short: "구간 보 수", unit: "보", place: "p3", get: (m) => m.stride?.steps },
  { k: "map", label: "같은 구간을 지도 앱으로 잰 거리", short: "지도 앱 거리", unit: "m", place: "p3", get: (m) => m.stride?.map },
  { k: "eye", label: "내가 직접 센 꽃 수", short: "직접 센 꽃", unit: "송이", place: "p3", get: (m) => m.quadrat?.eye },
  { k: "ai", label: "AI가 센 꽃 수", short: "AI가 센 꽃", unit: "송이", place: "p3", get: (m) => m.quadrat?.aiCount },
  { k: "lawn", label: "스페이스 허브 잔디밭 넓이 (가장 믿는 값)", short: "잔디밭 넓이", unit: "㎡", place: "p3", get: (m) => m.area?.bestArea },
  { k: "cw", label: "솔방울 나선, 시계 방향 줄 수", short: "시계 방향 나선", unit: "줄", place: "p4", get: (m) => m.fibo?.cw },
  { k: "ccw", label: "솔방울 나선, 시계 반대 방향 줄 수", short: "반대 방향 나선", unit: "줄", place: "p4", get: (m) => m.fibo?.ccw }
];
export const STAR_KINDS = ["food", "stride", "quadrat", "area", "fibo", "pento"];
const unitOf = (it, m) => typeof it.unit === "function" ? it.unit(m) : it.unit;
// ★ 숫자 + 그림·규칙에 쓰는 계산값 (보폭 거리, 국화 송이 수)
export function starValues(m) {
  const o = {};
  STAR_ITEMS.forEach((it) => o[it.k] = n0(it.get(m || {})));
  o.walk = o.step != null && o.steps != null ? Math.round(o.step * o.steps) / 100 : n0(m?.stride?.walk);
  o.perM2 = n0(m?.area?.perM2 ?? m?.quadrat?.perM2);
  o.total = n0(m?.area?.total);
  return o;
}

const num = (v, d = 1) => v == null || !Number.isFinite(v) ? "-" : (Math.round(v * 10 ** d) / 10 ** d).toLocaleString();
const avg = (a) => { const b = a.filter((x) => x != null && Number.isFinite(x)); return b.length ? b.reduce((x, y) => x + y, 0) / b.length : null; };

/* ── 그림 도구 ── */
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }
function txt(c, s, x, y, { size = 32, weight = 700, color = INK, align = "left", max } = {}) {
  c.font = `${weight} ${size}px ${FONT}`; c.fillStyle = color; c.textAlign = align; c.textBaseline = "alphabetic";
  if (max) { let t = String(s); while (c.measureText(t).width > max && t.length > 1) t = t.slice(0, -1); if (t !== String(s)) t = t.slice(0, -1) + "…"; c.fillText(t, x, y); return; }
  c.fillText(String(s), x, y);
}
function wrap(c, s, maxW, size, weight = 600) {
  c.font = `${weight} ${size}px ${FONT}`;
  const out = []; let line = "";
  for (const ch of String(s)) {
    if (ch === "\n") { out.push(line); line = ""; continue; }
    if (c.measureText(line + ch).width > maxW) { out.push(line); line = ch.trim() ? ch : ""; } else line += ch;
  }
  if (line) out.push(line);
  return out;
}
const SCENES = ["숫자", "정리", "그림", "규칙", "리포트"];
function frame(c, idx, title, sub, who) {
  c.fillStyle = CREAM; c.fillRect(0, 0, W, H);
  // 모눈종이
  c.strokeStyle = "#e2e8f3"; c.lineWidth = 2;
  for (let x = 0; x <= W; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  for (let y = 0; y <= H; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  c.fillStyle = GREEN; c.fillRect(0, 0, W, 210);
  txt(c, "우리가족 ‘AI투어 데이터 맵’", 60, 82, { size: 40, weight: 900, color: "#fff" });
  txt(c, `${idx + 1} / 5`, W - 60, 82, { size: 34, weight: 800, color: YELLOW, align: "right" });
  // 5장면 단계
  const sw = (W - 120) / 5;
  SCENES.forEach((s, i) => {
    const x = 60 + i * sw;
    rr(c, x + 4, 112, sw - 8, 64, 12); c.fillStyle = i === idx ? YELLOW : "rgba(255,255,255,.12)"; c.fill();
    txt(c, `${i + 1} ${s}`, x + sw / 2, 155, { size: 28, weight: 800, color: i === idx ? GREEN : "#dfe5f5", align: "center" });
    if (i < 4) txt(c, "→", x + sw, 155, { size: 24, weight: 800, color: "#9aa8d6", align: "center" });
  });
  txt(c, title, 60, 290, { size: 54, weight: 900 });
  if (sub) txt(c, sub, 60, 340, { size: 28, weight: 600, color: SUB, max: W - 120 });
  // 아래
  c.fillStyle = "#eef1fb"; c.fillRect(0, H - 86, W, 86);
  c.fillStyle = GREEN; c.fillRect(0, H - 86, W, 3);
  txt(c, `${who.school} ${who.name} 가족 · ${who.date}`, 60, H - 34, { size: 26, weight: 700, color: SUB, max: 640 });
  txt(c, "순천수학교육체험센터", W - 60, H - 34, { size: 26, weight: 800, color: GREEN, align: "right" });
}

/* 1. 숫자 */
function scene1(c, d) {
  frame(c, 0, `우리 가족이 모은 숫자 ${STAR_ITEMS.length}개`, "걸음을 재고, 꽃을 세고, 넓이를 재고, 솔방울 나선을 세어 모은 데이터예요.", d.who);
  const cw = (W - 120 - 40) / 3, ch = 262;
  STAR_ITEMS.forEach((it, i) => {
    const x = 60 + (i % 3) * (cw + 20), y = 380 + Math.floor(i / 3) * (ch + 20);
    rr(c, x, y, cw, ch, 26); c.fillStyle = "#fff"; c.fill(); c.strokeStyle = GREEN; c.lineWidth = 3; c.stroke();
    c.fillStyle = PLACES[it.place].color; rr(c, x, y, 14, ch, 7); c.fill();
    txt(c, `${PLACES[it.place].no} ${it.short}`, x + 34, y + 58, { size: 27, weight: 800, color: SUB, max: cw - 96 });
    const v = d.mine[it.k];
    txt(c, num(v, 2), x + 34, y + 176, { size: 72, weight: 900, color: v == null ? "#b8b2a4" : INK, max: cw - 120 });
    c.font = `900 72px ${FONT}`;
    const vw = Math.min(c.measureText(num(v, 2)).width, cw - 120);
    txt(c, unitOf(it, d.m), x + 44 + vw, y + 176, { size: 32, weight: 800, color: SUB });
    txt(c, "★", x + cw - 24, y + 52, { size: 30, weight: 900, color: "#e0a800", align: "right" });
  });
}

/* 2. 정리 */
function scene2(c, d) {
  frame(c, 1, "표로 정리하기", `우리 가족 숫자를 ${d.sessName} ${d.n}가족의 숫자와 나란히 놓았어요.`, d.who);
  const x0 = 60, cols = [x0, 480, 670, 850], top = 450, rh = 72;
  rr(c, x0, top - 60, W - 120, 64, 12); c.fillStyle = GREEN; c.fill();
  ["항목", "우리 가족", "모두의 평균", "범위"].forEach((h, i) => txt(c, h, i ? cols[i] + 80 : cols[0] + 22, top - 17, { size: 26, weight: 800, color: "#fff", align: i ? "center" : "left" }));
  let lastPlace = "";
  STAR_ITEMS.forEach((it, i) => {
    const y = top + 14 + i * rh;
    c.fillStyle = i % 2 ? "#fff" : "#f4f6fc"; c.fillRect(x0, y, W - 120, rh);
    if (it.place !== lastPlace) { lastPlace = it.place; c.fillStyle = PLACES[it.place].color; c.fillRect(x0, y, 8, rh); }
    else { c.fillStyle = PLACES[it.place].color; c.fillRect(x0, y, 8, rh); }
    const u = unitOf(it, d.m), all = d.all.map((r) => r[it.k]).filter((v) => v != null);
    txt(c, it.short, cols[0] + 24, y + 46, { size: 28, weight: 700, max: 380 });
    txt(c, d.mine[it.k] == null ? "-" : `${num(d.mine[it.k], 2)}${u}`, cols[1] + 80, y + 46, { size: 30, weight: 900, color: ORANGE, align: "center", max: 180 });
    txt(c, all.length ? `${num(avg(all))}${u}` : "-", cols[2] + 80, y + 46, { size: 28, weight: 800, align: "center", max: 170 });
    txt(c, all.length ? `${num(Math.min(...all))}~${num(Math.max(...all))}` : "-", cols[3] + 85, y + 46, { size: 24, weight: 700, color: SUB, align: "center", max: 160 });
  });
  const y = top + 14 + STAR_ITEMS.length * rh + 38;
  wrap(c, "같은 항목끼리 모아 표로 정리하면 많은 숫자도 한눈에 비교할 수 있어요. AI도 이렇게 데이터를 정리하는 것부터 시작해요.", W - 120, 27).forEach((l, i) => txt(c, l, 60, y + i * 36, { size: 25, weight: 600, color: SUB }));
}

/* 3. 그림 */
function strip(c, x, y, w, vals, mine, unit, title) {
  rr(c, x, y, w, 330, 24); c.fillStyle = "#fff"; c.fill(); c.strokeStyle = GREEN; c.lineWidth = 3; c.stroke();
  txt(c, title, x + 26, y + 52, { size: 28, weight: 900, max: w - 50 });
  const v = vals.filter((a) => a != null);
  if (!v.length) { txt(c, "자료가 아직 없어요", x + w / 2, y + 190, { size: 24, color: SUB, align: "center" }); return; }
  const lo = Math.min(...v, mine ?? Infinity), hi = Math.max(...v, mine ?? -Infinity), span = hi - lo || 1;
  const X = (a) => x + 40 + (a - lo) / span * (w - 80);
  c.strokeStyle = LINE; c.lineWidth = 6; c.beginPath(); c.moveTo(x + 30, y + 220); c.lineTo(x + w - 30, y + 220); c.stroke();
  const stack = {};
  v.forEach((a) => { const k = Math.round(X(a) / 18); stack[k] = (stack[k] || 0) + 1; c.fillStyle = "rgba(31,42,92,.45)"; c.beginPath(); c.arc(X(a), y + 220 - (stack[k] - 1) * 20 - 14, 10, 0, 7); c.fill(); });
  const av = avg(v);
  c.strokeStyle = GREEN; c.lineWidth = 3; c.setLineDash([8, 6]); c.beginPath(); c.moveTo(X(av), y + 100); c.lineTo(X(av), y + 236); c.stroke(); c.setLineDash([]);
  txt(c, `평균 ${num(av)}${unit}`, X(av), y + 92, { size: 22, weight: 800, color: GREEN, align: "center" });
  if (mine != null) {
    c.fillStyle = ORANGE; c.beginPath(); c.arc(X(mine), y + 264, 16, 0, 7); c.fill();
    txt(c, `우리 ${num(mine)}${unit}`, Math.min(Math.max(X(mine), x + 90), x + w - 90), y + 314, { size: 26, weight: 900, color: ORANGE, align: "center" });
  }
}
function pairBars(c, x, y, w, title, items, unit) {
  rr(c, x, y, w, 330, 24); c.fillStyle = "#fff"; c.fill(); c.strokeStyle = GREEN; c.lineWidth = 3; c.stroke();
  txt(c, title, x + 26, y + 52, { size: 28, weight: 900, max: w - 50 });
  const mx = Math.max(1, ...items.flatMap((it) => [it.v ?? 0, it.avg ?? 0]));
  items.forEach((it, i) => {
    const yy = y + 100 + i * 112;
    txt(c, it.name, x + 26, yy + 8, { size: 24, weight: 800, color: it.color });
    const bw = w - 210;
    c.fillStyle = "#f0ece1"; rr(c, x + 26, yy + 22, bw, 30, 15); c.fill();
    if (it.v != null) { c.fillStyle = it.color; rr(c, x + 26, yy + 22, Math.max(18, it.v / mx * bw), 30, 15); c.fill(); }
    txt(c, it.v == null ? "-" : `${num(it.v)}${unit}`, x + w - 26, yy + 46, { size: 26, weight: 900, align: "right" });
    if (it.avg != null) {
      const ax = x + 26 + it.avg / mx * bw;
      c.strokeStyle = GREEN; c.lineWidth = 3; c.beginPath(); c.moveTo(ax, yy + 16); c.lineTo(ax, yy + 58); c.stroke();
      txt(c, `평균 ${num(it.avg)}`, Math.min(ax, x + bw - 20), yy + 82, { size: 20, weight: 700, color: GREEN, align: "center" });
    }
  });
}
function scene3(c, d) {
  frame(c, 2, "그림으로 보기", "빨강 = 우리 가족, 남색 선 = 모든 가족의 평균이에요.", d.who);
  const m = d.mine, A = (k) => avg(d.all.map((r) => r[k]));
  const cw = (W - 120 - 24) / 2;
  strip(c, 60, 380, cw, d.all.map((r) => r.step), m.step, "cm", "① 1보 길이, 우리는 어디쯤?");
  pairBars(c, 60 + cw + 24, 380, cw, "② 거리: 보 수 × 1보 vs 지도 앱", [{ name: "내 보폭 (계산)", v: m.walk, avg: A("walk"), color: ORANGE }, { name: "지도 앱", v: m.map, avg: A("map"), color: "#3a7bd5" }], "m");
  pairBars(c, 60, 734, cw, "③ 꽃 세기: 나 vs AI", [{ name: "내가 센 꽃", v: m.eye, avg: A("eye"), color: GREEN }, { name: "AI가 센 꽃", v: m.ai, avg: A("ai"), color: "#8e5cd9" }], "송이");
  pairBars(c, 60 + cw + 24, 734, cw, "④ 잔디밭 넓이: 우리 vs 실제", [{ name: "우리가 잰 넓이", v: m.lawn, avg: A("lawn"), color: ORANGE }, { name: `실제 넓이 (175m × 8m)`, v: d.lawnArea, color: "#17795a" }], "㎡");
  // ⑤ 솔방울 나선 — 피보나치 수직선 위에 표시
  const y = 1088;
  rr(c, 60, y, W - 120, 160, 24); c.fillStyle = "#fff"; c.fill(); c.strokeStyle = GREEN; c.lineWidth = 3; c.stroke();
  txt(c, `⑤ 솔방울 나선: 시계 방향 ${num(m.cw, 0)}줄 · 시계 반대 방향 ${num(m.ccw, 0)}줄`, 86, y + 48, { size: 27, weight: 900, max: W - 180 });
  const fib = [1, 2, 3, 5, 8, 13, 21, 34], x0 = 120, x1 = W - 140;
  const fx = (i) => x0 + i / (fib.length - 1) * (x1 - x0);
  c.strokeStyle = LINE; c.lineWidth = 5; c.beginPath(); c.moveTo(x0, y + 100); c.lineTo(x1, y + 100); c.stroke();
  fib.forEach((f, i) => {
    const on = f === m.cw || f === m.ccw;
    c.fillStyle = on ? (f === m.cw ? "#e53935" : "#1e66d0") : "#fff"; c.strokeStyle = GREEN; c.lineWidth = 3;
    c.beginPath(); c.arc(fx(i), y + 100, on ? 20 : 13, 0, 7); c.fill(); c.stroke();
    txt(c, f, fx(i), y + 146, { size: 22, weight: 800, color: on ? INK : SUB, align: "center" });
  });
}

/* 4. 규칙 */
function scene4(c, d) {
  frame(c, 3, "숫자 속 규칙 찾기", "우리 가족 숫자에 숨어 있는 수학 규칙이에요.", d.who);
  const m = d.mine, L = d.lawnArea;
  const lo = Math.min(m.cw ?? 0, m.ccw ?? 0), hi = Math.max(m.cw ?? 0, m.ccw ?? 0), i = FIBS.indexOf(lo);
  const nb = m.cw != null && m.ccw != null && i >= 0 && FIBS[i + 1] === hi;
  const rules = [
    ["비례식", m.food != null ? `1 : 150 = 4 : ${num(m.food)}  →  한 마리당 ${num(m.food / 4)}g` : "자료가 없어요", "마릿수가 달라져도 한 마리당 먹이량(비율)은 같아요.", PLACES.p2.color],
    ["대응 규칙  거리 = 1보 × 보 수", m.step != null && m.steps != null ? `${num(m.step)}cm × ${num(m.steps, 0)}보 = ${num(m.walk)}m` : "자료가 없어요",
      m.walk != null && m.map ? `지도 앱 ${num(m.map)}m와 ${num(Math.abs(m.walk - m.map))}m 차이 (오차 약 ${num(Math.abs(m.walk - m.map) / m.map * 100)}%)` : "", PLACES.p3.color],
    ["표본 조사 (방형구법)", m.eye != null ? `${num(m.eye, 0)}송이 × 25 = 1㎡당 ${num(m.eye * 25, 0)}송이` : "자료가 없어요", "방형구 25개 = 1m × 1m = 1㎡", PLACES.p3.color],
    ["사람과 AI", m.eye != null && m.ai != null ? `내가 센 꽃 ${num(m.eye, 0)}송이 · AI ${num(m.ai, 0)}송이` : "자료가 없어요",
      m.eye != null && m.ai != null ? (m.eye === m.ai ? "AI와 똑같이 셌어요! 그래도 최종 확인은 내가!" : `${num(Math.abs(m.eye - m.ai), 0)}송이 차이 — AI는 보조, 최종 확인은 내가 해요.`) : "", PLACES.p3.color],
    ["넓이 재기", m.lawn != null ? `우리가 잰 넓이 ${num(m.lawn)}㎡ · 실제 ${num(L, 0)}㎡` : "자료가 없어요",
      m.lawn != null && L ? `실제 넓이(175m × 8m)와 ${num(Math.abs(m.lawn - L))}㎡ 차이 (오차 약 ${num(Math.abs(m.lawn - L) / L * 100)}%)` : "", PLACES.p3.color],
    ["국화를 심는다면?", m.perM2 != null && m.lawn != null ? `${num(m.perM2, 0)}송이 × ${num(m.lawn)}㎡ = 약 ${num(m.total ?? m.perM2 * m.lawn, 0)}송이` : "자료가 없어요",
      m.perM2 != null && L ? `실제 넓이로 계산하면 ${num(m.perM2, 0)} × ${num(L, 0)} = 약 ${num(m.perM2 * L, 0)}송이` : "", PLACES.p3.color],
    ["피보나치 수 (솔방울)", m.cw != null && m.ccw != null ? `시계 방향 ${num(m.cw, 0)}줄 · 시계 반대 방향 ${num(m.ccw, 0)}줄` : "자료가 없어요",
      m.cw != null && m.ccw != null ? (nb ? `${lo}와 ${hi}는 이웃한 피보나치 수예요!` : "1, 1, 2, 3, 5, 8, 13, 21 … 앞의 두 수를 더하면 다음 수!") : "", PLACES.p4.color]
  ];
  const rh = 114;
  rules.forEach(([t, f, s, col], i) => {
    const y = 376 + i * (rh + 10);
    rr(c, 60, y, W - 120, rh, 22); c.fillStyle = "#fff"; c.fill(); c.strokeStyle = GREEN; c.lineWidth = 3; c.stroke();
    c.fillStyle = col; rr(c, 60, y, 12, rh, 6); c.fill();
    txt(c, t, 94, y + 36, { size: 23, weight: 800, color: col });
    txt(c, f, 94, y + 74, { size: 31, weight: 900, max: W - 200 });
    if (s) txt(c, s, 94, y + 103, { size: 22, weight: 600, color: SUB, max: W - 200 });
  });
}

/* 5. 리포트 */
function scene5(c, d) {
  frame(c, 4, "우리 가족 AI투어 리포트", `${d.sessName} ${d.n}가족의 데이터와 함께 만든 이야기예요.`, d.who);
  const m = d.mine, q = d.m, L = d.lawnArea;
  const rank = (k) => {
    const v = d.all.map((r) => r[k]).filter((x) => x != null).sort((a, b) => b - a);
    return m[k] == null || !v.length ? null : v.indexOf(m[k]) + 1;
  };
  const lines = [];
  if (m.step != null) lines.push(["👣", `우리 1보는 ${num(m.step)}cm! ${d.n}가족 중 ${rank("step")}번째로 길어요.`]);
  if (m.walk != null && m.map) lines.push(["🗺", `${num(m.steps, 0)}보로 걸은 거리는 ${num(m.walk)}m, 지도 앱은 ${num(m.map)}m — 오차는 약 ${num(Math.abs(m.walk - m.map) / m.map * 100)}%예요.`]);
  if (m.eye != null && m.ai != null) lines.push(["🤖", m.eye === m.ai ? `방형구 속 국화를 AI와 똑같이 ${num(m.eye, 0)}송이로 셌어요.` : `방형구 속 국화를 우리는 ${num(m.eye, 0)}송이, AI는 ${num(m.ai, 0)}송이로 셌어요.`]);
  if (m.lawn != null) lines.push(["📐", `잔디밭 넓이를 ${num(m.lawn)}㎡로 쟀어요. 실제 넓이는 약 ${num(L, 0)}㎡(175m × 8m)예요.`]);
  if (m.total != null) lines.push(["🌼", `그 잔디밭에 국화를 심는다면 약 ${num(m.total, 0)}송이를 심을 수 있어요.`]);
  if (m.food != null) lines.push(["🦊", `사막여우 4마리에게는 하루 ${num(m.food)}g의 먹이가 필요해요.`]);
  if (m.cw != null && m.ccw != null) lines.push(["🌲", `솔방울 나선은 시계 방향 ${num(m.cw, 0)}줄, 시계 반대 방향 ${num(m.ccw, 0)}줄이었어요.`]);
  const pz = Object.keys(pentoSolved(q.pento)).length;
  if (pz) lines.push(["🧩", `펜토미노 퍼즐 ${pz}개를 가족이 힘을 모아 완성했어요.`]);
  const boxH = 150, limit = H - 86 - boxH - 24;
  let y = 378;
  for (const [ic, s] of lines) {
    const ls = wrap(c, s, W - 230, 28, 700);
    const h = Math.max(78, 30 + ls.length * 38);
    if (y + h > limit) break;
    rr(c, 60, y, W - 120, h, 20); c.fillStyle = "#fff"; c.fill(); c.strokeStyle = GREEN; c.lineWidth = 3; c.stroke();
    txt(c, ic, 90, y + h / 2 + 13, { size: 36, weight: 400 });
    ls.forEach((l, i) => txt(c, l, 156, y + h / 2 + 10 - (ls.length - 1) * 19 + i * 38, { size: 28, weight: 700 }));
    y += h + 10;
  }
  const by = Math.max(y + 6, limit - 40);
  rr(c, 60, by, W - 120, boxH, 16); c.fillStyle = GREEN; c.fill();
  txt(c, "정직한 숫자가 좋은 AI를 만들어요!", W / 2, by + 62, { size: 38, weight: 900, color: "#ffd84d", align: "center" });
  wrap(c, `우리 가족 숫자 ${STAR_ITEMS.filter((it) => m[it.k] != null).length}개가 다른 가족의 숫자와 합쳐져 순천 AI 데이터 맵이 돼요.`, W - 200, 25).forEach((l, i) =>
    txt(c, l, W / 2, by + 104 + i * 32, { size: 25, weight: 600, color: "#e7ecff", align: "center" }));
}

export async function drawDataMap({ who, sessName, m, all, lawnArea = 1400 }) {
  try { await document.fonts.ready; } catch { /* 글꼴을 기다리지 못해도 그려요 */ }
  const mine = starValues(m);
  const d = { who, sessName, m, mine, all, lawnArea: Number(lawnArea) || null, n: Math.max(all.length, 1) };
  return [scene1, scene2, scene3, scene4, scene5].map((fn) => {
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    fn(cv.getContext("2d"), d);
    return cv;
  });
}
export const SCENE_NAMES = SCENES;

// 5장면을 한 장에 모아 보기 (2칸 × 3줄, 마지막 칸은 제목 카드)
export function drawOverview(canvases, who) {
  const cw = 540, ch = 675, gap = 24, pad = 30, top = 150;
  const cv = document.createElement("canvas");
  cv.width = pad * 2 + cw * 2 + gap; cv.height = top + (ch + gap) * 3 - gap + pad + 70;
  const c = cv.getContext("2d");
  c.fillStyle = CREAM; c.fillRect(0, 0, cv.width, cv.height);
  c.strokeStyle = "#e2e8f3"; c.lineWidth = 2;
  for (let x = 0; x <= cv.width; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, cv.height); c.stroke(); }
  for (let y = 0; y <= cv.height; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(cv.width, y); c.stroke(); }
  c.fillStyle = GREEN; c.fillRect(0, 0, cv.width, 120);
  txt(c, "우리가족 ‘AI투어 데이터 맵’ 한눈에 보기", pad + 6, 76, { size: 42, weight: 900, color: "#fff", max: cv.width - 2 * pad });
  canvases.slice(0, 5).forEach((s, i) => {
    const x = pad + (i % 2) * (cw + gap), y = top + Math.floor(i / 2) * (ch + gap);
    c.fillStyle = GREEN; rr(c, x + 7, y + 7, cw, ch, 14); c.fill();
    c.save(); rr(c, x, y, cw, ch, 14); c.clip(); c.drawImage(s, x, y, cw, ch); c.restore();
    c.strokeStyle = GREEN; c.lineWidth = 3; rr(c, x, y, cw, ch, 14); c.stroke();
  });
  // 6번째 칸: 제목 카드
  const x = pad + cw + gap, y = top + 2 * (ch + gap);
  c.fillStyle = GREEN; rr(c, x, y, cw, ch, 14); c.fill();
  txt(c, "숫자 → 정리 → 그림", x + cw / 2, y + 190, { size: 40, weight: 900, color: YELLOW, align: "center" });
  txt(c, "→ 규칙 → 리포트", x + cw / 2, y + 245, { size: 40, weight: 900, color: YELLOW, align: "center" });
  txt(c, who.school, x + cw / 2, y + 360, { size: 34, weight: 800, color: "#fff", align: "center", max: cw - 60 });
  txt(c, `${who.name} 가족`, x + cw / 2, y + 412, { size: 40, weight: 900, color: "#fff", align: "center", max: cw - 60 });
  txt(c, who.date, x + cw / 2, y + 470, { size: 28, weight: 700, color: "#dfe5f5", align: "center" });
  txt(c, "순천수학교육체험센터", x + cw / 2, y + ch - 50, { size: 28, weight: 800, color: YELLOW, align: "center" });
  txt(c, "2026. 가족과 함께하는 AI수학투어", cv.width / 2, cv.height - 32, { size: 26, weight: 700, color: SUB, align: "center" });
  return cv;
}
