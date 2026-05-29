const { config } = require("./config");

const PLACEHOLDER =
  '<aside class="ad-slot ad-slot--placeholder" aria-label="広告枠"><span>広告</span></aside>';

function wrapAdHtml(html) {
  if (!html) return "";
  const trimmed = html.trim();
  if (trimmed.includes('class="ad-slot')) return trimmed;
  return `<aside class="ad-slot ad-slot--live" aria-label="広告">${trimmed}</aside>`;
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

function resolveAdHtml(position) {
  const byPosition = {
    top: config.adHtmlTop,
    bottom: config.adHtmlBottom,
    inline: config.adHtmlInline,
  }[position];

  if (byPosition) return byPosition;

  // 共通タグは top / bottom のみ（inline へ流用すると同一ページに大量配置になる）
  if (config.adHtml && (position === "top" || position === "bottom")) {
    return config.adHtml;
  }

  const slotId = {
    top: config.adSlotTop,
    bottom: config.adSlotBottom,
    inline: config.adSlotInline,
  }[position];

  const unit = buildAdSenseUnit(slotId);
  if (unit) return unit;

  return "";
}

function getAdSlot(position) {
  const html = resolveAdHtml(position);
  return html ? wrapAdHtml(html) : PLACEHOLDER;
}

function injectAds(html) {
  const inline = getAdSlot("inline");
  if (inline === PLACEHOLDER) {
    return html;
  }

  let body = inline + html;
  const parts = body.split(/<\/h2>/i);
  if (parts.length > 2) {
    body = parts
      .map((part, i) => {
        if (i === 0) return part + "</h2>";
        if (i === parts.length - 1) return part;
        return part + "</h2>" + inline;
      })
      .join("");
  }
  body += inline;
  return body;
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
  isAdsConfigured,
};
