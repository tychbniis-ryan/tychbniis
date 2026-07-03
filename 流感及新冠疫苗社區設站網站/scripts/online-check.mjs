const baseUrl = (process.argv[2] || 'https://tychb-vaccineweb.web.app').replace(/\/+$/, '');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchText(pathname) {
  const url = `${baseUrl}${pathname}`;
  const response = await fetch(url, { cache: 'no-store' });
  assert(response.ok, `${url} returned HTTP ${response.status}`);
  return {
    body: await response.text(),
    headers: response.headers,
    url
  };
}

function checkNoCache(headers, source) {
  const cacheControl = headers.get('cache-control') || '';
  assert(cacheControl.toLowerCase().includes('no-cache'), `${source} should use Cache-Control: no-cache`);
}

function checkNoTracking(text, source) {
  const blockedPatterns = [
    /googletagmanager/i,
    /google-analytics/i,
    /\bgtag\s*\(/i,
    /\bga\s*\(/i,
    /\bfbq\s*\(/i,
    /facebook\.net/i,
    /hotjar/i,
    /clarity\.ms/i,
    /firebase\/auth/i,
    /\bliff\b/i,
    /oauth/i,
    /signin/i,
    /login/i,
    /tracking\s*pixel/i
  ];
  blockedPatterns.forEach((pattern) => {
    assert(!pattern.test(text), `${source} includes tracking or login code: ${pattern}`);
  });
}

function checkPublicAppJs(text) {
  assert(text.includes('rel="noopener noreferrer"'), 'app.js external links should use noopener noreferrer');
  assert(!text.includes('onclick='), 'app.js should not use inline onclick handlers');
  ['reset', 'week', 'all'].forEach((action) => {
    assert(text.includes(`data-empty-action="${action}"`), `app.js missing empty-state action: ${action}`);
  });
}

function checkPublicJson(payload) {
  const rootKeys = ['title', 'updatedAt', 'notice', 'isOpen', 'defaultView', 'data'];
  const siteKeys = [
    'id', 'district', 'village', 'date', 'rocDate', 'weekday', 'time', 'rawTime',
    'startTime', 'endTime', 'siteName', 'address', 'hospitalName', 'target',
    'fluBrand', 'covidBrand', 'note', 'lat', 'lng', 'mapUrl', 'queueUrl',
    'queueLabel', 'queueUpdatedAt', 'tags'
  ];
  const forbiddenKeys = [
    '醫療院所十碼代碼', '流感疫苗預估人數', '流感疫苗接種人數', '流感疫苗接種率',
    '新冠疫苗預估人數', '新冠疫苗接種人數', '新冠疫苗接種率', '是否公開',
    '資料狀態', '填報單位', '填報人', '是否鎖定', '鎖定時間',
    '解鎖申請狀態', '解鎖申請時間', '解鎖申請人', '解鎖申請原因',
    '宣導品配送聯絡人', '宣導品配送聯絡電話', '宣導品配送地址',
    '廠商名稱', '廠商查詢碼', '管理功能密碼'
  ];

  assert(Array.isArray(payload.data), 'public.json data must be an array');
  Object.keys(payload).forEach((key) => {
    assert(rootKeys.includes(key), `unexpected root key in public.json: ${key}`);
  });
  payload.data.forEach((site) => {
    Object.keys(site).forEach((key) => {
      assert(siteKeys.includes(key), `unexpected site key in public.json: ${key}`);
      assert(!forbiddenKeys.includes(key), `forbidden site key in public.json: ${key}`);
    });
    ['id', 'district', 'village', 'date', 'time', 'siteName', 'address'].forEach((key) => {
      assert(Object.prototype.hasOwnProperty.call(site, key), `missing site key in public.json: ${key}`);
    });
  });
}

async function main() {
  const home = await fetchText('/');
  assert(home.body.includes('app.js'), 'home page does not load app.js');
  assert(home.body.includes('browserHint'), 'home page is missing LINE/browser hint container');
  assert(home.body.includes('不要求登入、不蒐集民眾姓名、電話、身分證字號或定位紀錄'), 'home page is missing privacy notice');
  checkNoTracking(home.body, 'home page');
  console.log(`OK home page: ${home.url}`);

  const publicJson = await fetchText('/public.json');
  checkNoCache(publicJson.headers, 'public.json');
  const payload = JSON.parse(publicJson.body);
  checkPublicJson(payload);
  console.log(`OK public.json: ${payload.data.length} site(s)`);

  const appJs = await fetchText('/app.js');
  checkNoCache(appJs.headers, 'app.js');
  checkNoTracking(appJs.body, 'app.js');
  checkPublicAppJs(appJs.body);
  console.log('OK app.js no tracking and safe actions');

  console.log(`All online checks passed: ${baseUrl}`);
}

main();
