// 문제별 입력 화면 — render(el, q, ctx)는 { collect } 를 돌려줘요.
// collect()는 형식을 검사해 { ok, msg, data, priv } 를 돌려줘요. (정답 검사는 하지 않아요 — 펜토미노만 판을 다 채워야 해요)
import { esc, fileToJpeg, toast } from "./fb.js?v=3.16";
import { BUILTIN, funOptions, qTitle, qIcon, pentoSettings, pentoSolved, pentoProgress, pzGroup, keyShift, FIBS } from "./questions.js?v=3.16";
import { PUZZLES } from "./puzzles.js?v=3.16";
import { cipherWheel, cropper, dotsHtml, pentoBoard, miniGrid, eulerTracer, spiralPad } from "./widgets.js?v=3.16";

const isNum = (s) => /^-?\d+(\.\d+)?$/.test(String(s).trim());
const isInt = (s) => /^\d+$/.test(String(s).trim());
const fail = (msg) => ({ ok: false, msg });

function numField(id, label, unit, val, { int = false, ph = "" } = {}) {
  return `<label class="fld" for="${id}">${label}</label>
    <div class="unit-wrap"><input id="${id}" class="inp" inputmode="${int ? "numeric" : "decimal"}" enterkeyhint="done" autocomplete="off"
      placeholder="${esc(ph)}" value="${val ?? ""}">${unit ? `<span class="unit">${esc(unit)}</span>` : ""}</div>`;
}
function numCheck(v, label, unit, int) {
  const s = String(v ?? "").trim();
  if (!s) return `「${label}」을(를) 입력해 주세요.`;
  if (/[^\d.\-]/.test(s)) return `「${label}」에는 숫자만 써 주세요.${unit ? ` (단위 「${unit}」는 빼고 숫자만!)` : ""}`;
  if (int ? !isInt(s) : !isNum(s)) return `「${label}」은(는) ${int ? "자연수(0, 1, 2 …)" : "숫자"}로 써 주세요.`;
  return "";
}
function choiceGroup(el, sel, onPick) {
  el.querySelectorAll(sel).forEach((b) => b.onclick = () => {
    el.querySelectorAll(sel).forEach((x) => x.classList.toggle("on", x === b));
    onPick(b.dataset.v);
  });
}
function photoPicker(holder, prev, onPhoto) {
  holder.innerHTML = `
    <div class="ph-prev">${prev ? `<img src="${prev}" style="border-radius:14px;margin-bottom:8px">` : ""}</div>
    <label class="btn ghost block" style="margin-top:4px">📷 ${prev ? "사진 다시 올리기" : "사진 찍기 / 고르기"}
      <input type="file" accept="image/*" class="hidden"></label>`;
  holder.querySelector("input").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const url = await fileToJpeg(f, 900, 0.72);
      holder.querySelector(".ph-prev").innerHTML = `<img src="${url}" style="border-radius:14px;margin-bottom:8px">`;
      onPhoto(url);
    } catch { toast("사진을 열지 못했어요. 다른 사진으로 해 볼까요?"); }
  };
}

export const EULER_SVG = `
<svg viewBox="0 0 300 250" style="width:min(100%,300px);display:block;margin:6px auto">
  <g fill="none" stroke="#1d2b2a" stroke-width="3">
    <path d="M60 35 C 18 55, 18 110, 60 125"/><path d="M60 35 C 102 55, 102 110, 60 125"/>
    <path d="M60 125 C 18 140, 18 195, 60 215"/><path d="M60 125 C 102 140, 102 195, 60 215"/>
    <line x1="60" y1="35" x2="255" y2="125"/><line x1="60" y1="125" x2="255" y2="125"/><line x1="60" y1="215" x2="255" y2="125"/>
  </g>
  <g fill="#e53935"><circle cx="60" cy="35" r="6"/><circle cx="60" cy="125" r="6"/><circle cx="60" cy="215" r="6"/><circle cx="255" cy="125" r="6"/></g>
</svg>`;

const R = {};

// 작은 숫자 칸 (표·문장 속에 넣는 칸)
const mini = (id, val, { w = 72, int = false, ph = "" } = {}) =>
  `<input id="${id}" class="inp mini" style="width:${w}px" inputmode="${int ? "numeric" : "decimal"}" enterkeyhint="next" autocomplete="off" placeholder="${esc(ph)}" value="${val ?? ""}">`;
const star = `<span class="star" title="데이터 맵에 쓰이는 숫자">★</span>`;
// [[id, 이름, 단위, 자연수만?, 선택?]] 차례로 검사 → 첫 오류 글 또는 ""
function checkAll(el, specs) {
  for (const [id, label, unit, int, optional] of specs) {
    const v = el.querySelector("#" + id).value;
    if (optional && !String(v).trim()) continue;
    const e = numCheck(v, label, unit, int);
    if (e) { el.querySelector("#" + id).focus({ preventScroll: true }); return e; }
  }
  return "";
}
// 일단 제출용: 숫자로 읽히면 숫자, 아니면 null
const numOr = (el, id) => { const v = String(el.querySelector("#" + id)?.value ?? "").trim(); return v !== "" && Number.isFinite(Number(v)) ? Number(v) : null; };
const valOf = (el, id) => String(el.querySelector("#" + id)?.value ?? "").trim();
const numOf = (el, id) => { const v = el.querySelector("#" + id)?.value; return String(v ?? "").trim() === "" ? null : Number(v); };
const r2 = (n) => Math.round(n * 100) / 100;
const sec = (t, sub = "") => `<h4 class="sec">${t}${sub ? ` <small>${sub}</small>` : ""}</h4>`;

/* 1-1. 오일러와 한붓그리기 */
R.euler = (el, q, { prev }) => {
  let pick = prev?.possible || "";
  el.innerHTML = `
    ${sec("가. 한붓그리기로 따라 그려 보세요", "출발점을 고른 뒤 선을 눌러요")}
    <div class="muted">같은 선을 두 번 지나지 않고 모든 선을 한 번에 그려요. 어느 점에서 출발하면 좋을까요?</div>
    <div class="tr-a" style="margin-top:8px"></div><div class="tr-b" style="margin-top:14px"></div>
    ${sec("나. 이 도형은 한붓그리기가 가능할까요?")}
    ${EULER_SVG}
    <div class="choices"><button type="button" class="choice" data-v="가능">⭕ 가능</button><button type="button" class="choice" data-v="불가능">❌ 불가능</button></div>
    ${numField("e_odd", "홀수점은 몇 개인가요?", "개", prev?.odd, { int: true, ph: "예) 2" })}
    <label class="fld" for="e_why">이유를 설명해 보세요</label>
    <textarea id="e_why" class="inp" rows="3" maxlength="200" placeholder="예) 홀수점이 ○개라서 …">${esc(prev?.reason || "")}</textarea>
    <div class="family-tip">가족 함께해요 ▶ "점마다 선이 몇 개 모였을까? 홀수점은 몇 개지?" 물어봐 주세요.</div>`;
  const ta = eulerTracer(el.querySelector(".tr-a"), "a", prev?.draw?.a);
  const tb = eulerTracer(el.querySelector(".tr-b"), "b", prev?.draw?.b);
  if (pick) el.querySelector(`[data-v="${pick}"]`)?.classList.add("on");
  choiceGroup(el, ".choice", (v) => pick = v);
  return {
    draft() {
      const a = ta.get(), b = tb.get();
      return { draw: { a: { path: a.path, edges: a.edges }, b: { path: b.path, edges: b.edges } }, drawOk: { a: a.ok, b: b.ok }, possible: pick, odd: numOr(el, "e_odd"), reason: valOf(el, "e_why") };
    },
    collect() {
      const a = ta.get(), b = tb.get();
      if (!a.ok || !b.ok) return fail(`가. 두 도형을 모두 한붓그리기로 그려 주세요. (${[a, b].filter((x) => x.ok).length} / 2 성공)`);
      if (!pick) return fail("나. 가능한지 불가능한지 골라 주세요.");
      const odd = el.querySelector("#e_odd").value, why = el.querySelector("#e_why").value.trim();
      const e = numCheck(odd, "홀수점 개수", "개", true); if (e) return fail(e);
      if (why.length < 2) return fail("이유를 한 줄로 써 주세요.");
      return { ok: true, data: { draw: { a: { path: a.path, edges: a.edges }, b: { path: b.path, edges: b.edges } }, possible: pick, odd: Number(odd), reason: why } };
    }
  };
};

/* 1-2. 스페이스 암호 해독 (5문제 + 창작 미션) */
const NUMS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"];
R.cipher = (el, q, { prev, config }) => {
  const cps = config.ciphers || [];
  const ans = prev?.answers || [];
  const unknownAt = (c) => !/^[A-Z]$/i.test(String(c.key || "").trim());
  el.innerHTML = `<div class="wh"></div>
    ${sec("암호 해독 미션", "우주에서 온 편지를 풀어요")}
    ${cps.map((c, i) => `<div class="cp-row">
      <div class="cp-top"><b>${unknownAt(c) ? "도전" : "문제"} ${NUMS[i] || i + 1}</b>
        <span class="cp-key">열쇠 KEY <b>${unknownAt(c) ? "?" : esc(c.key.toUpperCase())}</b></span>
        ${unknownAt(c) ? "" : `<button type="button" class="btn small gray" data-set="${keyShift(c.key)}">암호판 맞추기</button>`}</div>
      <div class="cp-ct">${esc(c.text)}</div>
      ${unknownAt(c) && c.hint ? `<div class="muted" style="margin:4px 0">${esc(c.hint)}</div>` : ""}
      ${unknownAt(c) ? `<div class="row" style="gap:8px;margin:6px 0"><span style="font-weight:800">KEY =</span>
        <input id="c_k${i}" class="inp mini up" style="width:64px" maxlength="1" autocapitalize="characters" autocomplete="off" value="${esc(prev?.keys?.[i] || "")}"></div>` : ""}
      <input id="c_a${i}" class="inp up" autocomplete="off" autocapitalize="characters" placeholder="해독한 말 (원래 글자)" value="${esc(ans[i] || "")}"></div>`).join("")}
    ${sec("창작 미션", "가족에게 전하는 응원 한마디")}
    <div class="muted">응원 한마디(영어)를 암호판으로 바꿔 써요. 다른 가족이 「팀별 발자취」에서 풀어 볼 수 있어요!</div>
    <div class="row" style="gap:8px;margin:10px 0 6px"><span style="font-weight:800">열쇠 KEY</span>
      <input id="c_mk" class="inp mini up" style="width:64px" maxlength="1" autocapitalize="characters" autocomplete="off" value="${esc(prev?.my?.key || "")}"></div>
    <input id="c_mt" class="inp up" autocomplete="off" autocapitalize="characters" placeholder="암호문 (예: MJHHT)" value="${esc(prev?.my?.text || "")}">
    <div class="family-tip">가족 함께해요 ▶ "Key 글자가 뭐지?" 먼저 읽게 하고, 작은 원의 ▲(A)를 큰 원의 Key 글자에 맞췄는지 함께 확인해 주세요. 풀이 뒤에는 뜻이 통하는 문장인지 소리 내어 읽어 보세요.</div>`;
  const wheel = cipherWheel(el.querySelector(".wh"), 0);
  el.querySelectorAll("[data-set]").forEach((b) => b.onclick = () => { wheel.setK(Number(b.dataset.set)); el.querySelector(".wh").scrollIntoView({ block: "start", behavior: "smooth" }); });
  const up = (s) => s.toUpperCase().replace(/\s+/g, " ").trim();
  return {
    draft() {
      const keys = {};
      cps.forEach((c, i) => { if (unknownAt(c)) { const k = up(el.querySelector("#c_k" + i).value); if (k) keys[i] = k; } });
      return { answers: cps.map((c, i) => up(el.querySelector("#c_a" + i).value)), keys, my: { key: up(el.querySelector("#c_mk").value), text: up(el.querySelector("#c_mt").value) } };
    },
    collect() {
      const answers = [], keys = {};
      for (let i = 0; i < cps.length; i++) {
        const t = up(el.querySelector("#c_a" + i).value);
        const nm = `${unknownAt(cps[i]) ? "도전" : "문제"} ${NUMS[i] || i + 1}`;
        if (unknownAt(cps[i])) {
          const k = up(el.querySelector("#c_k" + i).value);
          if (!/^[A-Z]$/.test(k)) return fail(`${nm}의 열쇠 KEY를 알파벳 한 글자로 써 주세요.`);
          keys[i] = k;
        }
        if (!t) return fail(`${nm}의 해독한 말을 써 주세요.`);
        if (!/^[A-Z ]+$/.test(t)) return fail(`${nm}의 해독한 말은 영어 알파벳과 띄어쓰기만 써 주세요.`);
        answers.push(t);
      }
      const mk = up(el.querySelector("#c_mk").value), mt = up(el.querySelector("#c_mt").value);
      if (!/^[A-Z]$/.test(mk)) return fail("창작 미션의 열쇠 KEY를 알파벳 한 글자로 써 주세요.");
      if (!mt) return fail("창작 미션의 암호문을 써 주세요.");
      if (!/^[A-Z ]+$/.test(mt)) return fail("창작 미션의 암호문은 영어 알파벳과 띄어쓰기만 써 주세요.");
      return { ok: true, data: { answers, keys, my: { key: mk, text: mt } } };
    }
  };
};

/* 1-3. 라틴방진 스마트톡 */
export const LATIN_PRACTICE = [
  [0, 0, 1, 4, 0, 0, 0, 0, 1, 0, 2, 0, 2, 3, 4, 0],
  [0, 3, 0, 0, 0, 1, 2, 0, 0, 0, 0, 4, 0, 0, 1, 2]
];
export const LATIN_COLORS = ["#e53935", "#fb8c00", "#fdd835", "#43a047", "#1e88e5", "#8e24aa", "#ec407a", "#6d4c41"];
// 같은 줄(가로·세로)과 (box면) 2×2 네모 안에 겹치는 칸 번호들
export function latinClash(g, box = true) {
  const bad = new Set();
  for (let i = 0; i < 16; i++) for (let j = i + 1; j < 16; j++) {
    if (!g[i] || g[i] !== g[j]) continue;
    const [ri, ci, rj, cj] = [i >> 2, i & 3, j >> 2, j & 3];
    if (ri === rj || ci === cj || (box && (ri >> 1) === (rj >> 1) && (ci >> 1) === (cj >> 1))) { bad.add(i); bad.add(j); }
  }
  return bad;
}
// 4×4 칸: 칸을 누르고 아래 버튼으로 채워요
function latinPad(holder, { givens = Array(16).fill(0), values, box, cell, padLabel, onChange = () => {} }) {
  const v = values.slice();
  let sel = -1;
  const draw = () => {
    const bad = latinClash(v, box), full = v.every(Boolean);
    holder.innerHTML = `<div class="lgrid">${v.map((x, i) => {
      const fixed = !!givens[i];
      return `<button type="button" class="lc ${fixed ? "fx" : ""} ${i === sel ? "sel" : ""} ${bad.has(i) ? "bad" : ""} ${(i & 3) === 1 ? "bR" : ""} ${(i >> 2) === 1 ? "bB" : ""}" data-i="${i}" ${fixed ? "disabled" : ""}>${cell(x, fixed)}</button>`;
    }).join("")}</div>
      <div class="lpad">${[1, 2, 3, 4].map((n) => `<button type="button" class="lp" data-n="${n}" ${sel < 0 ? "disabled" : ""}>${padLabel(n)}</button>`).join("")}
        <button type="button" class="lp" data-n="0" ${sel < 0 ? "disabled" : ""}>지우기</button></div>
      <div class="lmsg ${bad.size ? "bad" : full ? "good" : ""}">${bad.size ? "빨간 칸: 같은 줄에 같은 것이 두 번 나왔어요." : full ? "✔ 규칙에 맞게 모두 채웠어요!" : sel < 0 ? "빈칸을 누른 뒤 아래 버튼을 골라요." : "아래 버튼을 골라 채워요."}</div>`;
    holder.querySelectorAll(".lc").forEach((b) => b.onclick = () => { sel = Number(b.dataset.i); draw(); });
    holder.querySelectorAll(".lp").forEach((b) => b.onclick = () => {
      if (sel < 0) return;
      v[sel] = Number(b.dataset.n);
      const nx = v.findIndex((x, i) => i > sel && !x && !givens[i]);
      if (v[sel] && nx >= 0) sel = nx;
      draw(); onChange(v);
    });
  };
  draw();
  return { get values() { return v.slice(); }, set(nv) { nv.forEach((x, i) => { if (!givens[i]) v[i] = x; }); sel = -1; draw(); onChange(v); } };
}
R.latin = (el, q, { prev }) => {
  let photo = prev?.photo || "";
  const colors = (prev?.colors || ["#e53935", "#fdd835", "#43a047", "#1e88e5"]).slice();
  let slot = 0;
  el.innerHTML = `
    ${sec("STEP 1. 숫자로 연습하기", "가로·세로·굵은 네모 안에 1~4가 한 번씩")}
    <div class="lpair"><div class="lp1"></div><div class="lp2"></div></div>
    ${sec("STEP 2. 색으로 바꾸어 설계하기", "스마트톡 설계")}
    <div class="muted">1~4번에 쓸 색을 정해요. 번호를 누른 뒤 아래 색을 골라요.</div>
    <div class="slots"></div><div class="swatches">${LATIN_COLORS.map((c) => `<button type="button" class="sw" data-c="${c}" style="background:${c}" aria-label="색"></button>`).join("")}</div>
    <div class="muted" style="margin-top:10px">가로줄·세로줄마다 같은 색이 두 번 나오면 안 돼요.</div>
    <div class="ldesign" style="margin-top:6px"></div>
    <button type="button" class="btn small ghost" data-copy style="margin-top:6px">STEP 1 첫 번째 방진 그대로 색칠하기</button>
    ${sec("메이커 미션", "스마트톡 조립 · 인증샷")}
    <div class="ph"></div>
    <label class="fld" for="l_name">우리 가족 스마트톡 이름 <small>(선택)</small></label>
    <input id="l_name" class="inp" maxlength="30" placeholder="예) 알록달록 행운 거북이 톡" value="${esc(prev?.name || "")}">
    <div class="family-tip">가족 함께해요 ▶ "같은 줄에 같은 색이 두 번 나오지 않았니?" 확인해 주세요. 가위·조립은 부모님이 함께 잡아 주세요(안전!).</div>`;
  const pads = LATIN_PRACTICE.map((gv, k) => latinPad(el.querySelector(".lp" + (k + 1)), {
    givens: gv, values: prev?.s1?.[k] || gv.slice(), box: true,
    cell: (x) => x || "", padLabel: (n) => n
  }));
  const swatch = (n) => `<i style="background:${colors[n - 1]}"></i>`;
  const design = latinPad(el.querySelector(".ldesign"), {
    values: prev?.design || Array(16).fill(0), box: false,
    cell: (x) => x ? swatch(x) : "", padLabel: (n) => `${swatch(n)}<small>${n}번</small>`
  });
  const drawSlots = () => {
    el.querySelector(".slots").innerHTML = colors.map((c, i) => `<button type="button" class="slot ${i === slot ? "on" : ""}" data-s="${i}"><i style="background:${c}"></i>${i + 1}번</button>`).join("");
    el.querySelectorAll(".slot").forEach((b) => b.onclick = () => { slot = Number(b.dataset.s); drawSlots(); });
  };
  el.querySelectorAll(".sw").forEach((b) => b.onclick = () => { colors[slot] = b.dataset.c; slot = (slot + 1) % 4; drawSlots(); design.set(design.values); });
  el.querySelector("[data-copy]").onclick = () => {
    const g = pads[0].values;
    if (!g.every(Boolean) || latinClash(g).size) return toast("STEP 1 첫 번째 방진을 먼저 규칙에 맞게 다 채워 주세요.");
    design.set(g);
  };
  drawSlots();
  photoPicker(el.querySelector(".ph"), photo, (u) => photo = u);
  return {
    draft() { return { s1: { 0: pads[0].values, 1: pads[1].values }, colors, design: design.values, photo, name: el.querySelector("#l_name").value.trim() }; },
    collect() {
      for (let k = 0; k < 2; k++) {
        const g = pads[k].values;
        if (!g.every(Boolean)) return fail(`STEP 1의 ${k + 1}번째 방진 빈칸을 모두 채워 주세요.`);
        if (latinClash(g).size) return fail(`STEP 1의 ${k + 1}번째 방진에 같은 숫자가 겹친 줄이 있어요. 빨간 칸을 고쳐 주세요.`);
      }
      if (new Set(colors).size < 4) return fail("STEP 2에서 1~4번에 서로 다른 색 4가지를 정해 주세요.");
      const d = design.values;
      if (!d.every(Boolean)) return fail("STEP 2 설계판의 칸을 모두 색칠해 주세요.");
      if (latinClash(d, false).size) return fail("STEP 2 설계판에서 같은 줄에 같은 색이 겹쳤어요. 빨간 칸을 고쳐 주세요.");
      if (!photo) return fail("완성한 스마트톡 인증샷을 올려 주세요.");
      return { ok: true, data: { s1: { 0: pads[0].values, 1: pads[1].values }, colors, design: d, photo, name: el.querySelector("#l_name").value.trim() } };
    }
  };
};

/* 2-1. 동물 안내판 속 숫자 보물 찾기 */
export const SIGN_FIELDS = [
  ["fox", "귀가 큰 사막여우", "모래사막에 깊은 굴을 파는 야행성", [["foxL1", "몸길이", "cm"], ["foxL2", "", "cm"], ["foxW", "몸무게 약", "kg"]]],
  ["sul", "설가타 육지거북", "세계에서 세 번째로 크게 자라는 육지거북", [["sulL1", "등갑길이", "cm"], ["sulL2", "", "cm"], ["sulA", "최대 수명", "년"]]],
  ["ald", "알다브라 코끼리거북", "최대 255년 산 기록이 있는 장수 거북", [["aldA1", "수명", "년"], ["aldA2", "", "년"], ["aldH", "땅에서", "m 위 잎도 먹어요"]]]
];
R.sign = (el, q, { prev }) => {
  const p = prev || {};
  el.innerHTML = SIGN_FIELDS.map(([k, name, feat, f]) => `<div class="sign-card">
      <div class="sign-h"><b>${name}</b><small>${feat}</small></div>
      <div class="sign-l">${f[0][1]} ${mini("s_" + f[0][0], p[f[0][0]], { w: 64 })} ~ ${mini("s_" + f[1][0], p[f[1][0]], { w: 64 })} ${f[0][2]}</div>
      <div class="sign-l">${f[2][1]} ${mini("s_" + f[2][0], p[f[2][0]], { w: 64 })} ${f[2][2]}</div></div>`).join("") +
    `<div class="family-tip">가족 함께해요 ▶ 숫자만 읽고 끝내지 말고 "내 키·몸무게와 비교하면 어느 정도일까?" 물어봐 주세요.</div>`;
  return {
    draft() { const d = {}; SIGN_FIELDS.forEach(([, , , f]) => f.forEach(([id]) => d[id] = numOr(el, "s_" + id))); return d; },
    collect() {
      const specs = SIGN_FIELDS.flatMap(([, name, , f]) => f.map(([id, lb, u]) => ["s_" + id, `${name.split(" ").pop()} ${lb || f[0][1] + "(끝)"}`, u.split(" ")[0], false]));
      const e = checkAll(el, specs); if (e) return fail(e);
      const data = {};
      SIGN_FIELDS.forEach(([, , , f]) => f.forEach(([id]) => data[id] = numOf(el, "s_" + id)));
      return { ok: true, data };
    }
  };
};

/* 2-2. 동물 친구 웰빙 계산기 */
R.food = (el, q, { prev }) => {
  const p = prev || {};
  el.innerHTML = `
    ${sec("① 비례표 만들기", "사막여우 1마리의 하루 먹이는 150g")}
    <div class="ptable">
      <div class="h">여우 수(마리)</div><div>1</div><div>2</div><div>4</div><div>8</div><div>${mini("f_n7", p.n7, { w: 52, int: true })}</div>
      <div class="h">먹이(g)</div><div>150</div><div>${mini("f_g2", p.g2, { w: 52 })}</div><div>${mini("f_g4", p.g4, { w: 52 })}</div><div>${mini("f_g8", p.g8, { w: 52 })}</div><div>1,050</div>
      <div class="h">먹이 ÷ 마리 수</div><div class="dv" data-d="1">150</div><div class="dv" data-d="2"></div><div class="dv" data-d="4"></div><div class="dv" data-d="8"></div><div class="dv" data-d="n"></div>
    </div>
    <div class="qline">(1) 4마리가 함께 지낼 때 하루 먹이는? ${star}<div class="calc">1 : 150 = 4 : ${mini("f_q1", p.q1, { w: 80 })} g</div></div>
    <div class="qline">(2) 먹이 1,050g으로는 사막여우 몇 마리의 하루치를 줄 수 있을까?<div class="calc">1 : 150 = □ : 1,050 → ${mini("f_q2", p.q2, { w: 64, int: true })} 마리</div></div>
    <label class="fld" for="f_why">(3) 표 맨 아랫줄(먹이 ÷ 마리 수)은 모두 같아요. 왜 같을까요?</label>
    <textarea id="f_why" class="inp" rows="2" maxlength="200" placeholder="예) 한 마리당 먹는 양이 …">${esc(p.why || "")}</textarea>
    ${sec("② 비례배분", "새 먹이 500g을 과일 : 곡식 = 3 : 2 로 섞어요")}
    <div class="calc">과일 = 500 × 3/5 = ${mini("f_fr", p.fruit, { w: 72 })} g</div>
    <div class="calc">곡식 = 500 × 2/5 = ${mini("f_gr", p.grain, { w: 72 })} g</div>
    <div class="calc">과일은 전체의 ${mini("f_fp", p.fruitPct, { w: 64 })} %</div>
    ${sec("③ 수명 비교", "알다브라 코끼리거북의 최대 기록 255년")}
    <div class="calc">내 나이 만 ${mini("f_age", p.age, { w: 56, int: true })} 세</div>
    <div class="calc">내 나이 : 255 = 1 : □ → 거북은 나의 약 ${mini("f_x", p.times, { w: 64 })} 배</div>
    <div class="calc">거북 기록에서 나는 약 ${mini("f_pct", p.pct, { w: 64 })} %를 살았어요</div>
    <label class="fld" for="f_talk">생각 넓히기 (가족 토론) <small>선택</small></label>
    <div class="muted">우리 A에는 여우 4마리에게 600g, 우리 B에는 8마리에게 1,200g을 줘요. 어느 우리 여우가 더 배불리 먹을까요?</div>
    <textarea id="f_talk" class="inp" rows="2" maxlength="200" style="margin-top:6px" placeholder="우리 가족 생각">${esc(p.talk || "")}</textarea>`;
  const live = () => {
    const g = { 2: numOf(el, "f_g2"), 4: numOf(el, "f_g4"), 8: numOf(el, "f_g8") };
    [2, 4, 8].forEach((n) => el.querySelector(`[data-d="${n}"]`).textContent = g[n] != null && Number.isFinite(g[n]) ? r2(g[n] / n) : "");
    const n7 = numOf(el, "f_n7");
    el.querySelector('[data-d="n"]').textContent = n7 ? r2(1050 / n7) : "";
  };
  el.querySelectorAll(".ptable input").forEach((i) => i.addEventListener("input", live));
  live();
  return {
    draft() {
      const d = {};
      [["g2", "f_g2"], ["g4", "f_g4"], ["g8", "f_g8"], ["n7", "f_n7"], ["q1", "f_q1"], ["q2", "f_q2"], ["fruit", "f_fr"], ["grain", "f_gr"], ["fruitPct", "f_fp"], ["age", "f_age"], ["times", "f_x"], ["pct", "f_pct"]].forEach(([k, id]) => d[k] = numOr(el, id));
      d.why = valOf(el, "f_why"); d.talk = valOf(el, "f_talk");
      return d;
    },
    collect() {
      const e = checkAll(el, [["f_g2", "2마리 먹이", "g"], ["f_g4", "4마리 먹이", "g"], ["f_g8", "8마리 먹이", "g"], ["f_n7", "1,050g일 때 여우 수", "마리", true],
        ["f_q1", "(1) 4마리의 하루 먹이", "g"], ["f_q2", "(2) 여우 수", "마리", true]]);
      if (e) return fail(e);
      const why = el.querySelector("#f_why").value.trim();
      if (why.length < 2) return fail("(3) 아랫줄이 모두 같은 까닭을 한 줄로 써 주세요.");
      const e2 = checkAll(el, [["f_fr", "과일", "g"], ["f_gr", "곡식", "g"], ["f_fp", "과일 비율", "%"], ["f_age", "내 나이", "세", true], ["f_x", "거북은 나의 몇 배", "배"], ["f_pct", "내가 산 비율", "%"]]);
      if (e2) return fail(e2);
      if (!(numOf(el, "f_age") > 0)) return fail("내 나이를 1 이상의 수로 써 주세요.");
      return {
        ok: true, data: {
          g2: numOf(el, "f_g2"), g4: numOf(el, "f_g4"), g8: numOf(el, "f_g8"), n7: numOf(el, "f_n7"),
          q1: numOf(el, "f_q1"), q2: numOf(el, "f_q2"), why, fruit: numOf(el, "f_fr"), grain: numOf(el, "f_gr"), fruitPct: numOf(el, "f_fp"),
          age: numOf(el, "f_age"), times: numOf(el, "f_x"), pct: numOf(el, "f_pct"), talk: el.querySelector("#f_talk").value.trim()
        }
      };
    }
  };
};

/* 3-1. 내 보폭으로 재어보는 산책로 */
const WB = "img/wb/";
const wbImg = (f, alt, style = "") => `<img src="${WB}${f}" alt="${esc(alt)}" class="wb-img" style="${style}" loading="lazy">`;
R.stride = (el, q, { prev }) => {
  const p = prev || {};
  const who = [["me", "학생(나)", false], ["par", "부모님(선택)", true], ["sib", "동생(선택)", true]];
  el.innerHTML = `
    ${sec("내 1보 재기", "5보(10걸음) 걸은 거리 ÷ 5 = 1보")}
    <div class="stable"><div class="h">측정 대상</div><div class="h">5보 길이</div><div class="h">1보 길이(÷5)</div>
      ${who.map(([k, n]) => `<div class="h">${n}${k === "me" ? " " + star : ""}</div>
        <div>${mini("st_" + k + "5", p[k + "5"], { w: 70 })} cm</div><div>${mini("st_" + k + "1", p[k + "1"], { w: 70 })} cm</div>`).join("")}</div>
    <div class="muted st-hint"></div>
    ${sec("어린이동물원 ~ 스페이스 허브 가는 길 측정해 보기")}
    <div class="wb-pair">${wbImg("route_photo.jpg", "측정할 산책로")}${wbImg("route_map.jpg", "측정 구간 (빨간 점선)")}</div>
    <div class="muted" style="text-align:center;margin-top:4px">빨간 점선이 우리가 잴 구간이에요.</div>
    <div class="qline">1. 이 구간을 내 보폭으로 걸었어요 ${star}
      <div class="calc">${mini("st_steps", p.steps, { w: 72, int: true })} 보 × 1보 <span class="st-one">□</span> cm = <b class="st-walk">□</b> m <small class="muted">(자동 계산)</small></div></div>
    <div class="qline">2. 지도 앱(네이버지도·카카오맵)의 위성사진에서 점을 이어 잰 거리 ${star}
      <div class="calc">${mini("st_map", p.map, { w: 80 })} m</div></div>
    <div class="howto"><b>📍 지도 앱 측정 방법 (카카오맵)</b>
      <ol><li>시작점을 꾹 눌러요.</li><li>「거리재기」 버튼을 눌러요.</li><li>끝 지점을 눌러요.</li></ol>
      <div class="wb-pair">${wbImg("kakao1.jpg", "카카오맵 거리재기 버튼")}${wbImg("kakao2.jpg", "카카오맵 거리재기 결과")}</div></div>
    <div class="qline">3. AI·디지털과의 비교: 내 보폭으로 구한 거리와 지도 앱 거리의 차이
      <div class="calc">${mini("st_diff", p.diff, { w: 80 })} m</div></div>
    <label class="fld" for="st_why">오차가 생긴 까닭을 가족과 이야기해요</label>
    <textarea id="st_why" class="inp" rows="2" maxlength="200" placeholder="우리 가족 생각">${esc(p.why || "")}</textarea>
    <div class="family-tip">가족 함께해요 ▶ 5보를 걷는 동안 학생은 앞을 보고, 부모님이 시작·끝 뒤꿈치 위치를 표시해 주세요.</div>`;
  // 보폭 거리(m) = 보 수 × 1보(cm) ÷ 100 — 앱이 계산해요
  const walkOf = () => { const s = numOr(el, "st_steps"), o = numOr(el, "st_me1"); return s != null && o != null ? r2(s * o / 100) : null; };
  const live = () => {
    const h = who.map(([k, n]) => { const v = numOf(el, `st_${k}5`); return v ? `${n.replace("(선택)", "")} ${r2(v)} ÷ 5 = ${r2(v / 5)}cm` : ""; }).filter(Boolean);
    el.querySelector(".st-hint").textContent = h.length ? "계산 도우미: " + h.join(" · ") : "";
    el.querySelector(".st-one").textContent = numOr(el, "st_me1") ?? "□";
    el.querySelector(".st-walk").textContent = walkOf() ?? "□";
  };
  el.querySelectorAll("input").forEach((i) => i.addEventListener("input", live));
  live();
  const keys = ["me5", "me1", "par5", "par1", "sib5", "sib1", "steps", "map", "diff"];
  return {
    draft() {
      const d = { why: valOf(el, "st_why") };
      keys.forEach((k) => d[k] = numOr(el, "st_" + k));
      d.walk = walkOf();
      return d;
    },
    collect() {
      const e = checkAll(el, [["st_me5", "학생 5보 길이", "cm"], ["st_me1", "학생 1보 길이", "cm"],
        ["st_par5", "부모님 5보 길이", "cm", false, true], ["st_par1", "부모님 1보 길이", "cm", false, true],
        ["st_sib5", "동생 5보 길이", "cm", false, true], ["st_sib1", "동생 1보 길이", "cm", false, true],
        ["st_steps", "구간 보 수", "보", true], ["st_map", "지도 앱 거리", "m"], ["st_diff", "거리 차이", "m"]]);
      if (e) return fail(e);
      for (const [k, n] of [["par", "부모님"], ["sib", "동생"]]) {
        const a = valOf(el, `st_${k}5`), b = valOf(el, `st_${k}1`);
        if (!!a !== !!b) return fail(`${n}도 재었다면 5보 길이와 1보 길이를 모두 써 주세요.`);
      }
      const why = valOf(el, "st_why");
      if (why.length < 2) return fail("오차가 생긴 까닭을 한 줄로 써 주세요.");
      const d = { why };
      keys.forEach((k) => d[k] = numOr(el, "st_" + k));
      d.walk = walkOf();
      return { ok: true, data: d };
    }
  };
};

/* 3-2. 방형구법과 AI로 국화꽃 세기 */
R.quadrat = (el, q, { prev, config }) => {
  const st = {
    photo: prev?.photo || "", aiCount: prev?.aiCount ?? "", aiPoints: prev?.aiPoints || [],
    aiManual: !!prev?.aiManual, basis: prev?.basis || "", aiBy: prev?.aiBy || ""
  };
  el.innerHTML = `
    <div class="steps">
      <div class="step"><h5>방형구 사진 올리기</h5>
        <div class="q-photo"></div></div>
      <div class="step"><h5>AI가 센 꽃 수 <span class="star">★</span></h5><div class="q-ai"></div></div>
      <div class="step"><h5>내가 직접 센 꽃 수 <span class="star">★</span></h5>
        ${numField("q_eye", "우리 가족이 직접 센 꽃 수", "송이", prev?.eye, { int: true, ph: "예) 12" })}</div>
      <div class="step"><h5>1㎡에는 몇 송이?</h5>
        <div class="muted">20cm × 20cm 방형구 25개 = 1m × 1m = 1㎡ 예요. 어떤 수로 계산할까요?</div>
        <div class="choices" style="margin:8px 0"><button type="button" class="choice" data-v="eye">👀 내가 센 수</button><button type="button" class="choice" data-v="ai">🤖 AI가 센 수</button></div>
        <div class="calc q-f1">(기준 수) × 25 = □</div>
        ${numField("q_m2", "1㎡당 꽃 수", "송이", prev?.perM2, { int: true })}</div>
    </div>
    <div class="family-tip">가족 함께해요 ▶ 방형구 사진은 부모님이, 수직 촬영인지 학생이 확인해요. AI는 어디까지나 보조 역할! 최종 확인은 반드시 내가 직접 해요.</div>`;
  const $ = (s) => el.querySelector(s);
  if (st.basis) $(`[data-v="${st.basis}"]`)?.classList.add("on");
  const formula = () => {
    const base = st.basis === "ai" ? st.aiCount : st.basis === "eye" ? $("#q_eye").value : "";
    $(".q-f1").textContent = `${base !== "" && base != null ? base : "(기준 수)"} × 25 = □`;
  };
  choiceGroup(el, ".choice", (v) => { st.basis = v; formula(); });
  $("#q_eye").oninput = formula; $("#q_m2").oninput = formula;

  const aiBox = $(".q-ai");
  const drawAi = (state) => {
    if (state === "busy") {
      aiBox.innerHTML = `<div class="loading" style="padding:16px"><div class="spin"></div>AI가 꽃을 세고 있어요… <b class="ai-sec">0초</b><br>
        <span class="muted">보통 <b>30초~1분</b> 걸려요. 꽃이 많으면 더 오래 걸릴 수 있어요.<br>화면을 끄거나 다른 앱으로 가지 말고 기다려 주세요!<br>기다리는 동안 가족과 함께 직접 세어 보세요 👀</span></div>`;
      return;
    }
    if (st.photo && !st.aiManual && st.aiCount !== "") {
      aiBox.innerHTML = `${dotsHtml(st.photo, st.aiPoints, `AI: ${st.aiCount}송이`)}
        <div class="muted" style="margin-top:6px"><b>🤖 Gemini AI가 셌어요</b> · 빨간 점이 AI가 꽃이라고 본 곳이에요. 빠뜨리거나 두 번 센 꽃이 있나요?</div>`;
      return;
    }
    const manual = st.aiManual || state === "fail";
    aiBox.innerHTML = manual
      ? `${state === "fail" ? `<div class="err">AI에게 물어보지 못했어요. 다른 AI 앱(Gemini·ChatGPT 등)으로 센 수를 직접 적어 주세요.</div>${st.aiErr ? `<div class="muted" style="font-size:12px">오류: ${esc(st.aiErr)}</div>` : ""}` : ""}
         ${numField("q_aiman", "다른 AI 앱이 센 꽃 수", "송이", st.aiCount, { int: true })}
         ${config.gasUrl && st.photo ? `<button type="button" class="btn small gray" style="margin-top:8px" data-retry>🔄 다시 AI에게 물어보기</button>` : ""}`
      : `<div class="muted">사진을 올리고 「AI에게 세어 달라고 하기」를 누르면 여기에 결과가 나와요.</div>`;
    const inp = aiBox.querySelector("#q_aiman");
    if (inp) { st.aiManual = true; inp.oninput = () => { st.aiCount = inp.value; formula(); }; }
    aiBox.querySelector("[data-retry]")?.addEventListener("click", askAi);
  };

  const ph = $(".q-photo");
  let crop = null;
  const drawPhoto = () => {
    ph.innerHTML = `${st.photo ? `<img src="${st.photo}" style="border-radius:14px;margin-bottom:8px;width:70%;margin:0 auto 8px">` : `<div class="muted">20cm × 20cm 틀이 화면에 꽉 차게, 위에서 수직으로 찍어요.</div>`}
      <label class="btn ghost block" style="margin-top:6px">📷 ${st.photo ? "사진 다시 올리기" : "방형구 사진 찍기 / 고르기"}<input type="file" accept="image/*" class="hidden"></label>`;
    ph.querySelector("input").onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const url = await fileToJpeg(f, 1600, 0.85).catch(() => null);
      if (!url) return toast("사진을 열지 못했어요.");
      ph.innerHTML = `<div class="cr"></div>
        <button type="button" class="btn orange block" style="margin-top:10px" data-go>🤖 이 영역을 AI에게 세어 달라고 하기</button>
        <div class="muted" style="text-align:center;margin-top:4px">AI가 세는 데 30초~1분쯤 걸려요. 꽃이 많으면 더 걸릴 수 있어요.</div>
        <button type="button" class="btn gray block small" style="margin-top:6px" data-cancel>취소</button>`;
      crop = cropper(ph.querySelector(".cr"), url);
      ph.querySelector("[data-cancel]").onclick = () => { crop = null; drawPhoto(); };
      ph.querySelector("[data-go]").onclick = async () => {
        st.photo = crop.toDataUrl(800, 0.75);
        crop = null; drawPhoto();
        st.aiCount = ""; st.aiPoints = []; st.aiManual = false;
        askAi();
      };
    };
  };
  async function askAi() {
    if (!st.photo) return;
    if (!config.gasUrl) { st.aiManual = true; st.aiErr = "AI 주소가 설정되지 않았어요"; drawAi("fail"); return; }
    drawAi("busy");
    // 꽃이 많거나 보조 AI 모델로 다시 물어보면 1분을 넘길 수 있어서 3분까지 기다려요
    const LIMIT = 180;
    const t0 = Date.now();
    const tick = setInterval(() => { const n = aiBox.querySelector(".ai-sec"); if (n) n.textContent = `${Math.round((Date.now() - t0) / 1000)}초`; }, 1000);
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), LIMIT * 1000);
    try {
      const res = await fetch(config.gasUrl, {
        method: "POST", body: JSON.stringify({ image: st.photo.split(",")[1] }), signal: ctl.signal
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "fail");
      st.aiCount = String(j.count); st.aiPoints = j.points || []; st.aiManual = false; st.aiBy = "gemini"; st.aiErr = "";
      drawAi(); formula();
    } catch (err) {
      console.warn(err);
      st.aiErr = err.name === "AbortError" ? `응답이 너무 오래 걸렸어요 (${LIMIT / 60}분). 사진 영역을 조금 좁혀서 다시 해 보세요.`
        : !navigator.onLine ? "인터넷이 끊겼어요." : String(err.message || err).slice(0, 200);
      st.aiManual = true; drawAi("fail");
    } finally { clearTimeout(tm); clearInterval(tick); }
  }
  drawPhoto(); drawAi(); formula();

  return {
    draft() {
      const n = (v) => String(v ?? "").trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null;
      return { photo: st.photo || "", aiCount: n(st.aiCount), aiPoints: (st.aiPoints || []).slice(0, 400), aiManual: !!st.aiManual,
        eye: n($("#q_eye").value), basis: st.basis || "", perM2: n($("#q_m2").value), aiBy: st.aiManual ? "manual" : "gemini" };
    },
    collect() {
      if (crop) return fail("사진 영역을 정한 뒤 「AI에게 세어 달라고 하기」를 눌러 주세요.");
      if (!st.photo) return fail("방형구 사진을 올려 주세요.");
      let e = numCheck(st.aiCount, "AI가 센 꽃 수", "송이", true); if (e) return fail(e);
      const eye = $("#q_eye").value, m2 = $("#q_m2").value;
      e = numCheck(eye, "직접 센 꽃 수", "송이", true); if (e) return fail(e);
      if (!st.basis) return fail("1㎡ 계산에 쓸 수(내가 센 수 / AI가 센 수)를 골라 주세요.");
      e = numCheck(m2, "1㎡당 꽃 수", "송이", true); if (e) return fail(e);
      return {
        ok: true, data: {
          photo: st.photo, aiCount: Number(st.aiCount), aiPoints: st.aiPoints.slice(0, 400), aiManual: st.aiManual,
          eye: Number(eye), basis: st.basis, perM2: Number(m2), aiBy: st.aiManual ? "manual" : "gemini"
        }
      };
    }
  };
};

/* 3-3. 스페이스 허브 초록 잔디밭에 국화를 심는다면? */
const AREA_WAYS = [["app", "① 측정 앱"], ["map", "② 지도 앱"], ["stride", "③ 보폭"]];
R.area = (el, q, { prev, mine }) => {
  const p = prev || {};
  const one = mine?.stride?.me1;          // 3-1에서 잰 내 1보
  const perM2 = p.perM2 ?? mine?.quadrat?.perM2; // 3-2에서 구한 1㎡당 꽃 수
  let best = p.best || "";
  el.innerHTML = `
    ${wbImg("lawn.jpg", "스페이스 허브 초록 잔디밭 (빨간 네모)")}
    <div class="muted" style="text-align:center;margin:4px 0 2px">빨간 네모 안의 긴 초록 잔디밭이에요.</div>
    ${sec("초록 잔디밭 면적 구하기", "세 가지 방법으로 재어 봐요")}
    ${wbImg("area_methods.jpg", "넓이를 재는 세 가지 방법")}
    ${sec("방법 ① 측정(Measure) 앱", "네 모서리를 차례로 콕!")}
    <div class="calc">${mini("a_app", p.app, { w: 90 })} ㎡</div>
    ${sec("방법 ② 지도 앱 면적 재기", "잔디밭 둘레를 점으로 연결!")}
    <div class="calc">${mini("a_map", p.map, { w: 90 })} ㎡</div>
    ${sec("방법 ③ 보폭으로 재기", `보 수 × 1보 = 길이(m)${one ? ` · 내 1보 ${one}cm` : ""}`)}
    <div class="calc">가로 ${mini("a_ws", p.ws, { w: 56, int: true })} 보 × 1보 → ${mini("a_wm", p.wm, { w: 70 })} m</div>
    <div class="calc">세로 ${mini("a_hs", p.hs, { w: 56, int: true })} 보 × 1보 → ${mini("a_hm", p.hm, { w: 70 })} m</div>
    <div class="calc">넓이 <span class="a-f">□ m × □ m</span> = ${mini("a_st", p.stride, { w: 80 })} ㎡</div>
    ${sec(`가장 믿는 넓이 1개 ${star}`, "방법 ①②③ 중에서 골라요")}
    <div class="choices a-best" style="grid-template-columns:repeat(3,1fr)"></div>
    ${sec("잔디밭에 국화를 심는다면 몇 송이?", "앞에서 구한 방형구법의 1㎡를 활용해요")}
    <div class="calc">1㎡당 꽃 수 ${mini("a_pm", perM2, { w: 70, int: true })} 송이 × 넓이 <span class="a-bv">□</span>㎡</div>
    <div class="calc">= 약 ${mini("a_tot", p.total, { w: 100, int: true })} 송이</div>
    <div class="muted">1㎡당 꽃 수는 「방형구법과 AI로 국화꽃 세기」에서 구한 값이에요. 답을 내면 「팀별 발자취」에서 실제 넓이와 비교할 수 있어요!</div>
    <div class="family-tip">가족 함께해요 ▶ 보폭을 잴 때는 같은 속도로 걷고 시작·끝에 표시해 주세요.</div>`;
  const bestVal = () => best ? numOr(el, { app: "a_app", map: "a_map", stride: "a_st" }[best]) : null;
  const drawBest = () => {
    const v = { app: numOr(el, "a_app"), map: numOr(el, "a_map"), stride: numOr(el, "a_st") };
    el.querySelector(".a-best").innerHTML = AREA_WAYS.map(([k, n]) => `<button type="button" class="choice ${best === k ? "on" : ""}" data-v="${k}" ${v[k] == null ? "disabled" : ""}>
      ${n}<small style="display:block;font-weight:600">${v[k] == null ? "아직 안 잼" : v[k] + "㎡"}</small></button>`).join("");
    el.querySelectorAll(".a-best .choice").forEach((b) => b.onclick = () => { best = b.dataset.v; drawBest(); });
    el.querySelector(".a-bv").textContent = bestVal() ?? "□";
  };
  const live = () => {
    const w = numOr(el, "a_wm"), h = numOr(el, "a_hm");
    el.querySelector(".a-f").textContent = `${w ?? "□"} m × ${h ?? "□"} m`;
    if (best && bestVal() == null) best = "";
    drawBest();
  };
  el.querySelectorAll("input").forEach((i) => i.addEventListener("input", live));
  live();
  const out = () => ({
    app: numOr(el, "a_app"), map: numOr(el, "a_map"), ws: numOr(el, "a_ws"), wm: numOr(el, "a_wm"), hs: numOr(el, "a_hs"), hm: numOr(el, "a_hm"),
    stride: numOr(el, "a_st"), best, bestArea: bestVal(), perM2: numOr(el, "a_pm"), total: numOr(el, "a_tot")
  });
  return {
    draft: out,
    collect() {
      const e = checkAll(el, [["a_app", "측정 앱 넓이", "㎡", false, true], ["a_map", "지도 앱 넓이", "㎡", false, true], ["a_ws", "가로 보 수", "보", true, true], ["a_wm", "가로 길이", "m", false, true],
        ["a_hs", "세로 보 수", "보", true, true], ["a_hm", "세로 길이", "m", false, true], ["a_st", "보폭으로 잰 넓이", "㎡", false, true]]);
      if (e) return fail(e);
      if (numOr(el, "a_app") == null && numOr(el, "a_map") == null && numOr(el, "a_st") == null) return fail("방법 ①②③ 중 하나 이상으로 잔디밭 넓이를 재어 써 주세요.");
      if (!best || bestVal() == null) return fail("가장 믿는 넓이 1개를 골라 주세요.");
      const e2 = checkAll(el, [["a_pm", "1㎡당 꽃 수", "송이", true], ["a_tot", "심을 수 있는 국화 수", "송이", true]]); if (e2) return fail(e2);
      return { ok: true, data: out() };
    }
  };
};

/* 4-1. 자연 속 피보나치 수 — 솔방울 나선 */
R.fibo = (el, q, { prev }) => {
  const p = prev || {};
  el.innerHTML = `
    ${sec("솔방울의 피보나치 수", "솔방울을 뒤집어 아래쪽에서 봐요")}
    ${wbImg("pinecone.jpg", "솔방울 나선: 시계 반대 방향 8줄(파랑), 시계 방향 13줄(빨강)")}
    <div class="muted" style="margin:6px 0">솔방울 비늘이 만드는 나선은 이웃한 피보나치 수(5와 8, 8과 13 등)인 경우가 많아요. 땅에 떨어진 것을 눈으로만 세어요.</div>
    ${sec("사진 위에 나선 그려 보기", "그냥 세기 어려우면 사진에 펜으로!")}
    <div class="muted" style="margin-bottom:8px">솔방울 사진을 올리고, 색을 골라 손가락으로 나선을 따라 그려요. 한 줄을 그릴 때마다 한 번씩 그어요.</div>
    <div class="sp"></div>
    ${sec(`나선 수 세기 ${star}`)}
    <div class="calc">시계 방향 나선 수 ${mini("fb_cw", p.cw, { w: 60, int: true })} 개 ${star}</div>
    <div class="calc">시계 반대 방향 나선 수 ${mini("fb_ccw", p.ccw, { w: 60, int: true })} 개 ${star}</div>
    <button type="button" class="btn small ghost" data-fill style="margin-top:6px">그린 선 수로 채우기</button>
    <div class="fb-check muted" style="margin-top:8px"></div>
    <div class="family-tip">가족 함께해요 ▶ 꼭 3·5·8·13이 아니어도 괜찮아요. 가까운 수를 찾으면 성공입니다. 꺾지 않고 눈으로만 세어요.</div>`;
  const pad = spiralPad(el.querySelector(".sp"), { photo: p.photo, strokes: p.strokes }, () => {});
  const check = () => {
    const a = numOr(el, "fb_cw"), b = numOr(el, "fb_ccw"), box = el.querySelector(".fb-check");
    if (a == null || b == null) { box.textContent = ""; return; }
    const i = FIBS.indexOf(Math.min(a, b)), nb = i >= 0 && FIBS[i + 1] === Math.max(a, b);
    box.innerHTML = nb ? `✨ ${Math.min(a, b)}와 ${Math.max(a, b)}는 이웃한 피보나치 수예요!` : `피보나치 수: 1, 1, 2, 3, 5, 8, 13, 21 … 우리 숫자와 비교해 봐요.`;
  };
  el.querySelectorAll("#fb_cw,#fb_ccw").forEach((i) => i.addEventListener("input", check));
  el.querySelector("[data-fill]").onclick = () => {
    const c = pad.counts();
    if (!c.r && !c.b) return toast("사진 위에 나선을 먼저 그려 주세요.");
    el.querySelector("#fb_cw").value = c.r; el.querySelector("#fb_ccw").value = c.b; check();
  };
  check();
  const out = () => {
    const drawn = pad.strokes.length ? pad.composite() : (pad.photo || "");
    return { cw: numOr(el, "fb_cw"), ccw: numOr(el, "fb_ccw"), photo: pad.photo, drawn, strokes: pad.strokes.slice(0, 80).map((s) => ({ c: s.c, p: s.p.slice(0, 300).flat() })) };
  };
  return {
    draft: out,
    collect() {
      const e = checkAll(el, [["fb_cw", "시계 방향 나선 수", "개", true], ["fb_ccw", "시계 반대 방향 나선 수", "개", true]]); if (e) return fail(e);
      return { ok: true, data: out() };
    }
  };
};

/* 4-1. 황금비율자로 황금비 찾기 */
R.golden = (el, q, { prev }) => {
  const p = prev || {};
  el.innerHTML = `
    ${sec("가족 몸에서 황금비 찾기", "손의 길이와 손목~팔꿈치 길이")}
    ${numField("g_hand", "내 손 길이", "cm", p.hand, { ph: "예) 15" })}
    ${numField("g_arm", "내 손목~팔꿈치 길이", "cm", p.arm, { ph: "예) 24" })}
    <div class="gold-box"></div>
    <label class="fld" for="g_f1">내가 찾은 황금비 <small>(선택)</small></label>
    <input id="g_f1" class="inp" maxlength="40" placeholder="예) 얼굴 가로 : 세로" value="${esc(p.found1 || "")}">
    <div class="muted" style="margin-top:8px">황금비 예시: 얼굴 가로와 세로 · 턱~코 밑과 코 밑~눈썹 · 손과 손목~팔꿈치 · 배꼽~머리끝과 배꼽~발끝 · 손가락 마디</div>
    <div class="family-tip">가족 함께해요 ▶ 서로의 몸을 잴 때는 먼저 동의를 구하고 웃으며 재요.</div>`;
  const live = () => {
    const h = numOf(el, "g_hand"), a = numOf(el, "g_arm"), box = el.querySelector(".gold-box");
    if (!(h > 0 && a > 0)) { box.innerHTML = `<div class="muted">두 길이를 쓰면 비를 계산해 줘요.</div>`; return; }
    const r = a / h, pos = Math.max(0, Math.min(100, (r - 1) / 1.2 * 100)), g = (1.618 - 1) / 1.2 * 100;
    box.innerHTML = `<div class="calc" style="text-align:center">손 : 손목~팔꿈치 = 1 : <b>${r2(r)}</b></div>
      <div class="gauge"><i class="gold" style="left:${g}%"></i><i class="me" style="left:${pos}%"></i></div>
      <div class="gauge-l"><span>1.0</span><span style="color:#c9a227">황금비 1.618</span><span>2.2</span></div>
      <div class="muted" style="text-align:center">${Math.abs(r - 1.618) < 0.15 ? "✨ 황금비에 아주 가까워요!" : "황금비와 얼마나 다른지 살펴봐요."}</div>`;
  };
  el.querySelectorAll("#g_hand,#g_arm").forEach((i) => i.addEventListener("input", live));
  live();
  return {
    draft() { return { hand: numOr(el, "g_hand"), arm: numOr(el, "g_arm"), found1: valOf(el, "g_f1") }; },
    collect() {
      const e = checkAll(el, [["g_hand", "손 길이", "cm"], ["g_arm", "손목~팔꿈치 길이", "cm"]]); if (e) return fail(e);
      if (!(numOf(el, "g_hand") > 0)) return fail("손 길이는 0보다 커야 해요.");
      return { ok: true, data: { hand: numOf(el, "g_hand"), arm: numOf(el, "g_arm"), found1: valOf(el, "g_f1") } };
    }
  };
};

/* 4-2. 펜토미노 */
R.pento = (el, q, { prev, config, teamId, round = 0, autoSubmit, saveDraft }) => {
  const st = pentoSettings(config);
  const { list, need, mode } = st;
  const solved = { ...pentoSolved(prev) };            // { 퍼즐번호: { grid } }
  const prog = () => pentoProgress(solved, st);
  const passedBefore = prog().passed && !!prev?.passed;
  const startKey = `mt_pento_start_${teamId}_${round}`;
  if (!localStorage.getItem(startKey)) localStorage.setItem(startKey, String(Date.now()));
  let timerId = null, passedNow = null;
  const fmt = (s) => `${Math.floor(s / 60)}분 ${String(s % 60).padStart(2, "0")}초`;
  const elapsed = () => Math.round((Date.now() - Number(localStorage.getItem(startKey))) / 1000);
  const count = () => prog().count;
  const dataOut = () => { const p = prog(); return { solved, count: p.count, need, passed: p.passed }; };

  const head = () => {
    const p = prog();
    const all = list.length, doneN = p.done.length;
    const rule = mode === "group"
      ? `서로 다른 조각 수 퍼즐을 ${need}가지 완성하면 통과! (예: 2조각 · 3조각 · 5조각)`
      : `퍼즐 ${need}개를 완성하면 통과!`;
    const gs = [...new Set(list.map(pzGroup))];
    const chips = mode === "group" ? `<div class="tchips" style="margin-top:6px">${gs.map((g) => {
      const ok = p.doneGroups.includes(g);
      return `<span class="tchip" style="${ok ? "background:#1f2a5c;color:#fff" : ""}">${ok ? "✔ " : ""}${g}조각</span>`;
    }).join("")}</div>` : "";
    return `
    <div class="row" style="justify-content:space-between;margin-bottom:8px;align-items:flex-start">
      <div><b style="font-size:18px">${p.passed ? "🎉 통과!" : `통과까지 ${p.count} / ${need}${mode === "group" ? "가지" : "개"}`}</b>
        <div class="muted">${rule}</div>${chips}</div>
      ${config.pentoTimerShow === false ? "" : `<div class="timer">⏱ <span class="tt">${fmt(elapsed())}</span></div>`}</div>
    <div style="height:10px;background:#e6e1d4;border-radius:99px;overflow:hidden;margin:6px 0 4px">
      <i style="display:block;height:100%;width:${Math.min(100, doneN / all * 100)}%;background:#e5484d;border-radius:99px"></i></div>
    <div class="muted" style="margin-bottom:10px"><b style="color:#b8282d">전체 ${all}개 중 ${doneN}개 도전 완료</b> · 기왕이면 모든 퍼즐에 도전해 보세요!</div>`;
  };
  const tickOn = () => {
    clearInterval(timerId);
    timerId = setInterval(() => {
      if (!el.isConnected) { clearInterval(timerId); return; }
      const t = el.querySelector(".tt"); if (t && !prog().passed) t.textContent = fmt(elapsed());
    }, 1000);
  };

  // 퍼즐 고르기 화면 (조각 수별로 묶어서)
  const card = (i) => {
    const pz = PUZZLES[i], done = solved[i], lock = false;
    return `<button type="button" class="s" data-pz="${i}" style="cursor:pointer;${done ? "border:2px solid #1f2a5c;background:#fff6c9" : "border:2px solid transparent"}${lock ? ";opacity:.4" : ""}">
      <div style="display:flex;justify-content:center;align-items:center;height:84px">${miniGrid(done ? done.grid : pz.rows, 9)}</div>
      <div style="font-size:12px;color:#5d6b69">${esc(pz.level)}</div>${esc(pz.name)}${done ? `<div style="color:#1f2a5c;font-size:12px">✔ 완성</div>` : lock ? `<div style="font-size:12px;color:#5d6b69">🔒 잠김</div>` : ""}</button>`;
  };
  const showList = () => {
    document.body.classList.remove("pento-focus");
    const gs = [...new Set(list.map(pzGroup))];
    el.innerHTML = head() + gs.map((g) => {
      const n = list.filter((i) => pzGroup(i) === g), d = n.filter((i) => solved[i]).length;
      const tag = `<span class="tchip" style="${d ? "background:#eef1fb;color:#141b3d" : ""}">${d} / ${n.length}</span>`;
      return `<h4 style="margin:14px 2px 8px;display:flex;gap:6px;align-items:center">${g}조각 퍼즐 ${tag}</h4>
        <div class="sol-gallery pz-cards">${list.filter((i) => pzGroup(i) === g).map(card).join("")}</div>`;
    }).join("") + `<div class="muted" style="margin-top:10px">풀고 싶은 퍼즐을 골라요. 실물 조각으로 먼저 맞춘 뒤, 판에도 똑같이 놓아 보세요.</div>`;
    el.querySelectorAll("[data-pz]").forEach((b) => b.onclick = () => openPuzzle(Number(b.dataset.pz)));
    tickOn();
  };

  // 퍼즐 판 화면
  const openPuzzle = (i, again = false) => {
    const pz = PUZZLES[i];
    if (solved[i] && !again) {
      el.innerHTML = head() + `<div class="card" style="text-align:center;background:#eef1fb">
          <b>${esc(pz.level)} · ${esc(pz.name)} 완성!</b>
          <div style="margin:10px auto;display:flex;justify-content:center">${miniGrid(solved[i].grid, 26)}</div>
          <div class="row" style="justify-content:center">
            <button type="button" class="btn gray small" data-back>← 퍼즐 목록</button>
            <button type="button" class="btn ghost small" data-again>다른 방법으로 다시 맞추기</button></div></div>`;
      el.querySelector("[data-back]").onclick = showList;
      el.querySelector("[data-again]").onclick = () => openPuzzle(i, true);
      tickOn();
      return;
    }
    el.innerHTML = head() + `
      <div class="row" style="justify-content:space-between;margin-bottom:4px">
        <button type="button" class="btn gray small" data-back>← 퍼즐 목록</button>
        <div style="text-align:right"><b>${esc(pz.level)} · ${esc(pz.name)}</b><div class="muted">${pz.pieces.length}조각 · ${pz.pieces.length * 5}칸</div></div></div>
      <div class="pb"></div>
      <button type="button" class="btn gray small" style="margin-top:8px" data-reset>처음부터 다시</button>`;
    el.querySelector("[data-back]").onclick = showList;
    tickOn();
    // 휴대폰: 아래 버튼 줄을 숨기고 퍼즐 판이 화면 위쪽에 오게
    document.body.classList.add("pento-focus");
    setTimeout(() => el.querySelector("[data-back]")?.scrollIntoView({ block: "start", behavior: "smooth" }), 50);
    const board = pentoBoard(el.querySelector(".pb"), pz.rows, {
      onSolved: async (grid) => {
        const before = prog().passed;
        solved[i] = { grid };
        const p = prog();
        toast(p.passed && !before ? `🎉 통과! 다음 미션이 열려요` : `🎉 ${pz.name} 완성! (${p.count}/${need})`);
        if (p.passed && !before && !passedBefore) {
          passedNow = elapsed();
          autoSubmit();                 // 통과: 미션 해결로 저장
        } else if (p.passed) {
          autoSubmit();                 // 이미 통과한 뒤 더 푼 퍼즐도 저장
        } else {
          saveDraft(dataOut()).catch(() => toast("저장하지 못했어요. 인터넷 연결을 확인해 주세요."));
        }
        setTimeout(showList, 900);
      }
    });
    el.querySelector("[data-reset]").onclick = () => board.reset();
  };

  showList();

  return {
    draft() { return dataOut(); },
    collect() {
      if (!prog().passed) return fail(mode === "group"
        ? `서로 다른 조각 수 퍼즐을 ${need}가지 완성해야 통과할 수 있어요. (지금 ${count()}가지)`
        : `퍼즐을 ${need}개 완성해야 통과할 수 있어요. (지금 ${count()}개)`);
      const data = dataOut();
      // 걸린 시간은 처음 통과했을 때만 기록 (관리자만 볼 수 있는 곳에 저장)
      if (passedNow != null && !passedBefore) {
        return { ok: true, data, priv: { kind: "pentoTime", seconds: passedNow, puzzles: Object.keys(solved).map(Number), need } };
      }
      return { ok: true, data };
    }
  };
};

/* 마무리: 가장 재미있었던 활동 (여러 개) */
R.fun = (el, q, { prev, config }) => {
  const opts = funOptions(config);
  const picks = new Set(prev?.picks || []);
  el.innerHTML = `<div class="choices list">${opts.map((o) =>
    `<button type="button" class="choice ${picks.has(o.id) ? "on" : ""}" data-v="${o.id}"><span style="font-size:22px">${qIcon(o)}</span>${esc(qTitle(o))}</button>`).join("")}</div>
    <button type="button" class="btn gray small" style="margin-top:10px" data-all>모두 고르기</button>`;
  el.querySelectorAll(".choice").forEach((b) => b.onclick = () => {
    const v = b.dataset.v;
    picks.has(v) ? picks.delete(v) : picks.add(v);
    b.classList.toggle("on", picks.has(v));
  });
  el.querySelector("[data-all]").onclick = () => {
    opts.forEach((o) => picks.add(o.id));
    el.querySelectorAll(".choice").forEach((b) => b.classList.add("on"));
  };
  return {
    draft() { return { picks: [...picks] }; },
    collect() {
      if (!picks.size) return fail("재미있었던 활동을 하나 이상 골라 주세요.");
      return { ok: true, data: { picks: [...picks] } };
    }
  };
};

/* 마무리: 만족도 (관리자만) */
const FACES = [["😞", "전혀 그렇지 않다"], ["🙁", "그렇지 않다"], ["😐", "보통이다"], ["🙂", "그렇다"], ["😍", "매우 그렇다"]];
R.scale = (el, q, { teamId }) => {
  const key = `mt_scale_${teamId}_${q.id}`;
  let v = Number(localStorage.getItem(key)) || 0;
  el.innerHTML = `<div class="stars">${FACES.map((f, i) =>
    `<button type="button" data-v="${i + 1}" class="${v === i + 1 ? "on" : ""}"><i class="face">${f[0]}</i><span><b>${i + 1}점</b> <em>${f[1]}</em></span></button>`).join("")}</div>
    <div class="muted" style="margin-top:10px">🔒 이 답은 다른 가족에게 보이지 않고 선생님만 볼 수 있어요.</div>`;
  el.querySelectorAll(".stars button").forEach((b) => b.onclick = () => {
    v = Number(b.dataset.v);
    el.querySelectorAll(".stars button").forEach((x) => x.classList.toggle("on", x === b));
  });
  return {
    draft() { return { submitted: false }; },
    draftPriv() { if (!v) return null; localStorage.setItem(key, String(v)); return { kind: "scale", value: v }; },
    collect() {
      if (!v) return fail("1점부터 5점 중 하나를 골라 주세요.");
      localStorage.setItem(key, String(v));
      return { ok: true, data: { submitted: true }, priv: { kind: "scale", value: v } };
    }
  };
};

/* 마무리: 소감 한마디 */
R.comment = (el, q, { prev }) => {
  el.innerHTML = `<textarea id="cm" class="inp" rows="4" maxlength="120" placeholder="좋았던 점, 기억에 남는 장면을 남겨 주세요.">${esc(prev?.text || "")}</textarea>
    <div class="muted" style="text-align:right"><span class="n">0</span> / 120</div>`;
  const t = el.querySelector("#cm"), n = el.querySelector(".n");
  const upd = () => n.textContent = t.value.length; t.oninput = upd; upd();
  return {
    draft() { return { text: t.value.trim() }; },
    collect() {
      const s = t.value.trim();
      if (s.length < 2) return fail("소감을 한마디 남겨 주세요.");
      return { ok: true, data: { text: s } };
    }
  };
};

/* ── 관리자가 추가한 문제 ── */
R.number = (el, q, { prev }) => {
  el.innerHTML = numField("cn", q.label || "답", q.unit || "", prev?.value, { int: !!q.intOnly });
  return {
    draft() { return { value: numOr(el, "cn") }; },
    collect() {
      const v = el.querySelector("#cn").value;
      const e = numCheck(v, q.label || "답", q.unit || "", !!q.intOnly); if (e) return fail(e);
      return { ok: true, data: { value: Number(v) } };
    }
  };
};
R.text = (el, q, { prev }) => {
  el.innerHTML = `<textarea id="ct" class="inp" rows="3" maxlength="200">${esc(prev?.text || "")}</textarea>`;
  return {
    draft() { return { text: valOf(el, "ct") }; },
    collect() {
      const s = el.querySelector("#ct").value.trim();
      if (!s) return fail("답을 써 주세요.");
      return { ok: true, data: { text: s } };
    }
  };
};
R.choice = (el, q, { prev }) => {
  let pick = prev?.pick || "";
  const opts = (q.options || []).filter(Boolean);
  el.innerHTML = `<div class="choices list">${opts.map((o) => `<button type="button" class="choice ${o === pick ? "on" : ""}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
  choiceGroup(el, ".choice", (v) => pick = v);
  return { draft() { return { pick }; }, collect() { return pick ? { ok: true, data: { pick } } : fail("하나를 골라 주세요."); } };
};
R.photo = (el, q, { prev }) => {
  let photo = prev?.photo || "";
  el.innerHTML = `<div class="ph"></div>`;
  photoPicker(el.querySelector(".ph"), photo, (u) => photo = u);
  return { draft() { return { photo }; }, collect() { return photo ? { ok: true, data: { photo } } : fail("사진을 올려 주세요."); } };
};

export function renderInput(el, q, ctx) {
  const fn = R[q.kind];
  if (!fn) { el.innerHTML = `<div class="err">알 수 없는 문제 형식이에요.</div>`; return { collect: () => fail("") }; }
  return fn(el, q, ctx);
}
