// 관리자 화면: 팀 관리 · 진행 현황 · 문제 설정 · 결과
import {
  doc, getDoc, getDocs, setDoc, updateDoc, writeBatch, onSnapshot,
  collection, query, where, serverTimestamp, deleteField
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { db, auth, C, ADMIN_EMAIL, SESSIONS, esc, loginKey, checkPw, normName, normSchool, labelOf, toast } from "./fb.js?v=2.32";
import { withDefaults, DEFAULT_CONFIG, BUILTIN, CUSTOM_KINDS, isBuiltin, qTitle, qDesc, qIcon, pentoSettings, pentoSolved } from "./questions.js?v=2.32";
import { PUZZLES } from "./puzzles.js?v=2.32";
import { miniGrid } from "./widgets.js?v=2.32";
import { renderPeek } from "./peek.js?v=2.32";
import { drawRoster, savePng } from "./cert.js?v=2.32";

const $ = (id) => document.getElementById(id);
const A = {
  session: localStorage.getItem("mt_admin_session") || "am",
  tab: "teams", config: withDefaults(null), teams: [], priv: {}, unsub: [], qDraft: null
};

/* ── 로그인 ── */
onAuthStateChanged(auth, async (u) => {
  const ok = u && !u.isAnonymous && u.email === ADMIN_EMAIL;
  $("a-login").classList.toggle("hidden", ok);
  $("a-main").classList.toggle("hidden", !ok);
  $("btnOut").classList.toggle("hidden", !ok);
  if (u && !ok && !u.isAnonymous) { $("aErr").textContent = "관리자 계정이 아니에요."; await signOut(auth); }
  if (ok) start();
});
$("aLogin").onclick = async () => {
  $("aErr").textContent = "";
  try { await signInWithEmailAndPassword(auth, $("aEmail").value.trim(), $("aPw").value); }
  catch (e) { console.warn(e); $("aErr").textContent = "이메일 또는 비밀번호가 맞지 않아요."; }
};
$("aGoogle").onclick = async () => {
  $("aErr").textContent = "";
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch (e) { console.warn(e); $("aErr").textContent = "Google 로그인을 하지 못했어요."; }
};
$("aPw").addEventListener("keydown", (e) => { if (e.key === "Enter") $("aLogin").click(); });
$("btnOut").onclick = () => signOut(auth);

let started = false;
async function start() {
  if (started) return;
  started = true;
  // 설정 문서가 없으면 기본값으로 만들기
  const cs = await getDoc(doc(db, C.config, "main"));
  if (!cs.exists()) await setDoc(doc(db, C.config, "main"), DEFAULT_CONFIG);
  onSnapshot(doc(db, C.config, "main"), (snap) => {
    A.config = withDefaults(snap.data());
    if (!A.qDraft) A.qDraft = JSON.parse(JSON.stringify(A.config.questions));
    if (A.tab === "questions") renderQuestions(false);
    if (A.tab === "progress") renderProgress();
  });
  // 팀 관리·진행 현황·팀별 발자취 탭 위쪽의 시간대 선택 (세 탭이 같은 시간대를 함께 써요)
  document.querySelectorAll(".sessPick button").forEach((b) => b.onclick = () => { if (b.dataset.s !== A.session) setSession(b.dataset.s); });
  $("tabs").querySelectorAll("button").forEach((b) => b.onclick = () => setTab(b.dataset.t));
  setSession(A.session);
  setTab("teams");
}

function setSession(s) {
  if (s !== A.session && A.edits && Object.keys(A.edits).length && !confirm("저장하지 않은 팀 정보 수정이 있어요. 시간대를 바꾸면 사라져요. 바꿀까요?")) {
    document.querySelectorAll(".sessPick button").forEach((b) => b.classList.toggle("on", b.dataset.s === A.session));
    return;
  }
  if (A.edits) { A.edits = {}; A.checked = new Set(); }
  A.session = s;
  localStorage.setItem("mt_admin_session", s);
  $("teamSess").textContent = `· ${SESSIONS[s]}`;
  document.querySelectorAll(".sessPick button").forEach((b) => b.classList.toggle("on", b.dataset.s === s));
  A.unsub.forEach((u) => u()); A.unsub = [];
  A.teams = []; A.priv = {};
  A.unsub.push(onSnapshot(query(collection(db, C.teams), where("session", "==", s)), (snap) => {
    A.teams = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.labelIndex - b.labelIndex);
    renderTeams(); if (A.tab === "progress") renderProgress();
  }));
  A.unsub.push(onSnapshot(query(collection(db, C.teamsPrivate), where("session", "==", s)), (snap) => {
    A.priv = {}; snap.forEach((d) => A.priv[d.id] = d.data());
    renderTeams(); if (A.tab === "progress") renderProgress();
  }));
  if (A.tab === "peek") openAdminPeek();
}
function setTab(t) {
  A.tab = t;
  $("tabs").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.t === t));
  ["teams", "progress", "peek", "questions", "results"].forEach((n) => $("t-" + n).classList.toggle("hidden", n !== t));
  if (t === "progress") renderProgress();
  if (t === "peek") openAdminPeek(); else closeAdminPeek();
  if (t === "questions") { A.qDraft = JSON.parse(JSON.stringify(A.config.questions)); renderQuestions(true); }
}

/* ── 팀 관리 ── */
const fullTeams = () => A.teams.map((t) => ({ ...t, ...(A.priv[t.id] || {}), label: t.label }));
function randomPw(except = new Set()) {
  const used = new Set([...Object.values(A.priv).map((p) => String(p.pw)), ...except]);
  for (let i = 0; i < 5000; i++) {
    const v = String(1000 + Math.floor(Math.random() * 9000));
    if (!used.has(v)) return v;
  }
  return String(1000 + Math.floor(Math.random() * 9000));
}
async function updateSchools() {
  const list = [...new Set(Object.values(A.priv).filter((p) => p.session === A.session).map((p) => p.school))].sort((a, b) => a.localeCompare(b, "ko"));
  await setDoc(doc(db, C.schools, A.session), { list });
}
async function refreshPriv() {
  const snap = await getDocs(query(collection(db, C.teamsPrivate), where("session", "==", A.session)));
  A.priv = {}; snap.forEach((d) => A.priv[d.id] = d.data());
}

async function addTeam(school, name, pw, used) {
  school = normSchool(school); name = normName(name); pw = String(pw || "").trim();
  if (!school || !name) throw new Error("학교와 이름을 모두 써 주세요.");
  const pe = checkPw(pw); if (pe) throw new Error(pe);
  const dup = Object.values(A.priv).find((p) => p.school === school && p.name === name);
  if (dup) throw new Error(`${school} ${name} 학생은 이미 ${dup.label}으로 등록돼 있어요.`);
  const idx = Math.max(-1, ...A.teams.map((t) => t.labelIndex), ...(used?.idx || [])) + 1;
  const label = labelOf(idx);
  const ref = doc(collection(db, C.teams));
  const key = await loginKey(A.session, school, name, Number(pw));
  const b = writeBatch(db);
  b.set(ref, { session: A.session, label, labelIndex: idx, solved: {}, current: "", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  b.set(doc(db, C.teamsPrivate, ref.id), { session: A.session, label, school, name, pw: Number(pw), key });
  b.set(doc(db, C.logins, key), { teamId: ref.id, session: A.session });
  await b.commit();
  // 바로 다음 추가에도 반영되도록 로컬 목록에 넣어 두기
  A.priv[ref.id] = { session: A.session, label, school, name, pw: Number(pw), key };
  A.teams.push({ id: ref.id, session: A.session, label, labelIndex: idx, solved: {} });
  return label;
}

$("nRand").onclick = () => $("nPw").value = randomPw();
$("nPw").addEventListener("input", (e) => e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4));
$("nAdd").onclick = async () => {
  $("nErr").textContent = "";
  try {
    const label = await addTeam($("nSchool").value, $("nName").value, $("nPw").value);
    await updateSchools();
    toast(`${SESSIONS[A.session]}에 ${label}을 추가했어요.`);
    $("nName").value = ""; $("nPw").value = "";
  } catch (e) { $("nErr").textContent = e.message || "추가하지 못했어요."; }
};
$("bAdd").onclick = async () => {
  const lines = $("bulk").value.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return;
  $("bErr").textContent = "";
  $("bAdd").disabled = true;
  const errs = []; let n = 0; const fresh = new Set();
  for (const ln of lines) {
    const parts = ln.split(/\t|,/).map((s) => s.trim());
    const [school, name] = parts;
    let pw = parts[2] || "";
    if (!pw) { pw = randomPw(fresh); fresh.add(pw); }
    try { await addTeam(school, name, pw); n++; }
    catch (e) { errs.push(`「${ln}」 → ${e.message}`); }
  }
  await updateSchools();
  $("bAdd").disabled = false;
  $("bErr").textContent = errs.join("\n");
  if (n) { toast(`${SESSIONS[A.session]}에 ${n}팀을 추가했어요.`); if (!errs.length) $("bulk").value = ""; }
};

// 등록된 팀 표: 고친 내용(A.edits)과 체크한 팀(A.checked)은 실시간 갱신에도 그대로 남아요
A.edits = {}; A.checked = new Set();
function teamVal(t, f) { return A.edits[t.id]?.[f] ?? String(f === "pw" ? (t.pw ?? "") : (t[f] || "")); }
function renderTeams() {
  const list = fullTeams();
  const ids = new Set(list.map((t) => t.id));
  Object.keys(A.edits).forEach((id) => { if (!ids.has(id)) delete A.edits[id]; });
  [...A.checked].forEach((id) => { if (!ids.has(id)) A.checked.delete(id); });
  $("teamCount").textContent = `(${list.length}팀)`;
  $("schoolList").innerHTML = [...new Set(list.map((t) => t.school).filter(Boolean))].map((s) => `<option value="${esc(s)}">`).join("");
  const allOn = list.length && list.every((t) => A.checked.has(t.id));
  $("teamTbl").innerHTML = `<thead><tr><th class="c"><input type="checkbox" id="tAll" ${allOn ? "checked" : ""} aria-label="모두 선택"></th><th>팀</th><th>학교</th><th>학생 이름</th><th class="c">비밀번호</th></tr></thead>
    <tbody>${list.map((t) => {
      const e = A.edits[t.id] || {};
      const cell = (f, extra = "") => `<input class="inp ${e[f] != null ? "dirty" : ""}" data-f="${f}" value="${esc(teamVal(t, f))}" ${extra}>`;
      return `<tr data-id="${t.id}" class="${A.checked.has(t.id) ? "sel" : ""}">
        <td class="c"><input type="checkbox" class="tChk" ${A.checked.has(t.id) ? "checked" : ""} aria-label="${esc(t.label)} 선택"></td>
        <td><b>${esc(t.label)}</b></td>
        <td>${cell("school")}</td>
        <td>${cell("name")}</td>
        <td class="c">${cell("pw", 'inputmode="numeric" maxlength="4" style="text-align:center;font-weight:800"')}</td></tr>`;
    }).join("") || `<tr><td colspan="5" class="c muted" style="padding:24px">아직 등록된 팀이 없어요.</td></tr>`}</tbody>`;
  $("teamTbl").querySelectorAll("tr[data-id]").forEach((tr) => {
    const id = tr.dataset.id, t = list.find((x) => x.id === id);
    tr.querySelectorAll("input[data-f]").forEach((inp) => inp.oninput = () => {
      const f = inp.dataset.f;
      if (f === "pw") inp.value = inp.value.replace(/\D/g, "").slice(0, 4);
      const orig = String(f === "pw" ? (t.pw ?? "") : (t[f] || ""));
      A.edits[id] = A.edits[id] || {};
      if (inp.value === orig) delete A.edits[id][f]; else A.edits[id][f] = inp.value;
      if (!Object.keys(A.edits[id]).length) delete A.edits[id];
      inp.classList.toggle("dirty", inp.value !== orig);
      teamTools();
    });
    tr.querySelector(".tChk").onchange = (ev) => {
      ev.target.checked ? A.checked.add(id) : A.checked.delete(id);
      tr.classList.toggle("sel", ev.target.checked);
      $("tAll").checked = list.length && list.every((x) => A.checked.has(x.id));
      teamTools();
    };
  });
  $("tAll").onchange = (ev) => { list.forEach((t) => ev.target.checked ? A.checked.add(t.id) : A.checked.delete(t.id)); renderTeams(); };
  teamTools();
}
function teamTools() {
  const n = Object.keys(A.edits).length, c = A.checked.size;
  $("tSave").disabled = !n; $("tSave").textContent = n ? `💾 바뀐 내용 모두 저장 (${n}팀)` : "💾 바뀐 내용 모두 저장";
  $("tDel").disabled = !c; $("tDel").textContent = c ? `🗑 선택한 팀 삭제 (${c}팀)` : "🗑 선택한 팀 삭제";
  $("tRand").disabled = !c;
}

// 선택한 팀 비밀번호 새로 만들기 (저장 버튼을 눌러야 반영돼요)
$("tRand").onclick = () => {
  const used = new Set();
  fullTeams().filter((t) => A.checked.has(t.id)).forEach((t) => {
    const pw = randomPw(used); used.add(pw);
    A.edits[t.id] = { ...(A.edits[t.id] || {}), pw };
  });
  renderTeams();
  toast("새 비밀번호를 넣었어요. 「바뀐 내용 모두 저장」을 눌러야 반영돼요.");
};

// 바뀐 내용 모두 저장
$("tSave").onclick = async () => {
  const list = fullTeams();
  const rows = Object.keys(A.edits).map((id) => {
    const t = list.find((x) => x.id === id), p = A.priv[id];
    return { id, t, p, school: normSchool(teamVal(t, "school")), name: normName(teamVal(t, "name")), pw: teamVal(t, "pw").trim() };
  }).filter((r) => r.t && r.p);
  // 검사
  for (const r of rows) {
    if (!r.school || !r.name) return alert(`${r.t.label}: 학교와 이름을 모두 써 주세요.`);
    const pe = checkPw(r.pw); if (pe) return alert(`${r.t.label}: ${pe}`);
  }
  const finalOf = (id) => { const r = rows.find((x) => x.id === id); return r ? r : { school: A.priv[id]?.school, name: A.priv[id]?.name }; };
  for (const r of rows) {
    const dup = Object.keys(A.priv).find((k) => k !== r.id && finalOf(k).school === r.school && finalOf(k).name === r.name);
    if (dup) return alert(`${r.school} ${r.name} 학생이 ${r.t.label}과 ${A.priv[dup].label}에 함께 있어요. 한 팀만 남겨 주세요.`);
  }
  $("tSave").disabled = true;
  try {
    const b = writeBatch(db);
    let keyChanged = 0;
    for (const r of rows) {
      const key = await loginKey(A.session, r.school, r.name, Number(r.pw));
      if (key !== r.p.key) {
        keyChanged++;
        b.delete(doc(db, C.logins, r.p.key));
        b.set(doc(db, C.logins, key), { teamId: r.id, session: A.session });
      }
      b.set(doc(db, C.teamsPrivate, r.id), { ...r.p, school: r.school, name: r.name, pw: Number(r.pw), key });
    }
    await b.commit();
    A.edits = {};
    await refreshPriv(); await updateSchools();
    renderTeams();
    toast(`${rows.length}팀을 저장했어요.${keyChanged ? " (이미 접속한 기기는 그대로 쓸 수 있어요)" : ""}`);
  } catch (e) { console.error(e); alert("저장하지 못했어요. 다시 눌러 주세요."); teamTools(); }
};

// 선택한 팀 삭제
$("tDel").onclick = async () => {
  const sel = fullTeams().filter((t) => A.checked.has(t.id));
  if (!sel.length) return;
  if (!confirm(`아래 ${sel.length}팀을 지울까요? 이 팀들이 낸 답도 함께 지워져요.\n\n${sel.map((t) => `${t.label} ${t.school} ${t.name}`).join("\n")}`)) return;
  $("tDel").disabled = true;
  try {
    for (const t of sel) {
      const p = A.priv[t.id];
      const b = writeBatch(db);
      b.delete(doc(db, C.teams, t.id));
      b.delete(doc(db, C.teamsPrivate, t.id));
      if (p?.key) b.delete(doc(db, C.logins, p.key));
      const [ans, pv] = await Promise.all([
        getDocs(query(collection(db, C.answers), where("teamId", "==", t.id))),
        getDocs(query(collection(db, C.priv), where("teamId", "==", t.id)))
      ]);
      ans.forEach((d) => b.delete(d.ref)); pv.forEach((d) => b.delete(d.ref));
      await b.commit();
      delete A.priv[t.id]; delete A.edits[t.id]; A.checked.delete(t.id);
    }
    await updateSchools();
    toast(`${sel.length}팀을 지웠어요.`);
  } catch (e) { console.error(e); alert("지우지 못한 팀이 있어요. 다시 눌러 주세요."); }
  renderTeams();
};

$("btnRoster").onclick = async () => {
  const list = fullTeams();
  if (!list.length) return toast("등록된 팀이 없어요.");
  const cv = await drawRoster(`${SESSIONS[A.session]} 로그인 명단 (${list.length}팀)`, list);
  await savePng(cv, `AI수학투어_${SESSIONS[A.session]}_명단.png`);
};

/* ── 진행 현황 ── */
function renderProgress() {
  const qs = A.config.questions.filter((q) => !q.hidden);
  const list = fullTeams();
  const done = list.filter((t) => qs.every((q) => t.solved?.[q.id])).length;
  const ago = (ts) => {
    if (!ts?.toMillis) return "-";
    const m = Math.round((Date.now() - ts.toMillis()) / 60000);
    return m < 1 ? "방금" : m < 60 ? `${m}분 전` : `${Math.floor(m / 60)}시간 전`;
  };
  $("pgStats").innerHTML = [[list.length + "팀", "참여 팀"], [done + "팀", "완주"], [list.length ? Math.round(list.reduce((a, t) => a + qs.filter((q) => t.solved?.[q.id]).length, 0) / list.length * 10) / 10 + "개" : "-", "팀당 평균 해결"]]
    .map(([v, t]) => `<div class="stat"><b>${v}</b><span>${t}</span></div>`).join("");
  $("pgTbl").innerHTML = `<thead><tr><th>팀</th><th>학교 · 이름</th><th>지금 미션</th><th class="c">해결</th>${qs.map((q, i) => `<th class="c" title="${esc(qTitle(q))}">${i + 1}<br>${qIcon(q)}</th>`).join("")}<th>최근</th></tr></thead>
    <tbody>${list.map((t) => {
      const curI = qs.findIndex((q) => q.id === t.current);
      const n = qs.filter((q) => t.solved?.[q.id]).length;
      return `<tr><td><b>${esc(t.label)}</b></td><td>${esc(t.school || "")} ${esc(t.name || "")}</td>
        <td>${curI >= 0 ? `${curI + 1}. ${esc(qTitle(qs[curI]))}` : n === qs.length && n ? "🏆 완주" : "-"}</td><td class="c"><b>${n}</b>/${qs.length}</td>
        ${qs.map((q) => { const ok = t.solved?.[q.id], cur = t.current === q.id; return `<td class="c ${ok ? "ok" : cur ? "cur" : ""}">${ok ? "✔" : cur ? "👉" : ""}</td>`; }).join("")}
        <td class="muted">${ago(t.updatedAt)}</td></tr>`;
    }).join("")}
    <tr style="background:#f3f0e6"><td colspan="4"><b>미션별 해결 팀 수</b></td>${qs.map((q) => `<td class="c"><b>${list.filter((t) => t.solved?.[q.id]).length}</b></td>`).join("")}<td></td></tr></tbody>`;
}
setInterval(() => { if (A.tab === "progress" && started) renderProgress(); }, 30000);

/* ── 문제 설정 ── */
function renderQuestions(fillSettings) {
  const d = A.qDraft || [];
  let no = 0;
  $("qList").innerHTML = d.map((q, i) => {
    if (!q.hidden) no++;
    return `<div class="qrow ${q.hidden ? "off" : ""}" data-i="${i}">
      <div class="no">${q.hidden ? "-" : no}</div><div style="font-size:24px">${qIcon(q)}</div>
      <div class="tt"><input data-f="title" value="${esc(qTitle(q))}">
        <textarea data-f="desc" rows="2">${esc(qDesc(q))}</textarea>
        <div class="muted" style="font-size:12px">${isBuiltin(q) ? "기본 미션" : "추가한 미션 · " + CUSTOM_KINDS[q.kind]}${q.kind === "scale" ? " · 관리자만 보는 답" : ""}</div></div>
      <div style="display:grid;gap:4px">
        <button class="btn small gray" data-a="up" type="button">↑</button>
        <button class="btn small gray" data-a="down" type="button">↓</button></div>
      <div style="display:grid;gap:4px">
        <button class="btn small ${q.hidden ? "" : "ghost"}" data-a="hide" type="button">${q.hidden ? "보이기" : "숨기기"}</button>
        ${isBuiltin(q) ? "" : `<button class="btn small red" data-a="del" type="button">삭제</button>`}</div></div>`;
  }).join("");
  $("qList").querySelectorAll(".qrow").forEach((row) => {
    const i = Number(row.dataset.i);
    row.querySelector('[data-f="title"]').oninput = (e) => d[i].title = e.target.value;
    row.querySelector('[data-f="desc"]').oninput = (e) => d[i].desc = e.target.value;
    row.querySelector('[data-a="up"]').onclick = () => { if (i > 0) { [d[i - 1], d[i]] = [d[i], d[i - 1]]; renderQuestions(false); } };
    row.querySelector('[data-a="down"]').onclick = () => { if (i < d.length - 1) { [d[i + 1], d[i]] = [d[i], d[i + 1]]; renderQuestions(false); } };
    row.querySelector('[data-a="hide"]').onclick = () => { d[i].hidden = !d[i].hidden; renderQuestions(false); };
    row.querySelector('[data-a="del"]')?.addEventListener("click", () => {
      if (confirm(`「${qTitle(d[i])}」 미션을 목록에서 지울까요? (저장해야 반영돼요)`)) { d.splice(i, 1); renderQuestions(false); }
    });
  });
  if (!fillSettings) return;
  const c = A.config;
  $("sText").value = c.cipher.text || ""; $("sKey").value = c.cipher.key ?? "?"; $("sHint").value = c.cipher.hint || "";
  $("sAns").value = c.cipher.answer || ""; $("sAnsK").value = c.cipher.answerK ?? "";
  $("sArea").value = c.quadratArea; $("sGas").value = c.gasUrl || ""; $("sTime").checked = !!c.pentoTimePublic;
  $("sTimer").checked = c.pentoTimerShow !== false;
  const ps = pentoSettings(c);
  A.pzSet = new Set(ps.list);
  $("pzNeed").value = Number(c.pentoNeed) || 3;
  document.querySelectorAll('input[name="pzMode"]').forEach((r) => r.checked = r.value === ps.mode);
  $("pzGroupNeed").value = Number(c.pentoGroupNeed) || 3;
  pzModeUi();
  renderPz(); cipherCheck();
}
$("cKind").innerHTML = Object.entries(CUSTOM_KINDS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
$("cKind").onchange = () => {
  $("cNum").classList.toggle("hidden", $("cKind").value !== "number");
  $("cOpt").classList.toggle("hidden", $("cKind").value !== "choice");
};
$("cAdd").onclick = () => {
  const kind = $("cKind").value, title = $("cTitle").value.trim();
  if (!title) return toast("제목을 써 주세요.");
  const q = { id: "c_" + Date.now().toString(36), kind, title, desc: $("cDesc").value.trim(), hidden: false };
  if (kind === "number") { q.label = $("cLabel").value.trim() || "답"; q.unit = $("cUnit").value.trim(); q.intOnly = $("cInt").checked; }
  if (kind === "choice") {
    q.options = $("cOpts").value.split("\n").map((s) => s.trim()).filter(Boolean);
    if (q.options.length < 2) return toast("고를 것을 두 개 이상 적어 주세요.");
  }
  A.qDraft.push(q);
  renderQuestions(false);
  ["cTitle", "cDesc", "cLabel", "cUnit", "cOpts"].forEach((id) => $(id).value = "");
  toast("목록에 추가했어요. 「문제 목록 저장」을 눌러야 가족 화면에 반영돼요.");
};
$("qSave").onclick = async () => {
  const clean = A.qDraft.map((q) => {
    const o = { ...q };
    // 기본 미션은 기본 제목·안내와 같으면 저장하지 않음 (나중에 기본 글이 바뀌어도 따라가도록)
    if (isBuiltin(o)) {
      if (o.title === BUILTIN[o.kind].title) delete o.title;
      if (o.desc === BUILTIN[o.kind].desc) delete o.desc;
    }
    return o;
  });
  await updateDoc(doc(db, C.config, "main"), { questions: clean });
  toast("문제 목록을 저장했어요.");
};

function renderPz() {
  $("pzCnt").textContent = A.pzSet.size;
  $("pzPick").innerHTML = PUZZLES.map((p, i) => `<button type="button" data-i="${i}" class="${A.pzSet.has(i) ? "on" : ""}">
    <div style="display:flex;justify-content:center;height:96px;align-items:center">${miniGrid(p.rows, 10)}</div>
    ${esc(p.level)}<br>${esc(p.name)}<div class="muted" style="font-size:11px">${p.pieces}</div></button>`).join("");
  $("pzPick").querySelectorAll("button").forEach((b) => b.onclick = () => {
    const i = Number(b.dataset.i);
    A.pzSet.has(i) ? A.pzSet.delete(i) : A.pzSet.add(i);
    renderPz();
  });
}
function pzModeUi() {
  const m = document.querySelector('input[name="pzMode"]:checked')?.value || "group";
  $("pzGroupBox").style.opacity = m === "group" ? 1 : .4;
  $("pzCountBox").style.opacity = m === "count" ? 1 : .4;
}
document.querySelectorAll('input[name="pzMode"]').forEach((r) => r.onchange = pzModeUi);
$("pzAll").onclick = () => { A.pzSet = new Set(PUZZLES.map((_, i) => i)); renderPz(); };
$("pzNone").onclick = () => { A.pzSet = new Set(); renderPz(); };
function cipherCheck() {
  const t = $("sText").value.toUpperCase(), a = $("sAns").value.toUpperCase().trim(), k = Number($("sAnsK").value || $("sKey").value);
  if (!t || !a || !Number.isFinite(k) || !k) { $("sCheck").textContent = ""; return; }
  const dec = t.replace(/[A-Z]/g, (ch) => String.fromCharCode((ch.charCodeAt(0) - 65 - k + 260) % 26 + 65));
  $("sCheck").innerHTML = dec.trim() === a ? `✅ 열쇠 ${k}로 풀면 정답 문장과 같아요.` : `⚠️ 열쇠 ${k}로 풀면 「${esc(dec)}」 — 정답 문장과 달라요. 확인해 주세요.`;
}
["sText", "sAns", "sAnsK", "sKey"].forEach((id) => $(id).addEventListener("input", cipherCheck));

$("sSave").onclick = async () => {
  const area = Number($("sArea").value);
  const need = Number($("pzNeed").value);
  const pzMode = document.querySelector('input[name="pzMode"]:checked')?.value || "group";
  const gNeed = Number($("pzGroupNeed").value);
  const gAvail = new Set([...A.pzSet].map((i) => (PUZZLES[i].pieces || "").length)).size;
  if (!A.pzSet.size) return toast("가족이 고를 수 있는 펜토미노 퍼즐을 하나 이상 골라 주세요.");
  if (pzMode === "count" && (!Number.isInteger(need) || need < 1 || need > A.pzSet.size)) return toast(`통과에 필요한 퍼즐 수는 1부터 ${A.pzSet.size} 사이로 써 주세요.`);
  if (pzMode === "group" && (!Number.isInteger(gNeed) || gNeed < 1 || gNeed > gAvail)) return toast(`서로 다른 조각 수는 1부터 ${gAvail} 사이로 써 주세요. (지금 고른 퍼즐의 조각 수는 ${gAvail}가지예요)`);
  if (!(area > 0)) return toast("꽃밭 넓이를 숫자로 써 주세요.");
  const key = $("sKey").value.trim();
  if (key !== "?" && !/^\d{1,2}$/.test(key)) return toast("열쇠 k는 숫자(1~25) 또는 ?로 써 주세요.");
  const gas = $("sGas").value.trim();
  if (gas && !/^https:\/\/script\.google\.com\//.test(gas)) return toast("Apps Script 웹앱 주소(https://script.google.com/…)를 넣어 주세요.");
  await updateDoc(doc(db, C.config, "main"), {
    cipher: {
      text: $("sText").value.toUpperCase().trim(), key, hint: $("sHint").value.trim(),
      answer: $("sAns").value.toUpperCase().trim(), answerK: $("sAnsK").value.trim() ? Number($("sAnsK").value) : deleteField()
    },
    quadratArea: area, gasUrl: gas, pentoPuzzles: [...A.pzSet].sort((a, b) => a - b), pentoNeed: pzMode === "count" ? need : (Number(A.config.pentoNeed) || 3), pentoMode: pzMode, pentoGroupNeed: pzMode === "group" ? gNeed : (Number(A.config.pentoGroupNeed) || 3), pentoTimePublic: $("sTime").checked, pentoTimerShow: $("sTimer").checked
  });
  toast("설정을 저장했어요.");
};
$("sGasTest").onclick = async () => {
  const u = $("sGas").value.trim();
  if (!u) return;
  $("sGasMsg").textContent = "확인 중…";
  try {
    const j = await (await fetch(u)).json();
    $("sGasMsg").textContent = j.ok ? `✅ 연결됨 (${j.model || "Gemini"}${j.hasKey ? "" : " · ⚠️ API 키가 없어요"})` : "⚠️ 응답이 이상해요";
  } catch { $("sGasMsg").textContent = "❌ 연결하지 못했어요. 배포 설정(액세스: 모든 사용자)을 확인해 주세요."; }
};

/* ── 결과 (오전·오후 함께) ── */
let allPriv = {}; // 두 시간대 학교·이름
async function loadAllPriv() {
  const snap = await getDocs(collection(db, C.teamsPrivate));
  allPriv = {}; snap.forEach((d) => allPriv[d.id] = d.data());
}
const sessName = (s) => SESSIONS[s] || s;
const bySessLabel = (a, b) => (a.session || "").localeCompare(b.session || "") || a.label.length - b.label.length || a.label.localeCompare(b.label);
$("rLoad").onclick = loadResults;
async function loadResults() {
  $("rLoad").disabled = true;
  try {
    const [snap] = await Promise.all([getDocs(collection(db, C.priv)), loadAllPriv()]);
    const rows = snap.docs.map((d) => d.data());
    const name = (r) => { const p = allPriv[r.teamId]; return p ? `${esc(p.school)} ${esc(p.name)}` : ""; };
    const avgOf = (a) => a.length ? (a.reduce((x, r) => x + r.value, 0) / a.length).toFixed(2) + "점" : "-";

    // 만족도
    const sc = rows.filter((r) => r.kind === "scale").sort(bySessLabel);
    if (!sc.length) $("rScale").innerHTML = "아직 답한 팀이 없어요.";
    else {
      const am = sc.filter((r) => r.session === "am"), pm = sc.filter((r) => r.session === "pm");
      const dist = (list) => [1, 2, 3, 4, 5].map((v) => list.filter((r) => r.value === v).length);
      const dAll = dist(sc), dAm = dist(am), dPm = dist(pm), mx = Math.max(...dAll, 1);
      $("rScale").innerHTML = `<div class="stat-row">
          <div class="stat"><b>${avgOf(sc)}</b><span>전체 평균 · ${sc.length}팀</span></div>
          <div class="stat"><b>${avgOf(am)}</b><span>오전팀 평균 · ${am.length}팀</span></div>
          <div class="stat"><b>${avgOf(pm)}</b><span>오후팀 평균 · ${pm.length}팀</span></div></div>
        <div class="legend"><span><i style="background:var(--green)"></i>오전팀</span><span><i style="background:var(--orange)"></i>오후팀</span></div>
        ${[5, 4, 3, 2, 1].map((v) => `<div class="row" style="margin:6px 0"><b style="width:40px">${v}점</b>
          <div class="grow" style="background:#eeede8;border-radius:99px;height:16px;display:flex;overflow:hidden">
            <i style="display:block;height:100%;width:${dAm[v - 1] / mx * 100}%;background:var(--green)"></i>
            <i style="display:block;height:100%;width:${dPm[v - 1] / mx * 100}%;background:var(--orange)"></i></div>
          <span style="width:110px;text-align:right" class="muted">오전 ${dAm[v - 1]} · 오후 ${dPm[v - 1]}</span></div>`).join("")}
        <div class="tbl-wrap" style="margin-top:12px;max-height:340px"><table class="t"><thead><tr><th>시간대</th><th>팀</th><th>학교 · 이름</th><th class="c">점수</th></tr></thead>
        <tbody>${sc.map((r) => `<tr><td>${sessName(r.session)}</td><td>${esc(r.label)}</td><td>${name(r)}</td><td class="c"><b>${r.value}</b></td></tr>`).join("")}</tbody></table></div>`;
    }

    // 펜토미노 시간
    const pt = rows.filter((r) => r.kind === "pentoTime").sort((a, b) => a.seconds - b.seconds);
    const f = (s) => `${Math.floor(s / 60)}분 ${String(s % 60).padStart(2, "0")}초`;
    $("rPento").innerHTML = pt.length ? `<div class="muted" style="margin-bottom:8px">${A.config.pentoTimePublic ? "🔓 가족 「팀별 발자취」에 공개 중" : "🔒 비공개 (문제 설정에서 공개할 수 있어요)"}</div>
      <div class="tbl-wrap" style="max-height:420px"><table class="t"><thead><tr><th class="c">순위</th><th>시간대</th><th>팀</th><th>학교 · 이름</th><th>완성한 퍼즐</th><th class="c">통과까지 걸린 시간</th></tr></thead>
      <tbody>${pt.map((r, i) => `<tr><td class="c">${i + 1}</td><td>${sessName(r.session)}</td><td>${esc(r.label)}</td><td>${name(r)}</td><td>${esc((r.puzzles || (r.puzzle != null ? [r.puzzle] : [])).map((i) => PUZZLES[i]?.name).filter(Boolean).join(", "))}</td><td class="c"><b>${f(r.seconds)}</b></td></tr>`).join("")}</tbody></table></div>` : "아직 완성한 팀이 없어요.";
  } finally { $("rLoad").disabled = false; }
}

function summarize(kind, d, priv) {
  if (!d) return "";
  switch (kind) {
    case "euler": return `${d.possible} / 홀수점 ${d.odd}개 / ${d.reason}`;
    case "cipher": return `${d.decoded}${d.k != null ? ` (k=${d.k})` : ""}`;
    case "latin": return `사진 있음${d.name ? " / " + d.name : ""}`;
    case "food": return `${d.value}g`;
    case "stride": return `1보 ${d.step}cm / 보폭 거리 ${d.walk}m / GPS ${d.gps}m`;
    case "quadrat": return `직접 ${d.eye} / AI ${d.aiCount}${d.aiManual ? "(직접 입력)" : ""} / 기준 ${d.basis === "ai" ? "AI" : "직접"} / 1㎡ ${d.perM2} / 전체 ${d.total}`;
    case "fibo": return `${d.plant} / ${d.petals}장`;
    case "pento": { const sv = Object.keys(pentoSolved(d)).map((i) => PUZZLES[i]?.name).filter(Boolean); return `${sv.length}개 완성 (${sv.join(", ")})${priv?.seconds != null ? ` / ${priv.seconds}초` : ""}`; }
    case "fun": return (d.picks || []).map((id) => qTitle(A.config.questions.find((q) => q.id === id) || { kind: "", title: id })).join(" · ");
    case "scale": return priv?.value != null ? `${priv.value}점` : "제출";
    case "comment": case "text": return d.text;
    case "number": return String(d.value);
    case "choice": return d.pick;
    case "photo": return "사진 있음";
    default: return JSON.stringify(d);
  }
}
$("rCsv").onclick = async () => {
  const [a, p] = await Promise.all([getDocs(collection(db, C.answers)), getDocs(collection(db, C.priv)), loadAllPriv()]);
  const pv = {}; p.forEach((d) => pv[d.id] = d.data());
  const qs = A.config.questions;
  const order = (qid) => { const i = qs.findIndex((q) => q.id === qid); return i < 0 ? 99 : i; };
  const rows = a.docs.map((d) => ({ id: d.id, ...d.data() })).sort((x, y) => bySessLabel(x, y) || order(x.qid) - order(y.qid));
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [["시간대", "팀", "학교", "학생 이름", "미션 순서", "미션", "답", "제출 시각"].map(cell).join(",")];
  rows.forEach((r) => {
    const pr = allPriv[r.teamId] || {}, q = qs.find((x) => x.id === r.qid);
    const t = r.updatedAt?.toDate ? r.updatedAt.toDate().toLocaleString("ko-KR") : "";
    lines.push([sessName(r.session), r.label, pr.school, pr.name, order(r.qid) + 1, q ? qTitle(q) : r.qid, summarize(r.kind, r.data, pv[r.id]), t].map(cell).join(","));
  });
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const el = document.createElement("a");
  el.href = url; el.download = "AI수학투어_오전오후_답.csv";
  document.body.appendChild(el); el.click(); el.remove();
  setTimeout(() => URL.revokeObjectURL(url), 20000);
};

$("rReset").onclick = async () => {
  const which = $("rResetSess").value;
  const sessions = which === "all" ? ["am", "pm"] : [which];
  const label = which === "all" ? "오전팀과 오후팀" : sessName(which);
  const typed = prompt(`${label}의 모든 답·만족도·진행 상황을 지워요.\n계속하려면 「초기화」라고 써 주세요.`);
  if (typed !== "초기화") return;
  for (const sess of sessions) {
    const [a, p, t] = await Promise.all([
      getDocs(query(collection(db, C.answers), where("session", "==", sess))),
      getDocs(query(collection(db, C.priv), where("session", "==", sess))),
      getDocs(query(collection(db, C.teams), where("session", "==", sess)))
    ]);
    const refs = [...a.docs.map((d) => d.ref), ...p.docs.map((d) => d.ref)];
    for (let i = 0; i < refs.length; i += 400) {
      const b = writeBatch(db);
      refs.slice(i, i + 400).forEach((r) => b.delete(r));
      await b.commit();
    }
    const b = writeBatch(db);
    // round를 올리면 가족 기기에 남아 있던 펜토미노 시작 시각도 새로 시작해요
    t.forEach((d) => b.update(d.ref, { solved: {}, current: "", round: (d.data().round || 0) + 1, updatedAt: serverTimestamp() }));
    await b.commit();
  }
  toast(`${label}의 답을 초기화했어요.`);
  $("rScale").textContent = $("rPento").textContent = "「결과 불러오기」를 눌러 주세요.";
};


/* ── 팀별 발자취 모아보기 (관리자) ── */
let pkUnsub = [], pkQid = null;
function closeAdminPeek() { pkUnsub.forEach((u) => u()); pkUnsub = []; }
function openAdminPeek() {
  const qs = A.config.questions.filter((q) => !q.hidden);
  if (!qs.find((q) => q.id === pkQid)) pkQid = qs[0]?.id;
  $("pkPick").innerHTML = qs.map((q, i) => `<button type="button" class="btn small ${q.id === pkQid ? "" : "gray"}" data-q="${q.id}" title="${esc(qTitle(q))}">${i + 1}. ${qIcon(q)} ${esc(qTitle(q))}</button>`).join("");
  $("pkPick").querySelectorAll("button").forEach((b) => b.onclick = () => { pkQid = b.dataset.q; openAdminPeek(); });
  closeAdminPeek();
  const q = qs.find((x) => x.id === pkQid);
  const box = $("pkBox");
  if (!q) { box.innerHTML = `<div class="empty">보이는 미션이 없어요.</div>`; return; }
  box.innerHTML = `<div class="sheet-head" style="position:static"><h3>${qs.indexOf(q) + 1}. ${esc(qTitle(q))} <span class="muted">· ${SESSIONS[A.session]}</span></h3></div><div class="pk"><div class="loading"><div class="spin"></div></div></div>`;
  const body = box.querySelector(".pk");
  let list = [], priv = [];
  const named = (a) => {
    if (!$("pkNames").checked) return a;
    const p = A.priv[a.teamId];
    // 「A팀」 대신 「신대초 김순천」처럼 보여 줘요 (학교 이름의 「초등학교」는 「초」로 줄여요)
    return p ? { ...a, label: `${p.school.replace(/초등학교$/, "초")} ${p.name}` } : a;
  };
  const draw = () => {
    if (q.kind === "scale") { drawScalePeek(body, priv.filter((r) => r.kind === "scale").map(named)); return; }
    const times = priv.filter((r) => r.kind === "pentoTime").map(named);
    renderPeek(body, q, list.map(named), { myTeamId: null, admin: true, wideNames: $("pkNames").checked, config: { ...A.config, pentoTimePublic: true }, times });
  };
  $("pkNames").onchange = draw;
  pkUnsub.push(onSnapshot(query(collection(db, C.answers), where("session", "==", A.session), where("qid", "==", q.id)),
    (snap) => { list = snap.docs.map((d) => d.data()); draw(); },
    (e) => { console.warn(e); body.innerHTML = `<div class="empty">불러오지 못했어요.</div>`; }));
  if (q.kind === "scale" || q.kind === "pento") {
    pkUnsub.push(onSnapshot(query(collection(db, C.priv), where("session", "==", A.session), where("qid", "==", q.id)),
      (snap) => { priv = snap.docs.map((d) => d.data()); draw(); }, () => {}));
  }
}
function drawScalePeek(el, rows) {
  if (!rows.length) { el.innerHTML = `<div class="empty">아직 답한 팀이 없어요.</div>`; return; }
  const avg = rows.reduce((a, r) => a + r.value, 0) / rows.length;
  const faces = ["😞", "🙁", "😐", "🙂", "😍"];
  el.innerHTML = `<div class="stat-row"><div class="stat"><b>${avg.toFixed(2)}점</b><span>평균 (5점 만점)</span></div><div class="stat"><b>${rows.length}팀</b><span>응답</span></div></div>
    <div class="chart">${[5, 4, 3, 2, 1].map((v) => {
      const items = rows.filter((r) => r.value === v);
      return `<div class="row" style="margin:8px 0;align-items:flex-start"><b style="width:70px">${faces[v - 1]} ${v}점</b>
        <div class="grow"><div style="background:#eeede8;border-radius:99px;height:20px"><i style="display:block;height:100%;width:${items.length / rows.length * 100}%;background:#c9752c;border-radius:99px"></i></div>
        <div class="tchips" style="margin-top:4px">${items.map((r) => `<span class="tchip">${esc(r.label)}</span>`).join("")}</div></div>
        <b style="width:40px;text-align:right">${items.length}</b></div>`;
    }).join("")}</div><div class="muted">🔒 만족도는 가족 「팀별 발자취」에는 나오지 않고 관리자에게만 보여요.</div>`;
}
$("pkFull").onclick = () => {
  const el = $("pkBox");
  if (document.fullscreenElement) document.exitFullscreen();
  else el.requestFullscreen?.().catch(() => toast("이 브라우저에서는 크게 보기를 할 수 없어요."));
};
