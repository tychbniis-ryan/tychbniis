const SHEETS = {
  sites: '設站資料',
  settings: '公開設定',
  history: '異動紀錄',
  jsonLog: 'JSON輸出紀錄',
  deliveryItems: '宣導品品項表',
  deliveryTasks: '宣導品配送任務表',
  vendors: '廠商資料表',
  system: '系統設定'
};

const SITE_HEADERS = [
  '資料ID', '行政區', '里別', '接種日期', '設站時間', '設站地點名稱', '地址',
  '承接醫療院所名稱', '醫療院所十碼代碼', '服務對象', '流感疫苗廠牌', '新冠疫苗廠牌',
  '流感疫苗預估人數', '流感疫苗接種人數', '流感疫苗接種率',
  '新冠疫苗預估人數', '新冠疫苗接種人數', '新冠疫苗接種率',
  '備註', '是否公開', '資料狀態', '最後更新時間', '填報單位', '填報人',
  '是否鎖定', '鎖定時間', '解鎖申請狀態', '解鎖申請時間', '解鎖申請人', '解鎖申請原因',
  '解鎖審核時間', '解鎖審核人', '解鎖時間', '是否申請宣導品',
  '宣導品申請品項', '宣導品申請數量', '宣導品配送聯絡人', '宣導品配送聯絡電話',
  '宣導品配送地址', '宣導品配送備註', '宣導品配送狀態', '宣導品配送任務ID',
  '接種回報備註', '緯度', '經度', '地圖連結', '叫號連結', '叫號按鈕文字', '叫號更新時間'
];

const HISTORY_HEADERS = [
  '異動ID', '異動時間', '資料類型', '資料ID', '異動類型', '異動前摘要',
  '異動後摘要', '填報單位', '填報人', '使用功能', '備註'
];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('桃園市流感及新冠疫苗設站填報系統')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function setupWorkbook() {
  const ss = SpreadsheetApp.getActive();
  ensureSheet_(ss, SHEETS.sites, SITE_HEADERS);
  ensureSheet_(ss, SHEETS.history, HISTORY_HEADERS);
  ensureSheet_(ss, SHEETS.settings, ['設定項目', '內容', '備註', '最後更新時間']);
  ensureSheet_(ss, SHEETS.jsonLog, ['輸出時間', '輸出筆數', '結果', '備註']);
  ensureSheet_(ss, SHEETS.deliveryItems, ['宣導品ID', '年度', '宣導品名稱', '宣導品類型', '規格', '單位', '是否啟用', '顯示順序', '備註', '最後更新時間']);
  ensureSheet_(ss, SHEETS.deliveryTasks, ['配送任務ID', '年度', '批次', '來源類型', '來源資料ID', '宣導品ID', '宣導品名稱', '申請數量', '預計配送數量', '實際配送數量', '配送地點ID', '地點類型', '行政區', '里別', '地點名稱', '地址', '配送聯絡人', '配送聯絡電話', '是否關聯接種站', '關聯接種站資料ID', '配送狀態', '預計配送日期', '實際配送日期', '廠商ID', '廠商名稱', '廠商聯絡人', '廠商聯絡電話', '物流方式', '物流單號', '廠商回報人', '廠商回報時間', '收件確認狀態', '收件人', '收件時間', '備註', '最後更新時間']);
  ensureSheet_(ss, SHEETS.vendors, ['廠商ID', '廠商名稱', '廠商查詢碼', '聯絡人', '聯絡電話', 'Email', '是否啟用', '備註', '最後更新時間']);
  ensureSheet_(ss, SHEETS.system, ['設定項目', '設定值', '備註', '最後更新時間']);
  seedSettings_(ss);
  return { ok: true, message: '工作表初始化完成。' };
}

function listSites(filters) {
  const rows = readObjects_(SHEETS.sites);
  const safeFilters = filters || {};
  return rows.filter((row) => {
    if (safeFilters.district && row['行政區'] !== safeFilters.district) return false;
    if (safeFilters.status && row['資料狀態'] !== safeFilters.status) return false;
    if (safeFilters.date && normalizeDate_(row['接種日期']) !== safeFilters.date) return false;
    return true;
  });
}

function createSite(payload) {
  const data = sanitizePayload_(payload);
  validateSite_(data);

  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(SHEETS.sites);
  const headers = getHeaders_(sheet);
  const now = nowString_();
  const siteId = createSiteId_(data['接種日期']);

  data['資料ID'] = siteId;
  data['資料狀態'] = data['資料狀態'] || '草稿';
  data['是否公開'] = data['資料狀態'] === '已發布' ? '是' : (data['是否公開'] || '否');
  data['是否鎖定'] = data['資料狀態'] === '已發布' ? '是' : '否';
  data['鎖定時間'] = data['資料狀態'] === '已發布' ? now : '';
  data['最後更新時間'] = now;
  data['流感疫苗接種率'] = calculateRate_(data['流感疫苗接種人數'], data['流感疫苗預估人數']);
  data['新冠疫苗接種率'] = calculateRate_(data['新冠疫苗接種人數'], data['新冠疫苗預估人數']);

  sheet.appendRow(headers.map((header) => data[header] || ''));
  writeHistory_('設站資料', siteId, '新增設站資料', '', summarize_(data), data);

  return { ok: true, id: siteId, message: '設站資料已新增。' };
}

function updateReport(siteId, report) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.sites);
  const found = findRowById_(sheet, siteId);
  if (!found) throw new Error('找不到指定資料ID。');

  const before = objectFromRow_(found.headers, found.values);
  const fluCount = normalizeInteger_(report.fluCount);
  const covidCount = normalizeInteger_(report.covidCount);
  const now = nowString_();

  setCellByHeader_(sheet, found.row, found.headers, '流感疫苗接種人數', fluCount);
  setCellByHeader_(sheet, found.row, found.headers, '新冠疫苗接種人數', covidCount);
  setCellByHeader_(sheet, found.row, found.headers, '流感疫苗接種率', calculateRate_(fluCount, before['流感疫苗預估人數']));
  setCellByHeader_(sheet, found.row, found.headers, '新冠疫苗接種率', calculateRate_(covidCount, before['新冠疫苗預估人數']));
  setCellByHeader_(sheet, found.row, found.headers, '接種回報備註', sanitizeText_(report.note));
  setCellByHeader_(sheet, found.row, found.headers, '最後更新時間', now);

  const after = objectFromRow_(found.headers, sheet.getRange(found.row, 1, 1, found.headers.length).getValues()[0]);
  writeHistory_('設站資料', siteId, '回報接種人數', summarize_(before), summarize_(after), after);
  return { ok: true, message: '接種人數已回報。' };
}

function publishSite(siteId) {
  return setSiteStatus_(siteId, '已發布', '是', '是', '發布資料');
}

function unpublishSite(siteId) {
  return setSiteStatus_(siteId, '下架', '否', '是', '下架資料');
}

function buildPublicJson() {
  const settings = getPublicSettings_();
  const rows = readObjects_(SHEETS.sites);
  const data = rows
    .filter((row) => row['是否公開'] === '是' && row['資料狀態'] === '已發布')
    .map(toPublicSite_);

  const payload = {
    title: settings.title || '桃園市流感及新冠疫苗接種站查詢',
    updatedAt: nowString_(),
    notice: settings.notice || '接種資訊依里辦公處、轄區衛生所或現場公告為主，接種前請務必攜帶健保卡及相關證明文件。',
    isOpen: settings.isOpen !== '否',
    defaultView: settings.defaultView || 'today',
    data
  };

  const json = JSON.stringify(payload, null, 2);
  SpreadsheetApp.getActive().getSheetByName(SHEETS.jsonLog).appendRow([nowString_(), data.length, '成功', '已產生 public.json 內容']);
  return json;
}

function createJsonDownloadFile() {
  const json = buildPublicJson();
  const file = DriveApp.createFile('public.json', json, MimeType.PLAIN_TEXT);
  return { ok: true, fileId: file.getId(), url: file.getUrl(), message: 'public.json 已建立於 Google Drive，請下載後放入 Firebase public 資料夾。' };
}

function setSiteStatus_(siteId, status, isPublic, isLocked, action) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.sites);
  const found = findRowById_(sheet, siteId);
  if (!found) throw new Error('找不到指定資料ID。');

  const before = objectFromRow_(found.headers, found.values);
  const now = nowString_();
  setCellByHeader_(sheet, found.row, found.headers, '資料狀態', status);
  setCellByHeader_(sheet, found.row, found.headers, '是否公開', isPublic);
  setCellByHeader_(sheet, found.row, found.headers, '是否鎖定', isLocked);
  setCellByHeader_(sheet, found.row, found.headers, '鎖定時間', isLocked === '是' ? now : '');
  setCellByHeader_(sheet, found.row, found.headers, '最後更新時間', now);

  const after = objectFromRow_(found.headers, sheet.getRange(found.row, 1, 1, found.headers.length).getValues()[0]);
  writeHistory_('設站資料', siteId, action, summarize_(before), summarize_(after), after);
  return { ok: true, message: `${action}完成。` };
}

function toPublicSite_(row) {
  const date = normalizeDate_(row['接種日期']);
  const time = formatTimeRange_(row['設站時間']);
  const parts = time.split('-');
  return {
    id: row['資料ID'],
    district: row['行政區'],
    village: row['里別'],
    date,
    rocDate: toRocDate_(date),
    weekday: weekday_(date),
    time,
    rawTime: row['設站時間'],
    startTime: parts[0] || '',
    endTime: parts[1] || '',
    siteName: row['設站地點名稱'],
    address: row['地址'],
    hospitalName: row['承接醫療院所名稱'],
    target: row['服務對象'],
    fluBrand: row['流感疫苗廠牌'],
    covidBrand: row['新冠疫苗廠牌'],
    note: row['備註'],
    lat: numericOrBlank_(row['緯度']),
    lng: numericOrBlank_(row['經度']),
    mapUrl: row['地圖連結'] || '',
    queueUrl: row['叫號連結'] || '',
    queueLabel: row['叫號按鈕文字'] || '查看叫號情形',
    queueUpdatedAt: row['叫號更新時間'] || '',
    tags: []
  };
}

function validateSite_(data) {
  const required = ['行政區', '里別', '接種日期', '設站時間', '設站地點名稱', '地址', '承接醫療院所名稱', '服務對象'];
  const missing = required.filter((key) => !data[key]);
  if (missing.length) throw new Error(`請填寫必填欄位：${missing.join('、')}`);
  if (!/^\d{4}-\d{4}$/.test(String(data['設站時間']))) throw new Error('請輸入正確時間格式，例如 0800-1200。');
  ['流感疫苗預估人數', '流感疫苗接種人數', '新冠疫苗預估人數', '新冠疫苗接種人數'].forEach((key) => {
    if (data[key] !== '' && data[key] != null && !/^\d+$/.test(String(data[key]))) {
      throw new Error(`${key} 請輸入 0 或正整數。`);
    }
  });
}

function sanitizePayload_(payload) {
  const data = {};
  Object.keys(payload || {}).forEach((key) => {
    data[key] = sanitizeText_(payload[key]);
  });
  return data;
}

function sanitizeText_(value) {
  return String(value == null ? '' : value).trim();
}

function normalizeInteger_(value) {
  const text = sanitizeText_(value);
  if (!text) return '';
  if (!/^\d+$/.test(text)) throw new Error('人數欄位請輸入 0 或正整數。');
  return Number(text);
}

function calculateRate_(count, estimate) {
  const c = Number(count);
  const e = Number(estimate);
  if (!Number.isFinite(c) || !Number.isFinite(e) || e <= 0) return '';
  return `${Math.round((c / e) * 1000) / 10}%`;
}

function createSiteId_(dateValue) {
  const date = normalizeDate_(dateValue).replace(/-/g, '');
  const rows = readObjects_(SHEETS.sites);
  const sameDayCount = rows.filter((row) => String(row['資料ID']).startsWith(`SITE-${date}-`)).length + 1;
  return `SITE-${date}-${String(sameDayCount).padStart(4, '0')}`;
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
}

function seedSettings_(ss) {
  const sheet = ss.getSheetByName(SHEETS.settings);
  if (sheet.getLastRow() > 1) return;
  sheet.appendRow(['notice', '接種資訊依里辦公處、轄區衛生所或現場公告為主，接種前請務必攜帶健保卡及相關證明文件。', '', nowString_()]);
  sheet.appendRow(['isOpen', '是', '', nowString_()]);
  sheet.appendRow(['title', '桃園市流感及新冠疫苗接種站查詢', '', nowString_()]);
  sheet.appendRow(['defaultView', 'today', '', nowString_()]);
}

function getPublicSettings_() {
  const rows = readObjects_(SHEETS.settings);
  return rows.reduce((settings, row) => {
    settings[row['設定項目']] = row['內容'];
    return settings;
  }, {});
}

function readObjects_(sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values.map((row) => objectFromRow_(headers, row));
}

function objectFromRow_(headers, row) {
  return headers.reduce((obj, header, index) => {
    obj[header] = row[index];
    return obj;
  }, {});
}

function getHeaders_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function findRowById_(sheet, siteId) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf('資料ID');
  for (let i = 1; i < values.length; i += 1) {
    if (values[i][idIndex] === siteId) {
      return { row: i + 1, headers, values: values[i] };
    }
  }
  return null;
}

function setCellByHeader_(sheet, row, headers, header, value) {
  const index = headers.indexOf(header);
  if (index === -1) return;
  sheet.getRange(row, index + 1).setValue(value);
}

function writeHistory_(type, id, action, before, after, data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.history);
  const historyId = `HIS-${Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd-HHmmss')}`;
  sheet.appendRow([
    historyId,
    nowString_(),
    type,
    id,
    action,
    before,
    after,
    data['填報單位'] || '',
    data['填報人'] || '',
    action,
    ''
  ]);
}

function summarize_(data) {
  return JSON.stringify({
    行政區: data['行政區'],
    里別: data['里別'],
    接種日期: data['接種日期'],
    設站時間: data['設站時間'],
    設站地點名稱: data['設站地點名稱'],
    資料狀態: data['資料狀態'],
    是否公開: data['是否公開']
  });
}

function normalizeDate_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, 'Asia/Taipei', 'yyyy-MM-dd');
  }
  const text = String(value || '').trim();
  const roc = text.match(/^(\d{2,3})\/(\d{1,2})\/(\d{1,2})$/);
  if (roc) {
    const year = Number(roc[1]) + 1911;
    return `${year}-${String(roc[2]).padStart(2, '0')}-${String(roc[3]).padStart(2, '0')}`;
  }
  return text;
}

function toRocDate_(isoDate) {
  const parts = String(isoDate).split('-');
  if (parts.length !== 3) return isoDate;
  return `${Number(parts[0]) - 1911}/${Number(parts[1])}/${Number(parts[2])}`;
}

function weekday_(isoDate) {
  const date = new Date(`${isoDate}T00:00:00+08:00`);
  return ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
}

function formatTimeRange_(rawTime) {
  const match = String(rawTime || '').match(/^(\d{2})(\d{2})-(\d{2})(\d{2})$/);
  return match ? `${match[1]}:${match[2]}-${match[3]}:${match[4]}` : String(rawTime || '');
}

function numericOrBlank_(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : '';
}

function nowString_() {
  return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
}
