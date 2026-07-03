const state = {
  meta: {},
  allSites: [],
  filteredSites: [],
  userLocation: null,
  quickMode: "all",
  siteId: "",
  source: "",
  hasQueryFilters: false,
  page: 1,
  pageSize: 3
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
  brandFilter: document.querySelector("#brandFilter"),
  brandOptions: document.querySelector("#brandOptions"),
  filterForm: document.querySelector("#filterForm"),
  resultSummary: document.querySelector("#resultSummary"),
  resultArea: document.querySelector("#resultArea"),
  statusMessage: document.querySelector("#statusMessage"),
  cardList: document.querySelector("#cardList"),
  resultPager: document.querySelector("#resultPager"),
  resetButton: document.querySelector("#resetButton"),
  editSearchButton: document.querySelector("#editSearchButton"),
  noticeButton: document.querySelector("#noticeButton"),
  closeNoticeButton: document.querySelector("#closeNoticeButton"),
  closeBrowserHintButton: document.querySelector("#closeBrowserHintButton"),
  noticePanel: document.querySelector(".notice"),
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
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => handleQuickAction(button.dataset.action));
  });

  elements.filterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.quickMode = "all";
    state.page = 1;
    render();
    scrollToResults();
  });

  elements.districtFilter.addEventListener("change", () => {
    populateVillageOptions();
    state.page = 1;
    render();
    scrollToResults();
  });
  elements.villageFilter.addEventListener("input", () => {
    state.page = 1;
  });
  elements.vaccineFilter.addEventListener("change", () => {
    populateBrandOptions();
    state.page = 1;
    render();
  });

  elements.resetButton.addEventListener("click", resetFilters);
  elements.editSearchButton.addEventListener("click", () => {
    elements.filterForm.scrollIntoView({ behavior: "smooth", block: "start" });
    elements.districtFilter.focus({ preventScroll: true });
  });
  elements.noticeButton.addEventListener("click", openNotice);
  elements.closeNoticeButton.addEventListener("click", closeNotice);
  elements.closeBrowserHintButton.addEventListener("click", closeBrowserHint);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNotice();
      closeBrowserHint();
    }
  });
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
    openNoticeOnce();
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
  if (elements.resultPager) {
    elements.resultPager.hidden = true;
    elements.resultPager.innerHTML = "";
  }
  showMessage("本查詢服務尚未開放或資料更新中，請稍後再試，或洽轄區衛生所確認接種資訊。", "info");
  openNotice();
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
  if ((/Line/i.test(navigator.userAgent) || state.source.toLowerCase() === "line") && sessionStorage.getItem("vaccineBrowserHintClosed") !== "1") {
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
  const list = document.querySelector("#villageOptions");
  list.innerHTML = villages.map(optionHtml).join("");
  if (elements.villageFilter.dataset.initial) {
    elements.villageFilter.value = elements.villageFilter.dataset.initial;
    elements.villageFilter.dataset.initial = "";
  }
}

function populateBrandOptions() {
  const vaccine = elements.vaccineFilter.value;
  const brandField = vaccine === "flu" ? "fluBrand" : vaccine === "covid" ? "covidBrand" : "";
  const brands = brandField ? uniqueSorted(state.allSites.flatMap((site) => splitList(site[brandField]))) : [];
  elements.brandFilter.hidden = !brandField || brands.length === 0;
  elements.brandOptions.innerHTML = brands.map((brand) => `
    <label>
      <input type="checkbox" value="${escapeAttr(brand)}" data-brand-option>
      <span>${escapeHtml(brand)}</span>
    </label>
  `).join("");
  elements.brandOptions.querySelectorAll("[data-brand-option]").forEach((input) => {
    input.addEventListener("change", () => {
      state.page = 1;
      render();
    });
  });
}

function handleQuickAction(action) {
  state.quickMode = action;
  state.siteId = "";
  state.page = 1;

  if (action === "nearby") {
    requestLocation();
    return;
  }

  render();
  scrollToResults();
}

function requestLocation() {
  if (!navigator.geolocation) {
    showMessage("此瀏覽器不支援定位。您仍可使用行政區、日期或地點查詢。", "info");
    state.quickMode = "all";
    render();
    scrollToResults();
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
      state.page = 1;
      render();
      scrollToResults();
    },
    () => {
      state.quickMode = "all";
      showMessage("無法取得您的位置。您仍可使用行政區、日期或地點查詢。", "info");
      render();
      scrollToResults();
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
}

function resetFilters() {
  elements.filterForm.reset();
  elements.brandOptions.innerHTML = "";
  elements.brandFilter.hidden = true;
  elements.districtFilter.dataset.initial = "";
  elements.villageFilter.dataset.initial = "";
  state.quickMode = "all";
  state.userLocation = null;
  state.siteId = "";
  state.page = 1;
  hideMessage();
  populateVillageOptions();
  render();
  scrollToResults();
}

function render() {
  const filters = readFilters();
  let sites = state.allSites.map(normalizeSite);

  sites = applyQuickMode(sites);
  sites = applyFilters(sites, filters);
  sites = applySiteIdParam(sites);
  sites = sortSites(sites);

  state.filteredSites = sites;
  const totalPages = Math.max(1, Math.ceil(sites.length / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  const startIndex = (state.page - 1) * state.pageSize;
  const visibleSites = sites.slice(startIndex, startIndex + state.pageSize);
  elements.resultSummary.textContent = buildSummary(sites, filters);
  elements.cardList.innerHTML = sites.length ? visibleSites.map(cardHtml).join("") : emptyStateHtml();
  renderPager(sites.length, totalPages);
  syncQuickActionState();
  bindCardActions();
  bindPagerActions();
  bindEmptyStateActions();
}

function renderPager(totalItems, totalPages) {
  if (!elements.resultPager) return;
  if (totalItems <= state.pageSize) {
    elements.resultPager.hidden = true;
    elements.resultPager.innerHTML = "";
    return;
  }

  elements.resultPager.hidden = false;
  elements.resultPager.innerHTML = `
    <button class="secondary" type="button" data-page-direction="prev" ${state.page <= 1 ? "disabled" : ""}>上一頁</button>
    <span>第 ${state.page} / ${totalPages} 頁</span>
    <button class="secondary" type="button" data-page-direction="next" ${state.page >= totalPages ? "disabled" : ""}>下一頁</button>
  `;
}

function bindPagerActions() {
  if (!elements.resultPager) return;
  elements.resultPager.querySelectorAll("[data-page-direction]").forEach((button) => {
    button.addEventListener("click", () => {
      state.page += button.dataset.pageDirection === "next" ? 1 : -1;
      render();
      scrollToResults();
    });
  });
}

function syncQuickActionState() {
  document.querySelectorAll("[data-action]").forEach((button) => {
    const isActive = button.dataset.action === state.quickMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function readFilters() {
  return {
    district: elements.districtFilter.value.trim(),
    village: elements.villageFilter.value.trim(),
    date: elements.dateFilter.value,
    keyword: normalizeText(elements.keywordFilter.value),
    vaccine: elements.vaccineFilter.value,
    brands: Array.from(elements.brandOptions.querySelectorAll("[data-brand-option]:checked")).map((input) => input.value)
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
    if (filters.brands.length) {
      const brandText = filters.vaccine === "flu" ? site.fluBrand : site.covidBrand;
      const siteBrands = splitList(brandText);
      if (!filters.brands.some((brand) => siteBrands.includes(brand))) return false;
    }

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
  const mapUrl = buildNavigationUrl(site);
  const queueButton = site.queueUrl
    ? `<a href="${escapeAttr(site.queueUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(site.queueLabel)}</a>`
    : "";
  const shareText = buildShareText(site);
  const mapShareUrl = buildMapShareUrl(site);
  const domId = safeDomId(site.id || `${site.date}-${site.siteName}`);

  return `
    <article class="site-card">
      <div class="card-top">
        <div class="badges">
          <span class="badge">${escapeHtml(site.district)}</span>
          <span class="badge">${escapeHtml(site.village)}</span>
          ${todayStatus}
          ${distanceText}
          ${site.tags.map((tag) => `<span class="badge">${escapeHtml(tag)}</span>`).join("")}
        </div>
        <div class="icon-actions" aria-label="場次操作">
          <button class="icon-button" type="button" data-copy-site="${escapeAttr(shareText)}" title="複製場次資訊" aria-label="複製場次資訊">⧉</button>
          <button class="icon-button" type="button" data-share-site="${escapeAttr(mapShareUrl)}" title="分享 Google Maps 位置" aria-label="分享 Google Maps 位置">↗</button>
        </div>
      </div>
      <div class="date-time">${escapeHtml(site.rocDate)}${site.weekday ? `（${escapeHtml(site.weekday)}）` : ""} ${escapeHtml(site.time)}</div>
      <div class="site-name">${escapeHtml(site.siteName)}</div>
      <p class="address">
        <span>${escapeHtml(site.address)}</span>
        <button class="text-icon-button" type="button" data-copy-address="${escapeAttr(site.address)}" title="複製地址" aria-label="複製地址">⧉</button>
      </p>
      <button class="secondary expand-button" type="button" data-toggle-site="${escapeAttr(domId)}" aria-expanded="false" aria-controls="site-extra-${escapeAttr(domId)}">查看完整資訊</button>
      <div class="site-extra" id="site-extra-${escapeAttr(domId)}" hidden>
      <div class="detail-grid">
        ${fieldHtml("服務院所", site.hospitalName)}
        ${fieldHtml("服務對象", site.target)}
        ${fieldHtml("流感疫苗", site.fluBrand || "請洽現場確認")}
        ${fieldHtml("新冠疫苗", site.covidBrand || "請洽現場確認")}
      </div>
      ${site.note ? `<p class="note"><span class="field-name">備註</span>${escapeHtml(site.note)}</p>` : ""}
      <div class="actions">
        <a href="${escapeAttr(mapUrl)}" target="_blank" rel="noopener noreferrer">開啟導航</a>
        ${queueButton}
      </div>
      </div>
    </article>
  `;
}

function safeDomId(value) {
  return String(value || "site")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "site";
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
  document.querySelectorAll("[data-toggle-site]").forEach((button) => {
    button.addEventListener("click", () => toggleSiteDetails(button));
  });

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

function toggleSiteDetails(button) {
  const target = document.getElementById(`site-extra-${button.dataset.toggleSite}`);
  if (!target) return;
  const shouldOpen = target.hidden;
  target.hidden = !shouldOpen;
  button.setAttribute("aria-expanded", String(shouldOpen));
  button.textContent = shouldOpen ? "收合完整資訊" : "查看完整資訊";
  button.closest(".site-card")?.classList.toggle("is-expanded", shouldOpen);
}

function bindEmptyStateActions() {
  document.querySelectorAll("[data-empty-action]").forEach((button) => {
    button.addEventListener("click", () => handleEmptyAction(button.dataset.emptyAction));
  });
}

function handleEmptyAction(action) {
  if (action === "reset") {
    elements.resetButton.click();
    return;
  }

  const target = document.querySelector(`[data-action="${action}"]`);
  if (target) target.click();
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
        title: "Google Maps 位置",
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
  return [
    "桃園市流感及新冠疫苗接種站資訊",
    `行政區／里別：${site.district} ${site.village}`,
    `日期時間：${site.rocDate} ${site.time}`,
    `接種地點：${site.siteName}`,
    `地址：${site.address}`,
    `服務對象：${site.target}`,
    `Google Maps：${buildMapShareUrl(site)}`,
    "提醒：接種資訊依里辦公處、轄區衛生所或現場公告為準，請攜帶健保卡及相關證明文件。"
  ].join("\n");
}

function buildMapShareUrl(site) {
  if (site.mapUrl) return site.mapUrl;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address || site.siteName)}`;
}

function buildNavigationUrl(site) {
  const destination = site.lat && site.lng ? `${site.lat},${site.lng}` : (site.address || site.siteName);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

function buildSummary(sites, filters) {
  const active = [];
  if (state.quickMode !== "all") active.push(modeLabel(state.quickMode));
  if (filters.district) active.push(filters.district);
  if (filters.village) active.push(filters.village);
  if (filters.date) active.push(filters.date);
  if (filters.keyword) active.push(`關鍵字：${elements.keywordFilter.value}`);
  if (filters.vaccine) active.push(filters.vaccine === "flu" ? "流感疫苗" : "新冠疫苗");
  if (filters.brands.length) active.push(`廠牌：${filters.brands.join("、")}`);

  return `共找到 ${sites.length} 筆接種站資料${active.length ? `。目前條件：${active.join("｜")}` : "。"}`;
}

function emptyStateHtml() {
  return `
    <div class="status-message info empty-state">
      <span class="empty-mark" aria-hidden="true"></span>
      <div>
        <strong>目前查無符合條件的接種站資料。</strong>
        <p>您可以清除篩選條件，或改查其他日期、行政區。</p>
      </div>
      <div class="empty-actions">
        <button type="button" class="secondary" data-empty-action="reset">清除條件</button>
        <button type="button" data-empty-action="week">查看本週場次</button>
        <button type="button" class="secondary" data-empty-action="all">查看全部場次</button>
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

function openNotice() {
  elements.noticePanel.classList.add("is-open");
  document.body.classList.add("notice-open");
  elements.closeNoticeButton.focus({ preventScroll: true });
}

function closeNotice() {
  elements.noticePanel.classList.remove("is-open");
  document.body.classList.remove("notice-open");
}

function closeBrowserHint() {
  elements.browserHint.hidden = true;
  sessionStorage.setItem("vaccineBrowserHintClosed", "1");
}

function openNoticeOnce() {
  if (sessionStorage.getItem("vaccineNoticeSeen") === "1") return;
  sessionStorage.setItem("vaccineNoticeSeen", "1");
  openNotice();
}

function scrollToResults() {
  window.requestAnimationFrame(() => {
    elements.resultArea.scrollIntoView({ behavior: "smooth", block: "start" });
    elements.resultArea.focus({ preventScroll: true });
  });
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
