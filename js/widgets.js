// 화면 부품: 시저 암호판, 사진 자르기, 꽃 위치 점 표시, 펜토미노 판
import { PIECES, PIECE_COLORS } from "./questions.js?v=3.20";
import { esc, toast, fileToJpeg } from "./fb.js?v=3.20";

const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/* ───────── 시저 암호판 ─────────
   바깥 원 = 암호 글자(고정), 안쪽 원 = 원래 글자(돌아감)
   안쪽 원의 A를 바깥 원의 '열쇠 글자'에 맞추면, 바깥에서 암호 글자를 찾았을 때 바로 안쪽이 해독 글자예요. */
export function cipherWheel(el, startK = 0) {
  const S = 320, cx = 160, cy = 160, step = 360 / 26;
  let k = ((startK % 26) + 26) % 26;
  const pos = (r, i) => {
    const a = (i * step - 90) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  let outer = "", inner = "";
  for (let i = 0; i < 26; i++) {
    const [x, y] = pos(132, i);
    outer += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="17" font-weight="800" fill="#1f2a5c">${ABC[i]}</text>`;
    const [x2, y2] = pos(96, i);
    inner += `<text x="${x2}" y="${y2}" text-anchor="middle" dominant-baseline="central" font-size="15" font-weight="800" fill="${i === 0 ? "#d64545" : "#141b3d"}">${ABC[i]}</text>`;
    const [lx1, ly1] = pos(116, i + 0.5), [lx2, ly2] = pos(150, i + 0.5);
    outer += `<line x1="${lx1}" y1="${ly1}" x2="${lx2}" y2="${ly2}" stroke="#c9cfe0" stroke-width="1"/>`;
  }
  el.innerHTML = `
    <div class="wheel-wrap">
      <svg viewBox="0 0 ${S} ${S}">
        <circle cx="${cx}" cy="${cy}" r="152" fill="#eef1fb" stroke="#1f2a5c" stroke-width="3"/>
        <circle cx="${cx}" cy="${cy}" r="116" fill="#fff" stroke="#1f2a5c" stroke-width="2"/>
        ${outer}
        <g class="inner" style="transform-origin:${cx}px ${cy}px;transition:transform .25s">
          <circle cx="${cx}" cy="${cy}" r="114" fill="#eef1fb" stroke="#1f2a5c" stroke-width="2"/>
          ${inner}
          <circle cx="${cx}" cy="${cy}" r="70" fill="#fff" stroke="#1f2a5c" stroke-width="2"/>
        </g>
        <path d="M${cx} 4 l-9 -0 l9 14 l9 -14z" fill="#e5484d"/>
        <text x="${cx}" y="${cy - 14}" text-anchor="middle" font-size="13" font-weight="700" fill="#5d6b69">바깥 = 암호</text>
        <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="13" font-weight="700" fill="#1f2a5c">안쪽 = 원래 글자</text>
        <text class="kt" x="${cx}" y="${cy + 30}" text-anchor="middle" font-size="16" font-weight="900" fill="#1f2a5c"></text>
      </svg>
      <div class="wheel-ctl">
        <button type="button" class="btn small gray" data-d="-1">◀ 한 칸</button>
        <b class="kv"></b>
        <button type="button" class="btn small gray" data-d="1">한 칸 ▶</button>
      </div>
      <div class="muted">안쪽 원을 손가락으로 돌려도 돼요. 작은 원의 빨간 <b style="color:#d64545">A</b>(▲)를 큰 원의 열쇠(KEY) 글자에 맞춰요.</div>
    </div>`;
  const g = el.querySelector(".inner"), kv = el.querySelector(".kv"), kt = el.querySelector(".kt");
  let rot = k * step;
  const draw = () => {
    g.style.transform = `rotate(${rot}deg)`;
    kv.textContent = `열쇠 KEY = ${ABC[k]}`;
    kt.textContent = `A → ${ABC[k]}`;
  };
  const setK = (nk) => {
    const d = ((nk - k) % 26 + 39) % 26 - 13; // 가까운 방향으로 돌기
    k = ((nk % 26) + 26) % 26;
    rot += d * step;
    draw();
  };
  el.querySelectorAll("[data-d]").forEach((b) => b.onclick = () => setK(k + Number(b.dataset.d)));
  // 손가락으로 돌리기
  const svg = el.querySelector("svg");
  let drag = null;
  const ang = (e) => {
    const r = svg.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
  };
  svg.addEventListener("pointerdown", (e) => {
    drag = { a: ang(e), rot };
    g.style.transition = "none";
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener("pointermove", (e) => {
    if (!drag) return;
    let d = ang(e) - drag.a;
    rot = drag.rot + d;
    g.style.transform = `rotate(${rot}deg)`;
  });
  const end = () => {
    if (!drag) return;
    drag = null;
    g.style.transition = "transform .25s";
    const nk = Math.round(rot / step);
    rot = nk * step;
    k = ((nk % 26) + 26) % 26;
    draw();
  };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);
  draw();
  return { get k() { return k; }, setK };
}

export function caesarDecode(text, k) {
  return String(text).toUpperCase().replace(/[A-Z]/g, (ch) => ABC[(ABC.indexOf(ch) - k + 26 * 10) % 26]);
}

/* ───────── 사진 자르기 (정사각형) ───────── */
export function cropper(el, dataUrl) {
  el.innerHTML = `
    <div class="crop"><img alt="" draggable="false"><div class="frame"></div></div>
    <div class="row" style="margin-top:8px"><span class="muted">작게</span>
      <input type="range" class="grow zoomr" min="1" max="4" step="0.01" value="1"><span class="muted">크게</span></div>
    <div class="muted">사진을 끌어서 옮기고 막대로 확대해, 노란 테두리 안에 방형구 틀 안쪽만 꽉 차게 맞춰 주세요.</div>`;
  const box = el.querySelector(".crop"), img = el.querySelector("img"), zr = el.querySelector(".zoomr");
  let W = 1, H = 1, V = 1, base = 1, z = 1, x = 0, y = 0;
  const clamp = () => {
    const s = base * z;
    x = Math.min(0, Math.max(V - W * s, x));
    y = Math.min(0, Math.max(V - H * s, y));
  };
  const draw = () => { clamp(); img.style.transform = `translate(${x}px,${y}px) scale(${base * z})`; };
  const ready = new Promise((res) => {
    img.onload = () => {
      W = img.naturalWidth; H = img.naturalHeight;
      V = box.clientWidth || 300;
      base = V / Math.min(W, H);
      x = (V - W * base) / 2; y = (V - H * base) / 2;
      draw(); res();
    };
  });
  img.src = dataUrl;
  zr.oninput = () => {
    const nz = Number(zr.value), c = V / 2;
    // 가운데를 기준으로 확대
    x = c - (c - x) * nz / z; y = c - (c - y) * nz / z;
    z = nz; draw();
  };
  let d = null;
  box.addEventListener("pointerdown", (e) => { d = { px: e.clientX, py: e.clientY, x, y }; box.setPointerCapture(e.pointerId); });
  box.addEventListener("pointermove", (e) => { if (!d) return; x = d.x + e.clientX - d.px; y = d.y + e.clientY - d.py; draw(); });
  box.addEventListener("pointerup", () => d = null);
  box.addEventListener("pointercancel", () => d = null);
  return {
    ready,
    toDataUrl(size = 800, q = 0.75) {
      const cv = document.createElement("canvas");
      cv.width = cv.height = size;
      const r = size / V, s = base * z;
      cv.getContext("2d").drawImage(img, x * r, y * r, W * s * r, H * s * r);
      return cv.toDataURL("image/jpeg", q);
    }
  };
}

/* 사진 위에 AI가 찾은 꽃 위치 점 찍기 (points: [{x,y}] 0~1000) */
export function dotsHtml(src, points, label) {
  const dots = (points || []).map((p) =>
    `<i class="dot" style="left:${(p.x / 10).toFixed(2)}%;top:${(p.y / 10).toFixed(2)}%"></i>`).join("");
  return `<div class="dots"><img src="${src}" alt="">${dots}${label != null ? `<span class="cnt">${esc(label)}</span>` : ""}</div>`;
}

/* ───────── 펜토미노 ───────── */
const norm = (cells) => {
  const mr = Math.min(...cells.map((c) => c[0])), mc = Math.min(...cells.map((c) => c[1]));
  return cells.map(([r, c]) => [r - mr, c - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
};
const rotate = (cells) => norm(cells.map(([r, c]) => [c, -r]));
const flip = (cells) => norm(cells.map(([r, c]) => [r, -c]));

export function miniGrid(rows, px = 12) {
  const R = rows.length, Cc = Math.max(...rows.map((r) => r.length));
  let h = `<div class="mini-grid" style="grid-template-columns:repeat(${Cc},${px}px)">`;
  for (let r = 0; r < R; r++) for (let c = 0; c < Cc; c++) {
    const ch = rows[r][c] || ".";
    const col = ch === "." ? "transparent" : ch === "#" ? "#d8d2c2" : PIECE_COLORS[ch] || "#999";
    h += `<i style="background:${col}"></i>`;
  }
  return h + "</div>";
}

function pieceSvg(cells, cs, color) {
  const R = Math.max(...cells.map((c) => c[0])) + 1, Cc = Math.max(...cells.map((c) => c[1])) + 1;
  const rects = cells.map(([r, c]) =>
    `<rect x="${c * cs + 1}" y="${r * cs + 1}" width="${cs - 2}" height="${cs - 2}" rx="3" fill="${color}" stroke="rgba(0,0,0,.28)" stroke-width="1.2" data-r="${r}" data-c="${c}"/>`).join("");
  return `<svg width="${Cc * cs}" height="${R * cs}" viewBox="0 0 ${Cc * cs} ${R * cs}" style="display:block">${rects}</svg>`;
}

/* rows: 퍼즐 모양(# = 채울 칸), initialGrid: 저장된 배치(글자), onSolved(grid) */
export function pentoBoard(el, rows, { initialGrid = null, onSolved = () => {}, onChange = () => {} } = {}) {
  const R = rows.length, Cc = Math.max(...rows.map((r) => r.length));
  const target = new Set();
  rows.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === "#") target.add(r + "," + c); }));
  let placed = {}; // letter -> [[r,c]...]
  let sel = null;  // { letter, cells }
  let orient = {}; // letter -> 마지막 방향
  let solved = false;

  if (initialGrid) {
    initialGrid.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch !== "." && ch !== "#" && PIECES[ch]) (placed[ch] = placed[ch] || []).push([r, c]);
    }));
  }

  el.innerHTML = `
    <div class="pento-board"></div>
    <div class="sel-area"><div class="pv"><span class="muted">아래에서 조각을 골라 주세요</span></div>
      <div class="ctl">
        <button type="button" class="btn small gray" data-a="rot">⟳ 돌리기</button>
        <button type="button" class="btn small gray" data-a="flip">⇋ 뒤집기</button>
      </div></div>
    <div class="tray"></div>
    <div class="muted" style="margin-top:6px">조각을 골라 판 위로 끌어다 놓아요. 판에 놓은 조각을 톡 누르면 다시 빼낼 수 있어요.</div>`;
  const boardEl = el.querySelector(".pento-board"), pv = el.querySelector(".pv"), tray = el.querySelector(".tray");
  const width = Math.min(el.clientWidth || 340, 600);
  // 칸 크기: 화면 너비와 높이에 맞춰요 (휴대폰에서 판·미리보기·조각 칸이 한 화면에 들어오게)
  const byH = Math.floor((window.innerHeight - 330) / R);
  const cs = Math.max(20, Math.min(46, Math.floor((width - 8) / Cc), byH > 0 ? byH : 46));
  boardEl.style.width = Cc * cs + "px";
  boardEl.style.height = R * cs + "px";

  const occ = () => {
    const m = {};
    Object.entries(placed).forEach(([L, cells]) => cells.forEach(([r, c]) => m[r + "," + c] = L));
    return m;
  };
  const gridOut = () => {
    const m = occ();
    return rows.map((row, r) => [...Array(Cc)].map((_, c) => m[r + "," + c] || (target.has(r + "," + c) ? "#" : ".")).join(""));
  };

  function drawBoard(hl) {
    const m = occ();
    let h = "";
    for (let r = 0; r < R; r++) for (let c = 0; c < Cc; c++) {
      const key = r + "," + c;
      if (!target.has(key)) continue;
      const L = m[key];
      let cls = L ? "cell p" : "cell t";
      if (hl && hl.cells.has(key)) cls += hl.ok ? " hl-ok" : " hl-no";
      h += `<div class="${cls}" data-k="${key}" style="left:${c * cs + 1}px;top:${r * cs + 1}px;width:${cs - 2}px;height:${cs - 2}px;${L ? "background:" + PIECE_COLORS[L] : ""}"></div>`;
    }
    boardEl.innerHTML = h;
  }
  function drawTray() {
    tray.innerHTML = Object.keys(PIECES).map((L) =>
      `<button type="button" data-l="${L}" class="${placed[L] ? "used" : ""} ${sel && sel.letter === L ? "on" : ""}">
        <div style="display:flex;justify-content:center;height:46px;align-items:center">${pieceSvg(orient[L] || PIECES[L], 9, PIECE_COLORS[L])}</div><span>${L}</span></button>`).join("");
    tray.querySelectorAll("button").forEach((b) => b.onclick = () => {
      const L = b.dataset.l;
      if (placed[L]) { toast("이미 판에 놓은 조각이에요. 판에서 톡 눌러 빼낼 수 있어요."); return; }
      select(L, orient[L] || PIECES[L]);
    });
  }
  function drawSel() {
    if (!sel) { pv.innerHTML = `<span class="muted">아래에서 조각을 골라 주세요</span>`; return; }
    pv.innerHTML = pieceSvg(sel.cells, cs, PIECE_COLORS[sel.letter]);
    pv.querySelector("svg").addEventListener("pointerdown", (e) => {
      const t = e.target.closest("rect");
      if (!t) return;
      startDrag(e, sel.letter, sel.cells, [Number(t.dataset.r), Number(t.dataset.c)], false);
    });
  }
  function select(L, cells) {
    sel = { letter: L, cells: norm(cells) };
    orient[L] = sel.cells;
    drawSel(); drawTray();
  }
  el.querySelector('[data-a="rot"]').onclick = () => { if (sel) select(sel.letter, rotate(sel.cells)); };
  el.querySelector('[data-a="flip"]').onclick = () => { if (sel) select(sel.letter, flip(sel.cells)); };

  // 판 위 조각 누르기 → 빼내거나 끌어 옮기기
  boardEl.addEventListener("pointerdown", (e) => {
    const k = e.target.dataset?.k;
    if (!k) return;
    const L = occ()[k];
    if (!L) return;
    const cells = placed[L];
    const mr = Math.min(...cells.map((c) => c[0])), mc = Math.min(...cells.map((c) => c[1]));
    const [r, c] = k.split(",").map(Number);
    const rel = norm(cells);
    delete placed[L];
    solved = false;
    startDrag(e, L, rel, [r - mr, c - mc], true);
  });

  let ghost = null;
  function startDrag(e, L, cells, grab, fromBoard) {
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    let moved = false, last = null;
    ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    ghost.innerHTML = pieceSvg(cells, cs, PIECE_COLORS[L]);
    document.body.appendChild(ghost);
    const place = (x, y) => {
      ghost.style.left = x - (grab[1] + 0.5) * cs + "px";
      ghost.style.top = y - (grab[0] + 0.5) * cs + "px";
    };
    place(sx, sy);
    const target0 = (x, y) => {
      const b = boardEl.getBoundingClientRect();
      const c = Math.floor((x - b.left) / cs), r = Math.floor((y - b.top) / cs);
      const o = [r - grab[0], c - grab[1]];
      const abs = cells.map(([rr, cc]) => [rr + o[0], cc + o[1]]);
      const m = occ();
      const ok = abs.every(([rr, cc]) => target.has(rr + "," + cc) && !m[rr + "," + cc]);
      const near = x >= b.left - cs && x <= b.right + cs && y >= b.top - cs && y <= b.bottom + cs;
      return { abs, ok, near };
    };
    const move = (ev) => {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) moved = true;
      place(ev.clientX, ev.clientY);
      last = target0(ev.clientX, ev.clientY);
      drawBoard(last.near ? { cells: new Set(last.abs.map((a) => a.join(","))), ok: last.ok } : null);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      ghost.remove(); ghost = null;
      if (moved && last && last.ok) {
        placed[L] = last.abs;
        if (sel && sel.letter === L) sel = null;
        orient[L] = cells;
      } else if (fromBoard) {
        select(L, cells); // 판에서 빼낸 조각은 다시 고른 상태로
      }
      drawBoard(); drawSel(); drawTray();
      onChange(gridOut());
      check();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  function check() {
    const m = occ();
    const full = [...target].every((k) => m[k]);
    if (full && !solved) { solved = true; onSolved(gridOut()); }
  }

  drawBoard(); drawTray(); drawSel();
  return {
    reset() { placed = {}; sel = null; solved = false; drawBoard(); drawTray(); drawSel(); onChange(gridOut()); },
    get grid() { return gridOut(); },
    get solved() { return solved; }
  };
}

/* ───────── 한붓그리기 따라 그리기 ─────────
   점을 차례로 눌러 선을 지나가요. 같은 선은 두 번 지날 수 없어요. */
export const EULER_FIGS = {
  a: {
    vb: [240, 240],
    V: { OT: [120, 20], IT: [120, 65], IB: [120, 175], OB: [120, 220] },
    E: [["OT", "OB", "M120 20 A100 100 0 0 0 120 220"], ["OT", "OB", "M120 20 A100 100 0 0 1 120 220"],
      ["IT", "IB", "M120 65 A55 55 0 0 0 120 175"], ["IT", "IB", "M120 65 A55 55 0 0 1 120 175"],
      ["OT", "IT"], ["IT", "IB"], ["IB", "OB"]]
  },
  b: {
    vb: [300, 200],
    V: { L: [22, 100], TL: [78, 34], TR: [222, 34], BL: [78, 166], BR: [222, 166], C: [150, 100], R: [278, 100] },
    E: [["L", "TL"], ["L", "BL"], ["TL", "TR"], ["BL", "BR"], ["TL", "BL"], ["TR", "BR"],
      ["TL", "C"], ["C", "BR"], ["TR", "C"], ["C", "BL"], ["TR", "R"], ["BR", "R"]]
  }
};
const edgeD = (f, e) => e[2] || `M${f.V[e[0]].join(" ")} L${f.V[e[1]].join(" ")}`;
// 길 색: 처음 선은 초록 → 마지막 선은 주황
const hue = (i, n) => `hsl(${150 - (n > 1 ? i / (n - 1) : 0) * 125} 70% 42%)`;

export function eulerFigSvg(fig, { path = [], edges = [], cur = null, small = false, pickEdges = false } = {}) {
  const f = EULER_FIGS[fig], [W, H] = f.vb, n = f.E.length;
  let g = f.E.map((e) => `<path d="${edgeD(f, e)}" fill="none" stroke="#d9d3c4" stroke-width="${small ? 5 : 7}" stroke-linecap="round"/>`).join("");
  g += edges.map((ei, i) => `<path d="${edgeD(f, f.E[ei])}" fill="none" stroke="${hue(i, n)}" stroke-width="${small ? 5 : 7}" stroke-linecap="round"/>`).join("");
  // 출발한 뒤에는 선을 눌러요 (눈에 안 보이는 굵은 선이 손가락을 받아요)
  if (pickEdges) g += f.E.map((e, i) => `<path data-e="${i}" d="${edgeD(f, e)}" fill="none" stroke="transparent" stroke-width="24" stroke-linecap="round" style="cursor:pointer"/>`).join("");
  g += Object.entries(f.V).map(([id, [x, y]]) => {
    const start = path[0] === id, now = cur === id;
    return `<g data-v="${id}" style="cursor:pointer${pickEdges ? ";pointer-events:none" : ""}">
      <circle cx="${x}" cy="${y}" r="22" fill="transparent"/>
      ${now ? `<circle cx="${x}" cy="${y}" r="16" fill="none" stroke="#e5484d" stroke-width="4"/>` : ""}
      <circle cx="${x}" cy="${y}" r="${small ? 8 : 10}" fill="${start ? "#1f2a5c" : "#e53935"}" stroke="#fff" stroke-width="2"/></g>`;
  }).join("");
  if (path.length) {
    const [x, y] = f.V[path[0]];
    g += `<text x="${x}" y="${y + (y > H / 2 ? 26 : -18)}" text-anchor="middle" font-size="${small ? 16 : 13}" font-weight="900" fill="#1f2a5c" style="pointer-events:none">출발</text>`;
  }
  return `<svg viewBox="-10 -10 ${W + 20} ${H + 20}" style="width:100%;max-width:${small ? 160 : 320}px;display:block;margin:0 auto;touch-action:manipulation">${g}</svg>`;
}

export function eulerTracer(el, fig, prev, onChange = () => {}) {
  const f = EULER_FIGS[fig], n = f.E.length;
  let path = [...(prev?.path || [])], edges = [...(prev?.edges || [])];
  const ok = () => edges.length === n;
  const stuck = () => path.length && !ok() && !f.E.some((e, i) => !edges.includes(i) && (e[0] === path.at(-1) || e[1] === path.at(-1)));
  const draw = () => {
    const msg = !path.length ? "먼저 출발할 점을 눌러요."
      : ok() ? `🎉 성공! ${n}개의 선을 한 번씩 모두 지났어요.`
      : stuck() ? "더 갈 수 있는 선이 없어요. 되돌리거나 처음부터 다시 해 봐요!"
      : `이어서 지나갈 선을 눌러요. (${edges.length} / ${n} 선)`;
    el.innerHTML = `<div class="tracer ${ok() ? "ok" : ""}">${eulerFigSvg(fig, { path, edges, cur: path.at(-1), pickEdges: path.length > 0 && !ok() })}
      <div class="tr-msg ${ok() ? "good" : stuck() ? "bad" : ""}">${msg}</div>
      <div class="row" style="justify-content:center;gap:8px">
        <button type="button" class="btn small gray" data-undo ${path.length ? "" : "disabled"}>↶ 한 칸 되돌리기</button>
        <button type="button" class="btn small gray" data-reset ${path.length ? "" : "disabled"}>처음부터</button></div></div>`;
    el.querySelectorAll("[data-v]").forEach((v) => v.addEventListener("click", () => tapV(v.dataset.v)));
    el.querySelectorAll("[data-e]").forEach((p) => p.addEventListener("click", () => tapE(Number(p.dataset.e))));
    el.querySelector("[data-undo]").onclick = () => { if (edges.length) { edges.pop(); path.pop(); } else path = []; draw(); onChange(); };
    el.querySelector("[data-reset]").onclick = () => { path = []; edges = []; draw(); onChange(); };
  };
  const tapV = (v) => { if (!path.length) { path = [v]; draw(); onChange(); } };
  const tapE = (i) => {
    if (ok() || !path.length) return;
    const c = path.at(-1), e = f.E[i];
    if (edges.includes(i)) { toast("이미 지나간 선이에요."); return; }
    if (e[0] !== c && e[1] !== c) { toast("지금 있는 점(빨간 동그라미)에 이어진 선을 눌러요."); return; }
    edges.push(i); path.push(e[0] === c ? e[1] : e[0]);
    draw(); onChange();
    if (ok()) toast("🎉 한붓그리기 성공!");
  };
  draw();
  return { get: () => ({ ok: ok(), path, edges }) };
}

/* ───────── 솔방울 사진에 나선 그리기 ─────────
   빨강 = 시계 방향 나선, 파랑 = 시계 반대 방향 나선 (워크북 그림과 같은 색) */
export const SPIRAL_COLORS = { r: "#e53935", b: "#1e66d0" };
export function spiralPad(holder, prev, onChange = () => {}) {
  let photo = prev?.photo || "";
  // 저장된 선은 [x0, y0, x1, y1 …]처럼 펼쳐져 있어요 (Firestore는 배열 안의 배열을 못 담아요)
  const unflat = (p) => Array.isArray(p[0]) ? p.map((q) => [...q]) : p.reduce((a, v, i) => (i % 2 ? a[a.length - 1].push(v) : a.push([v]), a), []);
  let strokes = (prev?.strokes || []).map((s) => ({ c: s.c, p: unflat(s.p || []) }));
  let pen = "r", img = null, drawing = null;
  holder.innerHTML = `
    <div class="sp-wrap">
      <div class="sp-stage"><canvas class="sp-cv" aria-label="솔방울 사진 위에 나선 그리기"></canvas>
        <div class="sp-empty">솔방울을 뒤집어 아래쪽(줄기 쪽)에서 찍은 사진을 올려요.</div></div>
      <div class="sp-tools">
        <button type="button" class="sp-pen on" data-pen="r"><i style="background:${SPIRAL_COLORS.r}"></i>시계 방향</button>
        <button type="button" class="sp-pen" data-pen="b"><i style="background:${SPIRAL_COLORS.b}"></i>시계 반대 방향</button>
      </div>
      <div class="sp-count muted"></div>
      <div class="row" style="gap:6px;justify-content:center;flex-wrap:wrap">
        <label class="btn ghost small">📷 <span class="sp-ph">${photo ? "사진 다시 올리기" : "솔방울 사진 올리기"}</span><input type="file" accept="image/*" class="hidden"></label>
        <button type="button" class="btn small gray" data-undo>↶ 되돌리기</button>
        <button type="button" class="btn small gray" data-clear>모두 지우기</button>
      </div>
    </div>`;
  const cv = holder.querySelector(".sp-cv"), ctx = cv.getContext("2d"), stage = holder.querySelector(".sp-stage");
  const counts = () => ({ r: strokes.filter((s) => s.c === "r").length, b: strokes.filter((s) => s.c === "b").length });
  const draw = () => {
    const w = stage.clientWidth || 320;
    const h = img ? Math.round(w * img.naturalHeight / img.naturalWidth) : 0;
    const dpr = window.devicePixelRatio || 1;
    stage.classList.toggle("has", !!img);
    if (!img) { cv.width = cv.height = 0; cv.style.height = "0px"; }
    else {
      cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + "px"; cv.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(img, 0, 0, w, h);
      paint(ctx, strokes, w, h, 4);
    }
    const c = counts();
    holder.querySelector(".sp-count").innerHTML = img ? `그린 선: <b style="color:${SPIRAL_COLORS.r}">시계 방향 ${c.r}줄</b> · <b style="color:${SPIRAL_COLORS.b}">시계 반대 방향 ${c.b}줄</b>` : "";
  };
  const paint = (g, list, w, h, lw) => list.forEach((s) => {
    if (s.p.length < 2) return;
    g.strokeStyle = SPIRAL_COLORS[s.c]; g.lineWidth = lw; g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); g.moveTo(s.p[0][0] * w, s.p[0][1] * h);
    s.p.slice(1).forEach(([x, y]) => g.lineTo(x * w, y * h));
    g.stroke();
  });
  const pt = (e) => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * 1000) / 1000, Math.round((e.clientY - r.top) / r.height * 1000) / 1000]; };
  cv.addEventListener("pointerdown", (e) => {
    if (!img) return;
    e.preventDefault(); cv.setPointerCapture(e.pointerId);
    drawing = { c: pen, p: [pt(e)] }; strokes.push(drawing);
  });
  cv.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const p = pt(e), l = drawing.p.at(-1);
    if (Math.hypot(p[0] - l[0], p[1] - l[1]) < 0.006) return;
    drawing.p.push(p); draw();
  });
  const end = () => {
    if (!drawing) return;
    if (drawing.p.length < 3) strokes.pop(); // 콕 찍은 점은 선으로 치지 않아요
    drawing = null; draw(); onChange(counts());
  };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  holder.querySelectorAll(".sp-pen").forEach((b) => b.onclick = () => {
    pen = b.dataset.pen; holder.querySelectorAll(".sp-pen").forEach((x) => x.classList.toggle("on", x === b));
  });
  holder.querySelector("[data-undo]").onclick = () => { strokes.pop(); draw(); onChange(counts()); };
  holder.querySelector("[data-clear]").onclick = () => { if (!strokes.length || confirm("그린 선을 모두 지울까요?")) { strokes = []; draw(); onChange(counts()); } };
  const load = (url) => new Promise((res) => { const i = new Image(); i.onload = () => { img = i; draw(); res(); }; i.onerror = () => res(); i.src = url; });
  holder.querySelector("input[type=file]").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      photo = await fileToJpeg(f, 900, 0.72);
      if (strokes.length && !confirm("새 사진을 올리면 그린 선이 지워져요. 바꿀까요?")) return;
      strokes = []; await load(photo);
      holder.querySelector(".sp-ph").textContent = "사진 다시 올리기";
      onChange(counts());
    } catch { toast("사진을 열지 못했어요. 다른 사진으로 해 볼까요?"); }
  };
  if (photo) load(photo);
  new ResizeObserver(() => draw()).observe(stage);
  return {
    counts,
    get photo() { return photo; },
    get strokes() { return strokes; },
    // 「팀별 발자취」에 보여 줄 그림 (사진 + 그린 선)
    composite() {
      if (!img) return "";
      const w = 720, h = Math.round(w * img.naturalHeight / img.naturalWidth);
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const g = c.getContext("2d"); g.drawImage(img, 0, 0, w, h); paint(g, strokes, w, h, 6);
      return c.toDataURL("image/jpeg", 0.72);
    }
  };
}
