const { config } = require("./config");

const PLACEHOLDER =
  '<aside class="ad-slot ad-slot--placeholder" aria-label="広告枠"><span>広告</span></aside>';

/** 1ページあたりの本文内広告上限（top / bottom / 固定枠除く） */
const MAX_INLINE_PER_PAGE = Number(process.env.AD_MAX_INLINE) || 4;

/** h2 がこの数以上で本文内広告を入れる */
const MIN_H2_FOR_INLINE = 1;

/** リストページ：N 件ごとに1枚 */
const HOME_CARD_INTERVAL = Number(process.env.AD_HOME_INTERVAL) || 3;
const EPISODE_LIST_INTERVAL = Number(process.env.AD_EPISODE_INTERVAL) || 5;
const COURSE_LIST_INTERVAL = Number(process.env.AD_COURSE_INTERVAL) || 2;

const SLOT_FALLBACK = {
  top: ["top", "inline", "bottom", "common"],
  inline: ["inline", "top", "bottom", "common"],
  bottom: ["bottom", "inline", "top", "common"],
  home: ["inline", "top", "bottom", "common"],
};

function wrapAdHtml(html, variant = "live") {
  if (!html) return "";
  const trimmed = html.trim();
  if (trimmed.includes('class="ad-slot')) return trimmed;
  const mod = variant === "banner" ? " ad-slot--banner" : variant === "rectangle" ? " ad-slot--rectangle" : "";
  return `<aside class="ad-slot ad-slot--live${mod}" aria-label="広告">${trimmed}</aside>`;
}

function buildAdSenseUnit(slotId, format = "auto") {
  if (!config.adClient || !slotId) return "";
  return `<aside class="ad-slot ad-slot--live" aria-label="広告">
  <ins class="adsbygoogle"
       style="display:block"
       data-ad-client="${config.adClient}"
       data-ad-slot="${slotId}"
       data-ad-format="${format}"
       data-full-width-responsive="true"></ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</aside>`;
}

function getAdHeadScript() {
  if (config.adHeadHtml) return config.adHeadHtml;
  if (!config.adClient) return "";
  return `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.adClient}" crossorigin="anonymous"></script>`;
}

function rawHtmlForKey(key) {
  const map = {
    top: config.adHtmlTop,
    inline: config.adHtmlInline,
    bottom: config.adHtmlBottom,
    common: config.adHtml,
  };
  return (map[key] || "").trim();
}

function resolveAdHtml(position) {
  const chain = SLOT_FALLBACK[position] || SLOT_FALLBACK.inline;
  for (const key of chain) {
    const html = rawHtmlForKey(key);
    if (html) return html;
  }

  const slotId = {
    top: config.adSlotTop,
    inline: config.adSlotInline,
    bottom: config.adSlotBottom,
  }[position];
  return buildAdSenseUnit(slotId) || "";
}

function slotVariant(position) {
  if (position === "top") return "banner";
  if (position === "bottom") return "skyscraper";
  if (position === "inline" || position === "home") return "rectangle";
  return "live";
}

function getAdSlot(position) {
  const html = resolveAdHtml(position);
  if (!html) {
    return config.isProduction ? "" : PLACEHOLDER;
  }
  return wrapAdHtml(html, slotVariant(position));
}

function countH2(html) {
  return (String(html || "").match(/<\/h2>/gi) || []).length;
}

/** 本文内に挿入する h2 インデックス（0 始まり、該当 h2 の直後） */
function pickInlineH2Indices(h2Count, maxAds) {
  if (h2Count < MIN_H2_FOR_INLINE || maxAds < 1) return [];
  const n = Math.min(maxAds, h2Count);
  const indices = [];
  for (let i = 0; i < n; i += 1) {
    const idx = Math.floor(((i + 1) * h2Count) / (n + 1)) - 1;
    indices.push(Math.max(0, Math.min(h2Count - 1, idx)));
  }
  return [...new Set(indices)].slice(0, maxAds).sort((a, b) => a - b);
}

function injectAfterNthParagraph(html, adHtml, n) {
  let count = 0;
  let inserted = false;
  return html.replace(/<\/p>/gi, (match) => {
    count += 1;
    if (!inserted && count === n) {
      inserted = true;
      return `${match}${adHtml}`;
    }
    return match;
  });
}

/**
 * 記事本文へ効果的な位置にだけ広告を挿入
 * - 冒頭は adTop に任せる（重複しない）
 * - 末尾は adBottom に任せる
 * - h2 間は最大 MAX_INLINE_PER_PAGE 箇所
 */
function injectAds(html) {
  const inlineAd = getAdSlot("inline");
  if (!inlineAd || inlineAd === PLACEHOLDER) {
    return html;
  }

  const h2Count = countH2(html);
  const maxAds = Math.min(
    MAX_INLINE_PER_PAGE,
    h2Count >= MIN_H2_FOR_INLINE ? Math.max(1, h2Count - 1) : 0
  );

  if (maxAds === 0) {
    const pCount = (html.match(/<\/p>/gi) || []).length;
    if (pCount >= 3) {
      let out = html;
      const positions = [
        Math.ceil(pCount / 4),
        Math.ceil(pCount / 2),
        Math.ceil((3 * pCount) / 4),
      ].slice(0, Math.min(2, MAX_INLINE_PER_PAGE));
      for (const pos of positions) {
        out = injectAfterNthParagraph(out, inlineAd, pos);
      }
      return out;
    }
    return html;
  }

  const insertAfter = new Set(pickInlineH2Indices(h2Count, maxAds));
  const parts = html.split(/(<\/h2>)/i);
  let h2Index = -1;
  let out = "";

  for (let i = 0; i < parts.length; i += 1) {
    out += parts[i];
    if (/^<\/h2>$/i.test(parts[i])) {
      h2Index += 1;
      if (insertAfter.has(h2Index)) {
        out += inlineAd;
      }
    }
  }

  return out;
}

/** リストページ用：記事カードの間に挿入 */
function injectAdsInCardList(cardsHtml, interval = HOME_CARD_INTERVAL) {
  const ad = getAdSlot("home");
  if (!ad || ad === PLACEHOLDER) return cardsHtml;

  const chunks = cardsHtml.split(/(?=<article class="card")/);
  if (chunks.length <= 1) return cardsHtml;

  let out = "";
  chunks.forEach((chunk, i) => {
    out += chunk;
    if (i > 0 && i % interval === 0 && i < chunks.length - 1) {
      out += ad;
    }
  });
  return out;
}

/** 講座カード・エピソードリスト等：一定間隔で広告を挿入 */
function injectEveryNthBlock(html, splitPattern, interval, slot = "inline") {
  const ad = getAdSlot(slot);
  if (!ad || ad === PLACEHOLDER || !html) return html;
  const parts = html.split(splitPattern);
  if (parts.length <= 2) return html;
  let out = parts[0];
  for (let i = 1; i < parts.length; i += 1) {
    out += parts[i];
    if (i % interval === 0 && i < parts.length - 1) {
      out += ad;
    }
  }
  return out;
}

function injectAdsInEpisodeList(episodeHtml, interval = EPISODE_LIST_INTERVAL) {
  return injectEveryNthBlock(episodeHtml, /(?=<li class="episode-item)/, interval, "inline");
}

function injectAdsInCourseCards(cardsHtml, interval = COURSE_LIST_INTERVAL) {
  return injectEveryNthBlock(cardsHtml, /(?=<article class="card")/, interval, "inline");
}

function isAdsConfigured() {
  return Boolean(
    config.adClient ||
      config.adHtml ||
      config.adHeadHtml ||
      config.adHtmlTop ||
      config.adHtmlBottom ||
      config.adHtmlInline
  );
}

module.exports = {
  PLACEHOLDER,
  getAdHeadScript,
  getAdSlot,
  injectAds,
  injectAdsInCardList,
  injectAdsInEpisodeList,
  injectAdsInCourseCards,
  isAdsConfigured,
};
