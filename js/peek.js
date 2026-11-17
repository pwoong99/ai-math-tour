// 다른 가족 답 엿보기 — 문제마다 어울리는 모양으로 보여 줘요.
// renderPeek(el, q, list, ctx): list = [{ teamId, label, data }], ctx = { myTeamId, config, times }
import { esc } from "./fb.js?v=1.9";
import { funOptions, qTitle, qIcon } from "./questions.js?v=1.9";
import { PUZZLES } from "./puzzles.js?v=1.9";
import { dotsHtml, miniGrid } from "./widgets.js?v=1.9";

const PALETTE = ["#17795a", "#f08a24", "#3a7bd5", "#d64545", "#8e5cd9", "#1aa3a3", "#c27c0e", "#e0559b"];
const POSTIT = ["#fff59d", "#ffd1dc", "#c8f2c2", "#cfe8ff", "#ffe0b2", "#e6d4ff"];
const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const fmt = (n, d = 1) => Number.isFinite(n) ? (Math.round(n * 10 ** d) / 10 ** d).toLocaleString() : "-";
const avg = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
// 관리자가 학교·이름을 함께 볼 때는 이름 칸을 넓혀요
let WIDE = false;
const lblSort = (a, b) => a.label.length - b.label.length || a.label.localeCompare(b.label);

function who(a, me) { return a.teamId === me ? "우리 가족" : a.label; }
function stats(cards) {
  return `<div class="stat-row">${cards.map(([v, t]) => `<div class="stat"><b>${v}</b><span>${t}</span></div>`).join("")}</div>`;
}
function tabs(el, names, render) {
  el.innerHTML = `<div class="tabs">${names.map((n, i) => `<button type="button" data-i="${i}" class="${i ? "" : "on"}">${n}</button>`).join("")}</div><div class="tb"></div>`;
  const body = el.querySelector(".tb");
  const go = (i) => { el.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", Number(b.dataset.i) === i)); render(i, body); };
  el.querySelectorAll(".tabs button").forEach((b) => b.onclick = () => { el._tab = Number(b.dataset.i); go(el._tab); });
  go(el._tab || 0);
}

/* 수직선 위에 팀마다 아이콘을 쌓아 올리는 그래프 */
function dotStack(items, { unit = "", icon = "", color = "#17795a" } = {}) {
  if (!items.length) return "";
  const vals = items.map((i) => i.v);
  const uniq = [...new Set(vals)].sort((a, b) => a - b);
  let bins;
  if (uniq.length <= 12) {
    bins = uniq.map((u) => ({ label: fmt(u, 2), test: (v) => v === u }));
  } else {
    const mn = Math.min(...vals), mx = Math.max(...vals), w = (mx - mn) / 10;
    bins = [...Array(10)].map((_, i) => {
      const a = mn + w * i, b = i === 9 ? mx : mn + w * (i + 1);
      return { label: `${fmt(a, 0)}~`, test: (v) => v >= a && (i === 9 ? v <= b : v < b) };
    });
  }
  const cols = bins.map((b) => items.filter((i) => b.test(i.v)));
  const maxN = Math.max(...cols.map((c) => c.length));
  const W = 360, colW = Math.min(64, (W - 10) / bins.length), r = Math.max(7, Math.min(13, colW / 2 - 3)), H = Math.max(130, maxN * (r * 2 + 4) + 60);
  const x0 = (W - colW * bins.length) / 2;
  let g = "";
  cols.forEach((c, i) => {
    const cx = x0 + colW * (i + 0.5);
    const top = c.length === maxN && maxN > 0;
    if (top) g += `<rect x="${cx - colW / 2 + 2}" y="10" width="${colW - 4}" height="${H - 50}" rx="10" fill="#fff4e3"/>`;
    c.forEach((it, k) => {
      const cy = H - 50 - r - 4 - k * (r * 2 + 4);
      g += icon
        ? `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${r * 1.8}">${icon}</text>${it.mine ? `<circle cx="${cx}" cy="${cy}" r="${r + 2}" fill="none" stroke="#f08a24" stroke-width="3"/>` : ""}`
        : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${it.mine ? "#f08a24" : color}" opacity=".9"/>`;
    });
    g += `<text x="${cx}" y="${H - 28}" text-anchor="middle" font-size="${bins.length > 6 ? 10 : 13}" font-weight="800" fill="#1d2b2a">${esc(bins[i].label)}</text>`;
    g += `<text x="${cx}" y="${H - 10}" text-anchor="middle" font-size="11" fill="#5d6b69">${c.length}팀</text>`;
  });
  g += `<line x1="4" x2="${W - 4}" y1="${H - 46}" y2="${H - 46}" stroke="#c8c1b0" stroke-width="2"/>`;
  return `<svg viewBox="0 0 ${W} ${H}">${g}</svg>${unit ? `<div class="muted" style="text-align:right">단위: ${esc(unit)}</div>` : ""}`;
}
function modeOf(vals) {
  const m = new Map(); vals.forEach((v) => m.set(v, (m.get(v) || 0) + 1));
  let best = null, n = 0; m.forEach((c, v) => { if (c > n) { n = c; best = v; } });
  return { v: best, n };
}
function voteBars(groups, me, colorOf) {
  const total = groups.reduce((a, g) => a + g.items.length, 0) || 1;
  return `<div class="vote">${groups.map((g, i) => `
    <div class="v"><div class="top"><span>${esc(g.name)}</span><span>${g.items.length}팀 (${Math.round(g.items.length / total * 100)}%)</span></div>
      <div class="track"><i style="width:${g.items.length / total * 100}%;background:${colorOf ? colorOf(i) : PALETTE[i % 8]}"></i></div>
      <div class="tchips">${g.items.map((a) => `<span class="tchip ${a.teamId === me ? "mine" : ""}">${esc(who(a, me))}</span>`).join("")}</div></div>`).join("")}</div>`;
}
function wall(list, me, photoOf, capOf) {
  const items = list.filter((a) => photoOf(a));
  if (!items.length) return `<div class="empty">아직 올라온 사진이 없어요.</div>`;
  return `<div class="wall">${items.map((a) => {
    const rot = (hash(a.teamId) % 7) - 3;
    return `<div class="polaroid ${a.teamId === me ? "mine" : ""}" style="transform:rotate(${rot}deg)" data-zoom="${a.teamId}">
      <img src="${photoOf(a)}" alt="" loading="lazy"><div class="cap">${capOf(a)}</div></div>`;
  }).join("")}</div>`;
}
function hbars(rows, { unit = "", max, color = "#17795a", icon = "", nameW = 74 }) {
  const mx = max ?? Math.max(...rows.map((r) => r.v), 1);
  return rows.map((r) => `
    <div class="row" style="margin:6px 0;gap:8px">
      <div style="width:${WIDE ? Math.max(nameW, 190) : nameW}px;flex:none;font-weight:800;font-size:14px;line-height:1.25" class="${r.mine ? "me" : ""}">${esc(r.name)}</div>
      <div class="grow" style="background:#f0ece1;border-radius:99px;height:22px;position:relative;overflow:hidden">
        <i style="position:absolute;left:0;top:0;bottom:0;width:${Math.max(4, r.v / mx * 100)}%;background:${r.mine ? "#f08a24" : color};border-radius:99px"></i>
        ${icon ? `<span style="position:absolute;left:calc(${Math.max(4, r.v / mx * 100)}% - 22px);top:0;font-size:16px">${icon}</span>` : ""}
      </div>
      <div style="width:70px;text-align:right;font-weight:800;font-size:14px">${r.txt != null ? esc(r.txt) : fmt(r.v) + esc(unit)}</div></div>`).join("");
}

const P = {};

P.euler = (el, list, { myTeamId: me }) => {
  const groups = ["가능", "불가능"].map((n) => ({ name: n === "가능" ? "⭕ 가능" : "❌ 불가능", items: list.filter((a) => a.data.possible === n) }));
  const odds = {};
  list.forEach((a) => { const k = a.data.odd; (odds[k] = odds[k] || []).push(a); });
  const oddRows = Object.keys(odds).sort((a, b) => a - b).map((k) => ({ name: `홀수점 ${k}개`, items: odds[k] }));
  el.innerHTML = `
    <div class="chart"><h4>한붓그리기가 가능할까? 가족 투표</h4>${voteBars(groups, me, (i) => i ? "#d64545" : "#17795a")}</div>
    <div class="chart"><h4>홀수점은 몇 개라고 했을까?</h4>${voteBars(oddRows, me)}</div>
    <h4 style="margin:14px 2px 8px">💬 가족들의 이유</h4>
    <div class="bubbles">${list.map((a) => `<div class="bubble ${a.teamId === me ? "mine" : ""}">
      <div class="who">${esc(who(a, me))} · ${a.data.possible === "가능" ? "⭕ 가능" : "❌ 불가능"} · 홀수점 ${a.data.odd}개</div>${esc(a.data.reason)}</div>`).join("")}</div>`;
};

P.cipher = (el, list, { myTeamId: me, config, admin }) => {
  const cp = config.cipher || {};
  const unknown = String(cp.key ?? "").trim() === "?" || String(cp.key ?? "").trim() === "";
  const mine = admin || list.find((a) => a.teamId === me); // 관리자는 정답을 바로 봐요
  const norm = (s) => String(s || "").toUpperCase().replace(/\s+/g, " ").trim();
  const ans = norm(cp.answer);
  const g = new Map();
  list.forEach((a) => { const k = norm(a.data.decoded); if (!g.has(k)) g.set(k, []); g.get(k).push(a); });
  const groups = [...g.entries()].sort((a, b) => b[1].length - a[1].length);
  let html = mine && ans
    ? `<div class="cipher-box"><div class="muted" style="color:#c9d3ff">주최측이 숨겨 둔 원래 문장</div><div class="ct">${esc(cp.answer)}</div>
       ${unknown && cp.answerK ? `<div class="k">열쇠 k = ${esc(cp.answerK)}</div>` : ""}</div>`
    : `<div class="card" style="text-align:center">🔒 우리 가족 답을 내면 주최측 정답이 공개돼요!</div>`;
  html += `<h4 style="margin:14px 2px 8px">가족들이 해독한 문장</h4><div class="bubbles">${groups.map(([t, items]) => `
    <div class="bubble" style="${mine && ans && t === ans ? "border:2px solid #17795a;background:#eefaf3" : ""}">
      <div style="font-size:21px;font-weight:900;letter-spacing:2px">${esc(t)} ${mine && ans && t === ans ? "✅" : ""}</div>
      <div class="row wrap" style="margin-top:6px;gap:5px"><b style="font-size:13px">${items.length}팀:</b>
      ${items.map((a) => `<span class="tchip ${a.teamId === me ? "mine" : ""}">${esc(who(a, me))}</span>`).join("")}</div></div>`).join("")}</div>`;
  if (unknown) {
    const ks = {};
    list.forEach((a) => { if (a.data.k != null) (ks[a.data.k] = ks[a.data.k] || []).push(a); });
    html += `<div class="chart" style="margin-top:12px"><h4>찾아낸 열쇠 k</h4>${voteBars(Object.keys(ks).sort((a, b) => a - b).map((k) => ({ name: `k = ${k}`, items: ks[k] })), me)}</div>`;
  }
  el.innerHTML = html;
};

P.latin = (el, list, { myTeamId: me }) => {
  el.innerHTML = `<div class="peek-sub">사진을 누르면 크게 볼 수 있어요.</div>` +
    wall(list, me, (a) => a.data.photo, (a) => `${esc(who(a, me))}${a.data.name ? `<small>${esc(a.data.name)}</small>` : ""}`);
};

P.food = (el, list, { myTeamId: me }) => {
  const vals = list.map((a) => a.data.value);
  const m = modeOf(vals);
  el.innerHTML = `${stats([[`${fmt(m.v)}g`, `가장 많은 가족이 쓴 답 (${m.n}팀)`], [list.length + "팀", "답을 낸 가족"]])}
    <div class="chart"><h4>🦊 가족들이 구한 하루 먹이량</h4>
      ${dotStack(list.map((a) => ({ v: a.data.value, mine: a.teamId === me })), { unit: "g", icon: "🦊" })}
      <div class="calc" style="text-align:center;margin-top:8px">1 : 150 = 4 : <b>${fmt(m.v)}</b></div>
      <div class="muted">주황 테두리가 우리 가족이에요. 다른 답이 있다면 어떻게 계산했을지 이야기해 봐요.</div></div>`;
};

P.stride = (el, list, { myTeamId: me }) => {
  const rows = [...list].sort(lblSort);
  tabs(el, ["👣 1보 길이", "📏 보폭 vs 🛰 GPS"], (i, body) => {
    if (i === 0) {
      const s = rows.map((a) => ({ name: who(a, me), v: a.data.step, mine: a.teamId === me })).sort((a, b) => b.v - a.v);
      body.innerHTML = `${stats([[fmt(avg(s.map((x) => x.v))) + "cm", "평균 1보"], [fmt(Math.max(...s.map((x) => x.v))) + "cm", "가장 긴 1보"], [fmt(Math.min(...s.map((x) => x.v))) + "cm", "가장 짧은 1보"]])}
        <div class="chart"><h4>가족별 1보 길이</h4>${hbars(s, { unit: "cm", icon: "👣" })}</div>`;
      return;
    }
    const all = rows.flatMap((a) => [a.data.walk, a.data.gps]);
    const mn = Math.min(...all), mx = Math.max(...all), pad = (mx - mn) * 0.1 || 5;
    const lo = Math.max(0, mn - pad), hi = mx + pad;
    const W = WIDE ? 560 : 360, L = WIDE ? 230 : 62, Rr = 62, rowH = 30, H = rows.length * rowH + 34;
    const X = (v) => L + (v - lo) / (hi - lo) * (W - L - Rr);
    let g = "";
    rows.forEach((a, k) => {
      const y = 20 + k * rowH + rowH / 2, w = X(a.data.walk), p = X(a.data.gps), d = Math.abs(a.data.walk - a.data.gps);
      g += `<text x="${L - 10}" y="${y}" text-anchor="end" dominant-baseline="central" font-size="12" font-weight="800" fill="${a.teamId === me ? "#f08a24" : "#1d2b2a"}">${esc(who(a, me))}</text>
        <line x1="${Math.min(w, p)}" x2="${Math.max(w, p)}" y1="${y}" y2="${y}" stroke="#c8c1b0" stroke-width="4" stroke-linecap="round"/>
        <circle cx="${w}" cy="${y}" r="6.5" fill="#f08a24"/><circle cx="${p}" cy="${y}" r="6.5" fill="#3a7bd5"/>
        <text x="${W - 8}" y="${y}" text-anchor="end" dominant-baseline="central" font-size="11" font-weight="800" fill="#5d6b69">차이 ${fmt(d)}m</text>`;
    });
    [lo, (lo + hi) / 2, hi].forEach((v) => g += `<text x="${X(v)}" y="${H - 4}" text-anchor="middle" font-size="11" fill="#5d6b69">${fmt(v, 0)}m</text>`);
    const diffs = rows.map((a) => ({ a, d: Math.abs(a.data.walk - a.data.gps) })).sort((x, y) => x.d - y.d);
    body.innerHTML = `${stats([[fmt(avg(rows.map((a) => a.data.walk))) + "m", "보폭 거리 평균"], [fmt(avg(rows.map((a) => a.data.gps))) + "m", "GPS 거리 평균"], [fmt(avg(diffs.map((x) => x.d))) + "m", "평균 차이"]])}
      <div class="chart"><h4>내 보폭으로 잰 거리와 GPS 거리</h4>
        <div class="legend"><span><i style="background:#f08a24"></i>보폭으로 잰 거리</span><span><i style="background:#3a7bd5"></i>GPS 앱 거리</span></div>
        <svg viewBox="0 0 ${W} ${H}">${g}</svg></div>
      ${diffs.length ? `<div class="card" style="text-align:center">🎯 두 값이 가장 가까운 가족: <b>${esc(who(diffs[0].a, me))}</b> (차이 ${fmt(diffs[0].d)}m)<div class="muted">왜 보폭 거리와 GPS 거리가 다를까요? 걸음이 일정했나요? GPS는 정확할까요?</div></div>` : ""}`;
  });
};

P.quadrat = (el, list, { myTeamId: me, config }) => {
  const rows = [...list].sort(lblSort);
  const area = Number(config.quadratArea) || 20;
  tabs(el, ["📷 사진", "👀 vs 🤖", "🌼 전체 어림"], (i, body) => {
    if (i === 0) {
      body.innerHTML = `<div class="peek-sub">빨간 점은 AI가 꽃이라고 본 곳이에요. 누르면 크게 보여요.</div>
        <div class="sol-gallery" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">${rows.map((a) => `
          <div class="s ${a.teamId === me ? "mine" : ""}" data-zoom="${a.teamId}">${dotsHtml(a.data.photo, a.data.aiManual ? [] : a.data.aiPoints)}
          <div style="margin-top:6px">${esc(who(a, me))}</div><div class="muted">👀 ${a.data.eye} · 🤖 ${a.data.aiCount}</div></div>`).join("")}</div>`;
      return;
    }
    if (i === 1) {
      const e = avg(rows.map((a) => a.data.eye)), ai = avg(rows.map((a) => a.data.aiCount));
      const mx = Math.max(1, ...rows.flatMap((a) => [a.data.eye, a.data.aiCount]));
      body.innerHTML = `${stats([[fmt(e) + "송이", "👀 직접 센 수 평균"], [fmt(ai) + "송이", "🤖 AI가 센 수 평균"], [fmt(Math.abs(e - ai)) + "송이", "평균의 차이"]])}
        <div class="chart"><h4>방형구 안의 꽃 수</h4>
          <div class="legend"><span><i style="background:#17795a"></i>직접 센 수</span><span><i style="background:#8e5cd9"></i>AI가 센 수</span></div>
          ${rows.map((a) => `<div style="margin:8px 0"><div style="font-weight:800;font-size:14px" class="${a.teamId === me ? "me" : ""}">${esc(who(a, me))}</div>
            ${hbars([{ name: "👀 직접", v: a.data.eye }], { max: mx, unit: "", color: "#17795a" })}
            ${hbars([{ name: "🤖 AI", v: a.data.aiCount }], { max: mx, unit: "", color: "#8e5cd9" })}</div>`).join("")}
          <div class="muted">꽃이 겹쳐 있거나 봉오리가 있으면 AI와 사람이 센 수가 달라질 수 있어요.</div></div>`;
      return;
    }
    const tot = rows.map((a) => a.data.total);
    body.innerHTML = `${stats([[fmt(avg(tot), 0) + "송이", "우리 모두의 추정 (평균)"], [area + "㎡", "꽃밭 넓이"], [fmt(avg(rows.map((a) => a.data.perM2)), 0), "1㎡당 평균"]])}
      <div class="chart"><h4>꽃밭 전체 꽃 수 어림</h4>${dotStack(rows.map((a) => ({ v: a.data.total, mine: a.teamId === me })), { unit: "송이", icon: "🌼" })}</div>
      <div class="chart"><h4>가족별 어림값</h4>${hbars(rows.map((a) => ({ name: who(a, me), v: a.data.total, mine: a.teamId === me })), { unit: "" })}</div>
      <div class="muted">여러 가족의 값을 평균 내면 한 가족이 어림한 값보다 더 믿을 만할까요? (표본 조사!)</div>`;
  });
};

P.fibo = (el, list, { myTeamId: me }) => {
  const cols = ["3", "5", "8", "13", "기타"];
  el.innerHTML = `<div class="peek-sub">꽃잎 수별로 가족들이 찾은 꽃을 모았어요.</div><div class="board5">${cols.map((c) => {
    const items = list.filter((a) => a.data.petals === c);
    return `<div class="col"><h5>${c === "기타" ? "기타" : c + "장"}</h5><div class="n">${items.length}팀</div>
      ${items.map((a) => `<div class="card-s ${a.teamId === me ? "mine" : ""}">${esc(a.data.plant)}<small>${esc(who(a, me))}</small></div>`).join("")}</div>`;
  }).join("")}</div>
  <div class="muted" style="margin-top:10px">3, 5, 8, 13은 모두 피보나치 수예요. 어느 칸에 꽃이 가장 많이 모였나요?</div>`;
};

P.pento = (el, list, { myTeamId: me, config, times }) => {
  const idx = Number(config.pentoPuzzle) || 0;
  const pz = PUZZLES[idx] || PUZZLES[0];
  const rows = list.filter((a) => a.data.puzzle === idx && Array.isArray(a.data.grid)).sort(lblSort);
  // 조각 놓은 모양이 같은지 비교 (돌리거나 뒤집은 같은 답은 다르게 셈)
  const kinds = new Set(rows.map((a) => a.data.grid.join("/")));
  let html = `${stats([[rows.length + "팀", "완성한 가족"], [kinds.size + "가지", "서로 다른 해법"]])}
    <div class="peek-sub">${esc(pz.level)} · ${esc(pz.name)} — 같은 모양도 조각을 놓는 방법은 여러 가지예요!</div>
    <div class="sol-gallery">${rows.map((a) => `<div class="s ${a.teamId === me ? "mine" : ""}">
      <div style="display:flex;justify-content:center;margin-bottom:6px">${miniGrid(a.data.grid, 14)}</div>${esc(who(a, me))}</div>`).join("") || `<div class="empty">아직 완성한 가족이 없어요.</div>`}</div>`;
  if (config.pentoTimePublic && times && times.length) {
    const t = [...times].sort((a, b) => a.seconds - b.seconds);
    html += `<div class="chart" style="margin-top:12px"><h4>⏱ 완성까지 걸린 시간</h4>
      ${hbars(t.map((x) => ({ name: who(x, me), v: x.seconds, txt: x.seconds < 60 ? `${x.seconds}초` : `${Math.floor(x.seconds / 60)}분 ${x.seconds % 60}초`, mine: x.teamId === me })), { color: "#3a7bd5" })}</div>`;
  }
  el.innerHTML = html;
};

P.fun = (el, list, { myTeamId: me, config }) => {
  const opts = funOptions(config);
  const cnt = Object.fromEntries(opts.map((o) => [o.id, 0]));
  list.forEach((a) => (a.data.picks || []).forEach((p) => { if (p in cnt) cnt[p]++; }));
  const words = opts.map((o, i) => ({ t: qTitle(o), n: cnt[o.id], c: PALETTE[i % 8], icon: qIcon(o) })).sort((a, b) => b.n - a.n);
  const mx = Math.max(1, ...words.map((w) => w.n));
  el.innerHTML = `<div class="cloud"></div>
    <div class="chart" style="margin-top:12px"><h4>활동별로 고른 가족 수 (${list.length}가족 참여)</h4>
      ${hbars(words.map((w) => ({ name: `${w.icon} ${w.t}`, v: w.n })), { max: list.length || 1, unit: "팀", nameW: 130 })}</div>`;
  const cloud = el.querySelector(".cloud");
  const W = cloud.clientWidth || 340, H = cloud.clientHeight || 340;
  const placed = [];
  words.forEach((w) => {
    const s = document.createElement("span");
    const fs = w.n ? Math.round(15 + (w.n / mx) * (W < 420 ? 30 : 44)) : 13;
    s.textContent = w.t;
    s.style.fontSize = fs + "px";
    s.style.color = w.n ? w.c : "#c0bba9";
    cloud.appendChild(s);
    const bw = s.offsetWidth, bh = s.offsetHeight;
    for (let t = 0; t < 600; t += 0.35) {
      const x = W / 2 + 6 * t * Math.cos(t) * (W / H) - bw / 2, y = H / 2 + 5 * t * Math.sin(t) - bh / 2;
      if (x < 4 || y < 4 || x + bw > W - 4 || y + bh > H - 4) continue;
      const box = { x, y, w: bw, h: bh };
      if (placed.every((p) => x + bw < p.x || p.x + p.w < x || y + bh < p.y || p.y + p.h < y)) {
        placed.push(box); s.style.left = x + "px"; s.style.top = y + "px"; return;
      }
    }
    s.remove();
  });
};

P.scale = (el) => { el.innerHTML = `<div class="empty">🔒 만족도는 선생님만 보는 문항이라 엿볼 수 없어요.</div>`; };

P.comment = (el, list, { myTeamId: me }) => {
  el.innerHTML = list.length ? `<div class="cork">${[...list].reverse().map((a) => {
    const h = hash(a.teamId);
    return `<div class="postit ${a.teamId === me ? "mine" : ""}" style="background:${POSTIT[h % POSTIT.length]};transform:rotate(${(h % 9) - 4}deg)">
      ${esc(a.data.text)}<div class="who">— ${esc(who(a, me))}</div></div>`;
  }).join("")}</div>` : `<div class="empty">아직 붙은 소감이 없어요.</div>`;
};

/* 관리자가 추가한 문제 */
P.number = (el, list, { myTeamId: me, q }) => {
  const vals = list.map((a) => a.data.value);
  el.innerHTML = `${stats([[fmt(avg(vals)), "평균"], [fmt(modeOf(vals).v), "가장 많은 답"], [list.length + "팀", "답한 가족"]])}
    <div class="chart">${dotStack(list.map((a) => ({ v: a.data.value, mine: a.teamId === me })), { unit: q.unit || "" })}</div>`;
};
P.text = (el, list, { myTeamId: me }) => {
  el.innerHTML = `<div class="bubbles">${list.map((a) => `<div class="bubble ${a.teamId === me ? "mine" : ""}"><div class="who">${esc(who(a, me))}</div>${esc(a.data.text)}</div>`).join("")}</div>`;
};
P.choice = (el, list, { myTeamId: me, q }) => {
  const opts = (q.options || []).filter(Boolean);
  el.innerHTML = `<div class="chart">${voteBars(opts.map((o) => ({ name: o, items: list.filter((a) => a.data.pick === o) })), me)}</div>`;
};
P.photo = (el, list, { myTeamId: me }) => {
  el.innerHTML = wall(list, me, (a) => a.data.photo, (a) => esc(who(a, me)));
};

export function renderPeek(el, q, list, ctx) {
  WIDE = !!ctx.wideNames;
  const fn = P[q.kind];
  if (q.kind !== "scale" && !list.length) { el.innerHTML = `<div class="empty">아직 답을 낸 가족이 없어요.<br>조금 뒤에 다시 엿보러 와요! 👀</div>`; return; }
  if (!fn) { el.innerHTML = `<div class="empty">엿보기를 준비하지 못했어요.</div>`; return; }
  fn(el, list, { ...ctx, q });
  // 사진 크게 보기
  el.querySelectorAll("[data-zoom]").forEach((n) => n.onclick = () => {
    const a = list.find((x) => x.teamId === n.dataset.zoom);
    if (!a) return;
    const z = document.createElement("div");
    z.className = "zoom";
    const body = q.kind === "quadrat" ? dotsHtml(a.data.photo, a.data.aiManual ? [] : a.data.aiPoints, `🤖 ${a.data.aiCount}송이`) : `<img src="${a.data.photo}" style="width:100%;border-radius:10px">`;
    z.innerHTML = `<div>${body}<div class="cap">${esc(who(a, ctx.myTeamId))}${a.data.name ? " · " + esc(a.data.name) : ""}</div></div>`;
    z.onclick = () => z.remove();
    document.body.appendChild(z);
  });
}
