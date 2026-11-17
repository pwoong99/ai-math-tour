// 휴대폰 안에서 사진 색깔로 꽃 세기 (인터넷·API 키 없이 동작)
// 1) 잎(초록)·흙(어두운 색)이 아닌 밝은 꽃 색 픽셀을 골라내고
// 2) 붙어 있는 덩어리를 하나씩 찾은 뒤
// 3) 보통 크기보다 훨씬 큰 덩어리는 꽃 여러 송이가 겹친 것으로 보고 나눠 세요.
// pickRGB를 주면(꽃 한 송이를 눌러 고른 색) 그 색과 비슷한 픽셀만 골라요.
import { loadImage } from "./fb.js";

const N = 240; // 계산용 크기 (240 × 240)

function rgb2hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, mx ? d / mx : 0, mx];
}

export async function countFlowersOnDevice(dataUrl, { pickRGB = null, sensitivity = 1 } = {}) {
  const img = await loadImage(dataUrl);
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, N, N);
  const px = ctx.getImageData(0, 0, N, N).data;

  // 1) 꽃 픽셀 고르기
  let mask = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) {
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
    if (pickRGB) {
      const d = Math.hypot(r - pickRGB[0], g - pickRGB[1], b - pickRGB[2]);
      mask[i] = d < 70 * sensitivity ? 1 : 0;
    } else {
      const [h, s, v] = rgb2hsv(r, g, b);
      const leaf = h >= 70 && h <= 170 && s > 0.18;       // 초록 잎
      const dark = v < 0.42;                                // 흙·그림자·검은 틀
      const flower = (s > 0.35 && v > 0.5) || (s < 0.22 && v > 0.78); // 진한 꽃 색 또는 흰 꽃
      mask[i] = !leaf && !dark && flower ? 1 : 0;
    }
  }
  // 작은 점 지우기 (깎았다가 다시 불리기)
  const morph = (m, erode) => {
    const o = new Uint8Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let all = 1, any = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy, xx = x + dx;
        const v = yy < 0 || yy >= N || xx < 0 || xx >= N ? 0 : m[yy * N + xx];
        all &= v; any |= v;
      }
      o[y * N + x] = erode ? all : any;
    }
    return o;
  };
  mask = morph(morph(mask, true), false);

  // 2) 붙어 있는 덩어리 찾기
  const lab = new Int32Array(N * N).fill(-1);
  const blobs = [];
  const stack = [];
  for (let i = 0; i < N * N; i++) {
    if (!mask[i] || lab[i] >= 0) continue;
    const id = blobs.length, pts = [];
    lab[i] = id; stack.push(i);
    while (stack.length) {
      const j = stack.pop(); pts.push(j);
      const x = j % N, y = (j / N) | 0;
      const nb = [x > 0 ? j - 1 : -1, x < N - 1 ? j + 1 : -1, y > 0 ? j - N : -1, y < N - 1 ? j + N : -1];
      for (const k of nb) if (k >= 0 && mask[k] && lab[k] < 0) { lab[k] = id; stack.push(k); }
    }
    blobs.push(pts);
  }
  const minArea = N * N * 0.0012;
  const big = blobs.filter((b) => b.length >= minArea);
  if (!big.length) return { ok: true, count: 0, points: [], by: "device" };

  // 3) 보통 꽃 크기(중앙값)로 겹친 덩어리 나누기
  const areas = big.map((b) => b.length).sort((a, b) => a - b);
  const med = areas[Math.floor(areas.length / 2)];
  const points = [];
  big.forEach((b) => {
    if (b.length < med * 0.25) return; // 너무 작은 조각(꽃잎 일부)은 빼요
    const k = b.length > med * 1.6 ? Math.min(12, Math.round(b.length / med)) : 1;
    const xy = b.map((j) => [j % N, (j / N) | 0]);
    let cs = [];
    // k개 중심 찾기 (간단한 k-평균)
    for (let c = 0; c < k; c++) cs.push(xy[Math.floor((c + 0.5) * xy.length / k)]);
    for (let it = 0; it < 8 && k > 1; it++) {
      const sum = cs.map(() => [0, 0, 0]);
      xy.forEach(([x, y]) => {
        let bi = 0, bd = Infinity;
        cs.forEach(([cx, cy], ci) => { const d = (x - cx) ** 2 + (y - cy) ** 2; if (d < bd) { bd = d; bi = ci; } });
        sum[bi][0] += x; sum[bi][1] += y; sum[bi][2]++;
      });
      cs = sum.map((s, ci) => s[2] ? [s[0] / s[2], s[1] / s[2]] : cs[ci]);
    }
    if (k === 1) {
      const sx = xy.reduce((a, p) => a + p[0], 0), sy = xy.reduce((a, p) => a + p[1], 0);
      cs = [[sx / xy.length, sy / xy.length]];
    }
    cs.forEach(([x, y]) => points.push({ x: Math.round((x + 0.5) / N * 1000), y: Math.round((y + 0.5) / N * 1000) }));
  });
  return { ok: true, count: points.length, points, by: "device" };
}

// 사진 위 누른 곳의 색 (주변 5×5 평균)
export async function sampleColor(dataUrl, fx, fy) {
  const img = await loadImage(dataUrl);
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, N, N);
  const x = Math.max(2, Math.min(N - 3, Math.round(fx * N))), y = Math.max(2, Math.min(N - 3, Math.round(fy * N)));
  const d = ctx.getImageData(x - 2, y - 2, 5, 5).data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < 25; i++) { r += d[i * 4]; g += d[i * 4 + 1]; b += d[i * 4 + 2]; }
  return [r / 25, g / 25, b / 25];
}
