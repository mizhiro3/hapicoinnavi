import assert from "node:assert/strict";
import test from "node:test";
import {
  distanceInKilometers,
  filterAndSortStores,
  formatDisplayText,
  formatCrawlDate,
  formatDistance,
  googleMapsUrl,
  normalizeText,
  nextStorePage,
  safeCoinLogoPath,
  shouldShowPageTop,
  shouldShowStickyCoin,
  storeMatchesCategory
} from "../public/app.js";

test("allows only the expected same-origin coin logo path", () => {
  assert.equal(
    safeCoinLogoPath("assets/coins/main-wallet.svg", "main-wallet"),
    "assets/coins/main-wallet.svg"
  );
  assert.equal(
    safeCoinLogoPath("assets/coins/paper-voucher.svg", "obama-gift-certificate"),
    "assets/coins/paper-voucher.svg"
  );
  assert.equal(safeCoinLogoPath("https://tracker.example/logo.svg", "main-wallet"), null);
  assert.equal(safeCoinLogoPath("assets/coins/../other.svg", "main-wallet"), null);
  assert.equal(safeCoinLogoPath("assets/other.svg", "main-wallet"), null);
});

const stores = [
  {
    id: "far",
    name: "遠い店",
    searchTerms: ["とおいみせ"],
    coinIds: ["coin"],
    categories: ["スーパー"],
    address: { prefecture: "福井県", city: "坂井市" },
    location: { latitude: 36.22, longitude: 136.23 },
    published: true
  },
  {
    id: "near",
    name: "近い店",
    searchTerms: ["チカイミセ"],
    coinIds: ["coin"],
    categories: ["ドラッグストア"],
    address: { prefecture: "福井県", city: "福井市" },
    location: { latitude: 36.061, longitude: 136.221 },
    published: true
  }
];

test("normalizes width, case, and whitespace for search", () => {
  assert.equal(normalizeText(" Ａ BC　"), "abc");
});

test("converts source br tags to display line breaks without rendering HTML", () => {
  assert.equal(
    formatDisplayText("平日 9:00～19:00<br /> 土曜 10:00～17:00<br> 日曜休み"),
    "平日 9:00～19:00\n土曜 10:00～17:00\n日曜休み"
  );
  assert.equal(formatDisplayText("<strong>24時間営業</strong>"), "<strong>24時間営業</strong>");
});

test("formats the crawl timestamp as a date in Japan", () => {
  assert.equal(formatCrawlDate("2026-08-29T00:38:32.868Z"), "2026年8月29日");
  assert.equal(formatCrawlDate("invalid"), "");
});

test("filters by coin, category, and normalized keyword", () => {
  const result = filterAndSortStores(stores, {
    coinId: "coin",
    category: "ドラッグストア",
    keyword: "ちかいみせ",
    position: null
  });
  assert.deepEqual(result.map((store) => store.id), ["near"]);
});

test("filters by broad menu groups and detailed source categories", () => {
  assert.equal(storeMatchesCategory(stores[0], "group:grocery"), true);
  assert.equal(storeMatchesCategory(stores[1], "group:grocery"), true);
  assert.equal(storeMatchesCategory(stores[0], "group:shopping"), false);
  assert.equal(storeMatchesCategory(stores[1], "group:shopping"), false);
  assert.equal(
    storeMatchesCategory(stores[1], "category:ドラッグストア"),
    true
  );
  assert.equal(
    storeMatchesCategory(stores[0], "category:ドラッグストア"),
    false
  );
  assert.equal(
    storeMatchesCategory({ categories: ["ショッピングセンター"] }, "group:grocery"),
    true
  );
  assert.equal(
    storeMatchesCategory({ categories: ["ショッピングセンター"] }, "group:shopping"),
    true
  );
});

test("keeps source order without a position and sorts by distance with one", () => {
  const base = { coinId: "coin", category: "all", keyword: "" };
  assert.deepEqual(
    filterAndSortStores(stores, { ...base, position: null }).map((store) => store.id),
    ["far", "near"]
  );
  assert.deepEqual(
    filterAndSortStores(stores, {
      ...base,
      position: { latitude: 36.06, longitude: 136.22 }
    }).map((store) => store.id),
    ["near", "far"]
  );
});

test("calculates and formats approximate great-circle distance", () => {
  const distance = distanceInKilometers(
    { latitude: 36.06, longitude: 136.22 },
    { latitude: 36.061, longitude: 136.221 }
  );
  assert.ok(distance > 0.1 && distance < 0.2);
  assert.match(formatDistance(distance), /^約\d+m$/);
  assert.equal(formatDistance(1.24), "約1.2km");
});

test("builds a cross-platform Google Maps URL from the store name and address", () => {
  const url = new URL(googleMapsUrl({
    name: "さくらむすび",
    address: {
      postalCode: "910-0006",
      prefecture: "福井県",
      city: "福井市",
      street: "中央1丁目1-25",
      building: "くるふ福井駅内"
    }
  }));
  assert.equal(url.origin, "https://www.google.com");
  assert.equal(url.pathname, "/maps/search/");
  assert.equal(url.searchParams.get("api"), "1");
  assert.equal(
    url.searchParams.get("query"),
    "さくらむすび 〒910-0006 福井県 福井市 中央1丁目1-25 くるふ福井駅内"
  );
});

test("shows the selected coin only when the search bar is stuck", () => {
  assert.equal(
    shouldShowStickyCoin({ sentinelTop: -1, hasCoin: true, storeViewHidden: false }),
    true
  );
  assert.equal(
    shouldShowStickyCoin({ sentinelTop: 8, hasCoin: true, storeViewHidden: false }),
    false
  );
  assert.equal(
    shouldShowStickyCoin({ sentinelTop: -1, hasCoin: false, storeViewHidden: false }),
    false
  );
  assert.equal(
    shouldShowStickyCoin({ sentinelTop: -1, hasCoin: true, storeViewHidden: true }),
    false
  );
});

test("shows the page-top control only after scrolling the store view", () => {
  assert.equal(
    shouldShowPageTop({ scrollY: 401, hasCoin: true, storeViewHidden: false }),
    true
  );
  assert.equal(
    shouldShowPageTop({ scrollY: 400, hasCoin: true, storeViewHidden: false }),
    false
  );
  assert.equal(
    shouldShowPageTop({ scrollY: 800, hasCoin: false, storeViewHidden: false }),
    false
  );
  assert.equal(
    shouldShowPageTop({ scrollY: 800, hasCoin: true, storeViewHidden: true }),
    false
  );
});

test("shows stores in stable pages without changing their sorted order", () => {
  const sorted = Array.from({ length: 95 }, (_, index) => ({ id: index }));
  assert.deepEqual(nextStorePage(sorted, 0).map((store) => store.id), [
    ...Array.from({ length: 40 }, (_, index) => index)
  ]);
  assert.deepEqual(nextStorePage(sorted, 40).map((store) => store.id), [
    ...Array.from({ length: 40 }, (_, index) => index + 40)
  ]);
  assert.deepEqual(nextStorePage(sorted, 80).map((store) => store.id), [
    ...Array.from({ length: 15 }, (_, index) => index + 80)
  ]);
});
