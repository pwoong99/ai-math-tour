// 가족 화면: 로그인 → 미션 풀기 → 팀별 발자취 → 완주 수료증
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { db, auth, C, SESSIONS, esc, loginKey, checkPw, normName, toast, todayKR } from "./fb.js?v=3.01";
import { withDefaults, visibleQs, qTitle, qDesc, qIcon, qPlace, qCode, PLACES } from "./questions.js?v=3.01";
import { renderInput } from "./inputs.js?v=3.01";
import { renderPeek } from "./peek.js?v=3.01";
import { drawCertificate, canvasToPng } from "./cert.js?v=3.01";
import { drawDataMap, starValues, STAR_KINDS, SCENE_NAMES } from "./datamap.js?v=3.01";
import { getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const LS = "mathTour_login_v1";
const S = {
  uid: null, config: withDefaults(null), me: null, team: null, mine: {},
  idx: 0, view: "", handle: null, unsub: [], peekUnsub: [], booted: false
};

/* ── 화면 바꾸기 ── */
function show(v) {
  S.view = v;
  document.body.classList.remove("pento-focus");
  $("footer").classList.toggle("hidden", v !== "login"); // 만든 곳·버전은 첫 화면에만
  if (history.state?.mt === "base" && v !== "login" && v !== "loading") history.pushState({ mt: "app" }, ""); // 뒤로 가기 대비
  ["loading", "login", "mission", "list", "done"].forEach((n) => $("v-" + n).classList.toggle("hidden", n !== v));
  $("navbar").classList.toggle("hidden", v !== "mission");
  const inside = !!S.me && v !== "login";
  $("teamChip").classList.toggle("hidden", !inside);
  $("btnList").classList.toggle("hidden", !inside || v === "list");
  $("btnAdmin").classList.toggle("hidden", v !== "login"); // 관리자 톱니바퀴는 첫 화면에만
  window.scrollTo(0, 0);
}

const qs = () => visibleQs(S.config);
const solved = (q) => !!S.team?.solved?.[q.id];
const firstOpen = () => { const l = qs(); const i = l.findIndex((q) => !solved(q)); return i < 0 ? l.length : i; };
// 일단 제출한 미션 (다 못 하고 낸 것)
const isPartial = (q) => !!S.mine[q.id]?.partial;
const solvedTag = (q) => !solved(q) ? ""
  : isPartial(q) ? `<span class="solved-tag partial">📝 일단 제출한 미션 · 돌아와서 이어서 할 수 있어요</span>`
  : `<span class="solved-tag">✔ 해결한 미션 · 답을 고쳐서 다시 낼 수 있어요</span>`;
// 우리 가족 답을 미션 종류별로 (예: mine.stride)
const mineByKind = () => Object.fromEntries(withDefaults(S.config).questions.filter((q) => S.mine[q.id]).map((q) => [q.kind, S.mine[q.id]]));
const allDone = () => qs().length > 0 && firstOpen() >= qs().length;

/* ── 시작 ── */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    try { await signInAnonymously(auth); }
    catch (e) { console.error(e); $("v-loading").innerHTML = "접속하지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요."; }
    return;
  }
  if (S.booted) return;
  S.booted = true;
  S.uid = user.uid;
  onSnapshot(doc(db, C.config, "main"), (snap) => {
    S.config = withDefaults(snap.exists() ? snap.data() : null);
    onConfigChange();
  }, (e) => console.warn("config", e));
  const saved = JSON.parse(localStorage.getItem(LS) || "null");
  if (saved?.teamId) {
    try { await bindDevice(saved); await enter(saved); return; }
    catch (e) { console.warn(e); localStorage.removeItem(LS); }
  }
  showLogin();
});

/* ── 로그인 ── */
let loginSession = "";
function showLogin() {
  show("login");
  $("segSession").querySelectorAll("button").forEach((b) => b.onclick = () => pickSession(b.dataset.s));
}
async function pickSession(s) {
  loginSession = s;
  $("segSession").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.s === s));
  const sel = $("selSchool");
  sel.innerHTML = `<option value="">불러오는 중…</option>`;
  try {
    const snap = await getDoc(doc(db, C.schools, s));
    const list = snap.exists() ? (snap.data().list || []) : [];
    sel.innerHTML = list.length
      ? `<option value="">학교를 골라 주세요</option>` + list.map((x) => `<option>${esc(x)}</option>`).join("")
      : `<option value="">아직 등록된 학교가 없어요</option>`;
  } catch (e) {
    console.warn(e);
    sel.innerHTML = `<option value="">학교 목록을 불러오지 못했어요</option>`;
  }
}
$("inpPw").addEventListener("input", (e) => e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4));
$("inpPw").addEventListener("keydown", (e) => { if (e.key === "Enter") $("btnLogin").click(); });
$("btnLogin").onclick = async () => {
  const err = $("loginErr");
  err.textContent = "";
  const school = $("selSchool").value, name = normName($("inpName").value), pw = $("inpPw").value.trim();
  if (!loginSession) return err.textContent = "오전팀인지 오후팀인지 골라 주세요.";
  if (!school) return err.textContent = "학교를 골라 주세요.";
  if (!name) return err.textContent = "학생 이름을 써 주세요.";
  const pe = checkPw(pw);
  if (pe) return err.textContent = pe;
  $("btnLogin").disabled = true;
  try {
    const key = await loginKey(loginSession, school, name, Number(pw));
    const snap = await getDoc(doc(db, C.logins, key));
    if (!snap.exists()) { err.textContent = "학교, 이름, 비밀번호가 맞지 않아요. 다시 확인해 주세요."; return; }
    const info = { session: loginSession, school, name, key, teamId: snap.data().teamId };
    await bindDevice(info);
    localStorage.setItem(LS, JSON.stringify(info));
    await enter(info);
  } catch (e) {
    console.error(e);
    err.textContent = "로그인하지 못했어요. 잠시 뒤 다시 해 주세요.";
  } finally { $("btnLogin").disabled = false; }
};

// 이 기기를 우리 팀에 연결 (보안 규칙이 이 연결로 우리 팀 답만 쓸 수 있게 해요)
async function bindDevice(info) {
  await setDoc(doc(db, C.sessions, S.uid), {
    teamId: info.teamId, key: info.key, session: info.session, at: serverTimestamp()
  });
}

async function enter(info) {
  S.me = info;
  const t = await getDoc(doc(db, C.teams, info.teamId));
  if (!t.exists()) throw new Error("team gone");
  S.team = t.data();
  $("teamChip").textContent = `${SESSIONS[info.session]} · ${S.team.label}`;
  S.unsub.forEach((u) => u()); S.unsub = [];
  S.unsub.push(onSnapshot(doc(db, C.teams, info.teamId), (snap) => {
    if (!snap.exists()) { toast("팀 정보가 지워졌어요. 다시 로그인해 주세요."); logout(); return; }
    S.team = snap.data();
    if (S.view === "list") renderList();
    if (S.view === "mission") renderProgress();
  }));
  await new Promise((res) => {
    let first = true;
    S.unsub.push(onSnapshot(query(collection(db, C.answers), where("teamId", "==", info.teamId)), (snap) => {
      S.mine = {};
      snap.forEach((d) => S.mine[d.data().qid] = d.data().data);
      if (first) { first = false; res(); }
    }, () => { if (first) { first = false; res(); } }));
  });
  if (allDone()) showDone(); else openMission(firstOpen());
}

function logout() {
  S.unsub.forEach((u) => u()); S.unsub = [];
  localStorage.removeItem(LS);
  S.me = null; S.team = null; S.mine = {};
  $("inpPw").value = ""; $("inpName").value = "";
  showLogin();
}

function onConfigChange() {
  if (!S.me) return;
  if (S.view === "list") renderList();
  if (S.view === "mission") {
    const id = S.curId, i = qs().findIndex((q) => q.id === id);
    if (i < 0) { toast("문제 구성이 바뀌었어요."); showList(); return; }
    S.idx = i; renderProgress();
  }
}

/* ── 미션 ── */
function renderProgress() {
  const l = qs(), n = l.filter(solved).length;
  $("pBar").style.width = (l.length ? n / l.length * 100 : 0) + "%";
  $("pText").textContent = `${n} / ${l.length} 해결`;
  $("btnPrev").disabled = S.idx <= 0;
  const q = l[S.idx];
  const last = S.idx >= l.length - 1;
  $("btnNext").disabled = !q || !solved(q);
  $("btnNext").textContent = last ? "🏆 완주 화면" : "다음 미션 ▶";
}

function openMission(i) {
  const l = qs();
  if (!l.length) { showList(); return; }
  i = Math.max(0, Math.min(i, l.length - 1));
  if (i > firstOpen()) { toast("앞 미션을 먼저 해결해야 열려요 🔒"); i = firstOpen(); }
  S.idx = i;
  const q = l[i];
  S.curId = q.id;
  show("mission");
  const pl = PLACES[qPlace(q)];
  $("qPlace").textContent = `${pl.no} ${pl.name}`;
  $("qPlace").style.background = pl.color;
  $("qNum").textContent = qCode(q) ? `활동 ${qCode(q)}` : `미션 ${i + 1}`;
  $("qTitle").textContent = `${qIcon(q)} ${qTitle(q)}`;
  $("qSolved").innerHTML = solvedTag(q);
  const d = qDesc(q);
  $("qDesc").innerHTML = esc(d);
  $("qDesc").classList.toggle("hidden", !d);
  $("qErr").textContent = "";
  $("qDone").classList.add("hidden");
  $("btnSubmit").classList.remove("hidden");
  $("btnSubmit").textContent = solved(q) ? (isPartial(q) ? "이어서 하고 제출하기" : "답 고쳐서 다시 제출하기") : "답 제출하기";
  $("btnPeek").classList.toggle("hidden", q.kind === "scale");
  S.handle = renderInput($("qInput"), q, {
    prev: S.mine[q.id], config: S.config, mine: mineByKind(), teamId: S.me.teamId, round: S.team?.round || 0,
    autoSubmit: () => submit(),
    // 미션 해결로 치지 않고 답만 중간 저장 (펜토미노: 퍼즐 하나씩 완성할 때)
    saveDraft: (data) => setDoc(doc(db, C.answers, `${S.me.teamId}_${q.id}`), {
      teamId: S.me.teamId, session: S.me.session, qid: q.id, label: S.team.label, kind: q.kind, data, updatedAt: serverTimestamp()
    })
  });
  if (q.kind === "pento") $("btnSubmit").textContent = "미션 통과하기";
  renderProgress();
  // 관리자 진행 현황에 "지금 보고 있는 미션" 알려 주기
  if (S.team?.current !== q.id) {
    updateDoc(doc(db, C.teams, S.me.teamId), { current: q.id, updatedAt: serverTimestamp() }).catch(() => {});
  }
}

let busy = false;
async function submit(opts = {}) {
  if (busy) return;
  const q = qs()[S.idx];
  // 일단 제출: 다 못 했어도 지금까지 한 것만 저장하고 다음 미션을 열어요
  const partial = !!opts.partial && S.handle.draft;
  const r = partial ? { ok: true, data: { ...S.handle.draft(), partial: true }, priv: S.handle.draftPriv?.() || undefined } : S.handle.collect();
  $("qErr").textContent = "";
  if (!r.ok) {
    $("qErr").innerHTML = `${esc(r.msg)}${S.handle.draft && r.msg ? `<div class="partial-box">시간이 모자라거나 잘 모르겠으면 지금까지 한 것만 <b>일단 제출</b>하고 다음 미션으로 갈 수 있어요. 나중에 돌아와서 이어서 할 수 있어요.
      <button type="button" class="btn orange small" data-partial>📝 일단 제출하기</button></div>` : ""}`;
    $("qErr").querySelector("[data-partial]")?.addEventListener("click", () => submit({ partial: true }));
    $("qErr").scrollIntoView({ block: "center", behavior: "smooth" });
    return;
  }
  busy = true;
  const btn = $("btnSubmit");
  btn.disabled = true; btn.textContent = "저장하는 중…";
  try {
    const id = `${S.me.teamId}_${q.id}`;
    const base = { teamId: S.me.teamId, session: S.me.session, qid: q.id, label: S.team.label, updatedAt: serverTimestamp() };
    if (r.priv) await setDoc(doc(db, C.priv, id), { ...base, ...r.priv });
    await setDoc(doc(db, C.answers, id), { ...base, kind: q.kind, data: r.data });
    const l = qs();
    await updateDoc(doc(db, C.teams, S.me.teamId), {
      [`solved.${q.id}`]: partial ? "partial" : true, current: (l[S.idx + 1] || q).id, updatedAt: serverTimestamp()
    });
    S.mine[q.id] = r.data;
    S.team.solved = { ...(S.team.solved || {}), [q.id]: partial ? "partial" : true };
    renderProgress();
    $("qSolved").innerHTML = solvedTag(q);
    const last = S.idx >= l.length - 1;
    $("qDone").innerHTML = `<div class="card" style="background:#eef1fb;margin:0;text-align:center">
        <b style="font-size:18px">${partial ? "📝 일단 제출했어요!" : "✅ 제출했어요!"}</b><div class="muted">${partial ? "나중에 이 미션으로 돌아와서 이어서 할 수 있어요." : "다른 가족은 어떻게 답했을까요?"}</div>
        <div class="row" style="margin-top:10px">
          ${q.kind === "scale" ? "" : `<button type="button" class="btn ghost grow" data-peek>발자취 보기</button>`}
          <button type="button" class="btn grow" data-next>${last ? "🏆 완주!" : "다음 미션 ▶"}</button></div></div>`;
    $("qDone").classList.remove("hidden");
    $("qDone").querySelector("[data-peek]")?.addEventListener("click", () => openPeek(q));
    $("qDone").querySelector("[data-next]").onclick = goNext;
    $("qDone").scrollIntoView({ block: "center", behavior: "smooth" });
    btn.textContent = q.kind === "pento" ? "미션 통과하기" : partial ? "이어서 하고 제출하기" : "답 고쳐서 다시 제출하기";
  } catch (e) {
    console.error(e);
    $("qErr").textContent = "저장하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.";
    btn.textContent = "답 제출하기";
  } finally { busy = false; btn.disabled = false; }
}
$("btnSubmit").onclick = () => submit();

function goNext() {
  const l = qs();
  if (S.idx >= l.length - 1) { allDone() ? showDone() : openMission(firstOpen()); return; }
  openMission(S.idx + 1);
}
$("btnNext").onclick = goNext;
$("btnPrev").onclick = () => openMission(S.idx - 1);
$("btnPeek").onclick = () => openPeek(qs()[S.idx]);
$("btnList").onclick = showList;
$("btnNavList").onclick = showList;
$("btnBackList").onclick = showList;
$("btnLogout").onclick = () => { if (confirm("로그아웃할까요? 지금까지 낸 답은 그대로 남아 있어요.")) logout(); };

/* ── 미션 목록 ── */
function showList() { show("list"); renderList(); }
function renderList() {
  const l = qs(), open = firstOpen();
  let lastPlace = "";
  $("mList").innerHTML = l.map((q, i) => {
    const ok = solved(q), locked = i > open, cur = i === open;
    const pk = qPlace(q), pl = PLACES[pk];
    let head = "";
    if (pk !== lastPlace) {
      lastPlace = pk;
      const inPl = l.filter((x) => qPlace(x) === pk);
      head = `<div class="place-h"><span class="pn" style="background:${pl.color}">${pl.no}</span>${esc(pl.name)}<small>${inPl.filter(solved).length} / ${inPl.length}</small></div>`;
    }
    return `${head}<button type="button" class="mitem ${locked ? "locked" : ""} ${cur ? "current" : ""}" data-i="${i}">
      <span class="ic">${qIcon(q)}</span>
      <span class="t">${esc(qTitle(q))}<small>${qCode(q) ? `<span class="code">활동 ${esc(qCode(q))}</span>` : ""}미션 ${i + 1}${cur ? " · 지금 풀 차례" : ""}</small></span>
      <span class="st">${ok ? (isPartial(q) ? "📝" : "✅") : locked ? "🔒" : "▶"}</span></button>`;
  }).join("") + (allDone() ? `<button type="button" class="mitem current" data-done style="margin-top:14px"><span class="ic">🏆</span><span class="t">완주 · 데이터 맵과 수료증</span><span class="st">🎓</span></button>` : "");
  $("mList").querySelectorAll("[data-i]").forEach((b) => b.onclick = () => {
    const i = Number(b.dataset.i);
    if (i > firstOpen()) { toast("앞 미션을 먼저 해결해야 열려요 🔒"); return; }
    openMission(i);
  });
  $("mList").querySelector("[data-done]")?.addEventListener("click", showDone);
}

/* ── 팀별 발자취 ── */
function openPeek(q) {
  closePeek();
  const bg = document.createElement("div");
  bg.className = "sheet-bg";
  bg.innerHTML = `<div class="sheet"><div class="sheet-head"><h3>${esc(qTitle(q))}</h3><button class="x" type="button">✕</button></div>
    <div class="peek-sub">${SESSIONS[S.me.session]} 팀별 발자취예요. 실시간으로 바뀌어요!</div><div class="pk"><div class="loading"><div class="spin"></div></div></div></div>`;
  document.body.appendChild(bg);
  document.body.style.overflow = "hidden";
  history.pushState({ mt: "sheet" }, "");   // 휴대폰 뒤로 가기 → 창만 닫기
  bg.querySelector(".x").onclick = closePeek;
  bg.addEventListener("click", (e) => { if (e.target === bg) closePeek(); });
  const box = bg.querySelector(".pk");
  let list = [], times = [];
  const draw = () => renderPeek(box, q, list, { myTeamId: S.me.teamId, config: S.config, times });
  S.peekUnsub.push(onSnapshot(
    query(collection(db, C.answers), where("session", "==", S.me.session), where("qid", "==", q.id)),
    (snap) => { list = snap.docs.map((d) => d.data()); draw(); },
    (e) => { console.warn(e); box.innerHTML = `<div class="empty">팀별 발자취를 불러오지 못했어요.</div>`; }
  ));
  if (q.kind === "pento" && S.config.pentoTimePublic) {
    S.peekUnsub.push(onSnapshot(
      query(collection(db, C.priv), where("session", "==", S.me.session), where("kind", "==", "pentoTime")),
      (snap) => { times = snap.docs.map((d) => d.data()); draw(); },
      () => {}
    ));
  }
}
function closePeek(fromBack = false) {
  S.peekUnsub.forEach((u) => u()); S.peekUnsub = [];
  const open = document.querySelector(".sheet-bg");
  open?.remove();
  document.body.style.overflow = "";
  if (open && !fromBack && history.state?.mt === "sheet") history.back();
}

/* ── 휴대폰에 맞춘 동작 ── */
// 뒤로 가기: 크게 보기 사진 → 팀별 발자취 창 → 미션에서 목록으로. 앱 밖으로 바로 나가지 않게 해요.
history.replaceState({ mt: "base" }, "");
history.pushState({ mt: "app" }, "");
window.addEventListener("popstate", () => {
  const zoom = document.querySelector(".zoom");
  if (zoom) { zoom.remove(); history.pushState({ mt: "sheet" }, ""); return; }
  if (document.querySelector(".sheet-bg")) { closePeek(true); return; }
  if (S.me && (S.view === "mission" || S.view === "done")) { showList(); return; }
  // 목록·로그인 화면에서는 한 번 더 누르면 앱에서 나가요
  toast("한 번 더 누르면 앱에서 나가요");
});
// 키보드가 올라오면 아래 버튼 줄을 숨겨 입력 칸을 가리지 않게
document.addEventListener("focusin", (e) => {
  if (e.target.matches("input:not([type=checkbox]):not([type=file]):not([type=range]), textarea, select")) document.body.classList.add("kb-open");
});
document.addEventListener("focusout", () => setTimeout(() => {
  if (!document.activeElement?.matches?.("input, textarea, select")) document.body.classList.remove("kb-open");
}, 120));
// 로그인: 이름 칸에서 「다음」 → 비밀번호 칸으로
$("inpName").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("inpPw").focus(); } });

/* ── 완주 · 수료증 ── */
let certCanvas = null, certTimer = null;
async function showDone() {
  show("done");
  makeDataMap();
  await makeCert();
}

/* ── 데이터 맵 5장면 ── */
let dmCanvases = [], dmIdx = 0;
async function makeDataMap() {
  const box = $("dmBox");
  box.innerHTML = `<div class="loading"><div class="spin"></div>데이터 맵을 만들고 있어요…</div>`;
  const qsAll = withDefaults(S.config).questions.filter((q) => STAR_KINDS.includes(q.kind));
  const teams = {};
  try {
    const snaps = await Promise.all(qsAll.map((q) => getDocs(query(collection(db, C.answers), where("session", "==", S.me.session), where("qid", "==", q.id)))));
    snaps.forEach((sn, i) => sn.forEach((d) => { const x = d.data(); (teams[x.teamId] = teams[x.teamId] || {})[qsAll[i].kind] = x.data; }));
  } catch (e) { console.warn(e); }
  const m = mineByKind();
  teams[S.me.teamId] = { ...(teams[S.me.teamId] || {}), ...m };
  const all = Object.values(teams).map(starValues);
  const { y, m: mo, d } = todayKR();
  dmCanvases = await drawDataMap({
    who: { school: S.me.school, name: S.me.name, date: `${y}. ${mo}. ${d}.` },
    sessName: SESSIONS[S.me.session], m, all
  });
  $("dmTabs").innerHTML = SCENE_NAMES.map((s, i) => `<button type="button" data-i="${i}"><small>${i + 1}</small>${s}</button>`).join("");
  $("dmTabs").querySelectorAll("button").forEach((b) => b.onclick = () => showScene(Number(b.dataset.i)));
  showScene(dmIdx);
}
function showScene(i) {
  dmIdx = i;
  $("dmTabs").querySelectorAll("button").forEach((b) => b.classList.toggle("on", Number(b.dataset.i) === i));
  $("dmBox").innerHTML = `<img class="cert-img" src="${dmCanvases[i].toDataURL("image/png")}" alt="데이터 맵 ${i + 1}장면">`;
}
const dmName = (i) => `AI투어_데이터맵_${i + 1}_${SCENE_NAMES[i]}_${S.me.name}.png`;
async function downloadCanvas(cv, name) {
  const blob = await canvasToPng(cv);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
$("btnDmSave").onclick = async () => {
  if (!dmCanvases[dmIdx]) return;
  await downloadCanvas(dmCanvases[dmIdx], dmName(dmIdx));
  toast(`${dmIdx + 1}번째 장면 「${SCENE_NAMES[dmIdx]}」을 저장했어요!`);
};
$("btnDmAll").onclick = async () => {
  if (dmCanvases.length < 5) return;
  // 휴대폰: 공유 창으로 5장을 한 번에 (「이미지 저장」을 고르면 사진첩에 들어가요)
  if (navigator.canShare) {
    try {
      const files = await Promise.all(dmCanvases.map(async (cv, i) => new File([await canvasToPng(cv)], dmName(i), { type: "image/png" })));
      if (navigator.canShare({ files })) { await navigator.share({ files, title: "우리가족 AI투어 데이터 맵" }); return; }
    } catch (e) { if (e?.name === "AbortError") return; }
  }
  for (let i = 0; i < dmCanvases.length; i++) { await downloadCanvas(dmCanvases[i], dmName(i)); await new Promise((r) => setTimeout(r, 450)); }
  toast("5장을 모두 저장했어요! 사진첩이나 다운로드 폴더를 확인해 주세요.");
};
async function makeCert() {
  const { y, m, d } = todayKR();
  certCanvas = await drawCertificate({
    school: S.me.school, name: S.me.name, guardian: $("inpGuardian").value.trim(),
    y, m, d
  });
  const url = certCanvas.toDataURL("image/png");
  $("certBox").innerHTML = `<img class="cert-img" src="${url}" alt="수료증">`;
  const canShare = !!(navigator.canShare && navigator.share);
  $("btnCertShare").classList.toggle("hidden", !canShare);
}
$("inpGuardian").addEventListener("input", () => { clearTimeout(certTimer); certTimer = setTimeout(makeCert, 500); });
const certName = () => `AI수학투어_수료증_${S.me.name}.png`;
$("btnCertSave").onclick = async () => {
  if (!certCanvas) return;
  const blob = await canvasToPng(certCanvas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = certName();
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  toast("수료증을 저장했어요! 사진첩이나 다운로드 폴더를 확인해 주세요.");
};
$("btnCertShare").onclick = async () => {
  if (!certCanvas) return;
  const blob = await canvasToPng(certCanvas);
  const file = new File([blob], certName(), { type: "image/png" });
  try {
    if (navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: "AI수학투어 수료증" });
    else toast("이 기기에서는 공유할 수 없어요. 저장 버튼을 눌러 주세요.");
  } catch { /* 공유 창을 닫았을 때 */ }
};
