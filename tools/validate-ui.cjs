/**
 * Checks the UI string table in assets/app.js for duplicate keys.
 *
 * A duplicate key in a plain object literal is silently overwritten by the
 * last one, which once made the Malay "Listen & Learn" label disappear.
 * This test fails loudly instead.
 *
 * Run with:  node tools/validate-ui.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const appPath = path.join(__dirname, '..', 'assets', 'app.js');
const code = fs.readFileSync(appPath, 'utf8');

const start = code.indexOf('var UI = {');
if (start === -1) {
  console.error('Could not find the UI table in app.js');
  process.exit(1);
}

// Walk the object literal with a brace counter so nested objects are handled.
let depth = 0;
let end = -1;
for (let i = start + 'var UI = '.length; i < code.length; i++) {
  const ch = code[i];
  if (ch === '{') depth++;
  else if (ch === '}') {
    depth--;
    if (depth === 0) { end = i; break; }
  }
}
const literal = code.slice(start + 'var UI = '.length, end + 1);

// Count how many times each top-level key appears in each locale block.
const localeStarts = [];
const localeRe = /(?:^|\n)\s{4}(en|ms|zh):\s*\{/g;
let m;
while ((m = localeRe.exec(literal)) !== null) {
  localeStarts.push({ locale: m[1], index: m.index });
}

const problems = [];
for (let i = 0; i < localeStarts.length; i++) {
  const from = localeStarts[i].index;
  const to = i + 1 < localeStarts.length ? localeStarts[i + 1].index : literal.length;
  const block = literal.slice(from, to);

  const keyRe = /(?:^|[\s,{])([A-Za-z_$][\w$]*)\s*:/g;
  const seen = new Map();
  let k;
  while ((k = keyRe.exec(block)) !== null) {
    const key = k[1];
    if (!seen.has(key)) seen.set(key, k.index);
    else {
      const line = literal.slice(0, from + k.index).split('\n').length;
      problems.push(`duplicate key "${key}" in locale "${localeStarts[i].locale}" (line ~${line})`);
    }
  }
}

// Sanity check: the table must actually evaluate and contain the locales.
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext('var UI = ' + literal + '; result = UI;', sandbox);
const UI = sandbox.result;
['en', 'ms', 'zh'].forEach((loc) => {
  if (!UI[loc]) problems.push(`missing locale "${loc}"`);
  else if (Object.keys(UI[loc]).length < 30) problems.push(`locale "${loc}" looks incomplete`);
});

// Every locale must expose the same key set, so no screen can fall back to
// English halfway through a translation.
const enKeys = Object.keys(UI.en || {}).sort();
['ms', 'zh'].forEach((loc) => {
  const other = Object.keys(UI[loc] || {}).sort();
  const missing = enKeys.filter((key) => other.indexOf(key) === -1);
  const extra = other.filter((key) => enKeys.indexOf(key) === -1);
  if (missing.length) problems.push(`locale "${loc}" is missing keys: ${missing.join(', ')}`);
  if (extra.length) problems.push(`locale "${loc}" has unknown keys: ${extra.join(', ')}`);
});

if (problems.length) {
  console.log('FAILED - UI string table problems:');
  problems.forEach((p) => console.log('  ! ' + p));
  process.exit(1);
}

console.log(`OK - UI table valid (${enKeys.length} keys x 3 locales).`);
