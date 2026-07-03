import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const defaultUrl = 'https://script.google.com/macros/s/AKfycbwNVIuv6lOjovyXejbBVEEXwQ2FH36v8EGyNDmNN8E7-JOI2G7gGE8kfBBhb3fTQ3jnsw/exec';
const gasUrl = process.argv[2] || defaultUrl;
const screenshotPath = resolve('docs/test-evidence/gas-webapp-home.png');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function checkNoSensitiveCode(text) {
  [
    /管理功能密碼\s*[:=]\s*['"][^'"]+['"]/,
    /password\s*[:=]\s*['"][^'"]+['"]/i,
    /token\s*[:=]\s*['"][^'"]+['"]/i,
    /cookie\s*[:=]\s*['"][^'"]+['"]/i
  ].forEach((pattern) => {
    assert(!pattern.test(text), `GAS page may include hard-coded sensitive value: ${pattern}`);
  });
}

function hasDataView(text, viewName) {
  return [
    `data-view="${viewName}"`,
    `data-view='${viewName}'`,
    `data-view\\x3d"${viewName}"`,
    `data-view\\x3d'${viewName}'`,
    `data-view\\x3d\\x22${viewName}\\x22`,
    `data-view\\x3d\\\\\\x22${viewName}\\\\\\x22`
  ].some((marker) => text.includes(marker));
}

async function fetchGasPage() {
  const response = await fetch(gasUrl, { cache: 'no-store', redirect: 'follow' });
  assert(response.ok, `${gasUrl} returned HTTP ${response.status}`);
  const body = await response.text();
  return { body, status: response.status, url: response.url };
}

async function takeScreenshot() {
  await mkdir(dirname(screenshotPath), { recursive: true });
  const command = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npx';
  const args = process.platform === 'win32'
    ? [
      '/d',
      '/s',
      '/c',
      'npx',
      'playwright',
      'screenshot',
      '--wait-for-timeout=3000',
      '--viewport-size=390,1100',
      gasUrl,
      screenshotPath
    ]
    : [
      'playwright',
      'screenshot',
      '--wait-for-timeout=3000',
      '--viewport-size=390,1100',
      gasUrl,
      screenshotPath
    ];
  const result = spawnSync(
    command,
    args,
    { encoding: 'utf8' }
  );
  assert(result.status === 0, `Playwright screenshot failed: ${result.error?.message || result.stderr || result.stdout}`);
}

async function main() {
  const { body, status, url } = await fetchGasPage();

  assert(body.includes('桃園市流感及新冠疫苗設站填報系統'), 'GAS page title is missing');
  assert(body.includes('google.script.run'), 'GAS page is missing google.script.run bridge');
  assert(countMatches(body, /data-view/g) >= 8, 'GAS page should include at least 8 function entry buttons');

  ['report', 'create', 'maintain', 'search', 'stats', 'promo', 'vendor', 'system'].forEach((viewName) => {
    assert(hasDataView(body, viewName), `GAS page missing entry marker: ${viewName}`);
  });

  [
    '回報接種人數',
    '新增設站資料',
    '維護既有資料',
    '查詢場次',
    '稽催／統計',
    '宣導品管理',
    '廠商配送回報',
    '系統工具'
  ].forEach((label) => assert(body.includes(label), `GAS page missing entry label: ${label}`));

  assert(body.includes('view-admin-guard'), 'GAS page is missing admin guard view');
  assert(body.includes('verifyAdminAccess'), 'GAS page is missing admin verification call');
  assert(body.includes('password'), 'GAS page should use password input for admin code');
  assert(body.includes('setupWorkbook'), 'GAS page is missing setupWorkbook action');
  assert(body.includes('buildPublicJson'), 'GAS page is missing buildPublicJson action');
  assert(body.includes('downloadCsv'), 'GAS page is missing notice CSV action');
  checkNoSensitiveCode(body);

  await takeScreenshot();

  console.log(`OK GAS Web App HTTP ${status}: ${url}`);
  console.log('OK GAS entries: report/create/maintain/search/stats/promo/vendor/system');
  console.log('OK GAS admin guard and system tools markers');
  console.log(`OK screenshot: ${screenshotPath}`);
}

main();
