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

function checkPublicJson() {
  const raw = readText('public/public.json');
  JSON.parse(raw);
  console.log('OK public/public.json');
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

function main() {
  assert(fs.existsSync(path.join(rootDir, 'gas/Code.gs')), 'missing gas/Code.gs');
  assert(fs.existsSync(path.join(rootDir, 'gas/Index.html')), 'missing gas/Index.html');
  assert(fs.existsSync(path.join(rootDir, 'public/public.json')), 'missing public/public.json');

  checkGasCodeSyntax();
  checkGasIndexScriptSyntax();
  checkPublicJson();

  const runGasTest = loadGasForTest();
  checkAdminAccessLogic(runGasTest);
  checkVillageCoverageLogic(runGasTest);
  checkStatsLogic(runGasTest);

  console.log('All local checks passed.');
}

main();
