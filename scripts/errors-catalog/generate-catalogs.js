#!/usr/bin/env node
/**
 * 技術別500件のエラーカタログ JSON を生成
 * Usage: node scripts/errors-catalog/generate-catalogs.js [--tech python]
 */
const fs = require("fs");
const path = require("path");
const techDefs = require("../errors-tech-def");
const { generatePythonErrors, generateJavaErrors } = require("./patterns-python-java");
const {
  generateJavascriptErrors,
  generateLinuxErrors,
  generateSqlErrors,
  generateDockerErrors,
} = require("./patterns-other");
const {
  generateGitErrors,
  generateHttpErrors,
  generateNginxErrors,
  generateBashErrors,
} = require("./patterns-git-http");
const { expandCatalog } = require("./expand-catalogs");

const GENERATORS = {
  python: generatePythonErrors,
  java: generateJavaErrors,
  javascript: generateJavascriptErrors,
  linux: generateLinuxErrors,
  sql: generateSqlErrors,
  docker: generateDockerErrors,
  git: generateGitErrors,
  http: generateHttpErrors,
  nginx: generateNginxErrors,
  bash: generateBashErrors,
};

const OUT_DIR = path.join(__dirname, "data");

function generateForTech(tech) {
  const gen = GENERATORS[tech];
  if (!gen) throw new Error(`Unknown tech: ${tech}`);
  const entries = expandCatalog(gen(), tech);
  if (entries.length < 500) {
    console.warn(`  ⚠ ${tech}: ${entries.length} 件（500未満）`);
  }
  const out = path.join(OUT_DIR, `${tech}.json`);
  fs.writeFileSync(out, JSON.stringify(entries, null, 2), "utf-8");
  return entries.length;
}

function main() {
  const args = process.argv.slice(2);
  const techFilter = args.find((a) => !a.startsWith("--"));
  const techs = techFilter ? [techFilter] : techDefs.map((t) => t.tech);

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  let total = 0;
  for (const tech of techs) {
    const def = techDefs.find((t) => t.tech === tech);
    if (!def) {
      console.error(`Unknown tech: ${tech}`);
      continue;
    }
    const count = generateForTech(tech);
    console.log(`✓ ${def.title}: ${count} 件 → data/${tech}.json`);
    total += count;
  }
  console.log(`\n合計 ${total} 件のエラーカタログを生成しました`);
}

main();
