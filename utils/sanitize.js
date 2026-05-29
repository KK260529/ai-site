/** 記事本文の簡易サニタイズ（script等を除去） */
function sanitizeHtml(html) {
  return String(html || "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "");
}

module.exports = { sanitizeHtml };
