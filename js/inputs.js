// 문제별 입력 화면 — render(el, q, ctx)는 { collect } 를 돌려줘요.
// collect()는 형식을 검사해 { ok, msg, data, priv } 를 돌려줘요. (정답 검사는 하지 않아요 — 펜토미노만 판을 다 채워야 해요)
import { esc, fileToJpeg, toast } from "./fb.js";
import { BUILTIN, funOptions, qTitle, qIcon } from "./questions.js";
import { PUZZLES } from "./puzzles.js";
import { cipherWheel, cropper, dotsHtml, pentoBoard, miniGrid } from "./widgets.js";
import { countFlowersOnDevice, sampleColor } from "./flowercount.js";

const isNum = (s) => /^-?\d+(\.\d+)?$/.test(String(s).trim());
const isInt = (s) => /^\d+$/.test(String(s).trim());
const fail = (msg) => ({ ok: false, msg });

function numField(id, label, unit, val, { int = false, ph = "" } = {}) {
  return `<label class="fld" for="${id}">${label}</label>
    <div class="unit-wrap"><input id="${id}" class="inp" inputmode="${int ? "numeric" : "decimal"}" autocomplete="off"
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

/* 1. 오일러와 한붓그리기 */
R.euler = (el, q, { prev }) => {
  let pick = prev?.possible || "";
  el.innerHTML = `${EULER_SVG}
    <label class="fld">한붓그리기가 가능할까요?</label>
    <div class="choices"><button type="button" class="choice" data-v="가능">⭕ 가능</button><button type="button" class="choice" data-v="불가능">❌ 불가능</button></div>
    ${numField("e_odd", "홀수점은 몇 개인가요?", "개", prev?.odd, { int: true, ph: "예) 2" })}
    <label class="fld" for="e_why">이유를 설명해 보세요</label>
    <textarea id="e_why" class="inp" rows="3" maxlength="200" placeholder="예) 홀수점이 ○개라서 …">${esc(prev?.reason || "")}</textarea>`;
  if (pick) el.querySelector(`[data-v="${pick}"]`)?.classList.add("on");
  choiceGroup(el, ".choice", (v) => pick = v);
  return {
    collect() {
      if (!pick) return fail("가능한지 불가능한지 골라 주세요.");
      const odd = el.querySelector("#e_odd").value, why = el.querySelector("#e_why").value.trim();
      const e = numCheck(odd, "홀수점 개수", "개", true); if (e) return fail(e);
      if (why.length < 2) return fail("이유를 한 줄로 써 주세요.");
      return { ok: true, data: { possible: pick, odd: Number(odd), reason: why } };
    }
  };
};

/* 2. 스페이스 암호 해독 (주최측 문제) */
R.cipher = (el, q, { prev, config }) => {
  const cp = config.cipher || {};
  const unknown = String(cp.key ?? "").trim() === "?" || String(cp.key ?? "").trim() === "";
  el.innerHTML = `
    <div class="cipher-box"><div class="muted" style="color:#c9d3ff">우주에서 온 비밀 편지</div>
      <div class="ct">${esc(cp.text || "")}</div>
      <div class="k">열쇠 k = ${unknown ? "? (찾아보세요!)" : esc(cp.key)}</div>
      ${cp.hint ? `<div class="hint">${esc(cp.hint)}</div>` : ""}</div>
    <div class="wh"></div>
    ${unknown ? numField("c_k", "찾아낸 열쇠 k는?", "칸", prev?.k, { int: true, ph: "1 ~ 25" }) : ""}
    <label class="fld" for="c_txt">해독한 원래 문장 <small>(영어 대문자로 자동으로 바뀌어요)</small></label>
    <input id="c_txt" class="inp" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:2px;font-weight:800"
      placeholder="예) HELLO" value="${esc(prev?.decoded || "")}">`;
  cipherWheel(el.querySelector(".wh"), 0);
  return {
    collect() {
      const t = el.querySelector("#c_txt").value.trim().toUpperCase().replace(/\s+/g, " ");
      if (!t) return fail("해독한 문장을 써 주세요.");
      if (!/^[A-Z ]+$/.test(t)) return fail("해독한 문장은 영어 알파벳과 띄어쓰기만 써 주세요.");
      const data = { decoded: t };
      if (unknown) {
        const k = el.querySelector("#c_k").value;
        const e = numCheck(k, "열쇠 k", "칸", true); if (e) return fail(e);
        if (Number(k) < 1 || Number(k) > 25) return fail("열쇠 k는 1부터 25 사이의 수예요.");
        data.k = Number(k);
      }
      return { ok: true, data };
    }
  };
};

/* 3. 라틴방진 스마트톡 (사진) */
R.latin = (el, q, { prev }) => {
  let photo = prev?.photo || "";
  el.innerHTML = `<div class="ph"></div>
    <label class="fld" for="l_name">우리 가족 스마트톡 이름 <small>(선택)</small></label>
    <input id="l_name" class="inp" maxlength="30" placeholder="예) 알록달록 행운 거북이 톡" value="${esc(prev?.name || "")}">`;
  photoPicker(el.querySelector(".ph"), photo, (u) => photo = u);
  return {
    collect() {
      if (!photo) return fail("스마트톡 사진을 올려 주세요.");
      return { ok: true, data: { photo, name: el.querySelector("#l_name").value.trim() } };
    }
  };
};

/* 4. 동물 친구 웰빙 계산기 */
R.food = (el, q, { prev }) => {
  el.innerHTML = `<div class="calc" style="text-align:center;font-size:20px">1 : 150 = 4 : □</div>
    ${numField("f_v", "사막여우 4마리의 하루 먹이량", "g", prev?.value, { ph: "숫자만" })}`;
  return {
    collect() {
      const v = el.querySelector("#f_v").value;
      const e = numCheck(v, "먹이량", "g", false); if (e) return fail(e);
      return { ok: true, data: { value: Number(v) } };
    }
  };
};

/* 5. 내 보폭으로 재어보는 산책로 */
R.stride = (el, q, { prev }) => {
  el.innerHTML = `
    ${numField("s_step", "학생의 평균 1보 길이 (4보 길이 ÷ 4)", "cm", prev?.step, { ph: "예) 115" })}
    ${numField("s_walk", "내 보폭으로 계산한 구간 거리 (보수 × 1보)", "m", prev?.walk, { ph: "예) 120" })}
    ${numField("s_gps", "스마트폰 GPS 앱으로 잰 같은 구간 거리", "m", prev?.gps, { ph: "예) 125" })}`;
  return {
    collect() {
      const v = ["s_step", "s_walk", "s_gps"].map((id) => el.querySelector("#" + id).value);
      const names = [["1보 길이", "cm"], ["보폭 거리", "m"], ["GPS 거리", "m"]];
      for (let i = 0; i < 3; i++) { const e = numCheck(v[i], names[i][0], names[i][1], false); if (e) return fail(e); }
      return { ok: true, data: { step: Number(v[0]), walk: Number(v[1]), gps: Number(v[2]) } };
    }
  };
};

/* 6. 방형구법과 국화꽃 송이 맞히기 */
R.quadrat = (el, q, { prev, config }) => {
  const area = Number(config.quadratArea) || 20;
  const st = {
    photo: prev?.photo || "", aiCount: prev?.aiCount ?? "", aiPoints: prev?.aiPoints || [],
    aiManual: !!prev?.aiManual, basis: prev?.basis || "", aiBy: prev?.aiBy || ""
  };
  el.innerHTML = `
    <div class="steps">
      <div class="step"><h5>방형구 사진 올리기</h5>
        <div class="q-photo"></div></div>
      <div class="step"><h5>AI가 센 꽃 수</h5><div class="q-ai"></div></div>
      <div class="step"><h5>눈으로 직접 센 꽃 수</h5>
        ${numField("q_eye", "우리 가족이 직접 센 꽃 수", "송이", prev?.eye, { int: true, ph: "예) 12" })}</div>
      <div class="step"><h5>1㎡에는 몇 송이?</h5>
        <div class="muted">20cm × 20cm 방형구 25개 = 1m × 1m = 1㎡ 예요. 어떤 수로 계산할까요?</div>
        <div class="choices" style="margin:8px 0"><button type="button" class="choice" data-v="eye">👀 내가 센 수</button><button type="button" class="choice" data-v="ai">🤖 AI가 센 수</button></div>
        <div class="calc q-f1">(기준 수) × 25 = □</div>
        ${numField("q_m2", "1㎡당 꽃 수", "송이", prev?.perM2, { int: true })}</div>
      <div class="step"><h5>꽃밭 전체는 몇 송이?</h5>
        <div class="calc">선생님이 알려 준 꽃밭 넓이: <b>${area}㎡</b></div>
        <div class="calc q-f2">(1㎡당 꽃 수) × ${area} = □</div>
        ${numField("q_total", "꽃밭 전체 꽃 수 어림", "송이", prev?.total, { int: true })}</div>
    </div>`;
  const $ = (s) => el.querySelector(s);
  if (st.basis) $(`[data-v="${st.basis}"]`)?.classList.add("on");
  const formula = () => {
    const base = st.basis === "ai" ? st.aiCount : st.basis === "eye" ? $("#q_eye").value : "";
    $(".q-f1").textContent = `${base !== "" && base != null ? base : "(기준 수)"} × 25 = □`;
    const m2 = $("#q_m2").value;
    $(".q-f2").textContent = `${m2 || "(1㎡당 꽃 수)"} × ${area} = □`;
  };
  choiceGroup(el, ".choice", (v) => { st.basis = v; formula(); });
  $("#q_eye").oninput = formula; $("#q_m2").oninput = formula;

  const aiBox = $(".q-ai");
  const drawAi = (state) => {
    if (state === "busy") { aiBox.innerHTML = `<div class="loading" style="padding:16px"><div class="spin"></div>AI가 꽃을 세고 있어요…</div>`; return; }
    if (st.photo && !st.aiManual && st.aiCount !== "") {
      const byTxt = st.aiBy === "device" ? "📱 휴대폰 AI가 꽃 색깔로 셌어요" : "🤖 Gemini AI가 셌어요";
      aiBox.innerHTML = `<div class="tapzone" style="cursor:crosshair">${dotsHtml(st.photo, st.aiPoints, `AI: ${st.aiCount}송이`)}</div>
        <div class="muted" style="margin-top:6px"><b>${byTxt}</b> · 빨간 점이 AI가 꽃이라고 본 곳이에요. 빠뜨리거나 두 번 센 꽃이 있나요?</div>
        <div class="row wrap" style="margin-top:8px;gap:6px">
          ${st.aiBy === "device" ? `<span class="muted">꽃을 잘 못 찾았다면 👉 사진에서 <b>꽃 한 송이를 톡</b> 눌러 꽃 색을 알려 주세요.</span>` : ""}
          ${st.aiBy !== "device" ? `<button type="button" class="btn small gray" data-dev>📱 휴대폰 AI로도 세어 보기</button>` : ""}
          ${st.aiBy === "device" && config.gasUrl && aiMode !== "device" ? `<button type="button" class="btn small gray" data-retry>🤖 Gemini에게 다시 물어보기</button>` : ""}
        </div>`;
      aiBox.querySelector("[data-retry]")?.addEventListener("click", askAi);
      aiBox.querySelector("[data-dev]")?.addEventListener("click", () => askDevice());
      if (st.aiBy === "device") {
        aiBox.querySelector(".tapzone img").addEventListener("click", async (e) => {
          const r = e.target.getBoundingClientRect();
          const rgb = await sampleColor(st.photo, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
          askDevice(rgb);
        });
      }
      return;
    }
    const manual = st.aiManual || state === "fail";
    aiBox.innerHTML = manual
      ? `${state === "fail" ? `<div class="err">AI에게 물어보지 못했어요. 다른 AI 앱(Gemini·ChatGPT 등)으로 센 수를 직접 적어 주세요.</div>` : ""}
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
  // AI 방식: auto = Gemini 먼저, 안 되면 휴대폰 AI / device = 휴대폰 AI만 / gemini = Gemini만
  const aiMode = config.aiMode || "auto";
  async function askDevice(pickRGB = null) {
    drawAi("busy");
    try {
      const r = await countFlowersOnDevice(st.photo, { pickRGB });
      st.aiCount = String(r.count); st.aiPoints = r.points; st.aiManual = false; st.aiBy = "device";
      drawAi(); formula();
      if (pickRGB) toast(`고른 색으로 다시 셌어요: ${r.count}송이`);
    } catch (err) {
      console.warn(err);
      st.aiManual = true; drawAi("fail");
    }
  }
  async function askGemini() {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 30000);
    try {
      const res = await fetch(config.gasUrl, {
        method: "POST", body: JSON.stringify({ image: st.photo.split(",")[1] }), signal: ctl.signal
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "fail");
      return j;
    } finally { clearTimeout(tm); }
  }
  async function askAi() {
    if (!st.photo) return;
    if (aiMode === "device" || !config.gasUrl) return askDevice();
    drawAi("busy");
    try {
      const j = await askGemini();
      st.aiCount = String(j.count); st.aiPoints = j.points || []; st.aiManual = false; st.aiBy = "gemini";
      drawAi(); formula();
    } catch (err) {
      console.warn("Gemini 실패", err);
      if (aiMode === "auto") { toast("Gemini 연결이 안 돼서 휴대폰 AI로 셀게요"); return askDevice(); }
      st.aiManual = true; drawAi("fail");
    }
  }
  drawPhoto(); drawAi(); formula();

  return {
    collect() {
      if (crop) return fail("사진 영역을 정한 뒤 「AI에게 세어 달라고 하기」를 눌러 주세요.");
      if (!st.photo) return fail("방형구 사진을 올려 주세요.");
      let e = numCheck(st.aiCount, "AI가 센 꽃 수", "송이", true); if (e) return fail(e);
      const eye = $("#q_eye").value, m2 = $("#q_m2").value, total = $("#q_total").value;
      e = numCheck(eye, "직접 센 꽃 수", "송이", true); if (e) return fail(e);
      if (!st.basis) return fail("1㎡ 계산에 쓸 수(내가 센 수 / AI가 센 수)를 골라 주세요.");
      e = numCheck(m2, "1㎡당 꽃 수", "송이", true); if (e) return fail(e);
      e = numCheck(total, "꽃밭 전체 꽃 수", "송이", true); if (e) return fail(e);
      return {
        ok: true, data: {
          photo: st.photo, aiCount: Number(st.aiCount), aiPoints: st.aiPoints.slice(0, 400), aiManual: st.aiManual,
          eye: Number(eye), basis: st.basis, perM2: Number(m2), total: Number(total), area, aiBy: st.aiManual ? "manual" : st.aiBy
        }
      };
    }
  };
};

/* 7. 피보나치 */
R.fibo = (el, q, { prev }) => {
  let pick = prev?.petals || "";
  el.innerHTML = `
    <label class="fld" for="fb_p">식물 인식 AI로 찾은 꽃(식물) 이름</label>
    <input id="fb_p" class="inp" maxlength="30" placeholder="예) 코스모스" value="${esc(prev?.plant || "")}">
    <label class="fld">꽃잎은 몇 장인가요?</label>
    <div class="choices">${["3", "5", "8", "13", "기타"].map((v) => `<button type="button" class="choice" data-v="${v}">${v === "기타" ? "기타" : v + "장"}</button>`).join("")}</div>`;
  if (pick) el.querySelector(`[data-v="${pick}"]`)?.classList.add("on");
  choiceGroup(el, ".choice", (v) => pick = v);
  return {
    collect() {
      const p = el.querySelector("#fb_p").value.trim();
      if (!p) return fail("찾은 식물 이름을 써 주세요.");
      if (!pick) return fail("꽃잎 수를 골라 주세요.");
      return { ok: true, data: { plant: p, petals: pick } };
    }
  };
};

/* 8. 펜토미노 */
R.pento = (el, q, { prev, config, teamId, round = 0, autoSubmit }) => {
  const idx = Number(config.pentoPuzzle) || 0;
  const pz = PUZZLES[idx] || PUZZLES[0];
  const startKey = `mt_pento_start_${teamId}_${idx}_${round}`;
  const already = prev && prev.puzzle === idx && Array.isArray(prev.grid);
  let result = already ? { grid: prev.grid } : null;
  let timerId = null;
  const fmt = (s) => `${Math.floor(s / 60)}분 ${String(s % 60).padStart(2, "0")}초`;

  const startBoard = (initial) => {
    if (!localStorage.getItem(startKey)) localStorage.setItem(startKey, String(Date.now()));
    el.innerHTML = `
      <div class="row" style="justify-content:space-between;margin-bottom:6px">
        <div><b>${esc(pz.level)} · ${esc(pz.name)}</b><div class="muted">${pz.pieces.length}조각 · ${pz.pieces.length * 5}칸</div></div>
        <div class="timer">⏱ <span class="tt">0분 00초</span></div></div>
      <div class="pb"></div>
      <button type="button" class="btn gray small" style="margin-top:8px" data-reset>처음부터 다시</button>`;
    const tt = el.querySelector(".tt");
    const tick = () => {
      if (!el.isConnected) { clearInterval(timerId); return; }
      const s = Math.round((Date.now() - Number(localStorage.getItem(startKey))) / 1000);
      tt.textContent = fmt(s);
    };
    tick(); clearInterval(timerId); timerId = setInterval(tick, 1000);
    const board = pentoBoard(el.querySelector(".pb"), pz.rows, {
      initialGrid: initial,
      onSolved: (grid) => {
        clearInterval(timerId);
        const sec = Math.round((Date.now() - Number(localStorage.getItem(startKey))) / 1000);
        result = { grid, seconds: sec };
        toast(`🎉 완성! ${fmt(sec)} 걸렸어요`);
        autoSubmit();
      }
    });
    el.querySelector("[data-reset]").onclick = () => board.reset();
  };

  if (already) {
    el.innerHTML = `<div class="card" style="text-align:center;background:#e3f3ec">
        <div style="font-size:40px">🎉</div><b>${esc(pz.level)} · ${esc(pz.name)} 완성!</b>
        <div style="margin:10px auto;display:flex;justify-content:center">${miniGrid(prev.grid, 26)}</div>
        <button type="button" class="btn ghost small" data-again>다른 방법으로 다시 맞춰 보기</button>
        <div class="muted" style="margin-top:6px">다시 맞춰도 처음 걸린 시간 기록은 바뀌지 않아요.</div></div>`;
    el.querySelector("[data-again]").onclick = () => { result = null; startBoard(null); };
  } else {
    startBoard(null);
  }

  return {
    collect() {
      if (!result) return fail("판의 빈칸을 모두 채워야 통과할 수 있어요. 실물 퍼즐과 똑같이 놓아 보세요!");
      const data = { grid: result.grid, puzzle: idx, name: pz.name };
      // 걸린 시간은 처음 완성했을 때만 기록 (관리자만 볼 수 있는 곳에 저장)
      if (result.seconds != null && !already) {
        return { ok: true, data, priv: { kind: "pentoTime", seconds: result.seconds, puzzle: idx } };
      }
      return { ok: true, data };
    }
  };
};

/* 9. 가장 재미있었던 활동 (여러 개) */
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
    collect() {
      if (!picks.size) return fail("재미있었던 활동을 하나 이상 골라 주세요.");
      return { ok: true, data: { picks: [...picks] } };
    }
  };
};

/* 10. 만족도 (관리자만) */
const FACES = [["😞", "전혀 그렇지 않다"], ["🙁", "그렇지 않다"], ["😐", "보통이다"], ["🙂", "그렇다"], ["😍", "매우 그렇다"]];
R.scale = (el, q, { teamId }) => {
  const key = `mt_scale_${teamId}_${q.id}`;
  let v = Number(localStorage.getItem(key)) || 0;
  el.innerHTML = `<div class="stars">${FACES.map((f, i) =>
    `<button type="button" data-v="${i + 1}" class="${v === i + 1 ? "on" : ""}">${f[0]}<span>${i + 1}점<br>${f[1]}</span></button>`).join("")}</div>
    <div class="muted" style="margin-top:10px">🔒 이 답은 다른 가족에게 보이지 않고 선생님만 볼 수 있어요.</div>`;
  el.querySelectorAll(".stars button").forEach((b) => b.onclick = () => {
    v = Number(b.dataset.v);
    el.querySelectorAll(".stars button").forEach((x) => x.classList.toggle("on", x === b));
  });
  return {
    collect() {
      if (!v) return fail("1점부터 5점 중 하나를 골라 주세요.");
      localStorage.setItem(key, String(v));
      return { ok: true, data: { submitted: true }, priv: { kind: "scale", value: v } };
    }
  };
};

/* 11. 소감 한마디 */
R.comment = (el, q, { prev }) => {
  el.innerHTML = `<textarea id="cm" class="inp" rows="4" maxlength="120" placeholder="좋았던 점, 기억에 남는 장면을 남겨 주세요.">${esc(prev?.text || "")}</textarea>
    <div class="muted" style="text-align:right"><span class="n">0</span> / 120</div>`;
  const t = el.querySelector("#cm"), n = el.querySelector(".n");
  const upd = () => n.textContent = t.value.length; t.oninput = upd; upd();
  return {
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
  return { collect() { return pick ? { ok: true, data: { pick } } : fail("하나를 골라 주세요."); } };
};
R.photo = (el, q, { prev }) => {
  let photo = prev?.photo || "";
  el.innerHTML = `<div class="ph"></div>`;
  photoPicker(el.querySelector(".ph"), photo, (u) => photo = u);
  return { collect() { return photo ? { ok: true, data: { photo } } : fail("사진을 올려 주세요."); } };
};

export function renderInput(el, q, ctx) {
  const fn = R[q.kind];
  if (!fn) { el.innerHTML = `<div class="err">알 수 없는 문제 형식이에요.</div>`; return { collect: () => fail("") }; }
  return fn(el, q, ctx);
}
