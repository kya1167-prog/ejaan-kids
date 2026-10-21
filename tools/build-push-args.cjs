/**
 * Builds the push_files argument file for the GitHub App.
 *
 * The repository is deliberately 100% text: every raster asset is inlined as
 * a data URI (see assets/data/artwork.js), so the whole app can be pushed
 * through a text-only API without ever losing a byte.
 *
 * This script therefore refuses to send anything that is not valid UTF-8
 * text. If a binary file ever creeps back into the tree it fails loudly
 * instead of corrupting it on the remote.
 *
 * Usage: node tools/build-push-args.cjs <outfile> [--branch <name>] [--message <text>]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const args = process.argv.slice(2);
const out = args[0];
if (!out) {
  console.error('Usage: node tools/build-push-args.cjs <outfile> [--branch <name>] [--message <text>]');
  process.exit(1);
}

function flagValue(name, fallback) {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const branch = flagValue('--branch', 'feat/v3-redesign');
const message = flagValue('--message', 'Redesign v3: picture library, modern UI, PWA and bug fixes');

const TEXT = /\.(html|css|js|json|webmanifest|md|txt|cjs|ps1|svg)$/i;

const SKIP_DIRS = new Set(['.git', 'node_modules', '.tmp', 'source-assets']);
const SKIP_FILES = new Set(['package-lock.json']);

/** Dotfiles such as .gitignore have no extension but are still plain text. */
function isTextFile(rel) {
  if (TEXT.test(rel)) return true;
  const base = rel.split('/').pop();
  if (base.startsWith('.')) return true;   // .gitignore, .gitattributes
  return !base.includes('.');               // LICENSE, README
}

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else files.push(full);
  }
}
walk(ROOT);

const payload = [];
const problems = [];

for (const full of files) {
  const rel = path.relative(ROOT, full).split(path.sep).join('/');
  if (SKIP_FILES.has(rel)) continue;

  const raw = fs.readFileSync(full);

  if (!isTextFile(rel)) {
    problems.push(`${rel}: unknown extension, not provably text`);
    continue;
  }

  const content = raw.toString('utf8');
  // A lossy round-trip means the file holds bytes that are not valid UTF-8.
  if (!Buffer.from(content, 'utf8').equals(raw)) {
    problems.push(`${rel}: contains non-UTF-8 bytes (binary file in a text-only tree)`);
    continue;
  }
  // A NUL byte is the classic sign of a binary blob read as text.
  if (content.includes('\u0000')) {
    problems.push(`${rel}: contains NUL bytes (binary file in a text-only tree)`);
    continue;
  }

  payload.push({ path: rel, content });
  console.log(`${rel.padEnd(44)} ${String(raw.length).padStart(8)} bytes  text`);
}

if (problems.length) {
  console.error('\nERROR - these files cannot be pushed as text:');
  problems.forEach((p) => console.error('  ' + p));
  console.error('\nInline them as data URIs (tools/build-artwork.ps1) or remove them first.');
  process.exit(1);
}

const total = payload.reduce((n, f) => n + f.content.length, 0);
console.log(`\n${payload.length} files, ${(total / 1024).toFixed(0)} KB of content`);

fs.writeFileSync(out, JSON.stringify({
  owner: 'kya1167-prog',
  repo: 'ejaan-kids',
  branch,
  message,
  files: payload
}));
console.log('wrote ' + out);
