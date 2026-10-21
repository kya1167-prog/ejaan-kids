/**
 * Ejaan Kids — illustration overrides (v3.0.0)
 * ---------------------------------------------------------------------------
 * A handful of starter words ship with hand-picked artwork instead of the
 * generic emoji, so the very first session already looks like a real app.
 * The key is the canonical English word from assets/data/picture-library.js,
 * which means one illustration serves English, Melayu and Chinese at once.
 *
 * The artwork itself lives in assets/data/artwork.js as data URIs, so the
 * whole app is made of text files and can never 404 or need the network.
 *
 * Every other word falls back to its emoji from the picture library, so the
 * whole library still works with no image files at all.
 */
(function (global) {
  'use strict';

  var ARTWORK = global.EjaanKidsArtwork || {};

  /* English word -> key inside EjaanKidsArtwork */
  var MAP = {
    fish:   'word-ikan',
    cat:    'word-kucing',
    dog:    'word-anjing',
    bird:   'word-burung',
    apple:  'word-apel',
    banana: 'word-pisang',
    sun:    'word-matahari',
    moon:   'word-bulan',
    star:   'word-bintang',
    car:    'word-kereta',
    book:   'word-buku',
    ball:   'word-bola'
  };

  global.EjaanKidsArt = {
    version: '3.0.0',

    /** Data URI for an English key, or null when there is no artwork. */
    path: function (englishWord) {
      var key = MAP[String(englishWord || '').toLowerCase()];
      if (!key) return null;
      return ARTWORK[key] || null;
    },

    /** Data URI for the app icon at the given size. */
    icon: function (size) {
      return ARTWORK['icon' + size] || ARTWORK.icon192 || null;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
