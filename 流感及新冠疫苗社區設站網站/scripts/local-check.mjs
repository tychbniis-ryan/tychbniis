import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function checkGasCodeSyntax() {
  const code = readText('gas/Code.gs');
  new Function(code);
  console.log('OK gas/Code.gs syntax');
}

function checkGasIndexScriptSyntax() {
  const html = readText('gas/Index.html');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .join('\n');
  new Function(scripts);
  console.log('OK gas/Index.html script syntax');
}

function checkBusyGuardStructure() {
  const html = readText('gas/Index.html');
  assert(html.includes('button:disabled'), 'missing disabled button style');
  assert(html.includes('isBusy: false'), 'missing busy state');
  assert(html.includes('function setBusy(isBusy)'), 'missing setBusy function');
  assert(html.includes('if (appState.isBusy)'), 'missing duplicate submit guard');
  console.log('OK busy guard structure');
}

function checkErrorGuidanceStructure() {
  const html = readText('gas/Index.html');
  assert(html.includes('function formatErrorMessage(errors, nextStep)'), 'missing error message formatter');
  assert(html.includes('下一步：'), 'missing next-step guidance text');
  assert(html.includes('function showMessageErrors(errors, nextStep)'), 'missing message error helper');
  console.log('OK error guidance structure');
}

function checkGasReportMobileStructure() {
  const html = readText('gas/Index.html');
  assert(html.includes('<meta name="viewport" content="width=device-width, initial-scale=1">'), 'missing mobile viewport meta');
  assert(/button\s*\{[\s\S]*?min-height:\s*48px;/.test(html), 'missing touch-friendly button height');
  assert(/input,\s*select,\s*textarea\s*\{[\s\S]*?min-height:\s*44px;/.test(html), 'missing touch-friendly input height');
  assert(/\.row-actions\s*\{[\s\S]*?flex-wrap:\s*wrap;/.test(html), 'missing wrapping action buttons');
  assert(html.includes('<section id="view-report"'), 'missing report view section');
  assert(html.includes('<div id="reportList" class="list"></div>'), 'missing report list container');
  assert(html.includes('function reportCard(site)'), 'missing report card renderer');
  assert(html.includes('<article class="card">'), 'report rows are not card-based');
  assert(html.includes('data-flu=') && html.includes('inputmode="numeric"'), 'missing numeric flu count input');
  assert(html.includes('data-covid=') && html.includes('inputmode="numeric"'), 'missing numeric covid count input');
  assert(html.includes('data-note='), 'missing report note input');
  assert(html.includes('data-report='), 'missing report save button');
  console.log('OK GAS report mobile structure');
}

function checkPublicJson() {
  const raw = readText('public/public.json');
  JSON.parse(raw);
  console.log('OK public/public.json');
}

function checkPublicQueueUrlStructure() {
  const app = readText('public/app.js');
  const gas = readText('gas/Code.gs');
  const payload = JSON.parse(readText('public/public.json'));
  assert(app.includes('function normalizeExternalUrl(value)'), 'missing public queue URL normalizer');
  assert(app.includes('queueUrl: normalizeExternalUrl(site.queueUrl)'), 'public queue URL is not normalized');
  assert(gas.includes('function normalizeExternalUrl_(value)'), 'missing GAS queue URL normalizer');
  assert(gas.includes("queueUrl: normalizeExternalUrl_(row['叫號連結'])"), 'GAS public queue URL is not normalized');
  payload.data.forEach((site) => {
    if (site.queueUrl) {
      assert(/^https?:\/\//i.test(site.queueUrl), `invalid queueUrl in public.json: ${site.id}`);
    }
  });
  console.log('OK public queue URL structure');
}

function checkPublicClosedStateStructure() {
  const app = readText('public/app.js');
  assert(app.includes('function renderClosedState(payload)'), 'missing public closed-state renderer');
  assert(app.includes('renderClosedState(payload);'), 'isOpen=false does not use closed-state renderer');
  assert(app.includes('elements.resultSummary.textContent = "目前暫停開放查詢。"'), 'closed-state summary is missing');
  assert(app.includes('state.allSites = [];'), 'closed-state data reset is missing');
  assert(app.includes('elements.cardList.innerHTML = "";'), 'closed-state card reset is missing');
  console.log('OK public closed-state structure');
}

function loadGasForTest() {
  const code = readText('gas/Code.gs');
  return (testCode) => new Function(`${code}\n${testCode}`)();
}

function checkAdminAccessLogic(runGasTest) {
  runGasTest(`
    const kItem = '\\u8a2d\\u5b9a\\u9805\\u76ee';
    const kValue = '\\u8a2d\\u5b9a\\u503c';
    readObjects_ = function(name) {
      const row = {};
      row[kItem] = '\\u7ba1\\u7406\\u529f\\u80fd\\u5bc6\\u78bc';
      row[kValue] = 'TEST1234';
      return name === SHEETS.system ? [row] : [];
    };
    let blocked = false;
    try { verifyAdminAccess({ adminCode: 'WRONG' }); } catch (error) { blocked = true; }
    if (!blocked) throw new Error('wrong admin code was not blocked');
    const result = verifyAdminAccess({ adminCode: 'TEST1234' });
    if (!result.ok) throw new Error('correct admin code was not accepted');
  `);
  console.log('OK admin access logic');
}

function checkVillageCoverageLogic(runGasTest) {
  runGasTest(`
    const kDistrict = '\\u884c\\u653f\\u5340';
    const kVillage = '\\u91cc\\u5225';
    const kEnabled = '\\u662f\\u5426\\u555f\\u7528';
    const kStatus = '\\u8cc7\\u6599\\u72c0\\u614b';
    const kPublic = '\\u662f\\u5426\\u516c\\u958b';
    function row(district, village, enabled) {
      const item = {};
      item[kDistrict] = district;
      item[kVillage] = village;
      item[kEnabled] = enabled;
      return item;
    }
    function site(district, village, status, isPublic) {
      const item = {};
      item[kDistrict] = district;
      item[kVillage] = village;
      item[kStatus] = status;
      item[kPublic] = isPublic;
      return item;
    }
    readObjects_ = function(name) {
      return name === SHEETS.villages ? [
        row('\\u6e2c\\u8a66\\u5340', '\\u6e2c\\u8a66\\u91cc', '\\u662f'),
        row('\\u6e2c\\u8a66\\u5340', '\\u7bc4\\u4f8b\\u91cc', '\\u662f'),
        row('\\u6e2c\\u8a66\\u5340', '\\u505c\\u7528\\u91cc', '\\u5426')
      ] : [];
    };
    const result = buildVillageCoverage_([
      site('\\u6e2c\\u8a66\\u5340', '\\u6e2c\\u8a66\\u91cc\\u3001\\u5176\\u4ed6\\u91cc', '\\u5df2\\u767c\\u5e03', '\\u662f'),
      site('\\u6e2c\\u8a66\\u5340', '\\u8349\\u7a3f\\u91cc', '\\u8349\\u7a3f', '\\u5426')
    ]);
    if (result.totalVillages !== 2 || result.coveredVillages !== 1 || result.uncoveredCount !== 1 || result.uncovered[0].village !== '\\u7bc4\\u4f8b\\u91cc') {
      throw new Error(JSON.stringify(result));
    }
  `);
  console.log('OK village coverage logic');
}

function checkStatsLogic(runGasTest) {
  runGasTest(`
    const kDistrict = '\\u884c\\u653f\\u5340';
    const kStatus = '\\u8cc7\\u6599\\u72c0\\u614b';
    const kFluEstimate = '\\u6d41\\u611f\\u75ab\\u82d7\\u9810\\u4f30\\u4eba\\u6578';
    const kFluCount = '\\u6d41\\u611f\\u75ab\\u82d7\\u63a5\\u7a2e\\u4eba\\u6578';
    const kCovidEstimate = '\\u65b0\\u51a0\\u75ab\\u82d7\\u9810\\u4f30\\u4eba\\u6578';
    const kCovidCount = '\\u65b0\\u51a0\\u75ab\\u82d7\\u63a5\\u7a2e\\u4eba\\u6578';
    const kDeliveryStatus = '\\u914d\\u9001\\u72c0\\u614b';
    function site(district, status, fluEstimate, fluCount) {
      const item = {};
      item[kDistrict] = district;
      item[kStatus] = status;
      item[kFluEstimate] = fluEstimate;
      item[kFluCount] = fluCount;
      item[kCovidEstimate] = '';
      item[kCovidCount] = '';
      return item;
    }
    function task(status) {
      const item = {};
      item[kDeliveryStatus] = status;
      return item;
    }
    const result = buildStats_([
      site('A', '\\u5df2\\u767c\\u5e03', '10', ''),
      site('A', '\\u8349\\u7a3f', '10', '5'),
      site('B', '\\u5df2\\u767c\\u5e03', '0', '')
    ], [task('\\u5df2\\u914d\\u9001'), task('\\u672a\\u914d\\u9001'), task('\\u53d6\\u6d88')]);
    if (result.published !== 2 || result.unpublished !== 1 || result.unreported !== 1) throw new Error(JSON.stringify(result));
    if (result.deliveryCompletionRate !== '50%') throw new Error(JSON.stringify(result));
    if (result.districtStats.length !== 2) throw new Error(JSON.stringify(result));
    if (result.districtStats[0].district !== 'A' || result.districtStats[0].totalSites !== 2 || result.districtStats[0].published !== 1 || result.districtStats[0].unreported !== 1) throw new Error(JSON.stringify(result));
  `);
  console.log('OK stats logic');
}

function checkRateCalculationLogic(runGasTest) {
  runGasTest(`
    if (calculateRate_('', '10') !== '') throw new Error('blank count should keep blank rate');
    if (calculateRate_(null, '10') !== '') throw new Error('null count should keep blank rate');
    if (calculateRate_(0, '10') !== '0%') throw new Error('zero count should calculate 0%');
    if (calculateRate_('5', '10') !== '50%') throw new Error('normal rate should calculate 50%');
    if (calculateRate_('5', '0') !== '') throw new Error('zero estimate should keep blank rate');
  `);
  console.log('OK rate calculation logic');
}

function checkQueueUrlLogic(runGasTest) {
  runGasTest(`
    if (normalizeExternalUrl_('https://example.tycg.gov.tw/queue/demo') !== 'https://example.tycg.gov.tw/queue/demo') throw new Error('https queueUrl was rejected');
    if (normalizeExternalUrl_('http://example.tycg.gov.tw/queue/demo') !== 'http://example.tycg.gov.tw/queue/demo') throw new Error('http queueUrl was rejected');
    if (normalizeExternalUrl_('javascript:alert(1)') !== '') throw new Error('unsafe queueUrl was accepted');
    if (normalizeExternalUrl_('/queue/demo') !== '') throw new Error('relative queueUrl was accepted');
  `);
  console.log('OK queue URL logic');
}

function checkDeliveryDuplicateGuardLogic(runGasTest) {
  runGasTest(`
    const siteId = 'SITE-TEST-0001';
    const kId = '\\u8cc7\\u6599ID';
    const kApply = '\\u662f\\u5426\\u7533\\u8acb\\u5ba3\\u5c0e\\u54c1';
    const kItems = '\\u5ba3\\u5c0e\\u54c1\\u7533\\u8acb\\u54c1\\u9805';
    const kQty = '\\u5ba3\\u5c0e\\u54c1\\u7533\\u8acb\\u6578\\u91cf';
    const kTaskId = '\\u914d\\u9001\\u4efb\\u52d9ID';
    const kSourceType = '\\u4f86\\u6e90\\u985e\\u578b';
    const kSourceId = '\\u4f86\\u6e90\\u8cc7\\u6599ID';
    const kLinkedSiteId = '\\u95dc\\u806f\\u63a5\\u7a2e\\u7ad9\\u8cc7\\u6599ID';
    const kItemId = '\\u5ba3\\u5c0e\\u54c1ID';
    const kItemName = '\\u5ba3\\u5c0e\\u54c1\\u540d\\u7a31';
    const kDeliveryStatus = '\\u914d\\u9001\\u72c0\\u614b';
    const site = {};
    site[kId] = siteId;
    site[kApply] = '\\u662f';
    site[kItems] = 'ITEM-1\\u3001ITEM-1\\u3001ITEM-2';
    site[kQty] = '10\\u300110\\u30015';
    site['\\u884c\\u653f\\u5340'] = '\\u6e2c\\u8a66\\u5340';
    site['\\u91cc\\u5225'] = '\\u6e2c\\u8a66\\u91cc';
    site['\\u8a2d\\u7ad9\\u5730\\u9ede\\u540d\\u7a31'] = '\\u6e2c\\u8a66\\u6d3b\\u52d5\\u4e2d\\u5fc3';
    site['\\u5730\\u5740'] = '\\u6e2c\\u8a66\\u5730\\u5740';
    const task = {};
    task[kTaskId] = 'DEL-OLD-0001';
    task[kSourceType] = '\\u63a5\\u7a2e\\u7ad9\\u7533\\u8acb';
    task[kSourceId] = '';
    task[kLinkedSiteId] = siteId;
    task[kItemId] = 'ITEM-2';
    task[kDeliveryStatus] = '\\u672a\\u914d\\u9001';
    const activeItem1 = {};
    activeItem1[kItemId] = 'ITEM-1';
    activeItem1[kItemName] = '\\u6d77\\u5831';
    activeItem1['\\u662f\\u5426\\u555f\\u7528'] = '\\u662f';
    const activeItem2 = {};
    activeItem2[kItemId] = 'ITEM-2';
    activeItem2[kItemName] = '\\u55ae\\u5f35';
    activeItem2['\\u662f\\u5426\\u555f\\u7528'] = '\\u662f';
    const appended = [];
    SpreadsheetApp = {
      getActive: () => ({
        getSheetByName: () => ({
          getDataRange: () => ({
            getValues: () => [[kId], [siteId]]
          })
        })
      })
    };
    findRowById_ = function() { return { headers: Object.keys(site), values: Object.keys(site).map((key) => site[key]) }; };
    readObjects_ = function(name) {
      if (name === SHEETS.deliveryTasks) return [task];
      if (name === SHEETS.deliveryItems) return [activeItem1, activeItem2];
      return [];
    };
    appendObject_ = function(name, data) { if (name === SHEETS.deliveryTasks) appended.push(data); };
    writeHistory_ = function() {};
    nowString_ = function() { return '2026-07-03 12:00'; };
    createTaskId_ = function() { return 'DEL-NEW-' + String(appended.length + 1).padStart(4, '0'); };
    const created = createDeliveryTasksForSite_(siteId);
    if (created.length !== 1 || appended.length !== 1) throw new Error(JSON.stringify({ created, appended }));
    if (created[0][kItemId] !== 'ITEM-1') throw new Error(JSON.stringify(created));
  `);
  console.log('OK delivery duplicate guard logic');
}

function checkSiteDuplicateGuardLogic(runGasTest) {
  runGasTest(`
    const kId = '\\u8cc7\\u6599ID';
    const kDistrict = '\\u884c\\u653f\\u5340';
    const kVillage = '\\u91cc\\u5225';
    const kDate = '\\u63a5\\u7a2e\\u65e5\\u671f';
    const kStatus = '\\u8cc7\\u6599\\u72c0\\u614b';
    function site(id, district, village, date, status) {
      const item = {};
      item[kId] = id;
      item[kDistrict] = district;
      item[kVillage] = village;
      item[kDate] = date;
      item[kStatus] = status;
      return item;
    }
    readObjects_ = function(name) {
      return name === SHEETS.sites ? [
        site('SITE-1', '\\u6e2c\\u8a66\\u5340', '\\u6e2c\\u8a66\\u91cc\\u3001\\u5171\\u540c\\u91cc', '2026-10-01', '\\u5df2\\u767c\\u5e03'),
        site('SITE-2', '\\u6e2c\\u8a66\\u5340', '\\u4e0b\\u67b6\\u91cc', '2026-10-01', '\\u4e0b\\u67b6')
      ] : [];
    };
    let blocked = false;
    try {
      assertNoDuplicateSite_(site('', '\\u6e2c\\u8a66\\u5340', '\\u5171\\u540c\\u91cc', '2026-10-01', '\\u8349\\u7a3f'));
    } catch (error) {
      blocked = /SITE-1/.test(error.message);
    }
    if (!blocked) throw new Error('duplicate site was not blocked');
    assertNoDuplicateSite_(site('', '\\u6e2c\\u8a66\\u5340', '\\u5176\\u4ed6\\u91cc', '2026-10-01', '\\u8349\\u7a3f'));
    assertNoDuplicateSite_(site('SITE-1', '\\u6e2c\\u8a66\\u5340', '\\u6e2c\\u8a66\\u91cc', '2026-10-01', '\\u5df2\\u767c\\u5e03'), 'SITE-1');
    assertNoDuplicateSite_(site('', '\\u6e2c\\u8a66\\u5340', '\\u4e0b\\u67b6\\u91cc', '2026-10-01', '\\u8349\\u7a3f'));
  `);
  console.log('OK site duplicate guard logic');
}

function main() {
  assert(fs.existsSync(path.join(rootDir, 'gas/Code.gs')), 'missing gas/Code.gs');
  assert(fs.existsSync(path.join(rootDir, 'gas/Index.html')), 'missing gas/Index.html');
  assert(fs.existsSync(path.join(rootDir, 'public/public.json')), 'missing public/public.json');

  checkGasCodeSyntax();
  checkGasIndexScriptSyntax();
  checkBusyGuardStructure();
  checkErrorGuidanceStructure();
  checkGasReportMobileStructure();
  checkPublicJson();
  checkPublicQueueUrlStructure();
  checkPublicClosedStateStructure();

  const runGasTest = loadGasForTest();
  checkAdminAccessLogic(runGasTest);
  checkVillageCoverageLogic(runGasTest);
  checkStatsLogic(runGasTest);
  checkRateCalculationLogic(runGasTest);
  checkQueueUrlLogic(runGasTest);
  checkDeliveryDuplicateGuardLogic(runGasTest);
  checkSiteDuplicateGuardLogic(runGasTest);

  console.log('All local checks passed.');
}

main();
