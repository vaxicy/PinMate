/**
 * check-dict-sync.js — Verify PinMate's two independent i18n dictionaries stay consistent.
 *
 * PinMate maintains TWO separate translation sources (on purpose):
 *   1. js/i18n.js  -> I18N.en / I18N.zh   : runtime UI text for t(key) in popup/settings/content.
 *   2. _locales en + zh_CN messages.json  : ONLY Chrome manifest __MSG_*__ placeholders
 *                                          (name / description). The runtime JS never reads these.
 *
 * Rule: a UI key used by t() MUST live in js/i18n.js (both en & zh). It must NOT be added to
 * _locales en or zh_CN messages.json, because _locales is reserved for manifest placeholders only and a key
 * placed there but missing from i18n.js will render as the raw key string (e.g. "modelCustomOption").
 *
 * This script prints:
 *   - keys present in i18n.js en but missing in zh (and vice versa)
 *   - any UI key (used by t()) that accidentally also appears in _locales (would be dead/confusing)
 *
 * It does NOT fail the build; it is a human-review aid. Run: node tools/check-dict-sync.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const I18N_PATH = path.join(ROOT, "js", "i18n.js");
const LOCALES = {
  en: path.join(ROOT, "_locales", "en", "messages.json"),
  zh_CN: path.join(ROOT, "_locales", "zh_CN", "messages.json"),
};

/** Extract I18N.en / I18N.zh object keys from the (classic-script) i18n.js source. */
function parseI18nKeys(src) {
  // en block: from "en: {" up to the line "  }," that precedes "  zh:"
  const en = src.match(/en:\s*\{([\s\S]*?)\r?\n  \},\r?\n  zh:/);
  // zh block: from "zh: {" up to the closing "  }\n};" at end of I18N object
  const zh = src.match(/zh:\s*\{([\s\S]*?)\r?\n  \}\r?\n\};/);
  const keysFrom = (m) => {
    if (!m) return new Set();
    const block = m[1];
    const keys = new Set();
    const re = /^\s*([A-Za-z][A-Za-z0-9_]*)\s*:/gm;
    let mm;
    while ((mm = re.exec(block)) !== null) keys.add(mm[1]);
    return keys;
  };
  return { en: keysFrom(en), zh: keysFrom(zh) };
}

/** Extract message keys from a _locales messages.json. */
function parseLocaleKeys(file) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  return new Set(Object.keys(data));
}

function main() {
  const src = fs.readFileSync(I18N_PATH, "utf8");
  const i18n = parseI18nKeys(src);
  const en = i18n.en;
  const zh = i18n.zh;

  let problems = 0;

  const enOnly = [...en].filter((k) => !zh.has(k));
  const zhOnly = [...zh].filter((k) => !en.has(k));
  if (enOnly.length) {
    console.log("⚠ i18n.js en-only keys (missing from zh):", enOnly.join(", "));
    problems++;
  }
  if (zhOnly.length) {
    console.log("⚠ i18n.js zh-only keys (missing from en):", zhOnly.join(", "));
    problems++;
  }

  // Check _locales doesn't contain runtime UI keys (reserved for manifest placeholders only).
  for (const [name, file] of Object.entries(LOCALES)) {
    const loc = parseLocaleKeys(file);
    const leaked = [...loc].filter((k) => en.has(k) || zh.has(k));
    if (leaked.length) {
      console.log(`⚠ _locales/${name} contains runtime UI keys that belong in i18n.js:`, leaked.join(", "));
      problems++;
    }
  }

  if (problems === 0) {
    console.log(`✓ i18n.js en/zh aligned (${en.size} keys) and _locales has no leaked UI keys.`);
  } else {
    console.log(`\nFound ${problems} problem group(s). See above.`);
  }
}

main();
