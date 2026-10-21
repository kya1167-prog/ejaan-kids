# Ejaan Kids 🦞

A modern spelling & dictation app for children — **English**, **Bahasa Melayu** and **中文**.

Every picture always matches the word, in every language. No API keys, no network, no ads.
Install it on a phone and it works offline.

---

## What changed in v3

The v2 app was a single 1,800-line HTML file. This release rewrote it around one idea:
**a word and its picture must never disagree.** The old build kept three separate
emoji tables, so any word missing from its table fell back to a placeholder — a 🇲🇾 flag
for Malay, a ⭐ for English — or to a random stock photo from a photo-search API. That is
why pictures "did not match the word", especially in Malay.

### The picture fix

| | Before (v2) | Now (v3) |
|---|---|---|
| Picture source | 3 separate tables + 3 photo APIs | 1 shared library, 404 concepts × 3 languages |
| Malay word not in the table | 🇲🇾 flag | correct picture, matched in any language |
| English word not in the table | ⭐ | correct picture |
| Colour "orange" | 🍊 (the fruit) | 🟠 **and** 🍊 — the parent picks |
| "pink" | the literal text `.Magenta` | 🩷 |
| Picture API keys | 1 placeholder + 2 leaked keys in the source | none — no key, no rate limit, no network |
| Offline | broken (needed `fetch()` for the map) | fully offline, installable as a PWA |

The new library (`assets/data/picture-library.js`) pairs **one concept with one picture**
and spells that concept in all three languages, so `ikan` / `fish` / `鱼` all resolve to 🐟.
A validation script enforces that no picture is ever reused for two different words, which
keeps dictation unambiguous.

### Bugs fixed

- **Picture never updated in spelling mode** — the child saw a generic 🖼️ frame instead of
  the word's picture.
- **`fetch()` of a local JSON file** — blocked by CORS when the app is opened from disk
  (`file://`), which silently emptied the picture map. The library is now plain JS.
- **Wrong button updated while speaking** — `querySelector('.speak-btn')` always found the
  hidden button in the other mode. The active button is now passed in explicitly.
- **`event.target` on an implicit global** — broke outside Chrome.
- **Two functions with the same name** — `selectImage()` was defined twice.
- **Data file loaded twice**, racing the first render.
- **Stale undo stack** after a wrong answer — cleared the tiles but not the undo history.
- **`alert()` popups** everywhere, including on routine speech errors. Replaced with toasts.
- **Chinese in Listen mode** rendered the tracing panel instead of the word and picture.
- **Duplicate UI string keys** — the Malay "Listen & Learn" label was silently overwritten.
- **Layout**: `.hidden` was overridden by `display: grid`; the responsive rule clobbered
  `.picture--xs`; grid tracks sized to the image's intrinsic width so thumbnails overflowed.
- **Progress bar** divided by zero with an empty word list.

---

## Features

**For children**

- ✍️ **Spelling mode** — big picture, shuffled letter tiles, undo, clear, and a hint that
  fills the next letter.
- 👂 **Listen & Learn mode** — word, picture and narration with previous/next navigation.
- 🖌️ **Chinese stroke tracing** via HanziWriter, with a tap-the-character fallback when the
  library is unavailable offline.
- ⭐ Stars, 🔥 daily streaks and 🏅 badges that persist between sessions.
- 🎉 Confetti and a celebration screen on every correct answer.

**For parents**

- 📝 Add, edit and delete words in any of the three languages.
- 🎨 **Every word's picture is visible and changeable.** Tap a word to pick from 404
  illustrations, search in any of the three languages, or let the app match it automatically.
- 🧠 Auto-matching works across languages: type `kerbau` and it finds 🐃 even when the app
  is set to Chinese.
- 🔊 A voice panel that shows exactly which TTS voices your device has.
- ⬇️ Export / ⬆️ import the word list as JSON, and reset everything.
- ✨ One tap to add a 32-word starter set across all three languages.

**Technical**

- 📱 Installable PWA — add to home screen, runs offline.
- 🌙 Light / dark / system theme.
- 🌍 The interface language follows the content language: pick Melayu and the whole app
  becomes Bahasa Melayu.
- ♿ Accessible: semantic landmarks, ARIA labels, visible focus rings, 44px+ touch targets,
  and `prefers-reduced-motion` support.
- 📦 ~530 KB of images in total (the generated artwork was optimised down from 10 MB).

---

## Getting started

```bash
git clone https://github.com/kya1167-prog/ejaan-kids.git
cd ejaan-kids

# any static server works
npx serve .
# or
node tools/serve.cjs 8123
```

Then open <http://127.0.0.1:8123/>.

Opening `index.html` directly from disk also works — the app was rebuilt so it no longer
needs `fetch()` for local files.

### Voice packs

Pronunciation uses the Web Speech API with your device's voices. If a language is missing:

| Platform | Where to add it |
|---|---|
| Windows | Settings → Time & Language → Language → Speech |
| macOS | System Settings → Accessibility → Spoken Content |
| Android | Settings → System → Languages & input → Text-to-speech |
| iOS | Settings → Accessibility → Spoken Content → Voices |

The Parent screen shows a green tick for every voice it can find.

---

## Project layout

The repository is **100% text**. Every raster asset is inlined as a data URI, so the
whole app is a handful of plain files that can never 404, never need a build step,
and work straight from `file://`.

```
ejaan-kids/
├── index.html                     # markup only
├── manifest.webmanifest           # PWA metadata (icons inlined)
├── sw.js                          # offline cache
├── assets/
│   ├── styles.css                 # design tokens + all styling
│   ├── app.js                     # application logic
│   ├── data/
│   │   ├── picture-library.js     # 404 concepts × 3 languages (source of truth)
│   │   ├── illustrations.js       # curated artwork for the starter words
│   │   └── artwork.js             # generated: every image as a data URI
│   └── img/
│       └── icon.svg               # app icon (wraps the inline 192px PNG)
├── tools/
│   ├── validate-library.cjs       # picture/word integrity checks
│   ├── validate-ui.cjs            # UI string table checks
│   ├── optimize-images.ps1        # downscale and compress the raw artwork
│   ├── build-artwork.ps1          # raw artwork -> assets/data/artwork.js
│   ├── build-manifest.cjs         # regenerate manifest.webmanifest
│   ├── build-push-args.cjs        # build the GitHub App push payload
│   └── serve.cjs                  # tiny dev server
└── source-assets/                 # git-ignored: raw artwork sources
```

### Regenerating the artwork

The raw artwork is **not** committed — the repository stays text-only. To rebuild
the inline images, drop the originals into `source-assets/raw/` and run:

```bash
powershell -File tools/optimize-images.ps1   # raw -> optimised icons + JPEGs
powershell -File tools/build-artwork.ps1      # optimised -> assets/data/artwork.js
node tools/build-manifest.cjs                 # -> manifest.webmanifest
```

`build-artwork.ps1` re-encodes the icons as 8-bit indexed PNGs (259 KB → 18 KB) and
scales the word illustrations to the 320 px they are displayed at, which takes the
whole picture set from ~10 MB down to ~240 KB of inline data URIs.

## Checks

```bash
npm run check        # both validators
npm run serve        # dev server on :8123
```

`validate-library.cjs` enforces that every picture belongs to exactly one concept, that
every entry has all three languages, that multi-sense words can still reach every sense,
and that the historically broken words (`ikan`, `kucing`, `orange`, `pink`, `ice cream`, …)
still resolve correctly.

`validate-ui.cjs` enforces that the three locales have identical key sets and no duplicate
keys.

---

## Licence

MIT.
