// 가족 화면: 로그인 → 미션 풀기 → 엿보기 → 완주 수료증
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { db, auth, C, SESSIONS, esc, loginKey, checkPw, normName, toast, todayKR } from "./fb.js";
import { withDefaults, visibleQs, qTitle, qDesc, qIcon } from "./questions.js";
import { renderInput } from "./inputs.js";
import { renderPeek } from "./peek.js";
import { drawCertificate, canvasToPng } from "./cert.js";

const $ = (id) => document.getElementById(id);
const LS = "mathTour_login_v1";
const S = {
  uid: null, config: withDefaults(null), me: null, team: null, mine: {},
  idx: 0, view: "", handle: null, unsub: [], peekUnsub: [], booted: false
};

/* ── 화면 바꾸기 ── */
function show(v) {
  S.view = v;
  ["loading", "login", "mission", "list", "done"].forEach((n) => $("v-" + n).classList.toggle("hidden", n !== v));
  $("navbar").classList.toggle("hidden", v !== "mission");
  const inside = !!S.me && v !== "login";
  $("teamChip").classList.toggle("hidden", !inside);
  $("btnList").classList.toggle("hidden", !inside || v === "list");
  window.scrollTo(0, 0);
}

const qs = () => visibleQs(S.config);
const solved = (q) => !!S.team?.solved?.[q.id];
const firstOpen = () => { const l = qs(); const i = l.findIndex((q) => !solved(q)); return i < 0 ? l.length : i; };
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
  $("qNum").textContent = `미션 ${i + 1}`;
  $("qTitle").textContent = `${qIcon(q)} ${qTitle(q)}`;
  $("qSolved").innerHTML = solved(q) ? `<span class="solved-tag">✔ 해결한 미션 · 답을 고쳐서 다시 낼 수 있어요</span>` : "";
  const d = qDesc(q);
  $("qDesc").innerHTML = esc(d);
  $("qDesc").classList.toggle("hidden", !d);
  $("qErr").textContent = "";
  $("qDone").classList.add("hidden");
  $("btnSubmit").classList.toggle("hidden", q.kind === "pento" && !!S.mine[q.id]);
  $("btnSubmit").textContent = solved(q) ? "답 고쳐서 다시 제출하기" : "답 제출하기";
  $("btnPeek").classList.toggle("hidden", q.kind === "scale");
  S.handle = renderInput($("qInput"), q, {
    prev: S.mine[q.id], config: S.config, teamId: S.me.teamId, round: S.team?.round || 0,
    autoSubmit: () => submit()
  });
  if (q.kind === "pento") $("btnSubmit").textContent = "완성한 판 제출하기";
  renderProgress();
  // 관리자 진행 현황에 "지금 보고 있는 미션" 알려 주기
  if (S.team?.current !== q.id) {
    updateDoc(doc(db, C.teams, S.me.teamId), { current: q.id, updatedAt: serverTimestamp() }).catch(() => {});
  }
}

let busy = false;
async function submit() {
  if (busy) return;
  const q = qs()[S.idx];
  const r = S.handle.collect();
  $("qErr").textContent = "";
  if (!r.ok) { $("qErr").textContent = r.msg; $("qErr").scrollIntoView({ block: "center", behavior: "smooth" }); return; }
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
      [`solved.${q.id}`]: true, current: (l[S.idx + 1] || q).id, updatedAt: serverTimestamp()
    });
    S.mine[q.id] = r.data;
    S.team.solved = { ...(S.team.solved || {}), [q.id]: true };
    renderProgress();
    $("qSolved").innerHTML = `<span class="solved-tag">✔ 해결한 미션 · 답을 고쳐서 다시 낼 수 있어요</span>`;
    const last = S.idx >= l.length - 1;
    $("qDone").innerHTML = `<div class="card" style="background:#e3f3ec;margin:0;text-align:center">
        <b style="font-size:18px">✅ 제출했어요!</b><div class="muted">다른 가족은 어떻게 답했을까요?</div>
        <div class="row" style="margin-top:10px">
          ${q.kind === "scale" ? "" : `<button type="button" class="btn ghost grow" data-peek>👀 엿보기</button>`}
          <button type="button" class="btn grow" data-next>${last ? "🏆 완주!" : "다음 미션 ▶"}</button></div></div>`;
    $("qDone").classList.remove("hidden");
    $("qDone").querySelector("[data-peek]")?.addEventListener("click", () => openPeek(q));
    $("qDone").querySelector("[data-next]").onclick = goNext;
    $("qDone").scrollIntoView({ block: "center", behavior: "smooth" });
    btn.textContent = "답 고쳐서 다시 제출하기";
    if (q.kind === "pento") btn.classList.add("hidden");
  } catch (e) {
    console.error(e);
    $("qErr").textContent = "저장하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.";
    btn.textContent = "답 제출하기";
  } finally { busy = false; btn.disabled = false; }
}
$("btnSubmit").onclick = submit;

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
  $("mList").innerHTML = l.map((q, i) => {
    const ok = solved(q), locked = i > open, cur = i === open;
    return `<button type="button" class="mitem ${locked ? "locked" : ""} ${cur ? "current" : ""}" data-i="${i}">
      <span class="ic">${qIcon(q)}</span>
      <span class="t">${esc(qTitle(q))}<small>미션 ${i + 1}${cur ? " · 지금 풀 차례" : ""}</small></span>
      <span class="st">${ok ? "✅" : locked ? "🔒" : "▶"}</span></button>`;
  }).join("") + (allDone() ? `<button type="button" class="mitem current" data-done><span class="ic">🏆</span><span class="t">완주 · 수료증 받기</span><span class="st">🎓</span></button>` : "");
  $("mList").querySelectorAll("[data-i]").forEach((b) => b.onclick = () => {
    const i = Number(b.dataset.i);
    if (i > firstOpen()) { toast("앞 미션을 먼저 해결해야 열려요 🔒"); return; }
    openMission(i);
  });
  $("mList").querySelector("[data-done]")?.addEventListener("click", showDone);
}

/* ── 엿보기 ── */
function openPeek(q) {
  closePeek();
  const bg = document.createElement("div");
  bg.className = "sheet-bg";
  bg.innerHTML = `<div class="sheet"><div class="sheet-head"><h3>👀 ${esc(qTitle(q))}</h3><button class="x" type="button">✕</button></div>
    <div class="peek-sub">${SESSIONS[S.me.session]} 가족들의 답이에요. 실시간으로 바뀌어요!</div><div class="pk"><div class="loading"><div class="spin"></div></div></div></div>`;
  document.body.appendChild(bg);
  document.body.style.overflow = "hidden";
  bg.querySelector(".x").onclick = closePeek;
  bg.addEventListener("click", (e) => { if (e.target === bg) closePeek(); });
  const box = bg.querySelector(".pk");
  let list = [], times = [];
  const draw = () => renderPeek(box, q, list, { myTeamId: S.me.teamId, config: S.config, times });
  S.peekUnsub.push(onSnapshot(
    query(collection(db, C.answers), where("session", "==", S.me.session), where("qid", "==", q.id)),
    (snap) => { list = snap.docs.map((d) => d.data()); draw(); },
    (e) => { console.warn(e); box.innerHTML = `<div class="empty">엿보기를 불러오지 못했어요.</div>`; }
  ));
  if (q.kind === "pento" && S.config.pentoTimePublic) {
    S.peekUnsub.push(onSnapshot(
      query(collection(db, C.priv), where("session", "==", S.me.session), where("kind", "==", "pentoTime")),
      (snap) => { times = snap.docs.map((d) => d.data()); draw(); },
      () => {}
    ));
  }
}
function closePeek() {
  S.peekUnsub.forEach((u) => u()); S.peekUnsub = [];
  document.querySelector(".sheet-bg")?.remove();
  document.body.style.overflow = "";
}

/* ── 완주 · 수료증 ── */
let certCanvas = null, certTimer = null;
async function showDone() {
  show("done");
  await makeCert();
}
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
