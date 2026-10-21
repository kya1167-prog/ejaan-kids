/**
 * Validates the picture library. Run with:  node tools/validate-library.cjs
 *
 * Rules
 *   1. Every picture belongs to exactly ONE concept (one English word).
 *      A picture reused for two different words would make dictation
 *      ambiguous, so this is a hard error.
 *   2. Every entry carries all three languages and a picture.
 *   3. Multi-sense words ("orange" fruit / "orange" colour) are allowed, but
 *      they MUST have different pictures - otherwise one sense is unreachable.
 *   4. Every entry must be reachable through findAll() for each of its own
 *      words, and the picture it resolves to must be the entry's picture.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const libPath = path.join(__dirname, '..', 'assets', 'data', 'picture-library.js');
const code = fs.readFileSync(libPath, 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const D = sandbox.window.EjaanKidsData;

const problems = [];
const notes = [];
const err = (m) => problems.push(m);
const note = (m) => notes.push(m);

console.log('Picture library v' + D.version);

const picOwner = new Map();   // pic  -> { en, category, count }
const wordSenses = new Map(); // lang:word -> Set(pic)
let total = 0;

for (const cat of D.categories) {
  if (!cat.id || !cat.icon || !cat.label || !cat.label.en || !cat.label.ms || !cat.label.zh) {
    err(`category "${cat.id}" has incomplete metadata`);
  }
  for (const w of cat.words) {
    total++;
    for (const lang of ['en', 'ms', 'zh']) {
      const val = w[lang];
      if (!val || !String(val).trim()) {
        err(`${cat.id}: "${w.en}" is missing ${lang}`);
        continue;
      }
      const key = `${lang}:${String(val).toLowerCase().trim()}`;
      if (!wordSenses.has(key)) wordSenses.set(key, new Set());
      wordSenses.get(key).add(w.pic);
    }
    if (!w.pic) {
      err(`${cat.id}: "${w.en}" has no picture`);
      continue;
    }
    if (picOwner.has(w.pic)) {
      const owner = picOwner.get(w.pic);
      err(`picture ${w.pic} used by two different words: "${owner.en}" (${owner.category}) and "${w.en}" (${cat.id})`);
    } else {
      picOwner.set(w.pic, { en: w.en, category: cat.id });
    }
  }
}

D.buildIndex();

// Rule 3: a multi-sense word must still be able to reach every sense.
for (const [key, pics] of wordSenses) {
  if (pics.size > 1) {
    note(`multi-sense word "${key}" -> ${[...pics].join(' ')}`);
  }
}

// Rule 4: reachability.
for (const cat of D.categories) {
  for (const w of cat.words) {
    for (const lang of ['en', 'ms', 'zh']) {
      const hits = D.findAll(w[lang], lang);
      if (!hits.length) {
        err(`findAll("${w[lang]}") returned nothing (${cat.id}/${lang})`);
      } else if (!hits.some((h) => h.pic === w.pic)) {
        err(`findAll("${w[lang]}") does not include ${w.pic} (${cat.id}/${lang})`);
      }
    }
  }
}

console.log(`  categories  : ${D.categories.length}`);
console.log(`  entries     : ${total}`);
console.log(`  unique pics : ${picOwner.size}`);
console.log(`  word senses : ${wordSenses.size}`);

// Regression checks for the bugs reported against the old version.
const regression = [
  ['ikan', 'malay', '🐟', 'exact'],
  ['kucing', 'malay', '🐱', 'exact'],
  ['anjing', 'malay', '🐕', 'exact'],
  ['kura-kura', 'malay', '🐢', 'exact'],
  ['jerung', 'malay', '🦈', 'exact'],
  ['apel', 'malay', '🍎', 'exact'],
  ['pisang', 'malay', '🍌', 'exact'],
  ['kereta api', 'malay', '🚂', 'exact'],
  ['burung hantu', 'malay', '🦉', 'exact'],
  ['ikan paus', 'malay', '🐳', 'exact'],
  ['lada cili', 'malay', '🌶️', 'exact'],
  ['fish', 'english', '🐟', 'exact'],
  ['orange', 'english', '🟠', null],
  ['pink', 'english', '🩷', 'exact'],
  ['ice cream', 'english', '🍦', 'exact'],
  ['rainbow', 'english', '🌈', 'exact'],
  ['鱼', 'chinese', '🐟', 'exact'],
  ['猫', 'chinese', '🐱', 'exact']
];

console.log('\nRegression checks (the reported bug cases):');
for (const [word, lang, expected, expectSource] of regression) {
  const hits = D.findAll(word, lang);
  const ok = hits.some((h) => h.pic === expected);
  const line = `  ${ok ? 'PASS' : 'FAIL'}  ${lang.padEnd(8)} "${word}" -> ${hits.map((h) => h.pic).join(' ')}  (expected ${expected})`;
  console.log(line);
  if (!ok) problems.push(`regression: "${word}" should resolve to ${expected}`);
  if (expectSource && ok) {
    const src = hits.find((h) => h.pic === expected);
    console.log(`         source: ${src.matchedOn} / ${src.category}`);
  }
}

// The old version mapped "orange" to the fruit for colour lessons and
// "pink" to the literal text ".Magenta". Both must now be reachable.
const orangeHits = D.findAll('orange', 'english');
if (!orangeHits.some((h) => h.pic === '🍊')) err('fruit orange 🍊 is no longer reachable');
if (!orangeHits.some((h) => h.pic === '🟠')) err('colour orange 🟠 is no longer reachable');

console.log('\nMulti-sense words (picker shows every option):');
notes.forEach((n) => console.log('  - ' + n));

// ---------------------------------------------------------------------------
// Rule 5: every inlined image must be a well-formed data URI.
//
// A missing "data:" prefix makes the browser treat the value as a relative
// URL, so the image silently 404s. That bug shipped once already, so it is
// checked on every run.
// ---------------------------------------------------------------------------
console.log('\nInline artwork:');

const artworkPath = path.join(__dirname, '..', 'assets', 'data', 'artwork.js');
const artSandbox = { window: {} };
vm.createContext(artSandbox);
vm.runInContext(fs.readFileSync(artworkPath, 'utf8'), artSandbox);
const ARTWORK = artSandbox.window.EjaanKidsArtwork;

if (!ARTWORK || !Object.keys(ARTWORK).length) {
  err('assets/data/artwork.js is empty or missing - run tools/build-artwork.ps1');
} else {
  let ok = 0;
  for (const [key, uri] of Object.entries(ARTWORK)) {
    if (key === 'version') continue;
    if (typeof uri !== 'string' || !/^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(uri)) {
      err(`artwork "${key}" is not a valid base64 image data URI`);
    } else {
      ok++;
    }
  }
  console.log(`  data URIs   : ${ok}/${Object.keys(ARTWORK).length - 1} valid`);

  // illustrations.js may only point at artwork that actually exists.
  const illPath = path.join(__dirname, '..', 'assets', 'data', 'illustrations.js');
  const illSandbox = { window: { EjaanKidsArtwork: ARTWORK } };
  vm.createContext(illSandbox);
  vm.runInContext(fs.readFileSync(illPath, 'utf8'), illSandbox);
  const ART = illSandbox.window.EjaanKidsArt;

  for (const word of ['fish', 'cat', 'dog', 'bird', 'apple', 'banana', 'sun', 'moon', 'star', 'car', 'book', 'ball']) {
    const uri = ART.path(word);
    if (!uri) err(`illustration for "${word}" is missing`);
    else if (!uri.startsWith('data:image/')) err(`illustration for "${word}" is not a data URI`);
  }
  if (!ART.icon(192)) err('app icon (192) is missing');
  if (!ART.icon(512)) err('app icon (512) is missing');
  console.log(`  illustrations: 12 starter words + app icon resolved`);
}

console.log(problems.length === 0
  ? `\nOK - library is valid (${total} entries, ${picOwner.size} unique pictures).`
  : `\nFAILED - ${problems.length} problem(s).`);
problems.forEach((p) => console.log('  ! ' + p));
process.exit(problems.length === 0 ? 0 : 1);
