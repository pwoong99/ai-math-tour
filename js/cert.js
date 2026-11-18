// 사진(PNG)으로 저장하는 그림: 수료증, 관리자용 로그인 명단
import { CENTER, EVENT_TITLE } from "./fb.js?v=2.01";

const FONT = `"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;

function wrap(ctx, text, maxW) {
  const out = [];
  let line = "";
  for (const word of text.split(" ")) {
    const t = line ? line + " " + word : word;
    if (ctx.measureText(t).width <= maxW) { line = t; continue; }
    if (line) out.push(line);
    // 한 단어가 너무 길면 글자 단위로 자르기
    line = "";
    for (const ch of word) {
      if (ctx.measureText(line + ch).width > maxW) { out.push(line); line = ch; } else line += ch;
    }
  }
  if (line) out.push(line);
  return out;
}

export async function drawCertificate({ school, name, guardian = "", y, m, d }) {
  try { await document.fonts.ready; } catch { /* 글꼴 준비를 기다리지 못해도 그림은 그려요 */ }
  const W = 1240, H = 1754;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  const green = "#17795a", gold = "#c9a227", ink = "#1d2b2a";

  // 바탕
  const bg = c.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#fffdf6"); bg.addColorStop(1, "#f6f0dd");
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  // 테두리
  c.strokeStyle = green; c.lineWidth = 18; c.strokeRect(40, 40, W - 80, H - 80);
  c.strokeStyle = gold; c.lineWidth = 4; c.strokeRect(78, 78, W - 156, H - 156);
  c.strokeStyle = gold; c.lineWidth = 1.5; c.strokeRect(92, 92, W - 184, H - 184);
  // 모서리 장식 (펜토미노 조각 모양)
  const corner = (x, y, sx, sy) => {
    const cells = [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]];
    const cols = ["#f47c7c", "#f9c74f", "#2ec4b6", "#9b8afb", "#5aa9f0"];
    cells.forEach(([r, k], i) => { c.fillStyle = cols[i]; c.fillRect(x + sx * k * 26, y + sy * r * 26, sx * 22, sy * 22); });
  };
  corner(112, 112, 1, 1); corner(W - 112, 112, -1, 1); corner(112, H - 112, 1, -1); corner(W - 112, H - 112, -1, -1);

  c.textAlign = "center"; c.textBaseline = "alphabetic";
  c.fillStyle = green; c.font = `800 38px ${FONT}`;
  c.fillText(EVENT_TITLE, W / 2, 260);
  c.fillStyle = ink; c.font = `900 150px ${FONT}`;
  c.fillText("수 료 증", W / 2, 450);
  c.fillStyle = "#8a7a4a"; c.font = `600 26px ${FONT}`;
  c.fillText("AI MATH TOUR · CERTIFICATE OF COMPLETION", W / 2, 505);

  // 받는 사람
  const rows = [["소속 학교", school], ["성      명", name]];
  if (guardian) rows.push(["함께한 보호자", guardian]);
  let yy = 630;
  c.textAlign = "left";
  rows.forEach(([k, v]) => {
    c.fillStyle = "#5d6b69"; c.font = `700 38px ${FONT}`;
    c.fillText(k, 230, yy);
    c.fillStyle = ink; c.font = `900 50px ${FONT}`;
    c.fillText(v, 520, yy);
    c.strokeStyle = "#d9cfb2"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(500, yy + 20); c.lineTo(W - 230, yy + 20); c.stroke();
    yy += 92;
  });

  // 본문
  const who = guardian ? `보호자 ${guardian} 님과 함께` : "보호자와 함께";
  const body = `위 학생은 ${EVENT_TITLE}에 ${who} 참여하여, 순천만국가정원 곳곳에 숨은 수학을 탐구하고 모든 미션을 끝까지 해결하였기에 이 증서를 드립니다.`;
  c.font = `600 44px ${FONT}`; c.fillStyle = ink; c.textAlign = "center";
  const lines = wrap(c, body, W - 460);
  yy += 70;
  lines.forEach((ln) => { c.fillText(ln, W / 2, yy); yy += 70; });

  // 미션 아이콘 줄 (본문과 날짜 사이에 자리가 있을 때만)
  const iconY = Math.max(yy + 40, (yy + (H - 390)) / 2);
  if (iconY + 70 < H - 390) {
    c.font = `46px ${FONT}`;
    const icons = ["✏️", "🛸", "🐢", "🦊", "👣", "🌼", "🌻", "🧩"];
    icons.forEach((ic, i) => c.fillText(ic, W / 2 + (i - 3.5) * 84, iconY));
  }

  // 날짜·발급 (아래쪽에 고정)
  c.textAlign = "center";
  c.font = `800 46px ${FONT}`; c.fillStyle = ink;
  c.fillText(`${y}년 ${m}월 ${d}일`, W / 2, H - 390);
  c.font = `900 58px ${FONT}`; c.fillStyle = green;
  c.fillText(CENTER, W / 2, H - 295);
  c.font = `600 28px ${FONT}`; c.fillStyle = "#5d6b69";
  c.fillText("전남광주통합특별시 순천교육지원청", W / 2, H - 245);

  // 완주 배지 (오른쪽 위, 제목 옆)
  const bx = W - 250, by = 330;
  c.save();
  c.translate(bx, by); c.rotate(-0.18);
  c.beginPath(); c.arc(0, 0, 88, 0, Math.PI * 2); c.fillStyle = gold; c.fill();
  c.beginPath(); c.arc(0, 0, 74, 0, Math.PI * 2); c.strokeStyle = "#fff6d6"; c.lineWidth = 4; c.stroke();
  c.fillStyle = "#fff"; c.textAlign = "center";
  c.font = `900 28px ${FONT}`; c.fillText("미션", 0, -8);
  c.font = `900 40px ${FONT}`; c.fillText("완주!", 0, 34);
  c.restore();

  return cv;
}

export async function drawRoster(title, teams) {
  try { await document.fonts.ready; } catch { /* 계속 */ }
  const W = 1240, rowH = 66, top = 190;
  const H = top + rowH * (teams.length + 1) + 110;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  c.fillStyle = "#fff"; c.fillRect(0, 0, W, H);
  c.fillStyle = "#17795a"; c.fillRect(0, 0, W, 130);
  c.fillStyle = "#fff"; c.textAlign = "left";
  c.font = `900 46px ${FONT}`; c.fillText(title, 60, 82);
  c.font = `600 24px ${FONT}`; c.fillText(EVENT_TITLE, 60, 116);
  const cols = [[60, "팀"], [230, "학교"], [640, "학생 이름"], [960, "비밀번호"]];
  c.fillStyle = "#f3f0e6"; c.fillRect(40, top - 46, W - 80, rowH);
  c.fillStyle = "#1d2b2a"; c.font = `800 28px ${FONT}`;
  cols.forEach(([x, t]) => c.fillText(t, x, top));
  teams.forEach((t, i) => {
    const y = top + rowH * (i + 1);
    if (i % 2) { c.fillStyle = "#faf8f2"; c.fillRect(40, y - 46, W - 80, rowH); }
    c.fillStyle = "#1d2b2a"; c.font = `800 30px ${FONT}`;
    c.fillText(t.label, 60, y);
    c.font = `600 30px ${FONT}`;
    c.fillText(t.school, 230, y);
    c.fillText(t.name, 640, y);
    c.font = `900 34px ${FONT}`; c.fillStyle = "#d64545";
    c.fillText(String(t.pw), 960, y);
  });
  c.fillStyle = "#5d6b69"; c.font = `600 22px ${FONT}`;
  c.fillText(`${CENTER} · 이 명단은 로그인 안내용이에요. 다른 사람에게 보이지 않게 관리해 주세요.`, 60, H - 50);
  return cv;
}

export function canvasToPng(cv) {
  return new Promise((res) => cv.toBlob((b) => res(b), "image/png"));
}

export async function savePng(cv, filename) {
  const blob = await canvasToPng(cv);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return blob;
}
