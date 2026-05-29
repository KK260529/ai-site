const AD_PLACEHOLDER = '<aside class="ad-slot" aria-label="広告枠"></aside>';

function injectAds(html) {
  let body = html;
  body = AD_PLACEHOLDER + body;

  const parts = body.split(/<\/h2>/i);
  if (parts.length > 2) {
    body = parts
      .map((part, i) => {
        if (i === 0) return part + "</h2>";
        if (i === parts.length - 1) return part;
        return part + "</h2>" + AD_PLACEHOLDER;
      })
      .join("");
  }

  body += AD_PLACEHOLDER;
  return body;
}

module.exports = { AD_PLACEHOLDER, injectAds };
