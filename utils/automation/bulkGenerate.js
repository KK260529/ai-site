/**
 * 将来機能: キーワードCSV一括生成
 *
 * 使い方（将来）:
 *   node utils/automation/bulkGenerate.js keywords.csv
 *
 * CSV形式: theme,angle（任意）
 */
const fs = require("fs");
const path = require("path");

async function bulkGenerateFromCsv(csvPath) {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found: ${csvPath}`);
  }

  const lines = fs
    .readFileSync(csvPath, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const themes = lines.slice(1).map((line) => {
    const [theme, angle] = line.split(",").map((s) => s.trim());
    return { theme, angle };
  });

  return { themes, count: themes.length, status: "stub" };
}

if (require.main === module) {
  const csv = process.argv[2] || path.join(process.cwd(), "data", "keywords.example.csv");
  bulkGenerateFromCsv(csv)
    .then((r) => console.log("Bulk generate stub:", r))
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}

module.exports = { bulkGenerateFromCsv };
