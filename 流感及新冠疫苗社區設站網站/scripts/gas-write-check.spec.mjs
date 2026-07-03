import { test, expect } from '@playwright/test';

const gasUrl = process.env.GAS_WEBAPP_URL
  || 'https://script.google.com/macros/s/AKfycbwNVIuv6lOjovyXejbBVEEXwQ2FH36v8EGyNDmNN8E7-JOI2G7gGE8kfBBhb3fTQ3jnsw/exec';

async function getAppFrame(page) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const frame = page.frames().find((item) => item.name() === 'userHtmlFrame');
    if (frame) return frame;
    await page.waitForTimeout(500);
  }
  throw new Error('GAS userHtmlFrame was not found.');
}

async function callGas(frame, functionName, args = []) {
  return frame.evaluate(
    ({ functionName: fn, args: fnArgs }) => new Promise((resolve, reject) => {
      if (!window.google?.script?.run?.[fn]) {
        reject(new Error(`google.script.run.${fn} is not available`));
        return;
      }
      window.google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error) => {
          const message = error?.message || error?.toString?.() || JSON.stringify(error);
          reject(new Error(message));
        })[fn](...fnArgs);
    }),
    { functionName, args }
  );
}

function asRows(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  return Object.values(value).filter((item) => item && typeof item === 'object');
}

test('GAS write flow with fake data remains traceable and non-public', async ({ page }) => {
  test.setTimeout(120000);

  const runId = `Codex測試${Date.now()}`;
  const payload = {
    '行政區': '測試區',
    '里別': `測試里${runId}`,
    '接種日期': '2026-12-31',
    '設站時間': '0900-1100',
    '設站地點名稱': `${runId}活動中心`,
    '地址': '桃園市測試區測試路 1 號',
    '承接醫療院所名稱': `${runId}診所`,
    '醫療院所十碼代碼': '0000000000',
    '服務對象': '測試對象',
    '流感疫苗廠牌': '測試流感疫苗',
    '新冠疫苗廠牌': '測試新冠疫苗',
    '流感疫苗預估人數': '10',
    '新冠疫苗預估人數': '8',
    '是否申請宣導品': '否',
    '資料狀態': '草稿',
    '是否公開': '否',
    '備註': `${runId}，Codex GAS 線上寫入測試假資料，可下架或刪除。`,
    '填報單位': 'Codex測試單位',
    '填報人': 'Codex測試人員'
  };

  await page.goto(gasUrl, { waitUntil: 'domcontentloaded' });
  const appFrame = await getAppFrame(page);
  await expect(appFrame.getByText('桃園市流感及新冠疫苗設站填報系統')).toBeVisible();
  await appFrame.waitForFunction(() => Boolean(window.google?.script?.run), null, { timeout: 30000 });

  const setupResult = await callGas(appFrame, 'setupWorkbook');
  expect(setupResult.ok).toBe(true);

  const staleRows = asRows(await callGas(appFrame, 'listSites', [{ district: '測試區', date: '2026-12-31' }]));
  for (const row of staleRows) {
    if (row['資料ID'] && row['資料狀態'] !== '下架') {
      await callGas(appFrame, 'unpublishSite', [row['資料ID']]);
    }
  }

  const createResult = await callGas(appFrame, 'createSite', [payload]);
  expect(createResult.ok).toBe(true);
  expect(createResult.id).toMatch(/^SITE-20261231-\d{4}$/);

  const allRowsAfterCreate = asRows(await callGas(appFrame, 'listSites', [{}]));
  expect(allRowsAfterCreate.some((row) => row['資料ID'] === createResult.id)).toBe(true);
  const queriedRows = asRows(await callGas(appFrame, 'listSites', [{ district: '測試區', date: '2026-12-31' }]));
  expect(Array.isArray(queriedRows)).toBe(true);
  const createdRow = queriedRows.find((row) => row['資料ID'] === createResult.id);
  expect(createdRow).toBeTruthy();
  expect(createdRow['資料狀態']).toBe('草稿');
  expect(createdRow['是否公開']).toBe('否');

  const reportResult = await callGas(appFrame, 'updateReport', [
    createResult.id,
    { fluCount: '3', covidCount: '2', note: `${runId}回報測試` }
  ]);
  expect(reportResult.ok).toBe(true);

  const reportedRows = asRows(await callGas(appFrame, 'listSites', [{ district: '測試區', date: '2026-12-31' }]));
  const reportedRow = reportedRows.find((row) => row['資料ID'] === createResult.id);
  expect(String(reportedRow['流感疫苗接種人數'])).toBe('3');
  expect(String(reportedRow['新冠疫苗接種人數'])).toBe('2');

  const cleanupResult = await callGas(appFrame, 'unpublishSite', [createResult.id]);
  expect(cleanupResult.ok).toBe(true);

  const jsonText = await callGas(appFrame, 'buildPublicJson');
  const publicPayload = JSON.parse(jsonText);
  expect(JSON.stringify(publicPayload)).not.toContain(createResult.id);
  expect(JSON.stringify(publicPayload)).not.toContain(runId);

  console.log(`GAS write test fake site id: ${createResult.id}`);
});
