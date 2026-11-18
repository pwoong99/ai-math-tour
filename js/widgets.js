// 화면 부품: 시저 암호판, 사진 자르기, 꽃 위치 점 표시, 펜토미노 판
import { PIECES, PIECE_COLORS } from "./questions.js?v=2.1";
import { esc, toast } from "./fb.js?v=2.1";

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
    outer += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="17" font-weight="800" fill="#22305a">${ABC[i]}</text>`;
    const [x2, y2] = pos(96, i);
    inner += `<text x="${x2}" y="${y2}" text-anchor="middle" dominant-baseline="central" font-size="15" font-weight="800" fill="${i === 0 ? "#d64545" : "#0f5c44"}">${ABC[i]}</text>`;
    const [lx1, ly1] = pos(116, i + 0.5), [lx2, ly2] = pos(150, i + 0.5);
    outer += `<line x1="${lx1}" y1="${ly1}" x2="${lx2}" y2="${ly2}" stroke="#c9cfe0" stroke-width="1"/>`;
  }
  el.innerHTML = `
    <div class="wheel-wrap">
      <svg viewBox="0 0 ${S} ${S}">
        <circle cx="${cx}" cy="${cy}" r="152" fill="#eef1fb" stroke="#22305a" stroke-width="3"/>
        <circle cx="${cx}" cy="${cy}" r="116" fill="#fff" stroke="#22305a" stroke-width="2"/>
        ${outer}
        <g class="inner" style="transform-origin:${cx}px ${cy}px;transition:transform .25s">
          <circle cx="${cx}" cy="${cy}" r="114" fill="#e3f3ec" stroke="#17795a" stroke-width="2"/>
          ${inner}
          <circle cx="${cx}" cy="${cy}" r="70" fill="#fff" stroke="#17795a" stroke-width="2"/>
        </g>
        <path d="M${cx} 4 l-9 -0 l9 14 l9 -14z" fill="#f08a24"/>
        <text x="${cx}" y="${cy - 14}" text-anchor="middle" font-size="13" font-weight="700" fill="#5d6b69">바깥 = 암호</text>
        <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="13" font-weight="700" fill="#17795a">안쪽 = 원래 글자</text>
        <text class="kt" x="${cx}" y="${cy + 30}" text-anchor="middle" font-size="16" font-weight="900" fill="#22305a"></text>
      </svg>
      <div class="wheel-ctl">
        <button type="button" class="btn small gray" data-d="-1">◀ 한 칸</button>
        <b class="kv"></b>
        <button type="button" class="btn small gray" data-d="1">한 칸 ▶</button>
      </div>
      <div class="muted">안쪽 원을 손가락으로 돌려도 돼요. 빨간 <b style="color:#d64545">A</b>가 가리키는 바깥 글자가 열쇠예요.</div>
    </div>`;
  const g = el.querySelector(".inner"), kv = el.querySelector(".kv"), kt = el.querySelector(".kt");
  let rot = k * step;
  const draw = () => {
    g.style.transform = `rotate(${rot}deg)`;
    kv.textContent = `열쇠 k = ${k}`;
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
  return { get k() { return k; } };
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
  const cs = Math.max(22, Math.min(46, Math.floor((width - 8) / Cc)));
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
