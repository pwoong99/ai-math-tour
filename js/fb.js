// 공통 설정 — 가족 화면(index.html)과 관리자 화면(admin.html)이 함께 씁니다.
// Firebase 프로젝트: webapp-hub (웹앱 모음 페이지와 함께 쓰고, 컬렉션 이름은 mathTour_ 로 시작해요)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD4CIUitbAtrNVc9rwnojFrTPlljwzp1l4",
  authDomain: "webapp-hub-64b0d.firebaseapp.com",
  projectId: "webapp-hub-64b0d",
  storageBucket: "webapp-hub-64b0d.firebasestorage.app",
  messagingSenderId: "114748294567",
  appId: "1:114748294567:web:306ff643b1c06c282fe282"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// 관리자 계정 (firestore.rules에도 같은 주소가 들어 있어요)
export const ADMIN_EMAIL = "pwoong99@gmail.com";

// 컬렉션 이름
export const C = {
  config: "mathTour_config",          // main 문서 하나: 문제 목록·순서·설정
  schools: "mathTour_schools",        // am / pm 문서: 로그인 화면의 학교 목록
  logins: "mathTour_logins",          // 로그인 열쇠(학교·이름·비밀번호를 섞은 값) → 팀
  sessions: "mathTour_sessions",      // 접속한 기기 → 팀 연결
  teams: "mathTour_teams",            // 공개 정보: 팀 이름(A팀…)·진행 상황
  teamsPrivate: "mathTour_teamsPrivate", // 관리자만: 학교·학생 이름·비밀번호
  answers: "mathTour_answers",        // 팀별 답 (엿보기에 쓰임)
  priv: "mathTour_private"            // 관리자만: 만족도·펜토미노 걸린 시간
};

export const SESSIONS = { am: "오전팀", pm: "오후팀" };
export const CENTER = "순천수학교육체험센터";
export const EVENT_TITLE = "2026. 가족과 함께하는 AI수학투어";

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

export const normName = (s) => String(s || "").replace(/\s+/g, "");
export const normSchool = (s) => String(s || "").trim().replace(/\s+/g, " ");

// 로그인 열쇠: 오전/오후 + 학교 + 이름 + 비밀번호를 섞어서 만든 값 (원래 값은 거꾸로 알아낼 수 없어요)
export async function loginKey(session, school, name, pw) {
  const text = `mt1|${session}|${normSchool(school)}|${normName(name)}|${String(pw)}`;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 비밀번호 규칙: 숫자 4자리, 0으로 시작하면 안 됨
export function checkPw(pw) {
  const s = String(pw ?? "").trim();
  if (!/^\d{4}$/.test(s)) return "비밀번호는 숫자 4자리로 입력해 주세요.";
  if (s[0] === "0") return "0으로 시작하는 비밀번호는 쓸 수 없어요. 숫자로 저장할 때 맨 앞의 0이 사라져(예: 0123 → 123) 로그인할 수 없게 되기 때문이에요. 1~9로 시작하는 번호를 써 주세요.";
  return "";
}

// 0, 1, 2 … → A, B, … Z, AA, AB …
export function labelOf(i) {
  let s = "";
  i = Number(i) + 1;
  while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
  return s + "팀";
}

export function todayKR() {
  const d = new Date(Date.now() + 9 * 3600e3);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

export function toast(msg, ms = 2200) {
  let el = document.getElementById("toast");
  if (!el) { el = document.createElement("div"); el.id = "toast"; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), ms);
}

// 사진 파일 → 긴 변 max 픽셀의 JPEG (Firestore에 바로 저장할 수 있는 크기로 줄여요)
export function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

export async function fileToJpeg(file, max = 900, quality = 0.72) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement("canvas");
    cv.width = Math.round(img.naturalWidth * s);
    cv.height = Math.round(img.naturalHeight * s);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
