/**
 * AI수학투어 — 방형구 국화꽃 세기 중계 서버 (Google Apps Script)
 *
 * 가족 화면이 잘라 낸 방형구 사진을 보내면 Gemini에게 꽃 송이 수와 위치를 물어보고 돌려줘요.
 * Gemini API 키는 이 스크립트의 「스크립트 속성」에만 저장하므로 GitHub 코드에 드러나지 않아요.
 *
 * [처음 한 번 설정]
 * 1) 프로젝트 설정(톱니바퀴) → 스크립트 속성 → 속성 추가
 *      GEMINI_API_KEY = (Google AI Studio에서 받은 키, Gemini Project의 키)
 *      GEMINI_MODEL   = gemini-2.5-flash   (비워 두면 이 모델을 써요)
 * 2) 배포 → 새 배포 → 유형: 웹 앱
 *      실행 사용자: 나 / 액세스 권한: 모든 사용자
 * 3) 나온 웹 앱 주소(…/exec)를 관리자 화면 「문제 설정 → AI 꽃 세기 Apps Script 웹앱 주소」에 넣고 저장
 */

const DEFAULT_MODEL = 'gemini-2.5-flash';

function doGet() {
  const p = PropertiesService.getScriptProperties();
  return json_({ ok: true, model: p.getProperty('GEMINI_MODEL') || DEFAULT_MODEL, hasKey: !!p.getProperty('GEMINI_API_KEY') });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const image = String(body.image || '');
    if (!image) return json_({ ok: false, error: 'no image' });
    if (image.length > 2500000) return json_({ ok: false, error: 'image too large' });
    return json_(countFlowers_(image));
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function countFlowers_(base64) {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('GEMINI_API_KEY');
  if (!key) return { ok: false, error: 'GEMINI_API_KEY 스크립트 속성이 없어요' };
  const model = props.getProperty('GEMINI_MODEL') || DEFAULT_MODEL;

  const prompt = [
    'This photo shows the inside of a 20cm x 20cm square quadrat frame placed on a flower bed of chrysanthemums (국화).',
    'Count every individual chrysanthemum flower head (bloom) that is visible in the image. Count open flowers and clearly visible buds that show color.',
    'Do not count leaves, stems, or the frame. Count each flower only once, even if flowers overlap.',
    'For each counted flower, give one point at the center of the flower head as [y, x], normalized to 0-1000 (y from top, x from left).',
    'Return only JSON: {"count": <integer>, "points": [[y, x], ...]}. The number of points must equal count.'
  ].join(' ');

  const payload = {
    contents: [{
      parts: [
        { inline_data: { mime_type: 'image/jpeg', data: base64 } },
        { text: prompt }
      ]
    }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0 }
  };

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent';
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': key },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    return { ok: false, error: 'Gemini ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300) };
  }
  const data = JSON.parse(res.getContentText());
  const text = (((data.candidates || [])[0] || {}).content || {}).parts
    ? data.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('')
    : '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return { ok: false, error: 'AI 답을 읽지 못했어요' };
  const out = JSON.parse(m[0]);
  const points = (out.points || [])
    .filter(function (p) { return Array.isArray(p) && p.length >= 2; })
    .map(function (p) { return { y: clamp_(Number(p[0])), x: clamp_(Number(p[1])) }; });
  let count = parseInt(out.count, 10);
  if (!(count >= 0)) count = points.length;
  return { ok: true, count: count, points: points, model: model };
}

function clamp_(v) { return Math.max(0, Math.min(1000, isFinite(v) ? v : 0)); }

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// 편집기에서 실행해 키·모델이 잘 되는지 확인하는 용도 (작은 빈 그림을 보내 봐요)
function testGemini() {
  const blob = Utilities.newBlob(Utilities.base64Decode(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q=='), 'image/jpeg');
  Logger.log(JSON.stringify(countFlowers_(Utilities.base64Encode(blob.getBytes()))));
}
