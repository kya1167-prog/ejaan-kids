/**
 * Generates manifest.webmanifest with the app icons inlined as data URIs.
 *
 * The manifest needs both a 192px and a 512px icon for Chrome to offer the
 * install prompt. Because the repository is text-only, the icons are embedded
 * rather than referenced as files.
 *
 * Run:  node tools/build-manifest.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const artworkPath = path.join(ROOT, 'assets', 'data', 'artwork.js');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(artworkPath, 'utf8'), sandbox);
const ARTWORK = sandbox.window.EjaanKidsArtwork;

if (!ARTWORK || !ARTWORK.icon192 || !ARTWORK.icon512) {
  console.error('artwork.js does not contain the icons - run tools/build-artwork.ps1 first.');
  process.exit(1);
}

const manifest = {
  name: 'Ejaan Kids — Spelling & Dictation',
  short_name: 'Ejaan Kids',
  description:
    'A modern spelling and dictation app for children. Learn English, Bahasa Melayu and Chinese with matching pictures, clear voice playback and full offline support.',
  id: '/ejaan-kids/',
  start_url: './index.html',
  scope: './',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#f6f7fb',
  theme_color: '#6366f1',
  categories: ['education', 'kids'],
  lang: 'en',
  dir: 'ltr',
  icons: [
    { src: 'assets/img/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    { src: ARTWORK.icon192, sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: ARTWORK.icon512, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ],
  shortcuts: [
    {
      name: 'Melayu',
      short_name: 'Melayu',
      url: './index.html?lang=malay',
      icons: [{ src: 'assets/img/icon.svg', sizes: 'any', type: 'image/svg+xml' }]
    },
    {
      name: '中文',
      short_name: '中文',
      url: './index.html?lang=chinese',
      icons: [{ src: 'assets/img/icon.svg', sizes: 'any', type: 'image/svg+xml' }]
    }
  ]
};

const out = path.join(ROOT, 'manifest.webmanifest');
fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`Wrote ${out} (${(fs.statSync(out).size / 1024).toFixed(1)} KB)`);
