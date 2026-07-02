const SHEETS = {
  sites: '設站資料',
  settings: '公開設定',
  history: '異動紀錄',
  jsonLog: 'JSON輸出紀錄',
  deliveryItems: '宣導品品項表',
  deliveryTasks: '宣導品配送任務表',
  vendors: '廠商資料表',
  system: '系統設定',
  villages: '里別清冊'
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
  ensureSheet_(ss, SHEETS.villages, ['行政區', '里別', '是否啟用', '備註', '最後更新時間']);
  seedSettings_(ss);
  seedSystemSettings_(ss);
  seedDeliveryItems_(ss);
  return { ok: true, message: '工作表初始化完成。' };
}

function listSites(filters) {
  const rows = readObjects_(SHEETS.sites);
  const safeFilters = filters || {};
  return rows.filter((row) => {
    if (safeFilters.district && row['行政區'] !== safeFilters.district) return false;
    if (safeFilters.village && !String(row['里別'] || '').includes(safeFilters.village)) return false;
    if (safeFilters.status && row['資料狀態'] !== safeFilters.status) return false;
    if (safeFilters.isPublic && row['是否公開'] !== safeFilters.isPublic) return false;
    if (safeFilters.date && normalizeDate_(row['接種日期']) !== safeFilters.date) return false;
    if (safeFilters.dateFrom && normalizeDate_(row['接種日期']) < safeFilters.dateFrom) return false;
    if (safeFilters.dateTo && normalizeDate_(row['接種日期']) > safeFilters.dateTo) return false;
    if (safeFilters.siteName && !String(row['設站地點名稱'] || '').includes(safeFilters.siteName)) return false;
    if (safeFilters.hospital && !String(row['承接醫療院所名稱'] || '').includes(safeFilters.hospital)) return false;
    if (safeFilters.target && !String(row['服務對象'] || '').includes(safeFilters.target)) return false;
    if (safeFilters.fluBrand && !String(row['流感疫苗廠牌'] || '').includes(safeFilters.fluBrand)) return false;
    if (safeFilters.covidBrand && !String(row['新冠疫苗廠牌'] || '').includes(safeFilters.covidBrand)) return false;
    if (safeFilters.reportStatus && getReportStatus_(row) !== safeFilters.reportStatus) return false;
    if (safeFilters.deliveryStatus && row['宣導品配送狀態'] !== safeFilters.deliveryStatus) return false;
    if (safeFilters.keyword) {
      const keyword = String(safeFilters.keyword).trim();
      const text = [row['行政區'], row['里別'], row['設站地點名稱'], row['地址'], row['承接醫療院所名稱'], row['服務對象'], row['流感疫苗廠牌'], row['新冠疫苗廠牌'], row['備註']].join(' ');
      if (!text.includes(keyword)) return false;
    }
    return true;
  });
}

function getAppData(filters) {
  const sites = listSites(filters || {});
  const tasks = readObjects_(SHEETS.deliveryTasks);
  return {
    ok: true,
    sites,
    deliveryTasks: tasks,
    deliveryItems: getActiveDeliveryItems(),
    stats: buildStats_(sites, tasks),
    villageCoverage: buildVillageCoverage_(sites)
  };
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
  data['是否申請宣導品'] = data['是否申請宣導品'] || '否';
  data['最後更新時間'] = now;
  data['流感疫苗接種率'] = calculateRate_(data['流感疫苗接種人數'], data['流感疫苗預估人數']);
  data['新冠疫苗接種率'] = calculateRate_(data['新冠疫苗接種人數'], data['新冠疫苗預估人數']);

  sheet.appendRow(headers.map((header) => data[header] || ''));
  writeHistory_('設站資料', siteId, '新增設站資料', '', summarize_(data), data);
  if (data['資料狀態'] === '已發布') {
    createDeliveryTasksForSite_(siteId);
  }

  return { ok: true, id: siteId, message: '設站資料已新增。' };
}

function bulkCreateSites(payloads) {
  const list = Array.isArray(payloads) ? payloads : [];
  if (list.length === 0) throw new Error('沒有可上傳的資料。');
  if (list.length > 100) throw new Error('單次最多可上傳 100 筆，請分批處理。');
  return list.map((payload) => createSite(payload));
}

function updateSite(siteId, payload) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.sites);
  const found = findRowById_(sheet, siteId);
  if (!found) throw new Error('找不到指定資料ID。');
  if (hasDeliveredTask_(siteId)) {
    throw new Error('本筆資料已有宣導品配送任務完成配送，無法修改基本資料。');
  }

  const before = objectFromRow_(found.headers, found.values);
  if (before['是否鎖定'] === '是') {
    throw new Error('此筆資料已鎖定。如需修改基本資料，請先申請解鎖。');
  }

  const data = sanitizePayload_(payload);
  validateSite_(Object.assign({}, before, data));
  const editableHeaders = SITE_HEADERS.filter((header) => !['資料ID', '最後更新時間', '鎖定時間'].includes(header));
  editableHeaders.forEach((header) => {
    if (Object.prototype.hasOwnProperty.call(data, header)) {
      setCellByHeader_(sheet, found.row, found.headers, header, data[header]);
    }
  });
  setCellByHeader_(sheet, found.row, found.headers, '最後更新時間', nowString_());

  const after = objectFromRow_(found.headers, sheet.getRange(found.row, 1, 1, found.headers.length).getValues()[0]);
  writeHistory_('設站資料', siteId, '修改草稿資料', summarize_(before), summarize_(after), after);
  syncDeliveryTasksForSite_(siteId, after);
  return { ok: true, message: '設站資料已更新。' };
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
  const result = setSiteStatus_(siteId, '已發布', '是', '是', '發布資料');
  createDeliveryTasksForSite_(siteId);
  return result;
}

function unpublishSite(siteId) {
  return setSiteStatus_(siteId, '下架', '否', '是', '下架資料');
}

function requestUnlock(siteId, payload) {
  const data = sanitizePayload_(payload || {});
  if (!data['解鎖申請人']) throw new Error('請填寫解鎖申請人。');

  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.sites);
  const found = findRowById_(sheet, siteId);
  if (!found) throw new Error('找不到指定資料ID。');
  if (hasDeliveredTask_(siteId)) {
    throw new Error('本筆資料已有宣導品配送任務完成配送，無法申請解鎖修改。');
  }

  const before = objectFromRow_(found.headers, found.values);
  setCellByHeader_(sheet, found.row, found.headers, '解鎖申請狀態', '待審核');
  setCellByHeader_(sheet, found.row, found.headers, '解鎖申請時間', nowString_());
  setCellByHeader_(sheet, found.row, found.headers, '解鎖申請人', data['解鎖申請人']);
  setCellByHeader_(sheet, found.row, found.headers, '解鎖申請原因', data['解鎖申請原因'] || '');
  setCellByHeader_(sheet, found.row, found.headers, '最後更新時間', nowString_());

  const after = objectFromRow_(found.headers, sheet.getRange(found.row, 1, 1, found.headers.length).getValues()[0]);
  writeHistory_('設站資料', siteId, '申請解鎖', summarize_(before), summarize_(after), after);
  return { ok: true, message: '已送出解鎖申請。' };
}

function reviewUnlock(siteId, payload) {
  const data = sanitizePayload_(payload || {});
  validateAdminCode_(data.adminCode);
  if (!data.action || !['核准解鎖', '退回申請'].includes(data.action)) {
    throw new Error('請選擇核准解鎖或退回申請。');
  }

  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.sites);
  const found = findRowById_(sheet, siteId);
  if (!found) throw new Error('找不到指定資料ID。');
  const before = objectFromRow_(found.headers, found.values);
  if (data.action === '核准解鎖' && hasDeliveredTask_(siteId)) {
    throw new Error('本筆資料已有宣導品配送任務完成配送，無法解鎖修改。');
  }

  const now = nowString_();
  setCellByHeader_(sheet, found.row, found.headers, '解鎖申請狀態', data.action === '核准解鎖' ? '已核准' : '已退回');
  setCellByHeader_(sheet, found.row, found.headers, '解鎖審核時間', now);
  setCellByHeader_(sheet, found.row, found.headers, '解鎖審核人', data.reviewer || '管理者');
  if (data.action === '核准解鎖') {
    setCellByHeader_(sheet, found.row, found.headers, '是否鎖定', '否');
    setCellByHeader_(sheet, found.row, found.headers, '解鎖時間', now);
  }
  setCellByHeader_(sheet, found.row, found.headers, '最後更新時間', now);

  const after = objectFromRow_(found.headers, sheet.getRange(found.row, 1, 1, found.headers.length).getValues()[0]);
  writeHistory_('設站資料', siteId, data.action, summarize_(before), summarize_(after), after);
  return { ok: true, message: `${data.action}完成。` };
}

function verifyAdminAccess(payload) {
  const data = sanitizePayload_(payload || {});
  validateAdminCode_(data.adminCode);
  return { ok: true, message: '管理碼驗證通過。' };
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

function getActiveDeliveryItems() {
  return readObjects_(SHEETS.deliveryItems)
    .filter((row) => row['是否啟用'] === '是')
    .sort((a, b) => Number(a['顯示順序'] || 999) - Number(b['顯示順序'] || 999));
}

function createManualDeliveryTask(payload) {
  const data = sanitizePayload_(payload || {});
  const required = ['行政區', '地點名稱', '地址', '配送聯絡人', '配送聯絡電話', '宣導品ID', '宣導品名稱', '申請數量'];
  const missing = required.filter((key) => !data[key]);
  if (missing.length) throw new Error(`請填寫必填欄位：${missing.join('、')}`);
  if (!/^\d+$/.test(String(data['申請數量']))) throw new Error('申請數量請輸入 0 或正整數。');

  const task = Object.assign({}, data, {
    '配送任務ID': createTaskId_(),
    '年度': data['年度'] || String(new Date().getFullYear() - 1911),
    '來源類型': '管理者建立',
    '來源資料ID': '',
    '預計配送數量': data['申請數量'],
    '地點類型': data['地點類型'] || '其他',
    '是否關聯接種站': '否',
    '關聯接種站資料ID': '',
    '配送狀態': data['配送狀態'] || '未配送',
    '最後更新時間': nowString_()
  });
  appendObject_(SHEETS.deliveryTasks, task);
  writeHistory_('宣導品配送任務', task['配送任務ID'], '非接種站配送任務新增', '', summarizeDelivery_(task), task);
  return { ok: true, id: task['配送任務ID'], message: '已建立非接種站配送任務。' };
}

function updateDeliveryTask(payload) {
  const data = sanitizePayload_(payload || {});
  if (!data['配送任務ID']) throw new Error('缺少配送任務ID。');
  if (data['申請數量'] && !/^\d+$/.test(String(data['申請數量']))) throw new Error('申請數量請輸入 0 或正整數。');
  if (data['預計配送數量'] && !/^\d+$/.test(String(data['預計配送數量']))) throw new Error('預計配送數量請輸入 0 或正整數。');
  if (data['實際配送數量'] && !/^\d+$/.test(String(data['實際配送數量']))) throw new Error('實際配送數量請輸入 0 或正整數。');

  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.deliveryTasks);
  const found = findDeliveryTaskById_(sheet, data['配送任務ID']);
  if (!found) throw new Error('找不到指定配送任務。');

  const before = objectFromRow_(found.headers, found.values);
  const editableHeaders = [
    '申請數量', '預計配送數量', '實際配送數量', '配送狀態', '預計配送日期', '實際配送日期',
    '廠商ID', '廠商名稱', '廠商聯絡人', '廠商聯絡電話', '物流方式', '物流單號', '備註'
  ];
  editableHeaders.forEach((header) => {
    if (Object.prototype.hasOwnProperty.call(data, header)) {
      setCellByHeader_(sheet, found.row, found.headers, header, data[header]);
    }
  });
  setCellByHeader_(sheet, found.row, found.headers, '最後更新時間', nowString_());

  const after = objectFromRow_(found.headers, sheet.getRange(found.row, 1, 1, found.headers.length).getValues()[0]);
  const action = data['配送狀態'] === '取消' ? '取消宣導品配送任務' : '修改宣導品配送任務';
  writeHistory_('宣導品配送任務', data['配送任務ID'], action, summarizeDelivery_(before), summarizeDelivery_(after), after);
  return { ok: true, message: '配送任務已更新。' };
}

function vendorLogin(payload) {
  const data = sanitizePayload_(payload || {});
  const vendor = readObjects_(SHEETS.vendors).find((row) =>
    row['廠商名稱'] === data.vendorName &&
    row['廠商查詢碼'] === data.vendorCode &&
    row['是否啟用'] !== '否'
  );
  if (!vendor) throw new Error('廠商名稱或查詢碼錯誤，請確認後重新輸入。');

  const tasks = readObjects_(SHEETS.deliveryTasks).filter((task) => task['廠商名稱'] === vendor['廠商名稱']);
  return { ok: true, vendorName: vendor['廠商名稱'], tasks };
}

function vendorReportDelivery(payload) {
  const data = sanitizePayload_(payload || {});
  if (!data['配送任務ID']) throw new Error('缺少配送任務ID。');
  if (!data['廠商回報人']) throw new Error('請填寫廠商回報人。');

  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.deliveryTasks);
  const found = findDeliveryTaskById_(sheet, data['配送任務ID']);
  if (!found) throw new Error('找不到指定配送任務。');

  const before = objectFromRow_(found.headers, found.values);
  ['實際配送數量', '配送狀態', '實際配送日期', '物流方式', '物流單號', '廠商回報人', '備註'].forEach((header) => {
    if (Object.prototype.hasOwnProperty.call(data, header)) {
      setCellByHeader_(sheet, found.row, found.headers, header, data[header]);
    }
  });
  setCellByHeader_(sheet, found.row, found.headers, '廠商回報時間', nowString_());
  setCellByHeader_(sheet, found.row, found.headers, '最後更新時間', nowString_());

  const after = objectFromRow_(found.headers, sheet.getRange(found.row, 1, 1, found.headers.length).getValues()[0]);
  writeHistory_('宣導品配送任務', data['配送任務ID'], '廠商回報配送結果', summarizeDelivery_(before), summarizeDelivery_(after), after);
  return { ok: true, message: '配送回報已更新。' };
}

function exportNoticeCsv(filters) {
  const rows = listSites(filters || {});
  const output = [['行政區', '里別', '設站地點', '接種日期', '設站時間']];
  rows.forEach((row) => {
    splitMultiValue_(row['里別']).forEach((village) => {
      output.push([row['行政區'], village, row['設站地點名稱'], row['接種日期'], row['設站時間']]);
    });
  });
  writeHistory_('匯出資料', 'EXPORT', '匯出資料', '', `匯出 ${output.length - 1} 筆`, {});
  return output.map((line) => line.map(csvCell_).join(',')).join('\r\n');
}

function getReminderText(filters) {
  const sites = listSites(filters || {});
  const unfinished = sites.filter((site) => {
    const fluNeed = Number(site['流感疫苗預估人數'] || 0) > 0 && site['流感疫苗接種人數'] === '';
    const covidNeed = Number(site['新冠疫苗預估人數'] || 0) > 0 && site['新冠疫苗接種人數'] === '';
    return fluNeed || covidNeed;
  });
  if (!unfinished.length) return '目前查無需稽催的未回報場次。';
  return unfinished.map((site) => `${site['行政區']} ${site['里別']} ${site['接種日期']} ${site['設站時間']} ${site['設站地點名稱']} 尚未完成接種人數回報，請協助確認。`).join('\n');
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

function seedSystemSettings_(ss) {
  const sheet = ss.getSheetByName(SHEETS.system);
  if (sheet.getLastRow() > 1) return;
  sheet.appendRow(['管理功能密碼', '', '請由管理者自行填入，不要寫死在程式碼。', nowString_()]);
  sheet.appendRow(['是否開放新增', '是', '', nowString_()]);
  sheet.appendRow(['是否開放回報', '是', '', nowString_()]);
  sheet.appendRow(['是否開放宣導品申請', '是', '', nowString_()]);
  sheet.appendRow(['是否開放廠商回報', '是', '', nowString_()]);
  sheet.appendRow(['民眾端JSON輸出模式', '手動', '', nowString_()]);
}

function seedDeliveryItems_(ss) {
  const sheet = ss.getSheetByName(SHEETS.deliveryItems);
  if (sheet.getLastRow() > 1) return;
  sheet.appendRow(['ITEM-115-0001', '115', '流感疫苗宣導海報', '海報', 'A3', '張', '是', 1, '範例品項，可依實際需求修改。', nowString_()]);
  sheet.appendRow(['ITEM-115-0002', '115', '流感疫苗接種提醒單張', '單張', 'A4', '份', '是', 2, '範例品項，可依實際需求修改。', nowString_()]);
  sheet.appendRow(['ITEM-115-0003', '115', '新冠疫苗宣導單張', '單張', 'A4', '份', '是', 3, '範例品項，可依實際需求修改。', nowString_()]);
  sheet.appendRow(['ITEM-115-0004', '115', '疫苗設站宣導布條', '布條', '一般', '條', '是', 4, '範例品項，可依實際需求修改。', nowString_()]);
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

function appendObject_(sheetName, data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  const headers = getHeaders_(sheet);
  sheet.appendRow(headers.map((header) => data[header] || ''));
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

function findDeliveryTaskById_(sheet, taskId) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf('配送任務ID');
  for (let i = 1; i < values.length; i += 1) {
    if (values[i][idIndex] === taskId) {
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

function summarizeDelivery_(data) {
  return JSON.stringify({
    配送任務ID: data['配送任務ID'],
    宣導品名稱: data['宣導品名稱'],
    申請數量: data['申請數量'],
    配送狀態: data['配送狀態'],
    地點名稱: data['地點名稱'],
    廠商名稱: data['廠商名稱']
  });
}

function createDeliveryTasksForSite_(siteId) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.sites);
  const found = findRowById_(sheet, siteId);
  if (!found) return [];
  const site = objectFromRow_(found.headers, found.values);
  if (site['是否申請宣導品'] !== '是') return [];

  const requests = parseDeliveryRequests_(site);
  if (!requests.length) return [];

  const existing = readObjects_(SHEETS.deliveryTasks);
  const created = [];
  requests.forEach((request) => {
    const existed = existing.find((task) =>
      task['來源資料ID'] === siteId &&
      task['宣導品ID'] === request.itemId &&
      task['配送狀態'] !== '取消'
    );
    if (existed) return;

    const task = {
      '配送任務ID': createTaskId_(),
      '年度': String(new Date().getFullYear() - 1911),
      '來源類型': '接種站申請',
      '來源資料ID': siteId,
      '宣導品ID': request.itemId,
      '宣導品名稱': request.name,
      '申請數量': request.quantity,
      '預計配送數量': request.quantity,
      '地點類型': '接種站',
      '行政區': site['行政區'],
      '里別': site['里別'],
      '地點名稱': site['設站地點名稱'],
      '地址': site['宣導品配送地址'] || site['地址'],
      '配送聯絡人': site['宣導品配送聯絡人'] || site['填報人'],
      '配送聯絡電話': site['宣導品配送聯絡電話'],
      '是否關聯接種站': '是',
      '關聯接種站資料ID': siteId,
      '配送狀態': '未配送',
      '備註': site['宣導品配送備註'],
      '最後更新時間': nowString_()
    };
    appendObject_(SHEETS.deliveryTasks, task);
    writeHistory_('宣導品配送任務', task['配送任務ID'], '自動產生宣導品配送任務', '', summarizeDelivery_(task), task);
    created.push(task);
  });
  return created;
}

function parseDeliveryRequests_(site) {
  const names = splitMultiValue_(site['宣導品申請品項']);
  const quantities = splitMultiValue_(site['宣導品申請數量']);
  const activeItems = getActiveDeliveryItems();
  return names.map((name, index) => {
    const matched = activeItems.find((item) => item['宣導品名稱'] === name || item['宣導品ID'] === name);
    const quantity = Number(quantities[index] || 0);
    if (!matched || !Number.isFinite(quantity) || quantity <= 0) return null;
    return {
      itemId: matched['宣導品ID'],
      name: matched['宣導品名稱'],
      quantity
    };
  }).filter(Boolean);
}

function syncDeliveryTasksForSite_(siteId, site) {
  if (site['資料狀態'] !== '已發布') return;

  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.deliveryTasks);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    createDeliveryTasksForSite_(siteId);
    return;
  }

  const headers = values[0];
  const requests = site['是否申請宣導品'] === '是' ? parseDeliveryRequests_(site) : [];
  const requestByItemId = {};
  requests.forEach((request) => {
    requestByItemId[request.itemId] = request;
  });

  for (let index = 1; index < values.length; index += 1) {
    const rowNumber = index + 1;
    const task = objectFromRow_(headers, values[index]);
    if (!isSiteDeliveryTask_(task, siteId) || !isSyncableDeliveryStatus_(task['配送狀態'])) continue;

    const request = requestByItemId[task['宣導品ID']];
    if (!request) {
      updateDeliveryTaskRow_(sheet, rowNumber, headers, task, {
        '配送狀態': '取消',
        '備註': mergeNotes_(task['備註'], '接種站資料已取消此宣導品申請'),
        '最後更新時間': nowString_()
      }, '取消宣導品配送任務');
      continue;
    }

    updateDeliveryTaskRow_(sheet, rowNumber, headers, task, {
      '宣導品名稱': request.name,
      '申請數量': request.quantity,
      '預計配送數量': request.quantity,
      '行政區': site['行政區'],
      '里別': site['里別'],
      '地點名稱': site['設站地點名稱'],
      '地址': site['宣導品配送地址'] || site['地址'],
      '配送聯絡人': site['宣導品配送聯絡人'] || site['填報人'],
      '配送聯絡電話': site['宣導品配送聯絡電話'],
      '備註': site['宣導品配送備註'],
      '最後更新時間': nowString_()
    }, '同步接種站配送任務');
  }

  createDeliveryTasksForSite_(siteId);
}

function updateDeliveryTaskRow_(sheet, rowNumber, headers, before, updates, action) {
  let changed = false;
  Object.keys(updates).forEach((header) => {
    if (header === '最後更新時間') return;
    if (String(before[header] || '') !== String(updates[header] || '')) {
      setCellByHeader_(sheet, rowNumber, headers, header, updates[header]);
      changed = true;
    }
  });
  if (!changed) return;
  if (Object.prototype.hasOwnProperty.call(updates, '最後更新時間')) {
    setCellByHeader_(sheet, rowNumber, headers, '最後更新時間', updates['最後更新時間']);
  }
  const after = objectFromRow_(headers, sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0]);
  writeHistory_('宣導品配送任務', before['配送任務ID'], action, summarizeDelivery_(before), summarizeDelivery_(after), after);
}

function isSiteDeliveryTask_(task, siteId) {
  const id = String(siteId || '');
  return task['來源類型'] === '接種站申請' &&
    (String(task['來源資料ID'] || '') === id || String(task['關聯接種站資料ID'] || '') === id);
}

function isSyncableDeliveryStatus_(status) {
  return ['未配送', '配送中', '異常'].includes(String(status || '未配送'));
}

function mergeNotes_(existing, note) {
  const oldNote = String(existing || '').trim();
  return oldNote ? `${oldNote}；${note}` : note;
}

function buildStats_(sites, tasks) {
  const unpublished = sites.filter((site) => site['資料狀態'] !== '已發布').length;
  const published = sites.filter((site) => site['資料狀態'] === '已發布').length;
  const unreported = sites.filter((site) => getReportStatus_(site) === '未回報').length;
  const pendingDelivery = tasks.filter((task) => ['未配送', '配送中', '異常'].includes(task['配送狀態'])).length;
  const delivered = tasks.filter((task) => task['配送狀態'] === '已配送').length;
  const activeDeliveryTasks = tasks.filter((task) => task['配送狀態'] !== '取消');
  return {
    totalSites: sites.length,
    published,
    unpublished,
    unreported,
    totalDeliveryTasks: tasks.length,
    pendingDelivery,
    delivered,
    deliveryCompletionRate: calculatePercent_(delivered, activeDeliveryTasks.length),
    districtStats: buildDistrictStats_(sites)
  };
}

function buildDistrictStats_(sites) {
  const groups = {};
  sites.forEach((site) => {
    const district = site['行政區'] || '未填行政區';
    if (!groups[district]) {
      groups[district] = {
        district,
        totalSites: 0,
        published: 0,
        unreported: 0
      };
    }
    groups[district].totalSites += 1;
    if (site['資料狀態'] === '已發布') groups[district].published += 1;
    if (getReportStatus_(site) === '未回報') groups[district].unreported += 1;
  });
  return Object.keys(groups)
    .sort()
    .map((district) => groups[district]);
}

function calculatePercent_(numerator, denominator) {
  const n = Number(numerator || 0);
  const d = Number(denominator || 0);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return '0%';
  return `${Math.round((n / d) * 1000) / 10}%`;
}

function buildVillageCoverage_(sites) {
  const villages = readObjects_(SHEETS.villages)
    .filter((row) => row['行政區'] && row['里別'] && row['是否啟用'] !== '否');
  if (!villages.length) {
    return {
      totalVillages: 0,
      coveredVillages: 0,
      uncoveredCount: 0,
      uncovered: [],
      reminderText: '尚未建立里別清冊。請先在 Google Sheet 的「里別清冊」填入行政區、里別與是否啟用。'
    };
  }

  const coveredKeys = {};
  sites
    .filter((site) => site['資料狀態'] === '已發布' && site['是否公開'] === '是')
    .forEach((site) => {
      splitMultiValue_(site['里別']).forEach((village) => {
        coveredKeys[villageKey_(site['行政區'], village)] = true;
      });
    });

  const uncovered = villages
    .filter((row) => !coveredKeys[villageKey_(row['行政區'], row['里別'])])
    .map((row) => ({
      district: row['行政區'],
      village: row['里別'],
      note: row['備註'] || ''
    }));

  return {
    totalVillages: villages.length,
    coveredVillages: villages.length - uncovered.length,
    uncoveredCount: uncovered.length,
    uncovered,
    reminderText: buildUncoveredVillageText_(uncovered)
  };
}

function buildUncoveredVillageText_(uncovered) {
  if (!uncovered.length) return '目前里別清冊內的啟用里別皆已有已發布且公開的設站資料。';
  const byDistrict = uncovered.reduce((groups, row) => {
    const district = row.district || '未填行政區';
    if (!groups[district]) groups[district] = [];
    groups[district].push(row.village);
    return groups;
  }, {});
  return Object.keys(byDistrict)
    .sort()
    .map((district) => `${district} 尚未設站里別：${byDistrict[district].join('、')}`)
    .join('\n');
}

function villageKey_(district, village) {
  return `${String(district || '').trim()}__${String(village || '').trim()}`;
}

function getReportStatus_(site) {
  const fluNeed = Number(site['流感疫苗預估人數'] || 0) > 0 && site['流感疫苗接種人數'] === '';
  const covidNeed = Number(site['新冠疫苗預估人數'] || 0) > 0 && site['新冠疫苗接種人數'] === '';
  return fluNeed || covidNeed ? '未回報' : '已回報';
}

function validateAdminCode_(inputCode) {
  const settings = readObjects_(SHEETS.system);
  const row = settings.find((item) => item['設定項目'] === '管理功能密碼');
  const code = row ? String(row['設定值'] || '') : '';
  if (!code) throw new Error('尚未設定管理功能密碼，請先至系統設定表填入。');
  if (String(inputCode || '') !== code) throw new Error('管理碼錯誤，請確認後重新輸入。');
}

function hasDeliveredTask_(siteId) {
  const id = String(siteId || '');
  return readObjects_(SHEETS.deliveryTasks).some((task) =>
    task['配送狀態'] === '已配送' &&
    (String(task['關聯接種站資料ID'] || '') === id || String(task['來源資料ID'] || '') === id)
  );
}

function createTaskId_() {
  const date = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd');
  const rows = readObjects_(SHEETS.deliveryTasks);
  const count = rows.filter((row) => String(row['配送任務ID']).startsWith(`DEL-${date}-`)).length + 1;
  return `DEL-${date}-${String(count).padStart(4, '0')}`;
}

function splitMultiValue_(value) {
  return String(value || '')
    .split(/[、,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function csvCell_(value) {
  const text = String(value == null ? '' : value);
  return `"${text.replace(/"/g, '""')}"`;
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
