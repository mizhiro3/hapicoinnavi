import assert from "node:assert/strict";
import test from "node:test";
import {
  distanceInKilometers,
  filterAndSortStores,
  formatDisplayText,
  formatDistance,
  normalizeText,
  shouldShowPageTop,
  shouldShowStickyCoin,
  storeMatchesCategory
} from "../public/app.js";

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
