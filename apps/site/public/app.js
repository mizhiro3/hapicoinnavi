const CATEGORY_GROUPS = [
  {
    id: "grocery",
    label: "食品",
    icon: "grocery",
    categories: [
      "食料品・飲料", "酒", "野菜・果実", "食肉・鮮魚", "菓子・製菓・パン",
      "ドラッグストア", "コンビニエンスストア", "スーパー", "ショッピングセンター"
    ]
  },
  {
    id: "shopping",
    label: "ショッピング",
    icon: "shopping-bag",
    categories: [
      "衣服・靴", "バック・時計・アクセサリー", "眼鏡", "化粧品",
      "書籍・文房具", "雑貨", "スポーツ用品", "玩具・娯楽用品",
      "CD/DVD/レコード・楽器", "ホームセンター・園芸・工具", "家電",
      "家具インテリア", "車・バイク・自転車", "ペット関連",
      "ショッピングセンター"
    ]
  },
  {
    id: "food",
    label: "飲食",
    icon: "utensils",
    categories: [
      "日本料理・料亭", "ファストフード・喫茶店・カフェ", "焼鳥・焼肉・ステーキ",
      "ラーメン・中華料理", "カツ丼・とんかつ", "そば・うどん",
      "寿司・天ぷら・うなぎ", "イタリアン・フレンチ", "その他外国料理",
      "居酒屋・ダイニングバー・ビアホール", "スナック・パブ・キャバレー",
      "カフェバー・バー"
    ]
  },
  {
    id: "service",
    label: "サービス",
    icon: "service",
    categories: [
      "エステ・マッサージ・ネイル", "理容・美容", "医療サービス", "医療機関",
      "ジム・スポーツ施設", "助産院", "博物館・美術館・映画館",
      "公共施設・公共サービス", "銭湯", "カラオケ",
      "アミューズメント施設・ボーリング場", "冠婚葬祭施設", "観光施設",
      "旅客業( 切符・航空券等) ・旅行業", "旅館・ホテル", "不動産",
      "レンタリース", "交通機関・タクシー", "保育・学習支援", "介護",
      "写真", "クリーニング", "工事・修理"
    ]
  }
];

const STORE_PAGE_SIZE = 40;

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/[\u30a1-\u30f6]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - 0x60)
    )
    .replace(/\s+/g, "");
}

export function formatDisplayText(value) {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/[ \t]+\n|\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function formatCrawlDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

export function distanceInKilometers(origin, destination) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadius = 6371;
  const latitudeDelta = radians(destination.latitude - origin.latitude);
  const longitudeDelta = radians(destination.longitude - origin.longitude);
  const originLatitude = radians(origin.latitude);
  const destinationLatitude = radians(destination.latitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(distance) {
  if (distance < 1) return `約${Math.round(distance * 1000)}m`;
  return `約${distance.toFixed(distance < 10 ? 1 : 0)}km`;
}

export function shouldShowStickyCoin({ sentinelTop, hasCoin, storeViewHidden }) {
  return !storeViewHidden && hasCoin && sentinelTop < 8;
}

export function shouldShowPageTop({ scrollY, hasCoin, storeViewHidden }) {
  return !storeViewHidden && hasCoin && scrollY > 400;
}

export function storeMatchesCategory(store, category) {
  if (category === "all") return true;
  if (category.startsWith("category:")) {
    return store.categories.includes(category.slice("category:".length));
  }
  if (category.startsWith("group:")) {
    const group = CATEGORY_GROUPS.find(
      (item) => item.id === category.slice("group:".length)
    );
    return Boolean(group?.categories.some((item) => store.categories.includes(item)));
  }
  return store.categories.includes(category);
}

export function filterAndSortStores(stores, { coinId, category, keyword, position }) {
  const query = normalizeText(keyword);
  return stores
    .filter((store) => store.published && store.coinIds.includes(coinId))
    .filter((store) => storeMatchesCategory(store, category))
    .filter((store) => {
      if (!query) return true;
      const address = Object.values(store.address ?? {}).join("");
      return normalizeText([store.name, ...(store.searchTerms ?? []), address].join(" ")).includes(
        query
      );
    })
    .map((store, originalIndex) => ({
      ...store,
      originalIndex,
      distance: position ? distanceInKilometers(position, store.location) : null
    }))
    .sort((left, right) =>
      position ? left.distance - right.distance : left.originalIndex - right.originalIndex
    );
}

export function nextStorePage(stores, start, pageSize = STORE_PAGE_SIZE) {
  return stores.slice(start, start + pageSize);
}

export function safeCoinLogoPath(value, coinId) {
  if (typeof value !== "string" || typeof coinId !== "string") return null;
  const safeId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(coinId);
  const safePath = /^assets\/coins\/[a-z0-9]+(?:-[a-z0-9]+)*\.svg$/.test(value);
  return safeId && safePath ? value : null;
}

const dom = typeof document === "undefined" ? null : {
  coinView: document.querySelector("#coin-view"),
  storeView: document.querySelector("#store-view"),
  coinGrid: document.querySelector("#coin-grid"),
  coinError: document.querySelector("#coin-error"),
  dataAsOf: document.querySelector("#data-as-of"),
  homeButton: document.querySelector("#home-button"),
  changeCoin: document.querySelector("#change-coin"),
  stickyChangeCoin: document.querySelector("#sticky-change-coin"),
  stickySearchBar: document.querySelector(".hc-sticky-search-bar"),
  stickySearchSentinel: document.querySelector("#sticky-search-sentinel"),
  selectedCoinIcon: document.querySelector("#selected-coin-icon"),
  stickyCoinIcon: document.querySelector("#sticky-coin-icon"),
  stickyCoinName: document.querySelector("#sticky-coin-name"),
  selectedKindLabel: document.querySelector("#selected-kind-label"),
  storeHeading: document.querySelector("#store-heading"),
  storeDescription: document.querySelector("#store-description"),
  keyword: document.querySelector("#keyword"),
  locationButton: document.querySelector("#location-button"),
  locationTitle: document.querySelector("#location-title"),
  locationMessage: document.querySelector("#location-message"),
  resultCount: document.querySelector("#result-count"),
  sortStatus: document.querySelector("#sort-status"),
  filterStatus: document.querySelector("#filter-status"),
  resultList: document.querySelector("#result-list"),
  resultSentinel: document.querySelector("#result-sentinel"),
  loadMore: document.querySelector("#load-more"),
  emptyState: document.querySelector("#empty-state"),
  resetFilters: document.querySelector("#reset-filters"),
  pageTop: document.querySelector("#page-top"),
  categoryNav: document.querySelector("#category-nav"),
  categoryMenu: document.querySelector("#category-menu"),
  categoryDialog: document.querySelector("#category-dialog"),
  categoryDialogClose: document.querySelector("#category-dialog-close"),
  categoryDetailMenu: document.querySelector("#category-detail-menu")
};

const state = {
  coins: [],
  stores: [],
  assetVersion: "",
  storesLoaded: false,
  storesPromise: null,
  filteredStores: [],
  visibleStoreCount: 0,
  coinId: null,
  category: "all",
  keyword: "",
  position: null
};

function safeTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

const MATERIAL_ICON_NAMES = {
  "arrow-left": "arrow_back",
  "chevron-right": "chevron_right",
  search: "search",
  "map-pin": "location_on",
  "rotate-ccw": "refresh",
  x: "close",
  "layout-grid": "grid_view",
  "shopping-bag": "shopping_bag",
  grocery: "grocery",
  utensils: "restaurant",
  service: "handyman",
  "list-filter": "filter_list"
};

function createIcon(name, className = "hc-icon") {
  const icon = document.createElement("span");
  icon.classList.add("hc-material-symbols-rounded", className);
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = MATERIAL_ICON_NAMES[name] ?? name;
  return icon;
}

function createExternalLinkIcon() {
  const namespace = "http://www.w3.org/2000/svg";
  const icon = document.createElementNS(namespace, "svg");
  icon.classList.add("hc-map-link-external");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("fill", "none");
  icon.setAttribute("stroke", "currentColor");
  icon.setAttribute("stroke-width", "2.4");
  icon.setAttribute("stroke-linecap", "round");
  icon.setAttribute("stroke-linejoin", "round");
  const frame = document.createElementNS(namespace, "path");
  frame.setAttribute("d", "M13 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-7");
  const arrow = document.createElementNS(namespace, "path");
  arrow.setAttribute("d", "M14 4h6v6M10 14 20 4");
  icon.append(frame, arrow);
  return icon;
}

function renderStaticIcons() {
  for (const placeholder of document.querySelectorAll("[data-icon]")) {
    placeholder.replaceChildren(createIcon(placeholder.dataset.icon));
  }
}

function coinIcon(coin, className, altText = coin.name, loading = "lazy") {
  const wrapper = document.createElement("span");
  wrapper.className = className;
  const image = document.createElement("img");
  image.alt = altText;
  image.loading = loading;
  const fallback = safeTextElement("span", "hc-coin-icon-fallback", coin.name.slice(0, 1));
  fallback.setAttribute("aria-hidden", "true");
  const logo = safeCoinLogoPath(coin.logo, coin.id);
  image.hidden = !logo;
  fallback.hidden = Boolean(logo);
  if (logo) {
    image.src = state.assetVersion
      ? `${logo}?v=${encodeURIComponent(state.assetVersion)}`
      : logo;
  }
  image.addEventListener("error", () => {
    image.hidden = true;
    fallback.hidden = false;
  });
  wrapper.append(image, fallback);
  return wrapper;
}

function addressText(address) {
  return [address?.postalCode ? `〒${address.postalCode}` : "", address?.prefecture, address?.city, address?.street, address?.building]
    .filter(Boolean)
    .join(" ");
}

export function googleMapsUrl(store) {
  const query = [store?.name, addressText(store?.address)].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function renderCoins() {
  dom.coinGrid.replaceChildren();
  const publishedCoins = state.coins.filter((item) => item.published);
  for (const [kind, label] of [["digital", "サイフ・ポイント"], ["paper", "紙商品券"]]) {
    const groupCoins = publishedCoins.filter(
      (coin) => (coin.kind ?? "digital") === kind
    );
    if (groupCoins.length === 0) continue;
    dom.coinGrid.append(safeTextElement("h2", "hc-coin-group-title", label));
    for (const coin of groupCoins) {
      const button = document.createElement("button");
      button.className = "hc-coin-tile hc-coin-tile--compact";
      button.type = "button";
      button.dataset.coinId = coin.id;
      button.setAttribute("aria-label", `${coin.name}でお店を探す`);

      const symbol = coinIcon(coin, "hc-coin-symbol");
      button.append(symbol, safeTextElement("strong", "", coin.name));
      button.append(createIcon("chevron-right", "hc-arrow"));
      button.lastElementChild.setAttribute("aria-hidden", "true");
      button.addEventListener("click", () => selectCoin(coin.id));
      dom.coinGrid.append(button);
    }
  }
}

function renderCategoryMenu() {
  const coinStores = state.stores.filter(
    (store) => store.published && store.coinIds.includes(state.coinId)
  );
  const categories = [
    { id: "all", label: "すべて", icon: "layout-grid", count: coinStores.length },
    ...CATEGORY_GROUPS.map((group) => ({
      id: `group:${group.id}`,
      label: group.label,
      icon: group.icon,
      count: coinStores.filter((store) =>
        group.categories.some((category) => store.categories.includes(category))
      ).length
    })).filter((group) => group.count > 0),
    { id: "detail", label: "カテゴリ", icon: "list-filter", count: null }
  ];

  dom.categoryMenu.replaceChildren();
  for (const category of categories) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "hc-category-button";
    button.dataset.category = category.id;
    const detailSelected =
      category.id === "detail" && state.category.startsWith("category:");
    button.setAttribute(
      "aria-pressed",
      String(state.category === category.id || detailSelected)
    );
    const icon = createIcon(category.icon, "hc-category-icon");
    const label = safeTextElement("span", "hc-category-label", category.label);
    const count =
      category.count === null
        ? null
        : safeTextElement("span", "hc-category-count", `(${category.count})`);
    button.append(icon, label);
    if (count) label.append(count);
    button.addEventListener("click", () => {
      if (category.id === "detail") {
        renderCategoryDetails();
        dom.categoryDialog.showModal();
        return;
      }
      state.category = category.id;
      renderCategoryMenu();
      renderStores();
      document.querySelector("#result-count")?.scrollIntoView({ block: "nearest" });
    });
    dom.categoryMenu.append(button);
  }
}

function categoryLabel(category) {
  if (category === "all") return "すべてのカテゴリ";
  if (category.startsWith("category:")) return category.slice("category:".length);
  const group = CATEGORY_GROUPS.find(
    (item) => `group:${item.id}` === category
  );
  return group?.label ?? "すべてのカテゴリ";
}

function renderCategoryDetails() {
  const counts = new Map();
  for (const store of state.stores) {
    if (!store.published || !store.coinIds.includes(state.coinId)) continue;
    for (const category of store.categories) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }
  const categories = [...counts.entries()].sort(
    ([leftName, leftCount], [rightName, rightCount]) =>
      rightCount - leftCount || leftName.localeCompare(rightName, "ja")
  );
  dom.categoryDetailMenu.replaceChildren();
  for (const [name, count] of categories) {
    const id = `category:${name}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "hc-category-detail-button";
    button.setAttribute("aria-pressed", String(state.category === id));
    button.append(
      safeTextElement("span", "", name),
      safeTextElement("span", "", `${count}件`)
    );
    button.addEventListener("click", () => {
      state.category = id;
      dom.categoryDialog.close();
      renderCategoryMenu();
      renderStores();
      dom.resultCount.scrollIntoView({ block: "nearest" });
    });
    dom.categoryDetailMenu.append(button);
  }
}

function makeStoreCard(store) {
  const article = document.createElement("article");
  article.className = "hc-store-card";
  const content = document.createElement("div");
  const tags = document.createElement("div");
  tags.className = "hc-category-tags";
  for (const category of store.categories) {
    tags.append(safeTextElement("span", "hc-category-tag", category));
  }
  if (store.sample) {
    content.append(safeTextElement("span", "hc-sample-label", "架空のサンプルデータ"));
  }
  content.append(tags, safeTextElement("h3", "", store.name));
  content.append(safeTextElement("p", "hc-store-address", addressText(store.address)));
  if (store.businessHours) {
    content.append(
      safeTextElement("p", "hc-store-meta", `営業時間：${formatDisplayText(store.businessHours)}`)
    );
  }
  if (store.closedDays) {
    content.append(
      safeTextElement("p", "hc-store-meta", `定休日：${formatDisplayText(store.closedDays)}`)
    );
  }
  if (store.notice) {
    content.append(safeTextElement("p", "hc-store-notice", formatDisplayText(store.notice)));
  }
  const mapLink = document.createElement("a");
  mapLink.className = "hc-map-link";
  mapLink.href = googleMapsUrl(store);
  mapLink.target = "_blank";
  mapLink.rel = "noopener noreferrer";
  mapLink.setAttribute("aria-label", `${store.name}の住所をGoogleマップで開く`);
  mapLink.append(
    safeTextElement("span", "", "Googleマップで見る"),
    createExternalLinkIcon()
  );
  content.append(mapLink);
  const usableCoins = state.coins.filter(
    (coin) => coin.published && store.coinIds.includes(coin.id)
  );
  if (usableCoins.length > 0) {
    const coinSection = document.createElement("div");
    coinSection.className = "hc-store-coins";
    coinSection.setAttribute("aria-label", "利用できるコイン");
    coinSection.append(
      safeTextElement("span", "hc-store-coins-label", "使えるコイン"),
      ...usableCoins.map((coin) => coinIcon(coin, "hc-store-coin-icon"))
    );
    content.append(coinSection);
  }
  article.append(content);
  if (store.distance !== null) {
    article.append(safeTextElement("span", "hc-distance", formatDistance(store.distance)));
  }
  return article;
}

function renderStores() {
  const stores = filterAndSortStores(state.stores, state);
  state.filteredStores = stores;
  state.visibleStoreCount = 0;
  dom.resultCount.textContent = String(stores.length);
  dom.sortStatus.textContent = state.position ? "現在地から近い順" : "登録順";
  dom.filterStatus.textContent = `カテゴリ：${categoryLabel(state.category)}`;
  dom.resultList.replaceChildren();
  dom.resultList.hidden = stores.length === 0;
  dom.emptyState.hidden = stores.length > 0;
  showMoreStores();
}

function showMoreStores() {
  const start = state.visibleStoreCount;
  const end = Math.min(start + STORE_PAGE_SIZE, state.filteredStores.length);
  if (end > start) {
    dom.resultList.append(...nextStorePage(state.filteredStores, start).map(makeStoreCard));
  }
  state.visibleStoreCount = end;
  dom.resultSentinel.hidden = end >= state.filteredStores.length;
}

async function selectCoin(coinId) {
  const coin = state.coins.find((item) => item.id === coinId && item.published);
  if (!coin) {
    showCoinSelection();
    return;
  }
  state.coinId = coin.id;
  state.category = "all";
  state.keyword = "";
  dom.keyword.value = "";
  dom.stickySearchBar.classList.remove("hc-is-stuck");
  dom.selectedCoinIcon.replaceChildren(coinIcon(coin, "hc-selected-coin-image", ""));
  dom.stickyCoinIcon.replaceChildren(coinIcon(coin, "hc-sticky-coin-image", "", "eager"));
  dom.stickyCoinName.textContent = coin.name;
  dom.selectedKindLabel.textContent =
    coin.kind === "paper" ? "選択中の紙商品券" : "選択中のコイン";
  dom.storeHeading.textContent = coin.name;
  dom.storeDescription.textContent = coin.description;
  dom.coinView.hidden = true;
  dom.storeView.hidden = false;
  dom.categoryNav.hidden = true;
  dom.resultCount.textContent = "0";
  dom.sortStatus.textContent = "店舗情報を読み込んでいます";
  dom.resultList.replaceChildren();
  dom.resultSentinel.hidden = true;
  dom.emptyState.hidden = true;
  window.history.replaceState(null, "", `#coin=${encodeURIComponent(coin.id)}`);
  dom.storeView.focus?.();
  window.scrollTo({ top: 0 });
  scheduleStickySearchSync();
  try {
    await ensureStoresLoaded();
    if (state.coinId !== coin.id) return;
    dom.categoryNav.hidden = false;
    renderCategoryMenu();
    renderStores();
  } catch {
    dom.sortStatus.textContent = "読込エラー";
    dom.resultList.hidden = false;
    dom.resultList.replaceChildren(
      safeTextElement("p", "hc-empty-state", "店舗データを読み込めませんでした。ページを再読み込みしてください。")
    );
  }
}

function showCoinSelection() {
  state.coinId = null;
  dom.stickySearchBar.classList.remove("hc-is-stuck");
  dom.pageTop.hidden = true;
  dom.coinView.hidden = false;
  dom.storeView.hidden = true;
  dom.categoryNav.hidden = true;
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  window.scrollTo({ top: 0 });
  dom.coinView.focus();
}

function syncStickySearchBar() {
  const isStuck = shouldShowStickyCoin({
    sentinelTop: dom.stickySearchSentinel.getBoundingClientRect().top,
    hasCoin: Boolean(state.coinId),
    storeViewHidden: dom.storeView.hidden
  });
  dom.stickySearchBar.classList.toggle("hc-is-stuck", isStuck);
  dom.pageTop.hidden = !shouldShowPageTop({
    scrollY: window.scrollY,
    hasCoin: Boolean(state.coinId),
    storeViewHidden: dom.storeView.hidden
  });
}

let stickySyncFrame = null;

function scheduleStickySearchSync() {
  if (stickySyncFrame !== null) return;
  stickySyncFrame = window.requestAnimationFrame(() => {
    stickySyncFrame = null;
    syncStickySearchBar();
  });
}

function updateLocationStatus(title, message, buttonLabel, disabled = false) {
  dom.locationTitle.textContent = title;
  dom.locationMessage.textContent = message;
  dom.locationButton.textContent = buttonLabel;
  dom.locationButton.disabled = disabled;
}

function requestLocation() {
  if (!navigator.geolocation) {
    updateLocationStatus(
      "この端末では現在地を利用できません",
      "店名・住所検索や、画面下のカテゴリからお店を探せます。",
      "現在地を利用できません",
      true
    );
    return;
  }
  updateLocationStatus("現在地を確認しています", "端末の許可画面をご確認ください。", "確認中…", true);
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      state.position = { latitude: coords.latitude, longitude: coords.longitude };
      updateLocationStatus(
        "現在地から近い順に表示しています",
        "距離は直線距離の目安です。現在地は保存・送信されません。",
        "現在地を更新"
      );
      renderStores();
    },
    (error) => {
      const denied = error.code === error.PERMISSION_DENIED;
      updateLocationStatus(
        denied ? "位置情報は使わずに検索できます" : "現在地を取得できませんでした",
        denied
          ? "許可しなくても、店名・住所検索やカテゴリ絞り込みを利用できます。"
          : "電波状況を確認するか、店名・住所検索やカテゴリからお探しください。",
        "もう一度試す"
      );
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
}

function observeStickySearchBar() {
  window.addEventListener("scroll", scheduleStickySearchSync, { passive: true });
  window.addEventListener("resize", scheduleStickySearchSync);
  window.addEventListener("pageshow", scheduleStickySearchSync);
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(scheduleStickySearchSync, {
      threshold: 0,
      rootMargin: "-8px 0px 0px"
    });
    observer.observe(dom.stickySearchSentinel);
  }
}

function observeStorePagination() {
  dom.loadMore.addEventListener("click", showMoreStores);
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !dom.resultSentinel.hidden) {
        showMoreStores();
      }
    }, { rootMargin: "300px 0px" });
    observer.observe(dom.resultSentinel);
  }
}

async function ensureStoresLoaded() {
  if (state.storesLoaded) return state.stores;
  if (state.storesPromise) return state.storesPromise;
  state.storesPromise = fetch(
    `./data/stores.json?v=${encodeURIComponent(state.assetVersion)}`,
    { cache: "force-cache" }
  )
    .then((response) => {
      if (!response.ok) throw new Error("store response was not successful");
      return response.json();
    })
    .then((stores) => {
      if (!Array.isArray(stores)) throw new Error("store data is not an array");
      state.stores = stores;
      state.storesLoaded = true;
      return stores;
    })
    .catch((error) => {
      state.storesPromise = null;
      throw error;
    });
  return state.storesPromise;
}

async function loadData() {
  try {
    const versionResponse = await fetch("./data/version.json", { cache: "no-store" });
    if (!versionResponse.ok) throw new Error("version response was not successful");
    const versionData = await versionResponse.json();
    if (typeof versionData.version !== "string") throw new Error("version is invalid");
    state.assetVersion = versionData.version;
    const crawlDate = formatCrawlDate(versionData.crawledAt);
    if (crawlDate && dom.dataAsOf) {
      dom.dataAsOf.dateTime = versionData.crawledAt;
      dom.dataAsOf.textContent = `${crawlDate}時点の情報`;
      dom.dataAsOf.hidden = false;
    }
    const coinResponse = await fetch(
      `./data/coins.json?v=${encodeURIComponent(state.assetVersion)}`,
      { cache: "force-cache" }
    );
    if (!coinResponse.ok) throw new Error("coin response was not successful");
    const coins = await coinResponse.json();
    if (!Array.isArray(coins)) throw new Error("coin data is not an array");
    state.coins = coins;
    renderCoins();
    const coinId = new URLSearchParams(window.location.hash.slice(1)).get("coin");
    if (coinId) selectCoin(coinId);
  } catch {
    dom.coinError.hidden = false;
    dom.coinError.textContent =
      "お店のデータを読み込めませんでした。時間を置いてページを再読み込みしてください。";
  }
}

if (dom) {
  renderStaticIcons();
  observeStickySearchBar();
  observeStorePagination();
  dom.homeButton.addEventListener("click", showCoinSelection);
  dom.changeCoin.addEventListener("click", showCoinSelection);
  dom.stickyChangeCoin.addEventListener("click", showCoinSelection);
  dom.pageTop.addEventListener("click", () => {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    window.scrollTo({ top: 0, behavior });
  });
  dom.keyword.addEventListener("input", (event) => {
    state.keyword = event.currentTarget.value;
    renderStores();
  });
  dom.locationButton.addEventListener("click", requestLocation);
  dom.resetFilters.addEventListener("click", () => {
    state.category = "all";
    state.keyword = "";
    dom.keyword.value = "";
    renderCategoryMenu();
    renderStores();
  });
  dom.categoryDialogClose.addEventListener("click", () => dom.categoryDialog.close());
  dom.categoryDialog.addEventListener("click", (event) => {
    if (event.target === dom.categoryDialog) dom.categoryDialog.close();
  });
  loadData();
}
