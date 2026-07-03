const state = {
  meta: {},
  allSites: [],
  filteredSites: [],
  userLocation: null,
  quickMode: "all",
  siteId: "",
  source: "",
  hasQueryFilters: false
};

const elements = {
  siteTitle: document.querySelector("#siteTitle"),
  updatedAt: document.querySelector("#updatedAt"),
  noticeText: document.querySelector("#noticeText"),
  districtFilter: document.querySelector("#districtFilter"),
  villageFilter: document.querySelector("#villageFilter"),
  dateFilter: document.querySelector("#dateFilter"),
  keywordFilter: document.querySelector("#keywordFilter"),
  vaccineFilter: document.querySelector("#vaccineFilter"),
  filterForm: document.querySelector("#filterForm"),
  resultSummary: document.querySelector("#resultSummary"),
  statusMessage: document.querySelector("#statusMessage"),
  cardList: document.querySelector("#cardList"),
  resetButton: document.querySelector("#resetButton"),
  browserHint: document.querySelector("#browserHint")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  applyQueryParams();
  await loadPublicData();
}

function bindEvents() {
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleQuickAction(button.dataset.action));
  });

  elements.filterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.quickMode = "all";
    render();
  });

  elements.districtFilter.addEventListener("change", () => {
    populateVillageOptions();
    render();
  });

  elements.resetButton.addEventListener("click", resetFilters);
}

async function loadPublicData() {
  try {
    const response = await fetch("public.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (payload.isOpen === false) {
      renderClosedState(payload);
      return;
    }

    state.meta = payload;
    state.allSites = Array.isArray(payload.data) ? payload.data : [];
    if (!state.siteId && !state.hasQueryFilters && payload.defaultView && ["today", "tomorrow", "week", "all"].includes(payload.defaultView)) {
      state.quickMode = payload.defaultView;
    }
    elements.siteTitle.textContent = payload.title || "桃園市流感及新冠疫苗接種站查詢";
    elements.updatedAt.textContent = payload.updatedAt || "未提供";
    elements.noticeText.textContent = payload.notice || "接種資訊請依現場公告為準。";

    populateDistrictOptions();
    populateVillageOptions();
    render();
  } catch (error) {
    showMessage("目前暫時無法讀取接種站資料，請稍後再試，或洽轄區衛生所確認接種資訊。", "error");
    elements.resultSummary.textContent = "資料讀取失敗。";
  }
}

function renderClosedState(payload) {
  state.meta = payload || {};
  state.allSites = [];
  state.filteredSites = [];
  elements.siteTitle.textContent = payload.title || "桃園市流感及新冠疫苗接種站查詢";
  elements.updatedAt.textContent = payload.updatedAt || "未提供";
  elements.noticeText.textContent = payload.notice || "接種資訊請依現場公告為準。";
  elements.districtFilter.innerHTML = `<option value="">全部行政區</option>`;
  elements.villageFilter.innerHTML = `<option value="">全部里別</option>`;
  elements.resultSummary.textContent = "目前暫停開放查詢。";
  elements.cardList.innerHTML = "";
  showMessage("本查詢服務尚未開放或資料更新中，請稍後再試，或洽轄區衛生所確認接種資訊。", "info");
}

function applyQueryParams() {
  const params = new URLSearchParams(window.location.search);
  elements.districtFilter.dataset.initial = params.get("district") || "";
  elements.villageFilter.dataset.initial = params.get("village") || "";
  elements.dateFilter.value = params.get("date") || "";
  elements.keywordFilter.value = params.get("keyword") || "";
  state.siteId = params.get("siteId") || "";
  state.source = params.get("source") || "";
  state.hasQueryFilters = Boolean(
    elements.districtFilter.dataset.initial ||
    elements.villageFilter.dataset.initial ||
    elements.dateFilter.value ||
    elements.keywordFilter.value
  );
  if (/Line/i.test(navigator.userAgent) || state.source.toLowerCase() === "line") {
    elements.browserHint.hidden = false;
  }
}

function populateDistrictOptions() {
  const districts = uniqueSorted(state.allSites.map((site) => site.district));
  elements.districtFilter.innerHTML = `<option value="">全部行政區</option>${districts.map(optionHtml).join("")}`;
  if (elements.districtFilter.dataset.initial) {
    elements.districtFilter.value = elements.districtFilter.dataset.initial;
  }
}

function populateVillageOptions() {
  const district = elements.districtFilter.value;
  const sites = district ? state.allSites.filter((site) => site.district === district) : state.allSites;
  const villages = uniqueSorted(sites.flatMap((site) => splitList(site.village)));
  elements.villageFilter.innerHTML = `<option value="">全部里別</option>${villages.map(optionHtml).join("")}`;
  if (elements.villageFilter.dataset.initial) {
    elements.villageFilter.value = elements.villageFilter.dataset.initial;
    elements.villageFilter.dataset.initial = "";
  }
}

function handleQuickAction(action) {
  state.quickMode = action;
  state.siteId = "";

  if (action === "nearby") {
    requestLocation();
    return;
  }

  render();
}

function requestLocation() {
  if (!navigator.geolocation) {
    showMessage("此瀏覽器不支援定位。您仍可使用行政區、日期或地點查詢。", "info");
    state.quickMode = "all";
    render();
    return;
  }

  showMessage("正在取得您的位置。定位僅用於本次排序，不會儲存。", "info");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      hideMessage();
      render();
    },
    () => {
      state.quickMode = "all";
      showMessage("無法取得您的位置。您仍可使用行政區、日期或地點查詢。", "info");
      render();
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
}

function resetFilters() {
  elements.filterForm.reset();
  state.quickMode = "all";
  state.userLocation = null;
  state.siteId = "";
  hideMessage();
  populateVillageOptions();
  render();
}

function render() {
  const filters = readFilters();
  let sites = state.allSites.map(normalizeSite);

  sites = applyQuickMode(sites);
  sites = applyFilters(sites, filters);
  sites = applySiteIdParam(sites);
  sites = sortSites(sites);

  state.filteredSites = sites;
  elements.resultSummary.textContent = buildSummary(sites, filters);
  elements.cardList.innerHTML = sites.length ? sites.map(cardHtml).join("") : emptyStateHtml();
  bindCardActions();
}

function readFilters() {
  return {
    district: elements.districtFilter.value.trim(),
    village: elements.villageFilter.value.trim(),
    date: elements.dateFilter.value,
    keyword: normalizeText(elements.keywordFilter.value),
    vaccine: elements.vaccineFilter.value
  };
}

function applyQuickMode(sites) {
  const today = toLocalDate(new Date());
  const tomorrow = addDays(today, 1);

  if (state.quickMode === "today") {
    return sites.filter((site) => site.date === today);
  }

  if (state.quickMode === "tomorrow") {
    return sites.filter((site) => site.date === tomorrow);
  }

  if (state.quickMode === "week") {
    const end = getWeekEnd(today);
    return sites.filter((site) => site.date >= today && site.date <= end);
  }

  return sites;
}

function applyFilters(sites, filters) {
  return sites.filter((site) => {
    if (filters.district && site.district !== filters.district) return false;
    if (filters.village && !splitList(site.village).includes(filters.village)) return false;
    if (filters.date && site.date !== filters.date) return false;
    if (filters.vaccine === "flu" && !site.fluBrand) return false;
    if (filters.vaccine === "covid" && !site.covidBrand) return false;

    if (filters.keyword) {
      const searchable = [
        site.district,
        site.village,
        site.siteName,
        site.address,
        site.hospitalName,
        site.target,
        site.fluBrand,
        site.covidBrand,
        site.note
      ].map(normalizeText).join(" ");
      if (!searchable.includes(filters.keyword)) return false;
    }

    return true;
  });
}

function applySiteIdParam(sites) {
  if (!state.siteId) return sites;
  return sites.filter((site) => site.id === state.siteId);
}

function sortSites(sites) {
  const copied = [...sites];

  if (state.quickMode === "nearby" && state.userLocation) {
    copied.forEach((site) => {
      site.distanceKm = calculateDistanceKm(state.userLocation, site);
    });
    return copied.sort((a, b) => compareNullable(a.distanceKm, b.distanceKm) || compareDateTime(a, b));
  }

  return copied.sort(comparePublicSites);
}

function comparePublicSites(a, b) {
  const today = toLocalDate(new Date());
  if (a.date === today && b.date === today) {
    const endedCompare = Number(isEndedToday(a)) - Number(isEndedToday(b));
    if (endedCompare !== 0) return endedCompare;
  }
  return compareDateTime(a, b);
}

function compareDateTime(a, b) {
  return String(a.date).localeCompare(String(b.date)) ||
    String(a.startTime || a.time).localeCompare(String(b.startTime || b.time)) ||
    String(a.district).localeCompare(String(b.district), "zh-Hant") ||
    String(a.siteName).localeCompare(String(b.siteName), "zh-Hant");
}

function compareNullable(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
}

function normalizeSite(site) {
  return {
    id: site.id || "",
    district: site.district || "",
    village: site.village || "",
    date: site.date || "",
    rocDate: site.rocDate || site.date || "",
    weekday: site.weekday || "",
    time: site.time || formatRawTime(site.rawTime),
    rawTime: site.rawTime || "",
    startTime: site.startTime || "",
    endTime: site.endTime || "",
    siteName: site.siteName || "",
    address: site.address || "",
    hospitalName: site.hospitalName || "",
    target: site.target || "",
    fluBrand: site.fluBrand || "",
    covidBrand: site.covidBrand || "",
    note: site.note || "",
    lat: Number(site.lat),
    lng: Number(site.lng),
    mapUrl: site.mapUrl || "",
    queueUrl: normalizeExternalUrl(site.queueUrl),
    queueLabel: site.queueLabel || "查看叫號情形",
    queueUpdatedAt: site.queueUpdatedAt || "",
    tags: Array.isArray(site.tags) ? site.tags : []
  };
}

function cardHtml(site) {
  const todayStatus = getTodayStatus(site);
  const distanceText = site.distanceKm == null ? "" : `<span class="badge">距離約 ${site.distanceKm.toFixed(1)} 公里</span>`;
  const mapUrl = site.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address || site.siteName)}`;
  const queueButton = site.queueUrl
    ? `<a href="${escapeAttr(site.queueUrl)}" target="_blank" rel="noopener">${escapeHtml(site.queueLabel)}</a>`
    : "";
  const shareText = buildShareText(site);

  return `
    <article class="site-card">
      <div class="badges">
        <span class="badge">${escapeHtml(site.district)}</span>
        <span class="badge">${escapeHtml(site.village)}</span>
        ${todayStatus}
        ${distanceText}
        ${site.tags.map((tag) => `<span class="badge">${escapeHtml(tag)}</span>`).join("")}
      </div>
      <div class="date-time">${escapeHtml(site.rocDate)}${site.weekday ? `（${escapeHtml(site.weekday)}）` : ""} ${escapeHtml(site.time)}</div>
      <div class="site-name">${escapeHtml(site.siteName)}</div>
      <p class="address">${escapeHtml(site.address)}</p>
      <div class="detail-grid">
        ${fieldHtml("服務院所", site.hospitalName)}
        ${fieldHtml("服務對象", site.target)}
        ${fieldHtml("流感疫苗", site.fluBrand || "請洽現場確認")}
        ${fieldHtml("新冠疫苗", site.covidBrand || "請洽現場確認")}
      </div>
      ${site.note ? `<p class="note"><span class="field-name">備註</span>${escapeHtml(site.note)}</p>` : ""}
      ${site.queueUpdatedAt ? `<p class="meta">叫號資訊更新時間：${escapeHtml(site.queueUpdatedAt)}</p>` : ""}
      <div class="actions">
        <a href="${escapeAttr(mapUrl)}" target="_blank" rel="noopener">開啟地圖</a>
        <button class="secondary" type="button" data-copy-address="${escapeAttr(site.address)}">複製地址</button>
        <button class="secondary" type="button" data-copy-site="${escapeAttr(shareText)}">複製場次資訊</button>
        <button class="secondary" type="button" data-share-site="${escapeAttr(shareText)}">分享場次</button>
        ${queueButton}
      </div>
    </article>
  `;
}

function fieldHtml(label, value) {
  if (!value) return "";
  return `<div><span class="field-name">${escapeHtml(label)}</span><span class="field-value">${escapeHtml(value)}</span></div>`;
}

function getTodayStatus(site) {
  if (isEndedToday(site)) {
    return `<span class="badge ended">今日已結束</span>`;
  }

  const today = toLocalDate(new Date());
  if (site.date !== today) return "";
  return `<span class="badge today">今日可接種</span>`;
}

function isEndedToday(site) {
  const today = toLocalDate(new Date());
  return site.date === today && Boolean(site.endTime) && site.endTime < currentTimeString();
}

function bindCardActions() {
  document.querySelectorAll("[data-copy-address]").forEach((button) => {
    button.addEventListener("click", () => copyText(button.dataset.copyAddress, "地址已複製。"));
  });

  document.querySelectorAll("[data-copy-site]").forEach((button) => {
    button.addEventListener("click", () => copyText(button.dataset.copySite, "場次資訊已複製，可貼到 LINE 或簡訊。"));
  });

  document.querySelectorAll("[data-share-site]").forEach((button) => {
    button.addEventListener("click", () => shareText(button.dataset.shareSite));
  });
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    showMessage(message, "info");
  } catch (error) {
    showMessage("此瀏覽器無法直接複製，請手動選取文字後複製。", "info");
  }
}

async function shareText(text) {
  if (navigator.share) {
    try {
      await navigator.share({
        title: "桃園市流感及新冠疫苗接種站資訊",
        text
      });
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }
  await copyText(text, "此瀏覽器不支援直接分享，場次資訊已改為複製。");
}

function buildShareText(site) {
  const url = new URL(window.location.href);
  url.search = `?siteId=${encodeURIComponent(site.id)}`;
  return [
    "桃園市流感及新冠疫苗接種站資訊",
    `行政區／里別：${site.district} ${site.village}`,
    `日期時間：${site.rocDate} ${site.time}`,
    `接種地點：${site.siteName}`,
    `地址：${site.address}`,
    `服務對象：${site.target}`,
    `查詢連結：${url.toString()}`,
    "提醒：接種資訊依里辦公處、轄區衛生所或現場公告為準，請攜帶健保卡及相關證明文件。"
  ].join("\n");
}

function buildSummary(sites, filters) {
  const active = [];
  if (state.quickMode !== "all") active.push(modeLabel(state.quickMode));
  if (filters.district) active.push(filters.district);
  if (filters.village) active.push(filters.village);
  if (filters.date) active.push(filters.date);
  if (filters.keyword) active.push(`關鍵字：${elements.keywordFilter.value}`);
  if (filters.vaccine) active.push(filters.vaccine === "flu" ? "流感疫苗" : "新冠疫苗");

  return `共找到 ${sites.length} 筆接種站資料${active.length ? `。目前條件：${active.join("｜")}` : "。"}`;
}

function emptyStateHtml() {
  return `
    <div class="status-message info">
      <strong>目前查無符合條件的接種站資料。</strong>
      <p>您可以清除篩選條件，或改查其他日期、行政區。</p>
      <div class="empty-actions">
        <button type="button" class="secondary" onclick="document.querySelector('#resetButton').click()">清除條件</button>
        <button type="button" onclick="document.querySelector('[data-action=week]').click()">查看本週場次</button>
        <button type="button" class="secondary" onclick="document.querySelector('[data-action=all]').click()">查看全部場次</button>
      </div>
    </div>
  `;
}

function showMessage(message, type) {
  elements.statusMessage.hidden = false;
  elements.statusMessage.className = `status-message ${type}`;
  elements.statusMessage.textContent = message;
}

function hideMessage() {
  elements.statusMessage.hidden = true;
  elements.statusMessage.textContent = "";
}

function splitList(value) {
  return String(value || "")
    .split(/[、,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
}

function optionHtml(value) {
  return `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function normalizeExternalUrl(value) {
  const text = String(value || "").trim();
  if (!/^https?:\/\//i.test(text)) return "";
  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch (error) {
    return "";
  }
}

function formatRawTime(value) {
  const match = String(value || "").match(/^(\d{2})(\d{2})-(\d{2})(\d{2})$/);
  return match ? `${match[1]}:${match[2]}-${match[3]}:${match[4]}` : "";
}

function currentTimeString() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function toLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toLocalDate(date);
}

function getWeekEnd(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  const day = date.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  date.setDate(date.getDate() + daysUntilSunday);
  return toLocalDate(date);
}

function calculateDistanceKm(origin, site) {
  if (!Number.isFinite(site.lat) || !Number.isFinite(site.lng)) return null;
  const radiusKm = 6371;
  const dLat = toRadians(site.lat - origin.lat);
  const dLng = toRadians(site.lng - origin.lng);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(origin.lat)) * Math.cos(toRadians(site.lat)) *
    Math.sin(dLng / 2) ** 2;
  return 2 * radiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

function modeLabel(mode) {
  return {
    today: "今日場次",
    tomorrow: "明日場次",
    week: "本週場次",
    nearby: "附近場次"
  }[mode] || "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("\n", "&#10;");
}
