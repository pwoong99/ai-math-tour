// 팀별 발자취 모아보기 — 문제마다 어울리는 모양으로 보여 줘요.
// renderPeek(el, q, list, ctx): list = [{ teamId, label, data }], ctx = { myTeamId, config, times }
import { esc } from "./fb.js?v=3.19";
import { funOptions, qTitle, qIcon, pentoSettings, pentoSolved, pentoProgress, keyShift, caesar, normText, FIBS } from "./questions.js?v=3.19";
import { PUZZLES } from "./puzzles.js?v=3.19";
import { dotsHtml, miniGrid, EULER_FIGS } from "./widgets.js?v=3.19";
import { SIGN_FIELDS } from "./inputs.js?v=3.19";

const PALETTE = ["#1f2a5c", "#e5484d", "#3a7bd5", "#d64545", "#8e5cd9", "#1aa3a3", "#c27c0e", "#e0559b"];
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
function dotStack(items, { unit = "", icon = "", color = "#1f2a5c" } = {}) {
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
    if (top) g += `<rect x="${cx - colW / 2 + 2}" y="10" width="${colW - 4}" height="${H - 50}" rx="10" fill="#fff6c9"/>`;
    c.forEach((it, k) => {
      const cy = H - 50 - r - 4 - k * (r * 2 + 4);
      g += icon
        ? `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${r * 1.8}">${icon}</text>${it.mine ? `<circle cx="${cx}" cy="${cy}" r="${r + 2}" fill="none" stroke="#e5484d" stroke-width="3"/>` : ""}`
        : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${it.mine ? "#e5484d" : color}" opacity=".9"/>`;
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
function hbars(rows, { unit = "", max, color = "#1f2a5c", icon = "", nameW = 74 }) {
  const mx = max ?? Math.max(...rows.map((r) => r.v), 1);
  return rows.map((r) => `
    <div class="row" style="margin:6px 0;gap:8px">
      <div style="width:${WIDE ? Math.max(nameW, 190) : nameW}px;flex:none;font-weight:800;font-size:14px;line-height:1.25" class="${r.mine ? "me" : ""}">${esc(r.name)}</div>
      <div class="grow" style="background:#f0ece1;border-radius:99px;height:22px;position:relative;overflow:hidden">
        <i style="position:absolute;left:0;top:0;bottom:0;width:${Math.max(4, r.v / mx * 100)}%;background:${r.mine ? "#e5484d" : color};border-radius:99px"></i>
        ${icon ? `<span style="position:absolute;left:calc(${Math.max(4, r.v / mx * 100)}% - 22px);top:0;font-size:16px">${icon}</span>` : ""}
      </div>
      <div style="width:70px;text-align:right;font-weight:800;font-size:14px">${r.txt != null ? esc(r.txt) : fmt(r.v) + esc(unit)}</div></div>`).join("");
}

const P = {};

const ok = (v) => v != null && v !== "" && Number.isFinite(Number(v));
P.euler = (el, list, { myTeamId: me }) => {
  const drawn = list.filter((a) => a.data.draw);
  // 가족들이 출발한 점 (도형 가)
  const starts = {};
  drawn.forEach((a) => { const s = a.data.draw.a?.path?.[0]; if (s) starts[s] = (starts[s] || 0) + 1; });
  const f = EULER_FIGS.a;
  const startSvg = `<svg viewBox="-10 -10 260 260" style="width:100%;max-width:220px;display:block;margin:0 auto">
    ${f.E.map((e) => `<path d="${e[2] || `M${f.V[e[0]].join(" ")} L${f.V[e[1]].join(" ")}`}" fill="none" stroke="#c8c1b0" stroke-width="5"/>`).join("")}
    ${Object.entries(f.V).map(([id, [x, y]]) => `<circle cx="${x}" cy="${y}" r="${8 + (starts[id] || 0) * 3}" fill="${starts[id] ? "#e5484d" : "#e0dbcf"}" opacity=".9"/>
      ${starts[id] ? `<text x="${x + 24}" y="${y + 5}" font-size="15" font-weight="900" fill="#b8282d">${starts[id]}팀</text>` : ""}`).join("")}</svg>`;
  const withOdd = list.filter((a) => ok(a.data.odd));
  const groups = ["가능", "불가능"].map((n) => ({ name: n === "가능" ? "⭕ 가능" : "❌ 불가능", items: list.filter((a) => a.data.possible === n) }));
  const odds = {};
  withOdd.forEach((a) => { const k = a.data.odd; (odds[k] = odds[k] || []).push(a); });
  const oddRows = Object.keys(odds).sort((a, b) => a - b).map((k) => ({ name: `홀수점 ${k}개`, items: odds[k] }));
  el.innerHTML = `
    <div class="chart"><h4>가. 한붓그리기 — 가족들은 어느 점에서 출발했을까?</h4>${startSvg}
      <div class="muted" style="text-align:center">원이 클수록 그 점에서 출발한 가족이 많아요. 홀수점에서 출발해야 끝까지 그릴 수 있어요!</div></div>
    <div class="chart"><h4>나. 한붓그리기가 가능할까? 가족 투표</h4>${voteBars(groups, me, (i) => i ? "#d64545" : "#1f2a5c")}</div>
    <div class="chart"><h4>홀수점은 몇 개라고 했을까?</h4>${voteBars(oddRows, me)}</div>
    <h4 style="margin:14px 2px 8px">💬 가족들의 이유</h4>
    <div class="bubbles">${list.filter((a) => a.data.reason).map((a) => `<div class="bubble ${a.teamId === me ? "mine" : ""}">
      <div class="who">${esc(who(a, me))}${a.data.possible ? ` · ${a.data.possible === "가능" ? "⭕ 가능" : "❌ 불가능"}` : ""}${ok(a.data.odd) ? ` · 홀수점 ${a.data.odd}개` : ""}</div>${esc(a.data.reason)}</div>`).join("") || `<div class="empty">아직 이유가 없어요.</div>`}</div>`;
};

P.cipher = (el, list, { myTeamId: me, config, admin }) => {
  const cps = config.ciphers || [];
  const mine = !!admin; // 정답은 관리자 화면에서만 보여요 (가족에게는 다른 가족의 풀이만)
  const rows = list.filter((a) => Array.isArray(a.data.answers));
  const unk = (c) => !/^[A-Z]$/i.test(String(c.key || "").trim());
  tabs(el, ["해독 결과", "가족 암호 풀어 보기"], (t, body) => {
    if (t === 0) {
      body.innerHTML = (mine ? "" : `<div class="peek-sub">가족들이 해독한 문장을 모았어요. 정답은 선생님과 함께 확인해요!</div>`) + cps.map((c, i) => {
        const ans = normText(c.answer);
        const g = new Map();
        rows.forEach((a) => { const k = normText(a.data.answers[i]); if (!k) return; if (!g.has(k)) g.set(k, []); g.get(k).push(a); });
        const groups = [...g.entries()].sort((a, b) => b[1].length - a[1].length);
        const right = rows.filter((a) => normText(a.data.answers[i]) === ans).length;
        return `<div class="chart"><h4>${unk(c) ? "도전" : "문제"} ${i + 1} · <span style="color:#c62828;letter-spacing:1px">${esc(c.text)}</span>
          <span class="muted">KEY ${unk(c) ? (mine && c.answerKey ? esc(c.answerKey) : "?") : esc(c.key)}</span></h4>
          ${mine && ans ? `<div class="muted" style="margin-bottom:6px">정답: <b style="color:#1f2a5c;letter-spacing:1px">${esc(c.answer)}</b> · ${right} / ${rows.length}팀이 풀었어요</div>` : ""}
          <div class="tchips" style="flex-direction:column;gap:6px">${groups.map(([txt, items]) => `<div style="${mine && ans && txt === ans ? "color:#1f2a5c" : ""}">
            <b style="letter-spacing:1px">${esc(txt) || "-"}</b> ${mine && ans && txt === ans ? "✅" : ""} <span class="muted">${items.length}팀</span>
            ${items.some((a) => a.teamId === me) ? `<span class="tchip mine">우리 가족</span>` : ""}</div>`).join("")}</div></div>`;
      }).join("");
      return;
    }
    const my = rows.filter((a) => a.data.my?.text && a.data.my?.key);
    body.innerHTML = `<div class="peek-sub">다른 가족이 보낸 응원 암호예요. 암호판으로 풀어 본 뒤 「정답 보기」를 눌러 확인해요!</div>
      <div class="bubbles">${my.map((a) => {
        const sh = keyShift(a.data.my.key);
        return `<div class="bubble ${a.teamId === me ? "mine" : ""}"><div class="who">${esc(who(a, me))} · 열쇠 KEY ${esc(a.data.my.key)}</div>
          <div style="font-size:19px;font-weight:900;letter-spacing:2px;color:#c62828">${esc(a.data.my.text)}</div>
          <button type="button" class="btn small gray" style="margin-top:6px" data-show>정답 보기</button>
          <div class="ans hidden" style="font-size:18px;font-weight:900;letter-spacing:2px;color:#1f2a5c;margin-top:6px">${sh == null ? "" : esc(caesar(a.data.my.text, -sh))}</div></div>`;
      }).join("") || `<div class="empty">아직 창작 암호가 없어요.</div>`}</div>`;
    body.querySelectorAll("[data-show]").forEach((b) => b.onclick = () => { b.nextElementSibling.classList.toggle("hidden"); b.textContent = b.nextElementSibling.classList.contains("hidden") ? "정답 보기" : "숨기기"; });
  });
};

const latinMini = (a, px = 18) => a.data.design && a.data.colors
  ? `<div style="display:grid;grid-template-columns:repeat(4,${px}px);gap:2px;justify-content:center">${a.data.design.map((x) => `<i style="width:${px}px;height:${px}px;border-radius:3px;background:${a.data.colors[x - 1] || "#ddd"}"></i>`).join("")}</div>` : "";
P.latin = (el, list, { myTeamId: me }) => {
  tabs(el, ["스마트톡 사진", "색 설계도"], (t, body) => {
    if (t === 0) {
      body.innerHTML = `<div class="peek-sub">사진을 누르면 크게 볼 수 있어요.</div>` +
        wall(list.filter((a) => a.data.photo), me, (a) => a.data.photo, (a) => `${esc(who(a, me))}${a.data.name ? `<small>${esc(a.data.name)}</small>` : ""}`);
      return;
    }
    body.innerHTML = `<div class="peek-sub">가족마다 고른 4가지 색으로 만든 라틴방진 설계도예요. 가로·세로에 같은 색이 한 번씩만!</div>
      <div class="sol-gallery">${list.filter((a) => a.data.design?.every?.(Boolean) && a.data.colors).map((a) => `<div class="s ${a.teamId === me ? "mine" : ""}">${latinMini(a)}<div style="margin-top:6px">${esc(who(a, me))}</div></div>`).join("") || `<div class="empty">아직 설계도가 없어요.</div>`}</div>`;
  });
  // 줌은 사진 탭에서만
};

P.sign = (el, list, { myTeamId: me }) => {
  const fields = SIGN_FIELDS.flatMap(([, name, , f]) => [[name, f[0][1], f[0][0], f[1][0], f[0][2]], [name, f[2][1], f[2][0], null, f[2][2].split(" ")[0]]]);
  const modeTxt = (vals) => { const m = modeOf(vals.filter((v) => v != null)); return m.v == null ? "-" : `${fmt(m.v, 2)}`; };
  el.innerHTML = `<div class="peek-sub">가족들이 안내판에서 읽은 숫자 중 가장 많이 나온 값이에요. 우리 가족이 읽은 값과 비교해 봐요.</div>
    <div class="tbl-wrap"><table class="t"><thead><tr><th>동물</th><th>안내판 숫자</th><th class="c">가장 많은 답</th><th class="c">우리 가족</th></tr></thead><tbody>
    ${fields.map(([name, lb, k1, k2, u]) => {
      const mineA = list.find((a) => a.teamId === me)?.data;
      const val = (d) => d ? (k2 ? `${fmt(d[k1], 2)}~${fmt(d[k2], 2)}` : fmt(d[k1], 2)) : "-";
      const common = k2 ? `${modeTxt(list.map((a) => a.data[k1]))}~${modeTxt(list.map((a) => a.data[k2]))}` : modeTxt(list.map((a) => a.data[k1]));
      return `<tr><td>${esc(name)}</td><td>${esc(lb)}</td><td class="c"><b>${common}</b> ${esc(u)}</td><td class="c">${mineA ? val(mineA) + " " + esc(u) : "-"}</td></tr>`;
    }).join("")}</tbody></table></div>
    <div class="chart" style="margin-top:12px"><h4>🐢 알다브라 코끼리거북은 땅에서 몇 m 위 잎까지 먹을까?</h4>${dotStack(list.map((a) => ({ v: a.data.aldH, mine: a.teamId === me })).filter((x) => x.v != null), { unit: "m", icon: "🐢" })}</div>`;
};

P.food = (el, list, { myTeamId: me }) => {
  const all = list;
  const rows = list.filter((a) => ok(a.data.q1));
  tabs(el, ["🦊 먹이", "비례표", "🐢 나이"], (t, body) => {
    if (t === 0) {
      const m = modeOf(rows.map((a) => a.data.q1));
      body.innerHTML = `${stats([[`${fmt(m.v)}g`, `가장 많은 답 (${m.n}팀)`], [rows.length + "팀", "답을 낸 가족"]])}
        <div class="chart"><h4>가족들이 구한 4마리의 하루 먹이량 ★</h4>
          ${dotStack(rows.map((a) => ({ v: a.data.q1, mine: a.teamId === me })), { unit: "g", icon: "🦊" })}
          <div class="calc" style="text-align:center;margin-top:8px">1 : 150 = 4 : <b>${fmt(m.v)}</b></div></div>
        <div class="chart"><h4>② 비례배분 — 과일 : 곡식 = 3 : 2</h4>${voteBars([...new Map(all.filter((a) => ok(a.data.fruit) && ok(a.data.grain)).map((a) => [`과일 ${a.data.fruit}g · 곡식 ${a.data.grain}g · ${a.data.fruitPct}%`, 0])).keys()].map((k) => ({ name: k, items: all.filter((a) => `과일 ${a.data.fruit}g · 곡식 ${a.data.grain}g · ${a.data.fruitPct}%` === k) })), me)}</div>`;
      return;
    }
    if (t === 1) {
      const cell = (k) => { const m = modeOf(all.map((a) => a.data[k]).filter(ok)); return m.v == null ? "-" : `${fmt(m.v)}<small>${m.n}팀</small>`; };
      body.innerHTML = `<div class="peek-sub">칸마다 가장 많은 가족이 쓴 답이에요.</div>
        <div class="ptable"><div class="h">여우 수</div><div>1</div><div>2</div><div>4</div><div>8</div><div>${cell("n7")}</div>
          <div class="h">먹이(g)</div><div>150</div><div>${cell("g2")}</div><div>${cell("g4")}</div><div>${cell("g8")}</div><div>1,050</div></div>
        <h4 style="margin:14px 2px 8px">💬 아랫줄(먹이 ÷ 마리 수)이 모두 같은 까닭</h4>
        <div class="bubbles">${all.filter((a) => a.data.why).map((a) => `<div class="bubble ${a.teamId === me ? "mine" : ""}"><div class="who">${esc(who(a, me))}</div>${esc(a.data.why)}</div>`).join("")}</div>
        ${all.some((a) => a.data.talk) ? `<h4 style="margin:14px 2px 8px">🗣 가족 토론 — 어느 우리 여우가 더 배불리 먹을까?</h4>
          <div class="bubbles">${all.filter((a) => a.data.talk).map((a) => `<div class="bubble ${a.teamId === me ? "mine" : ""}"><div class="who">${esc(who(a, me))}</div>${esc(a.data.talk)}</div>`).join("")}</div>` : ""}`;
      return;
    }
    const ag = all.filter((a) => ok(a.data.age) && a.data.age > 0);
    const s = ag.map((a) => ({ name: who(a, me), v: a.data.age, txt: `${a.data.age}세${ok(a.data.times) ? ` · 거북은 ${fmt(a.data.times)}배` : ""}`, mine: a.teamId === me })).sort((a, b) => a.v - b.v);
    body.innerHTML = `${stats([[fmt(avg(ag.map((a) => a.data.age))) + "세", "평균 나이 ★"], [fmt(avg(ag.map((a) => 255 / a.data.age)), 0) + "배", "거북은 우리보다 평균"]])}
      <div class="chart"><h4>가족별 나이와 거북의 기록 255년</h4>${hbars(s, { max: Math.max(...s.map((x) => x.v), 1), nameW: 74 })}</div>
      <div class="muted">비로 나타내면 크기가 아주 다른 것(거북과 우리)도 공평하게 비교할 수 있어요.</div>`;
  });
};

P.stride = (el, list, { myTeamId: me }) => {
  const allS = [...list].sort(lblSort);
  const rows = allS.filter((a) => ok(a.data.me1));
  tabs(el, ["👣 1보 길이", "📏 보폭 vs 🗺 지도 앱", "💬 오차 이야기"], (i, body) => {
    if (i === 0) {
      const s = rows.map((a) => ({ name: who(a, me), v: a.data.me1, mine: a.teamId === me })).sort((a, b) => b.v - a.v);
      const p = rows.map((a) => a.data.par1).filter(ok);
      body.innerHTML = `${stats([[fmt(avg(s.map((x) => x.v))) + "cm", "학생 평균 1보 ★"], [fmt(avg(p)) + "cm", "부모님 평균 1보"], [fmt(Math.max(...s.map((x) => x.v))) + "cm", "가장 긴 학생 1보"]])}
        <div class="chart"><h4>가족별 학생 1보 길이</h4>${hbars(s, { unit: "cm", icon: "👣" })}</div>
        <div class="chart"><h4>학생과 부모님 1보 비교</h4>
          <div class="legend"><span><i style="background:#e5484d"></i>학생</span><span><i style="background:#3a7bd5"></i>부모님</span></div>
          ${rows.filter((a) => ok(a.data.par1)).map((a) => `<div style="margin:6px 0"><div style="font-weight:800;font-size:13px" class="${a.teamId === me ? "me" : ""}">${esc(who(a, me))}</div>
            ${hbars([{ name: "학생", v: a.data.me1, txt: a.data.me1 + "cm" }], { max: Math.max(...rows.flatMap((x) => [x.data.me1, x.data.par1 || 0])), color: "#e5484d", nameW: 44 })}
            ${hbars([{ name: "부모님", v: a.data.par1, txt: a.data.par1 + "cm" }], { max: Math.max(...rows.flatMap((x) => [x.data.me1, x.data.par1 || 0])), color: "#3a7bd5", nameW: 44 })}</div>`).join("")}</div>`;
      return;
    }
    if (i === 2) {
      body.innerHTML = `<div class="bubbles">${allS.filter((a) => a.data.why).map((a) => `<div class="bubble ${a.teamId === me ? "mine" : ""}"><div class="who">${esc(who(a, me))}${ok(a.data.diff) ? ` · 차이 ${fmt(a.data.diff)}m` : ""}</div>${esc(a.data.why)}</div>`).join("") || `<div class="empty">아직 이야기가 없어요.</div>`}</div>`;
      return;
    }
    const rowsD = allS.filter((a) => ok(a.data.walk) && ok(a.data.map));
    if (!rowsD.length) { body.innerHTML = `<div class="empty">아직 두 거리를 모두 낸 가족이 없어요.</div>`; return; }
    const all = rowsD.flatMap((a) => [a.data.walk, a.data.map]);
    const mn = Math.min(...all), mx = Math.max(...all), pad = (mx - mn) * 0.1 || 5;
    const lo = Math.max(0, mn - pad), hi = mx + pad;
    const W = WIDE ? 560 : 360, L = WIDE ? 230 : 62, Rr = 62, rowH = 30, H = rowsD.length * rowH + 34;
    const X = (v) => L + (v - lo) / (hi - lo) * (W - L - Rr);
    let g = "";
    rowsD.forEach((a, k) => {
      const y = 20 + k * rowH + rowH / 2, w = X(a.data.walk), p = X(a.data.map), d = Math.abs(a.data.walk - a.data.map);
      g += `<text x="${L - 10}" y="${y}" text-anchor="end" dominant-baseline="central" font-size="12" font-weight="800" fill="${a.teamId === me ? "#e5484d" : "#1d2b2a"}">${esc(who(a, me))}</text>
        <line x1="${Math.min(w, p)}" x2="${Math.max(w, p)}" y1="${y}" y2="${y}" stroke="#c8c1b0" stroke-width="4" stroke-linecap="round"/>
        <circle cx="${w}" cy="${y}" r="6.5" fill="#e5484d"/><circle cx="${p}" cy="${y}" r="6.5" fill="#3a7bd5"/>
        <text x="${W - 8}" y="${y}" text-anchor="end" dominant-baseline="central" font-size="11" font-weight="800" fill="#5d6b69">차이 ${fmt(d)}m</text>`;
    });
    [lo, (lo + hi) / 2, hi].forEach((v) => g += `<text x="${X(v)}" y="${H - 4}" text-anchor="middle" font-size="11" fill="#5d6b69">${fmt(v, 0)}m</text>`);
    const diffs = rowsD.map((a) => ({ a, d: Math.abs(a.data.walk - a.data.map) })).sort((x, y) => x.d - y.d);
    body.innerHTML = `${stats([[fmt(avg(rowsD.map((a) => a.data.walk))) + "m", "보폭 거리 평균 ★"], [fmt(avg(rowsD.map((a) => a.data.map))) + "m", "지도 앱 거리 평균 ★"], [fmt(avg(diffs.map((x) => x.d))) + "m", "평균 차이"]])}
      <div class="chart"><h4>내 보폭으로 잰 거리와 지도 앱 거리</h4>
        <div class="legend"><span><i style="background:#e5484d"></i>보폭으로 잰 거리</span><span><i style="background:#3a7bd5"></i>지도 앱 거리</span></div>
        <svg viewBox="0 0 ${W} ${H}">${g}</svg></div>
      ${diffs.length ? `<div class="card" style="text-align:center">🎯 두 값이 가장 가까운 가족: <b>${esc(who(diffs[0].a, me))}</b> (차이 ${fmt(diffs[0].d)}m)</div>` : ""}`;
  });
};

P.quadrat = (el, list, { myTeamId: me }) => {
  const allQ = [...list].sort(lblSort);
  tabs(el, ["📷 사진", "👀 vs 🤖", "1㎡당 꽃 수"], (i, body) => {
    let rows = allQ;
    if (i === 0) {
      rows = allQ.filter((a) => a.data.photo);
      body.innerHTML = `<div class="peek-sub">빨간 점은 AI가 꽃이라고 본 곳이에요. 누르면 크게 보여요.</div>
        <div class="sol-gallery" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">${rows.map((a) => `
          <div class="s ${a.teamId === me ? "mine" : ""}" data-zoom="${a.teamId}">${dotsHtml(a.data.photo, a.data.aiManual ? [] : a.data.aiPoints)}
          <div style="margin-top:6px">${esc(who(a, me))}</div><div class="muted">👀 ${a.data.eye} · 🤖 ${a.data.aiCount}</div></div>`).join("")}</div>`;
      return;
    }
    if (i === 1) {
      rows = allQ.filter((a) => ok(a.data.eye) && ok(a.data.aiCount));
      const e = avg(rows.map((a) => a.data.eye)), ai = avg(rows.map((a) => a.data.aiCount));
      const mx = Math.max(1, ...rows.flatMap((a) => [a.data.eye, a.data.aiCount]));
      body.innerHTML = `${stats([[fmt(e) + "송이", "👀 직접 센 수 평균 ★"], [fmt(ai) + "송이", "🤖 AI가 센 수 평균 ★"], [fmt(Math.abs(e - ai)) + "송이", "평균의 차이"]])}
        <div class="chart"><h4>방형구 안의 꽃 수</h4>
          <div class="legend"><span><i style="background:#1f2a5c"></i>직접 센 수</span><span><i style="background:#8e5cd9"></i>AI가 센 수</span></div>
          ${rows.map((a) => `<div style="margin:8px 0"><div style="font-weight:800;font-size:14px" class="${a.teamId === me ? "me" : ""}">${esc(who(a, me))}</div>
            ${hbars([{ name: "👀 직접", v: a.data.eye }], { max: mx, unit: "", color: "#1f2a5c" })}
            ${hbars([{ name: "🤖 AI", v: a.data.aiCount }], { max: mx, unit: "", color: "#8e5cd9" })}</div>`).join("")}
          <div class="muted">꽃이 겹쳐 있거나 봉오리가 있으면 AI와 사람이 센 수가 달라질 수 있어요. 같은 사진도 AI마다 숫자가 다를 수 있어요.</div></div>`;
      return;
    }
    rows = allQ.filter((a) => ok(a.data.perM2));
    body.innerHTML = `${stats([[fmt(avg(rows.map((a) => a.data.perM2)), 0) + "송이", "1㎡당 평균"], [rows.length + "곳", "방형구를 놓은 곳"]])}
      <div class="chart"><h4>가족별 1㎡당 꽃 수 (틀 안 꽃 수 × 25)</h4>${dotStack(rows.map((a) => ({ v: a.data.perM2, mine: a.teamId === me })), { unit: "송이", icon: "🌼" })}</div>
      <div class="muted">틀을 놓은 곳에 따라 꽃 수가 달라져요. 여러 곳에서 세어 평균을 내면 더 믿을 만해요(표본 조사!).</div>`;
  });
};

P.area = (el, list, { myTeamId: me, config, admin }) => {
  const allA = [...list].sort(lblSort);
  const L = Number(config.lawnArea) || 0;
  const show = admin || list.some((a) => a.teamId === me); // 우리 답을 내면 실제 넓이 공개
  const WAY = { app: "측정 앱", map: "지도 앱", stride: "보폭" };
  tabs(el, ["📐 잔디밭 넓이", "🌼 국화 몇 송이?"], (t, body) => {
    if (t === 0) {
      const rows = allA.filter((a) => ok(a.data.bestArea));
      const mx = Math.max(1, L, ...rows.flatMap((a) => [a.data.app || 0, a.data.map || 0, a.data.stride || 0]));
      const near = show && L ? [...rows].sort((x, y) => Math.abs(x.data.bestArea - L) - Math.abs(y.data.bestArea - L))[0] : null;
      const cnt = Object.fromEntries(Object.keys(WAY).map((k) => [k, rows.filter((a) => a.data.best === k).length]));
      body.innerHTML = `${stats([[fmt(avg(rows.map((a) => a.data.bestArea)), 0) + "㎡", "가족들이 믿은 넓이 평균 ★"],
          [show && L ? fmt(L, 0) + "㎡" : "🔒", show && L ? "실제 넓이 (175m × 8m)" : "답을 내면 실제 넓이 공개"], [rows.length + "팀", "답을 낸 가족"]])}
        ${near ? `<div class="card" style="text-align:center">🎯 실제 넓이에 가장 가까운 가족: <b>${esc(who(near, me))}</b> (${fmt(near.data.bestArea, 1)}㎡ · ${WAY[near.data.best] || ""})</div>` : ""}
        <div class="chart"><h4>어떤 방법을 가장 믿었을까?</h4>${voteBars(Object.entries(WAY).map(([k, n]) => ({ name: n, items: rows.filter((a) => a.data.best === k) })), me)}</div>
        <div class="chart"><h4>방법마다 잰 넓이 ${show && L ? `<span class="muted">· 초록 선 = 실제 ${fmt(L, 0)}㎡</span>` : ""}</h4>
          <div class="legend"><span><i style="background:#1f2a5c"></i>측정 앱</span><span><i style="background:#3a7bd5"></i>지도 앱</span><span><i style="background:#e5484d"></i>보폭</span><span>★ 가장 믿는 값</span></div>
          ${rows.map((a) => `<div style="margin:8px 0;position:relative"><div style="font-weight:800;font-size:14px" class="${a.teamId === me ? "me" : ""}">${esc(who(a, me))}</div>
            ${Object.entries(WAY).filter(([k]) => ok(a.data[k])).map(([k, n]) => hbars([{ name: (a.data.best === k ? "★ " : "") + n, v: a.data[k], txt: a.data[k] + "㎡" }], { max: mx, color: { app: "#1f2a5c", map: "#3a7bd5", stride: "#e5484d" }[k], nameW: 66 })).join("")}
          </div>`).join("")}
          ${show && L ? `<div class="muted">실제 넓이 ${fmt(L, 0)}㎡는 막대 길이 ${Math.round(L / mx * 100)}% 자리예요.</div>` : ""}</div>`;
      return;
    }
    const rows = allA.filter((a) => ok(a.data.total));
    body.innerHTML = `${stats([[fmt(avg(rows.map((a) => a.data.total)), 0) + "송이", "우리 모두의 어림 (평균)"], [rows.length + "팀", "답을 낸 가족"]])}
      <div class="chart"><h4>잔디밭에 심을 수 있는 국화 (1㎡당 꽃 수 × 넓이)</h4>${hbars(rows.map((a) => ({ name: who(a, me), v: a.data.total, txt: `${fmt(a.data.total, 0)}송이`, mine: a.teamId === me })).sort((x, y) => y.v - x.v), {})}</div>
      ${show && L ? `<div class="card">📐 실제 넓이 <b>${fmt(L, 0)}㎡</b>로 계산하면? ${rows.filter((a) => ok(a.data.perM2)).map((a) => `<div style="margin-top:4px" class="${a.teamId === me ? "me" : ""}">${esc(who(a, me))}: ${fmt(a.data.perM2, 0)} × ${fmt(L, 0)} = <b>${fmt(a.data.perM2 * L, 0)}송이</b></div>`).join("")}</div>` : ""}
      <div class="muted">넓이와 1㎡당 꽃 수 중 무엇이 결과를 더 크게 바꿨을까요?</div>`;
  });
};

P.fibo = (el, list, { myTeamId: me }) => {
  const rows = list.filter((a) => ok(a.data.cw) && ok(a.data.ccw));
  const nb = (a) => { const lo = Math.min(a.data.cw, a.data.ccw), hi = Math.max(a.data.cw, a.data.ccw), i = FIBS.indexOf(lo); return i >= 0 && FIBS[i + 1] === hi; };
  const pairs = new Map();
  rows.forEach((a) => { const k = `시계 ${a.data.cw}줄 · 반대 ${a.data.ccw}줄`; if (!pairs.has(k)) pairs.set(k, []); pairs.get(k).push(a); });
  tabs(el, ["🌲 솔방울 사진", "나선 수"], (t, body) => {
    if (t === 0) {
      body.innerHTML = `<div class="peek-sub">가족들이 솔방울 사진 위에 그린 나선이에요. 빨강 = 시계 방향, 파랑 = 시계 반대 방향.</div>` +
        wall(list.filter((a) => a.data.drawn || a.data.photo), me, (a) => a.data.drawn || a.data.photo, (a) => `${esc(who(a, me))}${ok(a.data.cw) ? `<small>${a.data.cw} · ${a.data.ccw}줄</small>` : ""}`);
      return;
    }
    body.innerHTML = `${stats([[rows.filter(nb).length + " / " + rows.length + "팀", "이웃한 피보나치 수가 나온 가족"], [fmt(avg(rows.map((a) => a.data.cw)), 1) + "줄", "시계 방향 평균 ★"], [fmt(avg(rows.map((a) => a.data.ccw)), 1) + "줄", "시계 반대 방향 평균 ★"]])}
      <div class="chart"><h4>가족들이 센 나선 수 짝</h4>${voteBars([...pairs.entries()].sort((x, y) => y[1].length - x[1].length).map(([k, items]) => ({ name: (nb(items[0]) ? "✨ " : "") + k, items })), me)}
        <div class="muted">✨ 표시는 5·8, 8·13처럼 이웃한 피보나치 수예요.</div></div>
      <div class="chart"><h4>시계 방향 나선 수 ★</h4>${dotStack(rows.map((a) => ({ v: a.data.cw, mine: a.teamId === me })), { unit: "줄", icon: "🌲" })}</div>
      <div class="chart"><h4>시계 반대 방향 나선 수 ★</h4>${dotStack(rows.map((a) => ({ v: a.data.ccw, mine: a.teamId === me })), { unit: "줄", icon: "🌲" })}</div>`;
  });
};

P.golden = (el, list, { myTeamId: me }) => {
  const rows = list.filter((a) => a.data.hand > 0 && a.data.arm > 0);
  if (!rows.length) { el.innerHTML = `<div class="empty">아직 두 길이를 모두 낸 가족이 없어요.</div>`; return; }
  const W = 340, H = 260, L = 50, B = 40;
  const hs = rows.map((a) => a.data.hand), as = rows.map((a) => a.data.arm);
  const loH = Math.max(0, Math.min(...hs) - 2), hiH = Math.max(...hs) + 2;
  const loA = Math.max(0, Math.min(...as, loH * 1.618) - 3), hiA = Math.max(...as, hiH * 1.618) + 3;
  const X = (v) => L + (v - loH) / (hiH - loH) * (W - L - 10), Y = (v) => H - B - (v - loA) / (hiA - loA) * (H - B - 10);
  let g = `<line x1="${L}" y1="${H - B}" x2="${W - 6}" y2="${H - B}" stroke="#9a937f"/><line x1="${L}" y1="10" x2="${L}" y2="${H - B}" stroke="#9a937f"/>`;
  [loH, (loH + hiH) / 2, hiH].forEach((v) => g += `<text x="${X(v)}" y="${H - B + 16}" text-anchor="middle" font-size="11" fill="#5d6b69">${fmt(v, 0)}</text>`);
  [loA, (loA + hiA) / 2, hiA].forEach((v) => g += `<text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="#5d6b69">${fmt(v, 0)}</text>`);
  g += `<line x1="${X(loH)}" y1="${Y(loH * 1.618)}" x2="${X(hiH)}" y2="${Y(hiH * 1.618)}" stroke="#c9a227" stroke-width="3" stroke-dasharray="6 5"/>
    <text x="${X(hiH) - 4}" y="${Y(hiH * 1.618) + 18}" text-anchor="end" font-size="12" font-weight="800" fill="#a8861a">황금비 1 : 1.618</text>`;
  rows.forEach((a) => g += `<circle cx="${X(a.data.hand)}" cy="${Y(a.data.arm)}" r="7" fill="${a.teamId === me ? "#e5484d" : "#1f2a5c"}" opacity=".85"/>`);
  g += `<text x="${(W + L) / 2}" y="${H - 6}" text-anchor="middle" font-size="12" fill="#5d6b69">손 길이 (cm)</text>
    <text x="10" y="${(H - B) / 2}" text-anchor="middle" font-size="12" fill="#5d6b69" transform="rotate(-90 10 ${(H - B) / 2})">손목~팔꿈치 (cm)</text>`;
  const rs = rows.map((a) => ({ name: who(a, me), v: a.data.arm / a.data.hand, mine: a.teamId === me })).sort((x, y) => Math.abs(x.v - 1.618) - Math.abs(y.v - 1.618));
  el.innerHTML = `${stats([[fmt(avg(rs.map((x) => x.v)), 2), "가족들의 평균 비"], ["1.618", "황금비"], [rs[0] ? esc(rs[0].name) : "-", "황금비에 가장 가까운 가족"]])}
    <div class="chart"><h4>손 길이와 손목~팔꿈치 길이 ★</h4><svg viewBox="0 0 ${W} ${H}">${g}</svg>
      <div class="muted">점선에 가까울수록 황금비에 가까워요. 주황 점이 우리 가족이에요.</div></div>
    <div class="chart"><h4>가족별 비 (손목~팔꿈치 ÷ 손)</h4>${hbars(rs.map((x) => ({ ...x, txt: "1 : " + fmt(x.v, 2) })), { max: 2.2 })}</div>
    ${list.some((a) => a.data.found1 || a.data.found2) ? `<h4 style="margin:14px 2px 8px">✨ 가족들이 찾은 황금비</h4><div class="bubbles">${list.filter((a) => a.data.found1 || a.data.found2).map((a) => `<div class="bubble ${a.teamId === me ? "mine" : ""}"><div class="who">${esc(who(a, me))}</div>${[a.data.found1, a.data.found2].filter(Boolean).map(esc).join("<br>")}</div>`).join("")}</div>` : ""}`;
};

P.pento = (el, list, { myTeamId: me, config, times, admin }) => {
  const st = pentoSettings(config);
  const { list: allowed, need, mode } = st;
  const rows = [...list].map((a) => ({ ...a, sv: pentoSolved(a.data) })).sort(lblSort);
  const cntOf = (a) => Object.keys(a.sv).filter((k) => allowed.includes(Number(k))).length; // 완성한 퍼즐 수
  const passed = rows.filter((a) => pentoProgress(a.sv, st).passed).length;
  const per = Object.fromEntries(allowed.map((i) => [i, rows.filter((a) => a.sv[i])]));
  const top = allowed.reduce((b, i) => (per[i].length > (per[b]?.length || 0) ? i : b), allowed[0]);
  if (el._pz == null || !allowed.includes(el._pz)) el._pz = per[top]?.length ? top : allowed[0];

  let html = `${stats([[passed + "팀", "통과한 가족"], [fmt(avg(rows.map(cntOf))) + "개", "평균 완성 퍼즐"], [per[top]?.length ? esc(PUZZLES[top].name) : "-", "가장 많이 푼 퍼즐"]])}
    <div class="chart"><h4>가족별 완성한 퍼즐 수</h4>${hbars(rows.map((a) => ({ name: who(a, me), v: cntOf(a), txt: `${cntOf(a)}개${pentoProgress(a.sv, st).passed ? " ✔" : ""}`, mine: a.teamId === me })), { max: Math.max(need, ...rows.map(cntOf)) })}
      ${mode === "group" ? `<div class="muted">✔ = 서로 다른 조각 수 퍼즐을 ${need}가지 완성해 통과한 가족</div>` : ""}</div>
    <h4 style="margin:14px 2px 8px">퍼즐별로 보기 <span class="muted">— 퍼즐을 누르면 ${admin ? "가족들의 해법이" : "해결한 가족이"} 나와요</span></h4>
    <div class="sol-gallery" style="grid-template-columns:repeat(auto-fill,minmax(92px,1fr))">${allowed.map((i) => `
      <button type="button" class="s" data-pz="${i}" style="cursor:pointer;${i === el._pz ? "outline:3px solid #1f2a5c" : ""}">
        <div style="display:flex;justify-content:center;align-items:center;height:70px">${miniGrid(PUZZLES[i].rows, 7)}</div>
        <div style="font-size:12px">${esc(PUZZLES[i].name)}</div><b style="color:#1f2a5c">${per[i].length}팀</b></button>`).join("")}</div>`;
  const sel = per[el._pz] || [];
  if (admin) {
    // 관리자: 가족마다 실제로 놓은 조각 배치(해법)까지 모두 보여 줘요
    const kinds = new Set(sel.map((a) => a.sv[el._pz].grid.join("/")));
    html += `<div class="chart" style="margin-top:12px"><h4>${esc(PUZZLES[el._pz].level)} · ${esc(PUZZLES[el._pz].name)} — ${sel.length}팀 해결 · 서로 다른 해법 ${kinds.size}가지 <span class="muted">(관리자만 보여요)</span></h4>
      <div class="sol-gallery">${sel.map((a) => `<div class="s">
        <div style="display:flex;justify-content:center;margin-bottom:6px">${miniGrid(a.sv[el._pz].grid, 14)}</div>${esc(who(a, me))}</div>`).join("") || `<div class="empty">아직 이 퍼즐을 해결한 가족이 없어요.</div>`}</div></div>`;
  } else {
    // 가족: 정답(조각 배치)은 보여 주지 않고, 퍼즐 모양과 해결한 가족만 보여 줘요
    html += `<div class="chart" style="margin-top:12px"><h4>${esc(PUZZLES[el._pz].level)} · ${esc(PUZZLES[el._pz].name)} — ${sel.length}팀 해결</h4>
      <div style="display:flex;justify-content:center;margin:6px 0 12px">${miniGrid(PUZZLES[el._pz].rows, 18)}</div>
      ${sel.length ? `<div class="tchips" style="justify-content:center">${sel.map((a) => `<span class="tchip ${a.teamId === me ? "mine" : ""}">✔ ${esc(who(a, me))}</span>`).join("")}</div>`
        : `<div class="empty" style="padding:10px">아직 이 퍼즐을 해결한 가족이 없어요.</div>`}</div>`;
  }
  if (config.pentoTimePublic && times && times.length) {
    const t = [...times].sort((a, b) => a.seconds - b.seconds);
    html += `<div class="chart" style="margin-top:12px"><h4>⏱ 통과까지 걸린 시간</h4>
      ${hbars(t.map((x) => ({ name: who(x, me), v: x.seconds, txt: x.seconds < 60 ? `${x.seconds}초` : `${Math.floor(x.seconds / 60)}분 ${x.seconds % 60}초`, mine: x.teamId === me })), { color: "#3a7bd5" })}</div>`;
  }
  el.innerHTML = html;
  el.querySelectorAll("[data-pz]").forEach((b) => b.onclick = () => { el._pz = Number(b.dataset.pz); P.pento(el, list, { myTeamId: me, config, times, admin }); });
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

P.scale = (el) => { el.innerHTML = `<div class="empty">🔒 만족도는 선생님만 보는 문항이라 볼 수 없어요.</div>`; };

P.comment = (el, list0, { myTeamId: me }) => {
  const list = list0.filter((a) => a.data.text);
  el.innerHTML = list.length ? `<div class="cork">${[...list].reverse().map((a) => {
    const h = hash(a.teamId);
    return `<div class="postit ${a.teamId === me ? "mine" : ""}" style="background:${POSTIT[h % POSTIT.length]};transform:rotate(${(h % 9) - 4}deg)">
      ${esc(a.data.text)}<div class="who">— ${esc(who(a, me))}</div></div>`;
  }).join("")}</div>` : `<div class="empty">아직 붙은 소감이 없어요.</div>`;
};

/* 관리자가 추가한 문제 */
P.number = (el, list0, { myTeamId: me, q }) => {
  const list = list0.filter((a) => ok(a.data.value));
  const vals = list.map((a) => a.data.value);
  el.innerHTML = `${stats([[fmt(avg(vals)), "평균"], [fmt(modeOf(vals).v), "가장 많은 답"], [list.length + "팀", "답한 가족"]])}
    <div class="chart">${dotStack(list.map((a) => ({ v: a.data.value, mine: a.teamId === me })), { unit: q.unit || "" })}</div>`;
};
P.text = (el, list, { myTeamId: me }) => {
  el.innerHTML = `<div class="bubbles">${list.filter((a) => a.data.text).map((a) => `<div class="bubble ${a.teamId === me ? "mine" : ""}"><div class="who">${esc(who(a, me))}</div>${esc(a.data.text)}</div>`).join("")}</div>`;
};
P.choice = (el, list, { myTeamId: me, q }) => {
  const opts = (q.options || []).filter(Boolean);
  el.innerHTML = `<div class="chart">${voteBars(opts.map((o) => ({ name: o, items: list.filter((a) => a.data.pick === o) })), me)}</div>`;
};
P.photo = (el, list, { myTeamId: me }) => {
  el.innerHTML = wall(list.filter((a) => a.data.photo), me, (a) => a.data.photo, (a) => esc(who(a, me)));
};

export function renderPeek(el, q, list, ctx) {
  WIDE = !!ctx.wideNames;
  const fn = P[q.kind];
  if (q.kind !== "scale" && !list.length) { el.innerHTML = `<div class="empty">아직 답을 낸 가족이 없어요.<br>조금 뒤에 다시 보러 와요!</div>`; return; }
  if (!fn) { el.innerHTML = `<div class="empty">팀별 발자취를 준비하지 못했어요.</div>`; return; }
  fn(el, list, { ...ctx, q });
  // 사진 크게 보기 (탭을 바꿔도 되도록 위임)
  el.onclick = (e) => {
    const n = e.target.closest("[data-zoom]");
    if (!n || !el.contains(n)) return;
    const a = list.find((x) => x.teamId === n.dataset.zoom);
    const pic = a?.data?.drawn || a?.data?.photo;
    if (!pic) return;
    const z = document.createElement("div");
    z.className = "zoom";
    const body = q.kind === "quadrat" ? dotsHtml(a.data.photo, a.data.aiManual ? [] : a.data.aiPoints, `🤖 ${a.data.aiCount}송이`) : `<img src="${pic}" style="width:100%;border-radius:10px">`;
    z.innerHTML = `<div>${body}<div class="cap">${esc(who(a, ctx.myTeamId))}${a.data.name ? " · " + esc(a.data.name) : ""}</div></div>`;
    z.onclick = () => z.remove();
    document.body.appendChild(z);
  };
}
