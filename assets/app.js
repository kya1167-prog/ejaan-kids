/* ==========================================================================
   Ejaan Kids — application logic (v3.0.0)
   --------------------------------------------------------------------------
   Rewritten from the v2 single-file build. The main things that changed:

   * Pictures are resolved from one shared library (assets/data/picture-library.js)
     so a word and its picture always agree, in all three languages.
   * The library is a JS file, not fetched JSON, so the app also works when it
     is opened straight from disk (file://) where fetch() is blocked.
   * No more alert() popups - every message goes through the toast area.
   * No more implicit `event` global, duplicated functions, or double-loading
     of the data file.
   * Spelling state is reset cleanly after a wrong answer (the undo stack used
     to keep stale entries).
   * The listen button is passed in explicitly instead of being found with
     querySelector(), which used to update the hidden button in the other mode.
   ========================================================================== */
(function () {
  'use strict';

  var APP_VERSION = '3.0.0';
  var STORAGE_KEY = 'ejaanKids.v3';
  var LEGACY_KEY = 'ejaanWords';

  // The placeholders the old version used for words it did not recognise.
  var LEGACY_FALLBACKS = { '⭐': 1, '🇲🇾': 1, '🇨🇳': 1 };

  var DATA = window.EjaanKidsData;
  var ART = window.EjaanKidsArt || { path: function () { return null; } };

  /* ---------------------------------------------------------------- state */

  var state = {
    words: [],
    stats: { stars: 0, streak: 0, lastPracticeDay: '', bestStreak: 0, mastered: {} },
    settings: { theme: 'auto', sound: true, autoSpeak: true, lang: 'english', mode: 'spelling' }
  };

  var session = {
    lang: 'english',
    mode: 'spelling',
    queue: [],
    index: 0,
    input: '',
    undo: [],
    active: null,        // the word object being practised
    sessionStars: 0,
    hanziWriters: [],
    hanziCharIndex: 0,
    hanziStroke: 0
  };

  /* ---------------------------------------------------------------- config */

  var LANGS = {
    english: {
      key: 'english', code: 'EN', speech: 'en-US',
      name: { en: 'English', ms: 'Inggeris', zh: '英文' }
    },
    malay: {
      key: 'malay', code: 'MS', speech: 'ms-MY',
      name: { en: 'Malay', ms: 'Melayu', zh: '马来语' }
    },
    chinese: {
      key: 'chinese', code: '中文', speech: 'zh-CN',
      name: { en: 'Chinese', ms: 'Cina', zh: '中文' }
    }
  };

  /* The interface language follows the selected content language. */
  var UI_LANG = { english: 'en', malay: 'ms', chinese: 'zh' };

  var UI = {
    en: {
      subtitle: 'Spell, listen, learn',
      hi: "Hi, let's learn! 👋",
      blurb: 'Pick a language and start spelling. Every picture always matches the word.',
      spelling: '✍️ Spelling', modeListen: '👂 Listen & Learn',
      start: '▶ Start practising', noWords: 'No words yet for this language. Add some in ⚙️ Parent.',
      ready: '{n} words ready to practise',
      listen: '🔊 Listen', undo: '↩️ Undo', clear: '🧹 Clear', hint: '💡 Hint',
      prompt: 'Tap the letters in order', tapChars: 'Tap the characters in order',
      zhPrompt: 'Trace each character in the correct stroke order', zhHint: '💡 Show next stroke',
      prev: '⬅️ Previous', next: 'Next ➡️',
      badges: '🏅 Your badges', wordList: '📝 Word list',
      addHint: 'Tap a picture to change it. Words with a picture are ready to practise.',
      langLabel: 'Language', wordLabel: 'Word', pictureLabel: 'Picture',
      browse: '🎨 Browse library', auto: '✨ Match automatically',
      save: 'Save', cancel: 'Cancel', close: 'Close',
      choosePicture: 'Choose a picture', current: 'Current:',
      addWord: 'Add a word', editWord: 'Edit a word',
      pickMatch: 'Pick the picture that matches the word.',
      noMatch: 'No picture found yet — choose one.',
      added: 'Added!', updated: 'Updated!', removed: 'Removed',
      wrong: 'Not quite — try again! 🔊', correct: 'Correct! 🎉',
      stars: 'Stars', streak: 'Streak', mastered: 'Words learned', total: 'Words',
      badgeFirst: 'First word', badge10: '10 stars', badge50: '50 stars',
      badge7: '7-day streak', badge100: '100 words', badgePerfect: 'Perfect round',
      noVoice: 'No {lang} voice found on this device. Install the language pack in your system settings.',
      offline: 'You are offline — pictures still work.',
      install: 'Install', voiceOk: 'Ready', voiceMissing: 'Missing',
      voiceTitle: '🔊 Voice', voiceHint: 'English, Melayu and Chinese are read aloud using your device voices.',
      settingsTitle: '⚙️ Settings',
      starter: '✨ Add starter set', export: '⬇️ Export', import: '⬆️ Import',
      reset: '🗑️ Reset', checkVoices: '🔄 Check again', noWordsYet: 'No words yet. Add one above, or add the starter set.',
      soundLabel: 'Sound effects', autoLabel: 'Auto-play the word', installLabel: 'Install as an app',
      searchPlaceholder: 'Search in English, Melayu or 中文…',
      on: 'On', off: 'Off',
      exportOk: 'Word list exported.', importOk: 'Imported {n} words.', resetOk: 'Everything reset.'
    },
    ms: {
      subtitle: 'Teka, dengar, belajar',
      hi: 'Hai, jom belajar! 👋',
      blurb: 'Pilih bahasa dan mula mengeja. Setiap gambar sentiasa sepadan dengan perkataan.',
      spelling: '✍️ Meneka', modeListen: '👂 Dengar & Belajar',
      start: '▶ Mula berlatih', noWords: 'Tiada perkataan untuk bahasa ini. Tambah di ⚙️ Parent.',
      ready: '{n} perkataan sedia berlatih',
      listen: '🔊 Dengar', undo: '↩️ Buat asal', clear: '🧹 Kosongkan', hint: '💡 Petunjuk',
      prompt: 'Tekan huruf mengikut urutan', tapChars: 'Tekan aksara mengikut urutan',
      zhPrompt: 'Tulis setiap aksara mengikut urutan strok yang betul', zhHint: '💡 Tunjukkan strok seterusnya',
      prev: '⬅️ Sebelum', next: 'Seterusnya ➡️',
      badges: '🏅 Lencana anda', wordList: '📝 Senarai perkataan',
      addHint: 'Tekan gambar untuk menukarnya. Perkataan bergambar sedia untuk berlatih.',
      langLabel: 'Bahasa', wordLabel: 'Perkataan', pictureLabel: 'Gambar',
      browse: '🎨 Lihat pustaka', auto: '✨ Padan secara automatik',
      save: 'Simpan', cancel: 'Batal', close: 'Tutup',
      choosePicture: 'Pilih gambar', current: 'Sekarang:',
      addWord: 'Tambah perkataan', editWord: 'Sunting perkataan',
      pickMatch: 'Pilih gambar yang sepadan dengan perkataan.',
      noMatch: 'Belum ada gambar — pilih satu.',
      added: 'Ditambah!', updated: 'Dikemas kini!', removed: 'Dibuang',
      wrong: 'Belum tepat — cuba lagi! 🔊', correct: 'Betul! 🎉',
      stars: 'Bintang', streak: 'Rentetan', mastered: 'Perkataan dihafal', total: 'Perkataan',
      badgeFirst: 'Perkataan pertama', badge10: '10 bintang', badge50: '50 bintang',
      badge7: 'Rentetan 7 hari', badge100: '100 perkataan', badgePerfect: 'Pusingan sempurna',
      noVoice: 'Tiada suara {lang} pada peranti ini. Pasang pakej bahasa dalam tetapan sistem.',
      offline: 'Anda tanpa talian — gambar masih berfungsi.',
      install: 'Pasang', voiceOk: 'Sedia', voiceMissing: 'Tiada',
      voiceTitle: '🔊 Suara', voiceHint: 'Inggeris, Melayu dan Cina dibaca dengan suara peranti anda.',
      settingsTitle: '⚙️ Tetapan',
      starter: '✨ Tambah set asas', export: '⬇️ Eksport', import: '⬆️ Import',
      reset: '🗑️ Set semula', checkVoices: '🔄 Semak semula', noWordsYet: 'Tiada perkataan lagi. Tambah di atas, atau tambah set asas.',
      soundLabel: 'Kesan bunyi', autoLabel: 'Main automatik', installLabel: 'Pasang sebagai aplikasi',
      searchPlaceholder: 'Cari dalam Inggeris, Melayu atau 中文…',
      on: 'Hidup', off: 'Mati',
      exportOk: 'Senarai perkataan dieksport.', importOk: '{n} perkataan diimport.', resetOk: 'Semua ditetapkan semula.'
    },
    zh: {
      subtitle: '拼写、听读、学习',
      hi: '嗨，我们开始学习吧！👋',
      blurb: '选择语言开始拼写。每张图片始终与单词匹配。',
      spelling: '✍️ 拼写', modeListen: '👂 听读学习',
      start: '▶ 开始练习', noWords: '这个语言还没有单词。请在 ⚙️ 家长 里添加。',
      ready: '{n} 个单词可以练习',
      listen: '🔊 听', undo: '↩️ 撤销', clear: '🧹 清空', hint: '💡 提示',
      prompt: '按顺序点击字母', tapChars: '按顺序点击汉字',
      zhPrompt: '按正确的笔画顺序书写每个汉字', zhHint: '💡 显示下一笔',
      prev: '⬅️ 上一个', next: '下一个 ➡️',
      badges: '🏅 你的徽章', wordList: '📝 单词列表',
      addHint: '点击图片可以更换。带图片的单词可以开始练习。',
      langLabel: '语言', wordLabel: '单词', pictureLabel: '图片',
      browse: '🎨 浏览图库', auto: '✨ 自动匹配',
      save: '保存', cancel: '取消', close: '关闭',
      choosePicture: '选择图片', current: '当前：',
      addWord: '添加单词', editWord: '编辑单词',
      pickMatch: '选择与单词相符的图片。',
      noMatch: '还没有图片 — 请选择一个。',
      added: '已添加！', updated: '已更新！', removed: '已删除',
      wrong: '不太对 — 再试一次！🔊', correct: '正确！🎉',
      stars: '星星', streak: '连续天数', mastered: '学会的单词', total: '单词',
      badgeFirst: '第一个单词', badge10: '10 颗星', badge50: '50 颗星',
      badge7: '连续 7 天', badge100: '100 个单词', badgePerfect: '完美一轮',
      noVoice: '此设备没有{lang}语音。请在系统设置中安装语言包。',
      offline: '当前离线 — 图片仍然可用。',
      install: '安装', voiceOk: '可用', voiceMissing: '缺失',
      voiceTitle: '🔊 语音', voiceHint: '使用设备语音朗读英文、马来文和中文。',
      settingsTitle: '⚙️ 设置',
      starter: '✨ 添加基础词集', export: '⬇️ 导出', import: '⬆️ 导入',
      reset: '🗑️ 重置', checkVoices: '🔄 重新检查', noWordsYet: '还没有单词。请在上方添加，或添加基础词集。',
      soundLabel: '音效', autoLabel: '自动朗读', installLabel: '安装为应用',
      searchPlaceholder: '搜索英文、马来文或中文…',
      on: '开', off: '关',
      exportOk: '单词列表已导出。', importOk: '已导入 {n} 个单词。', resetOk: '已全部重置。'
    }
  };

  var CHEERS = {
    en: ['Awesome!', 'Brilliant!', 'Well done!', 'Excellent!', 'Great job!', 'Fantastic!'],
    ms: ['Hebat!', 'Bagus sekali!', 'Syabas!', 'Bagus!', 'Cemerlang!'],
    zh: ['太棒了！', '真厉害！', '做得好！', '很棒！', '出色！']
  };

  /* ------------------------------------------------------------- helpers */

  function $(id) { return document.getElementById(id); }
  function t(key) {
    // The UI string table is keyed by locale (en/ms/zh) while the selected
    // content language is keyed by name (english/malay/chinese).
    var ui = UI_LANG[state.settings.lang] || 'en';
    return (UI[ui] || UI.en)[key] || UI.en[key] || key;
  }
  function langName(key) {
    var l = LANGS[key] || LANGS.english;
    var ui = UI_LANG[state.settings.lang] || 'en';
    return l.name[ui] || l.name.en;
  }
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  function todayKey() { return new Date().toISOString().slice(0, 10); }

  /* ------------------------------------------------------------- storage */

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);

      if (raw) {
        var data = JSON.parse(raw);
        if (Array.isArray(data.words)) state.words = data.words;
        if (data.stats) {
          state.stats = Object.assign(state.stats, data.stats);
          if (!state.stats.mastered) state.stats.mastered = {};
        }
        if (data.settings) state.settings = Object.assign(state.settings, data.settings);
      }

      // Runs after the v3 data is in place so it only adds what is missing.
      importLegacyWords();
      migrateWords();
    } catch (e) {
      console.warn('Could not read saved words:', e);
    }
  }

  /**
   * Repair saved words whose picture no longer points at anything real.
   *
   * Early v3 builds stored pictures as file paths ("assets/img/words/…jpg").
   * The artwork now lives inline as data URIs, so those references 404. Any
   * image scene that is not a data URI is re-resolved from the picture
   * library; a picture the parent chose by hand is only kept when it is
   * still self-contained.
   */
  function migrateWords() {
    var changed = false;

    state.words.forEach(function (entry) {
      var scene = entry.scene;

      if (!scene) {
        entry.scene = resolveScene(entry.word, entry.lang);
        changed = true;
        return;
      }

      // A hand-picked picture is always self-contained (emoji or data URI).
      if (scene.type === 'emoji') return;

      if (scene.type === 'image' && String(scene.value || '').indexOf('data:') === 0) return;

      // Anything else is a stale reference: rebuild it from the library.
      var fresh = resolveScene(entry.word, entry.lang);
      entry.scene = fresh || { type: 'emoji', value: '❓' };
      changed = true;
    });

    if (changed) save();
  }

  /**
   * Bring the word list across from the old v2 app.
   *
   * v2 kept its words under the key "ejaanWords". Without this step every
   * existing user would open v3 and find an empty list. Their pictures are
   * re-resolved from the new library, because the old ones were the broken
   * ones (a flag for Malay, a star for English).
   */
  function importLegacyWords() {
    var raw;
    try { raw = localStorage.getItem(LEGACY_KEY); } catch (e) { return; }
    if (!raw) return;

    var list;
    try { list = JSON.parse(raw); } catch (e) { return; }
    if (!Array.isArray(list)) return;

    var added = 0;

    list.forEach(function (old) {
      if (!old || !old.word) return;

      var word = String(old.word).trim();
      var lang = old.lang || 'english';

      var exists = state.words.some(function (w) {
        return w.lang === lang && String(w.word).toLowerCase() === word.toLowerCase();
      });
      if (exists) return;

      var scene = resolveScene(word, lang);

      if (!scene) {
        // Keep a v2 emoji only when it was a real match, not one of the
        // placeholder fallbacks the old version used for unknown words.
        var value = old.scene && old.scene.type === 'emoji' ? old.scene.value : null;
        scene = value && !LEGACY_FALLBACKS[value] ? { type: 'emoji', value: value } : null;
      }

      state.words.push({ word: word, lang: lang, scene: scene });
      added++;
    });

    if (added) {
      save();
      console.info('Imported ' + added + ' word(s) from the previous version.');
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        words: state.words,
        stats: state.stats,
        settings: state.settings
      }));
    } catch (e) {
      console.warn('Could not save:', e);
    }
  }

  function wordKey(word, lang) {
    return lang + '|' + String(word).toLowerCase().trim();
  }

  /* ------------------------------------------------------------ pictures */

  /**
   * Resolve the picture for a word.
   * Order of preference:
   *   1. an explicit override chosen by the parent
   *   2. curated artwork for that concept (one file serves all languages)
   *   3. the emoji from the shared picture library
   *   4. nothing - flagged so the parent can add a picture
   */
  function resolveScene(word, lang, override) {
    if (override && override.type && override.value) return override;

    var hits = DATA.findAll(word, lang);
    if (!hits.length) return null;

    var hit = hits[0];
    var art = ART.path(hit.en);
    if (art) return { type: 'image', value: art };
    return { type: 'emoji', value: hit.pic };
  }

  /** Every candidate picture for a word (multi-sense words return several). */
  function candidatesFor(word, lang) {
    var hits = DATA.findAll(word, lang);
    var out = hits.map(function (h) {
      var art = ART.path(h.en);
      return {
        pic: h.pic,
        en: h.en, ms: h.ms, zh: h.zh,
        category: h.category,
        image: art,
        scene: art ? { type: 'image', value: art } : { type: 'emoji', value: h.pic }
      };
    });
    return out;
  }

  function sceneMarkup(scene, fallback) {
    if (!scene) return esc(fallback || '❓');
    if (scene.type === 'image') {
      return '<img src="' + esc(scene.value) + '" alt="" loading="lazy">';
    }
    return esc(scene.value || fallback || '❓');
  }

  /**
   * Markup for one library item: the curated artwork when the concept has
   * one, otherwise the emoji from the picture library.
   *
   * The parent must see exactly the picture the child will see, so both the
   * picker grid and the add/edit dialog use this helper.
   */
  function itemPicture(item) {
    if (!item) return '';
    var art = item.image || ART.path(item.en);
    if (art) return '<img src="' + esc(art) + '" alt="" loading="lazy">';
    return esc(item.pic || '');
  }

  /* --------------------------------------------------------------- toast */

  function toast(message, kind) {
    var host = $('toasts');
    if (!host) return;
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast--' + kind : '');
    el.textContent = message;
    host.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .25s, transform .25s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      setTimeout(function () { el.remove(); }, 260);
    }, 2600);
  }

  /* ---------------------------------------------------------------- TTS */

  var voices = [];
  var voicesReady = false;

  function loadVoices() {
    return new Promise(function (resolve) {
      if (!('speechSynthesis' in window)) { resolve([]); return; }
      var list = window.speechSynthesis.getVoices();
      if (list && list.length) {
        voices = list; voicesReady = true; resolve(voices);
        return;
      }
      var done = false;
      var finish = function () {
        if (done) return;
        done = true;
        voices = window.speechSynthesis.getVoices() || [];
        voicesReady = true;
        resolve(voices);
      };
      window.speechSynthesis.addEventListener('voiceschanged', finish, { once: true });
      setTimeout(finish, 1200);
    });
  }

  function bestVoice(lang) {
    if (!voicesReady) return null;
    var prefs = {
      english: ['en-US', 'en-GB', 'en-AU', 'en'],
      malay: ['ms-MY', 'ms', 'id-ID', 'id'],
      chinese: ['zh-CN', 'zh-SG', 'zh-TW', 'zh-HK', 'zh']
    }[lang] || [lang];

    for (var i = 0; i < prefs.length; i++) {
      var exact = voices.filter(function (v) { return v.lang && v.lang.toLowerCase() === prefs[i].toLowerCase(); });
      if (exact.length) {
        var local = exact.filter(function (v) { return v.localService; });
        return local[0] || exact[0];
      }
    }
    for (var j = 0; j < prefs.length; j++) {
      var prefix = prefs[j].split('-')[0];
      var partial = voices.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf(prefix) === 0; });
      if (partial.length) {
        var localP = partial.filter(function (v) { return v.localService; });
        return localP[0] || partial[0];
      }
    }
    return null;
  }

  /**
   * Speak a word. The button is passed in so the right one is updated —
   * the old code used querySelector('.speak-btn'), which always found the
   * hidden button in the other mode.
   */
  function speak(text, lang, button) {
    if (!text) return;
    if (!('speechSynthesis' in window)) {
      toast(t('noVoice').replace('{lang}', langName(lang)), 'error');
      return;
    }

    var voice = bestVoice(lang);
    if (!voice && !voicesReady) {
      loadVoices().then(function () { speak(text, lang, button); });
      return;
    }

    try {
      window.speechSynthesis.cancel();
      var utter = new SpeechSynthesisUtterance(String(text));
      utter.lang = (voice && voice.lang) || (LANGS[lang] || LANGS.english).speech;
      utter.rate = lang === 'chinese' ? 0.72 : 0.82;
      utter.pitch = 1.02;
      if (voice) utter.voice = voice;

      if (button) {
        button.disabled = true;
        button.dataset.label = button.textContent;
        button.textContent = '🔊 …';
      }
      utter.onend = utter.onerror = function () {
        if (button) {
          button.disabled = false;
          button.textContent = button.dataset.label || t('listen');
        }
      };
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn('Speech failed:', e);
      if (button) { button.disabled = false; button.textContent = button.dataset.label || t('listen'); }
      toast(t('noVoice').replace('{lang}', langName(lang)), 'error');
    }
  }

  function renderVoiceStatus() {
    var host = $('voiceList');
    if (!host) return;
    host.innerHTML = '';
    Object.keys(LANGS).forEach(function (key) {
      var voice = bestVoice(key);
      var row = document.createElement('div');
      row.className = 'voice-item';
      row.innerHTML =
        '<span>' + esc(langName(key)) + '</span>' +
        '<span class="chip' + (voice ? '' : ' chip--warn') + '">' +
          (voice ? '✅ ' + esc(voice.name) + ' (' + esc(voice.lang) + ')' : '⚠️ ' + esc(t('voiceMissing'))) +
        '</span>';
      host.appendChild(row);
    });
  }

  /* ---------------------------------------------------------- home view */

  /**
   * Localise the static markup. The interface language follows the selected
   * content language, so picking Melayu switches the whole app to Bahasa
   * Melayu and picking 中文 switches it to Chinese.
   */
  function localizeStatic() {
    var map = [
      ['homeTitle', 'hi'],
      ['homeBlurb', 'blurb'],
      ['badgesTitle', 'badges'],
      ['parentTitle', 'wordList'],
      ['parentHint', 'addHint'],
      ['voiceTitle', 'voiceTitle'],
      ['voiceHint', 'voiceHint'],
      ['settingsTitle', 'settingsTitle'],
      ['modeSpelling', 'spelling'],
      ['modeListen', 'modeListen'],
      ['btnStart', 'start'],
      ['addLangLabel', 'langLabel'],
      ['modalLangLabel', 'langLabel'],
      ['modalWordLabel', 'wordLabel'],
      ['modalPicLabel', 'pictureLabel'],
      ['btnModalBrowse', 'browse'],
      ['btnModalAuto', 'auto'],
      ['btnModalSave', 'save'],
      ['btnUndo', 'undo'],
      ['btnClear', 'clear'],
      ['btnHint', 'hint'],
      ['btnPrev', 'prev'],
      ['btnNext', 'next'],
      ['btnListenSpell', 'listen'],
      ['btnListenPlay', 'listen'],
      ['btnListenZh', 'listen'],
      ['zhPrompt', 'zhPrompt'],
      ['btnZhHint', 'zhHint'],
      ['btnAddStarter', 'starter'],
      ['btnExport', 'export'],
      ['btnImport', 'import'],
      ['btnReset', 'reset'],
      ['btnCheckVoices', 'checkVoices'],
      ['btnPickerCancel', 'cancel'],
      ['btnWordCancel', 'cancel'],
      ['soundLabel', 'soundLabel'],
      ['autoLabel', 'autoLabel'],
      ['installLabel', 'installLabel']
    ];
    map.forEach(function (pair) {
      var el = $(pair[0]);
      if (el) el.textContent = t(pair[1]);
    });

    // The picker and word-modal titles are set when they open, but the
    // picture label inside the picker needs refreshing too.
    var pickerTitle = $('pickerTitle');
    if (pickerTitle) pickerTitle.textContent = t('choosePicture');
    var pickerSearch = $('pickerSearch');
    if (pickerSearch) pickerSearch.placeholder = t('searchPlaceholder');
    var newWord = $('newWord');
    if (newWord) {
      newWord.placeholder = state.settings.lang === 'malay' ? 'e.g. ikan, kucing'
        : state.settings.lang === 'chinese' ? 'e.g. 鱼, 猫' : 'e.g. fish, cat';
    }
  }

  function renderHome() {
    localizeStatic();
    $('appbarSubtitle').textContent = t('subtitle');

    var grid = $('langGrid');
    grid.innerHTML = '';
    Object.keys(LANGS).forEach(function (key) {
      var l = LANGS[key];
      var count = state.words.filter(function (w) { return w.lang === key; }).length;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lang-card';
      btn.setAttribute('aria-pressed', String(state.settings.lang === key));
      btn.innerHTML =
        '<span class="lang-card__badge" data-lang="' + key + '">' + esc(l.code) + '</span>' +
        '<span class="lang-card__name">' + esc(l.name[UI_LANG[state.settings.lang] || 'en'] || l.name.en) + '</span>' +
        '<span class="lang-card__meta">' + count + ' ' + esc(t('total').toLowerCase()) + '</span>';
      btn.addEventListener('click', function () {
        state.settings.lang = key;
        save();
        renderHome();
        applyLanguageToDocument();
      });
      grid.appendChild(btn);
    });

    Array.prototype.forEach.call($('modeSeg').children, function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.mode === state.settings.mode));
    });

    var count = state.words.filter(function (w) { return w.lang === state.settings.lang; }).length;
    $('startHint').textContent = count ? t('ready').replace('{n}', count) : t('noWords');
    $('btnStart').disabled = count === 0;

    renderStats();
    renderBadges();
  }

  function renderStats() {
    var grid = $('statGrid');
    var mastered = Object.keys(state.stats.mastered || {}).length;
    grid.innerHTML = '';
    [
      { value: state.stats.stars, label: t('stars'), icon: '⭐' },
      { value: state.stats.streak, label: t('streak'), icon: '🔥' },
      { value: mastered, label: t('mastered'), icon: '🧠' },
      { value: state.words.length, label: t('total'), icon: '📚' }
    ].forEach(function (s) {
      var el = document.createElement('div');
      el.className = 'stat';
      el.innerHTML = '<span class="stat__value">' + s.icon + ' ' + s.value + '</span>' +
                     '<span class="stat__label">' + esc(s.label) + '</span>';
      grid.appendChild(el);
    });
  }

  function renderBadges() {
    var host = $('badgeRow');
    var stars = state.stats.stars;
    var streak = state.stats.streak;
    var mastered = Object.keys(state.stats.mastered || {}).length;
    var perfect = state.stats.perfectRounds || 0;

    var list = [
      { icon: '🌱', label: t('badgeFirst'), earned: mastered >= 1 },
      { icon: '⭐', label: t('badge10'), earned: stars >= 10 },
      { icon: '🏅', label: t('badge50'), earned: stars >= 50 },
      { icon: '🔥', label: t('badge7'), earned: streak >= 7 },
      { icon: '📚', label: t('badge100'), earned: mastered >= 100 },
      { icon: '💯', label: t('badgePerfect'), earned: perfect >= 1 }
    ];
    host.innerHTML = '';
    list.forEach(function (b) {
      var el = document.createElement('span');
      el.className = 'badge' + (b.earned ? ' badge--earned' : '');
      el.textContent = b.icon + ' ' + b.label;
      host.appendChild(el);
    });
  }

  function applyLanguageToDocument() {
    document.documentElement.lang = state.settings.lang === 'chinese' ? 'zh-Hans'
      : state.settings.lang === 'malay' ? 'ms' : 'en';
  }

  /* -------------------------------------------------------- practice view */

  function startPractice() {
    var lang = state.settings.lang;
    var pool = state.words.filter(function (w) { return w.lang === lang; });
    if (!pool.length) {
      toast(t('noWords'), 'error');
      return;
    }
    session.lang = lang;
    session.mode = state.settings.mode;
    session.queue = shuffle(pool);
    session.index = 0;
    session.sessionStars = 0;

    showView('practice');
    loadCurrentWord();
  }

  function loadCurrentWord() {
    if (session.index >= session.queue.length) { finishPractice(); return; }

    session.active = session.queue[session.index];
    session.input = '';
    session.undo = [];

    $('practiceLang').textContent = LANGS[session.lang].code === langName(session.lang)
      ? langName(session.lang)
      : LANGS[session.lang].code + ' · ' + langName(session.lang);
    updateProgress();

    var chinese = session.lang === 'chinese';
    // Chinese only gets its own panel in spelling mode; in Listen mode it
    // behaves like any other language (show the word + picture).
    var chineseSpelling = chinese && session.mode !== 'listen';
    $('panelSpelling').classList.toggle('hidden', chineseSpelling || session.mode === 'listen');
    $('panelListen').classList.toggle('hidden', session.mode !== 'listen');
    $('panelChinese').classList.toggle('hidden', !chineseSpelling);

    if (session.mode === 'listen') {
      renderListen();
    } else if (chinese) {
      setupChinese(session.active);
    } else {
      renderSpelling();
    }

    if (state.settings.autoSpeak) {
      setTimeout(function () { speak(session.active.word, session.lang, listenButtonFor()); }, 450);
    }
  }

  function listenButtonFor() {
    // Listen mode always uses its own button, whichever language is active.
    if (session.mode === 'listen') return $('btnListenPlay');
    if (session.lang === 'chinese') return $('btnListenZh');
    return $('btnListenSpell');
  }

  function updateProgress() {
    var total = session.queue.length || 1;
    var done = Math.min(session.index, total);
    $('practiceProgress').textContent = 'Word ' + (session.index + 1) + ' / ' + session.queue.length;
    $('practiceProgressBar').style.width = (done / total) * 100 + '%';
  }

  /* ---- latin spelling ---- */

  function renderSpelling() {
    var word = session.active.word;
    var slots = $('spellSlots');
    var keys = $('spellKeys');

    $('spellPrompt').textContent = t('prompt');
    $('spellPicture').innerHTML = sceneMarkup(session.active.scene, '❓');

    slots.innerHTML = '';
    word.split('').forEach(function (ch) {
      var el = document.createElement('div');
      el.className = 'slot' + (ch === ' ' ? ' slot--space' : '');
      slots.appendChild(el);
    });

    keys.innerHTML = '';
    shuffle(word.split('')).forEach(function (ch) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'key';
      b.textContent = ch === ' ' ? '␣' : ch;
      b.setAttribute('aria-label', ch === ' ' ? 'space' : ch);
      b.addEventListener('click', function () { tapLetter(ch, b); });
      keys.appendChild(b);
    });
  }

  function tapLetter(ch, button) {
    if (session.input.length >= session.active.word.length) return;

    session.input += ch;
    session.undo.push({ char: ch, button: button });

    var slots = $('spellSlots').children;
    var target = null;
    for (var i = 0; i < slots.length; i++) {
      if (!slots[i].textContent && !slots[i].classList.contains('slot--space')) { target = slots[i]; break; }
      if (slots[i].classList.contains('slot--space') && !slots[i].textContent) { slots[i].textContent = ' '; }
    }
    // spaces need to be consumed in order, so walk again for the next free slot
    if (!target) {
      for (var j = 0; j < slots.length; j++) {
        if (!slots[j].textContent && !slots[j].classList.contains('slot--space')) { target = slots[j]; break; }
      }
    }
    if (target) {
      target.textContent = ch;
      target.classList.add('slot--filled');
    }

    button.disabled = true;
    button.classList.add('key--used');

    if (session.input.length === session.active.word.length) {
      setTimeout(checkAnswer, 120);
    }
  }

  function undoLetter() {
    if (!session.undo.length) return;
    var last = session.undo.pop();
    session.input = session.input.slice(0, -1);
    if (last.button) {
      last.button.disabled = false;
      last.button.classList.remove('key--used');
    }
    var slots = $('spellSlots').children;
    for (var i = slots.length - 1; i >= 0; i--) {
      if (slots[i].classList.contains('slot--space')) continue;
      if (slots[i].textContent) {
        slots[i].textContent = '';
        slots[i].classList.remove('slot--filled');
        break;
      }
    }
  }

  function clearAnswer() {
    session.input = '';
    session.undo = [];
    Array.prototype.forEach.call($('spellSlots').children, function (s) {
      if (s.classList.contains('slot--space')) return;
      s.textContent = '';
      s.classList.remove('slot--filled', 'slot--wrong');
    });
    Array.prototype.forEach.call($('spellKeys').children, function (b) {
      b.disabled = false;
      b.classList.remove('key--used');
    });
  }

  function checkAnswer() {
    var ok = session.input === session.active.word;
    if (ok) {
      onCorrect();
    } else {
      var slots = $('spellSlots').children;
      for (var i = 0; i < slots.length; i++) {
        if (slots[i].classList.contains('slot--space')) continue;
        slots[i].classList.add('slot--wrong');
      }
      toast(t('wrong'), 'error');
      speak(session.active.word, session.lang, listenButtonFor());
      setTimeout(function () {
        // Reset cleanly: the old code cleared the slots but left the undo
        // stack pointing at stale buttons.
        session.input = '';
        session.undo = [];
        Array.prototype.forEach.call($('spellSlots').children, function (s) {
          if (s.classList.contains('slot--space')) return;
          s.textContent = '';
          s.classList.remove('slot--filled', 'slot--wrong');
        });
        Array.prototype.forEach.call($('spellKeys').children, function (b) {
          b.disabled = false;
          b.classList.remove('key--used');
        });
      }, 620);
    }
  }

  function giveHint() {
    var word = session.active.word;
    var slots = $('spellSlots').children;
    var typed = session.input.length;
    if (typed >= word.length) return;
    var ch = word[typed];
    var target = null;
    for (var i = 0; i < slots.length; i++) {
      if (!slots[i].classList.contains('slot--space') && !slots[i].textContent) { target = slots[i]; break; }
    }
    if (!target) return;
    target.textContent = ch;
    target.classList.add('slot--filled');
    target.style.opacity = '0.55';
    setTimeout(function () { target.style.opacity = ''; }, 900);
  }

  /* ---- chinese ---- */

  function setupChinese(entry) {
    var scene = entry.scene;
    $('zhPicture').innerHTML = sceneMarkup(scene, '❓');

    var wrap = $('hanziWrap');
    wrap.innerHTML = '';
    session.hanziWriters = [];
    session.hanziCharIndex = 0;
    session.hanziStroke = 0;
    chineseCompleted = 0;

    var chars = entry.word.split('');
    var hasWriter = typeof window.HanziWriter === 'function';

    if (hasWriter) {
      $('zhSlots').classList.add('hidden');
      $('zhKeys').classList.add('hidden');
      chars.forEach(function (ch, i) {
        var box = document.createElement('div');
        box.className = 'hanzi-box';
        box.id = 'hz-' + i;
        wrap.appendChild(box);
      });

      chars.forEach(function (ch, i) {
        var writer;
        try {
          writer = window.HanziWriter.create('hz-' + i, ch, {
            width: 168, height: 168, padding: 8,
            showOutline: true,
            strokeAnimationSpeed: 1,
            delayBetweenStrokes: 420,
            showHintAfterMisses: 3,
            highlightOnComplete: true,
            strokeHighlightDuration: 500
          });
        } catch (e) {
          console.warn('HanziWriter could not render', ch, e);
          return;
        }
        session.hanziWriters.push(writer);
        writer.quiz({
          onMistake: function () { session.hanziCharIndex = i; },
          onCorrectStroke: function (d) { session.hanziStroke = d.strokeNum + 1; session.hanziCharIndex = i; },
          onComplete: function () {
            if (session.hanziWriters.every(function (w) { return w && w.quizCompleted !== false; })) {
              // every writer has finished -> success
            }
            onChineseComplete(chars.length);
          }
        });
      });
      session.hanziTotal = chars.length;
    } else {
      // Fallback: no stroke data available, so let the child tap the
      // characters in order instead.
      $('zhSlots').classList.remove('hidden');
      $('zhKeys').classList.remove('hidden');
      renderChineseKeys(chars);
    }
  }

  var chineseCompleted = 0;
  function onChineseComplete(total) {
    chineseCompleted++;
    if (chineseCompleted >= total) {
      chineseCompleted = 0;
      onCorrect();
    }
  }

  function renderChineseKeys(chars) {
    var slots = $('zhSlots');
    var keys = $('zhKeys');
    slots.innerHTML = '';
    keys.innerHTML = '';

    chars.forEach(function (ch) {
      var s = document.createElement('div');
      s.className = 'slot';
      slots.appendChild(s);
    });

    shuffle(chars).forEach(function (ch) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'key';
      b.textContent = ch;
      b.addEventListener('click', function () {
        if (session.input.length >= chars.length) return;
        session.input += ch;
        session.undo.push({ char: ch, button: b });
        var slotsArr = slots.children;
        if (slotsArr[session.input.length - 1]) {
          slotsArr[session.input.length - 1].textContent = ch;
          slotsArr[session.input.length - 1].classList.add('slot--filled');
        }
        b.disabled = true;
        b.classList.add('key--used');
        if (session.input.length === chars.length) setTimeout(checkAnswer, 120);
      });
      keys.appendChild(b);
    });
  }

  function showHanziHint() {
    if (!session.hanziWriters.length) return;
    var writer = session.hanziWriters[Math.min(session.hanziCharIndex, session.hanziWriters.length - 1)];
    if (!writer) return;
    try {
      writer.animateStroke(session.hanziStroke, { duration: 900 });
    } catch (e) {
      console.warn('Hint failed:', e);
    }
  }

  /* ---- listen & learn ---- */

  function renderListen() {
    var entry = session.active;
    $('listenWord').textContent = entry.word;
    $('listenWord').style.fontFamily = session.lang === 'chinese' ? 'var(--font-zh)' : 'var(--font)';
    $('listenPicture').innerHTML = sceneMarkup(entry.scene, '❓');
    updateProgress();
  }

  function nextWord() {
    session.index++;
    loadCurrentWord();
  }

  function previousWord() {
    if (session.index > 0) {
      session.index--;
      loadCurrentWord();
    }
  }

  /* ------------------------------------------------------------ rewards */

  function onCorrect() {
    var key = wordKey(session.active.word, session.lang);
    state.stats.mastered[key] = true;
    state.stats.stars += 1;
    session.sessionStars += 1;
    bumpStreak();
    save();
    renderStats();
    renderBadges();

    var cheers = CHEERS[session.lang] || CHEERS.en;
    var cheer = cheers[Math.floor(Math.random() * cheers.length)];
    celebrate(cheer, session.active.word);
    playChime();
  }

  function bumpStreak() {
    var today = todayKey();
    if (state.stats.lastPracticeDay === today) return;
    var last = state.stats.lastPracticeDay;
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var yKey = yesterday.toISOString().slice(0, 10);
    state.stats.streak = (last === yKey) ? (state.stats.streak || 0) + 1 : 1;
    state.stats.bestStreak = Math.max(state.stats.bestStreak || 0, state.stats.streak);
    state.stats.lastPracticeDay = today;
  }

  function finishPractice() {
    state.stats.perfectRounds = (state.stats.perfectRounds || 0) + 1;
    save();
    celebrate('🎉 ' + t('correct'), session.sessionStars + ' ⭐');
    $('btnCelebrateNext').textContent = '🏠 ' + t('close');
    $('btnCelebrateNext').dataset.finish = '1';
  }

  var celebrateOpen = false;
  function celebrate(text, sub) {
    var el = $('celebrate');
    $('celebrateText').textContent = text;
    $('celebrateSub').textContent = sub || '';
    $('btnCelebrateNext').textContent = t('next');
    delete $('btnCelebrateNext').dataset.finish;
    el.setAttribute('data-open', 'true');
    celebrateOpen = true;
    fireConfetti();
  }

  function closeCelebrate() {
    $('celebrate').removeAttribute('data-open');
    celebrateOpen = false;
  }

  /* ----------------------------------------------------------- confetti */

  function fireConfetti() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var canvas = $('confetti');
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.width = window.innerWidth * dpr;
    var h = canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    canvas.classList.remove('hidden');

    var colors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#8b5cf6'];
    var bits = [];
    for (var i = 0; i < 90; i++) {
      bits.push({
        x: Math.random() * w,
        y: -Math.random() * h * 0.5,
        w: (6 + Math.random() * 8) * dpr,
        h: (10 + Math.random() * 10) * dpr,
        vy: (2 + Math.random() * 3) * dpr,
        vx: (Math.random() - 0.5) * 2 * dpr,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.2,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    var frames = 0;
    function tick() {
      ctx.clearRect(0, 0, w, h);
      bits.forEach(function (b) {
        b.x += b.vx; b.y += b.vy; b.rot += b.vr;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.fillStyle = b.color;
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        ctx.restore();
      });
      frames++;
      if (frames < 220 && bits.some(function (b) { return b.y < h + 50; })) {
        requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, w, h);
        canvas.classList.add('hidden');
      }
    }
    requestAnimationFrame(tick);
  }

  function playChime() {
    if (!state.settings.sound) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      var notes = [523.25, 659.25, 783.99];
      notes.forEach(function (freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        var start = ctx.currentTime + i * 0.09;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);
        osc.start(start);
        osc.stop(start + 0.36);
      });
      setTimeout(function () { ctx.close && ctx.close(); }, 900);
    } catch (e) { /* audio is a nice-to-have */ }
  }

  /* ------------------------------------------------------- parent screen */

  function renderParent() {
    $('addLangLabel').textContent = t('langLabel');
    $('newWord').placeholder = state.settings.lang === 'malay' ? 'e.g. ikan, kucing'
      : state.settings.lang === 'chinese' ? 'e.g. 鱼, 猫' : 'e.g. fish, cat';

    Array.prototype.forEach.call($('addLangSeg').children, function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.lang === state.settings.lang));
    });

    var list = $('parentWordList');
    list.innerHTML = '';

    if (!state.words.length) {
      var empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = t('noWordsYet');
      list.appendChild(empty);
      return;
    }

    state.words.forEach(function (entry, i) {
      var row = document.createElement('div');
      row.className = 'word-row' + (entry.scene ? '' : ' word-row--missing');

      var pic = document.createElement('span');
      pic.className = 'picture picture--xs';
      pic.innerHTML = sceneMarkup(entry.scene, '❓');
      pic.setAttribute('role', 'button');
      pic.setAttribute('tabindex', '0');
      pic.title = 'Change picture';
      pic.setAttribute('aria-label', 'Change picture for ' + entry.word);
      pic.addEventListener('click', function () { openWordModal(i); });
      pic.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openWordModal(i); }
      });

      var text = document.createElement('div');
      text.className = 'word-row__text grow';
      text.innerHTML =
        '<span class="word-row__word">' + esc(entry.word) + '</span>' +
        '<span class="word-row__meta">' + esc(langName(entry.lang)) +
          (entry.scene ? '' : ' · ' + esc(t('noMatch'))) + '</span>';

      var lang = document.createElement('span');
      lang.className = 'chip chip--lang';
      lang.textContent = LANGS[entry.lang].code;

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'icon-btn';
      del.textContent = '🗑';
      del.setAttribute('aria-label', 'Remove ' + entry.word);
      del.addEventListener('click', function () {
        state.words.splice(i, 1);
        save();
        renderParent();
        renderHome();
        toast(t('removed'));
      });

      row.appendChild(pic);
      row.appendChild(text);
      row.appendChild(lang);
      row.appendChild(del);
      list.appendChild(row);
    });
  }

  /* --------------------------------------------------- picture picker */

  var pickerTarget = null;   // { word, lang } - the word being given a picture

  function renderPickerGrid(query, lang) {
    var grid = $('pickerGrid');
    grid.innerHTML = '';

    var items;
    if (query) {
      items = DATA.search(query, 60);
      // also offer every candidate for this exact word
      var cands = candidatesFor(query, lang);
      cands.forEach(function (c) {
        if (!items.some(function (i) { return i.pic === c.pic; })) {
          items.unshift({ pic: c.pic, en: c.en, ms: c.ms, zh: c.zh });
        }
      });
    } else {
      items = DATA.all();
    }

    if (!items.length) {
      var p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'No pictures found.';
      grid.appendChild(p);
      return;
    }

    items.forEach(function (item) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'picker-item';
      b.title = item.en + ' · ' + item.ms + ' · ' + item.zh;
      b.innerHTML = itemPicture(item) + '<small>' + esc(item.en) + '</small>';
      b.addEventListener('click', function () {
        if (!pickerTarget) return;
        // The picker is opened from the add/edit dialog, so the choice
        // belongs to the dialog, not straight to the saved word.
        modalScene = { type: 'emoji', value: item.pic };
        var art = item.image || ART.path(item.en);
        if (art) modalScene = { type: 'image', value: art };
        closeModal('pickerModal');
        $('wordModalPicture').innerHTML = sceneMarkup(modalScene, '❓');
        refreshModalPreview();
      });
      grid.appendChild(b);
    });
  }

  /* ------------------------------------------------------ word modal */

  var modalLang = 'english';
  var modalIndex = -1;      // -1 = new word
  var modalScene = null;

  function openWordModal(index) {
    modalIndex = (typeof index === 'number') ? index : -1;
    var entry = modalIndex >= 0 ? state.words[modalIndex] : null;

    $('wordModalTitle').textContent = entry ? t('editWord') : t('addWord');
    $('modalWord').value = entry ? entry.word : ($('newWord').value || '').trim();
    modalLang = entry ? entry.lang : state.settings.lang;
    modalScene = entry ? entry.scene : resolveScene($('modalWord').value.trim(), modalLang);

    Array.prototype.forEach.call($('modalLangSeg').children, function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.lang === modalLang));
    });

    refreshModalPreview();
    openModal('wordModal');
  }

  function refreshModalPreview() {
    var word = $('modalWord').value.trim();
    $('wordModalPicture').innerHTML = sceneMarkup(modalScene, '❓');

    var host = $('modalCandidates');
    host.innerHTML = '';
    $('wordModalHint').textContent = t('pickMatch');

    if (!word) { $('wordModalHint').textContent = t('pickMatch'); return; }

    var cands = candidatesFor(word, modalLang);
    if (!cands.length) {
      // No exact match: offer close matches so the parent is never stuck.
      var suggestions = DATA.search(word, 12);
      if (suggestions.length) {
        $('wordModalHint').textContent = t('noMatch');
        suggestions.forEach(function (s) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'picker-item';
          b.title = s.en + ' · ' + s.ms + ' · ' + s.zh;
          b.innerHTML = itemPicture(s) + '<small>' + esc(s.en) + '</small>';
          b.addEventListener('click', function () {
            var art = ART.path(s.en);
            modalScene = art ? { type: 'image', value: art } : { type: 'emoji', value: s.pic };
            $('wordModalPicture').innerHTML = sceneMarkup(modalScene, '❓');
            Array.prototype.forEach.call(host.children, function (x) { x.setAttribute('aria-pressed', 'false'); });
            b.setAttribute('aria-pressed', 'true');
          });
          host.appendChild(b);
        });
        return;
      }
      $('wordModalHint').textContent = t('noMatch');
      return;
    }

    cands.forEach(function (c, index) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'picker-item';
      b.title = c.en + ' · ' + c.ms + ' · ' + c.zh;
      b.innerHTML = itemPicture(c) + '<small>' + esc(c.en) + '</small>';
      b.setAttribute('aria-pressed', String(index === 0));
      b.addEventListener('click', function () {
        modalScene = c.scene;
        $('wordModalPicture').innerHTML = sceneMarkup(modalScene, '❓');
        Array.prototype.forEach.call(host.children, function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
      });
      host.appendChild(b);
    });

    // Auto-select the best candidate so the preview always shows a picture
    // that matches the word.
    if (!modalScene) {
      modalScene = cands[0].scene;
      $('wordModalPicture').innerHTML = sceneMarkup(modalScene, '❓');
    }
  }

  function saveModalWord() {
    var word = $('modalWord').value.trim();
    if (!word) { toast(t('noMatch'), 'error'); return; }

    var scene = modalScene || resolveScene(word, modalLang);

    if (modalIndex >= 0) {
      state.words[modalIndex].word = word;
      state.words[modalIndex].lang = modalLang;
      state.words[modalIndex].scene = scene;
      toast(t('updated'), 'success');
    } else {
      var exists = state.words.some(function (w) {
        return w.lang === modalLang && String(w.word).toLowerCase() === word.toLowerCase();
      });
      if (exists) { toast(t('updated'), 'success'); }
      else state.words.push({ word: word, lang: modalLang, scene: scene });
      toast(t('added'), 'success');
    }

    save();
    closeModal('wordModal');
    $('newWord').value = '';
    renderParent();
    renderHome();
  }

  /* ------------------------------------------------------- starter set */

  var STARTER = [
    { word: 'fish', lang: 'english' },
    { word: 'cat', lang: 'english' },
    { word: 'dog', lang: 'english' },
    { word: 'bird', lang: 'english' },
    { word: 'apple', lang: 'english' },
    { word: 'banana', lang: 'english' },
    { word: 'sun', lang: 'english' },
    { word: 'moon', lang: 'english' },
    { word: 'car', lang: 'english' },
    { word: 'book', lang: 'english' },
    { word: 'ball', lang: 'english' },
    { word: 'ikan', lang: 'malay' },
    { word: 'kucing', lang: 'malay' },
    { word: 'anjing', lang: 'malay' },
    { word: 'burung', lang: 'malay' },
    { word: 'apel', lang: 'malay' },
    { word: 'pisang', lang: 'malay' },
    { word: 'matahari', lang: 'malay' },
    { word: 'bulan', lang: 'malay' },
    { word: 'kereta', lang: 'malay' },
    { word: 'buku', lang: 'malay' },
    { word: 'bola', lang: 'malay' },
    { word: '鱼', lang: 'chinese' },
    { word: '猫', lang: 'chinese' },
    { word: '狗', lang: 'chinese' },
    { word: '鸟', lang: 'chinese' },
    { word: '苹果', lang: 'chinese' },
    { word: '太阳', lang: 'chinese' },
    { word: '月亮', lang: 'chinese' },
    { word: '汽车', lang: 'chinese' },
    { word: '书', lang: 'chinese' },
    { word: '球', lang: 'chinese' }
  ];

  function addStarterSet() {
    var added = 0;
    STARTER.forEach(function (item) {
      var exists = state.words.some(function (w) {
        return w.lang === item.lang && String(w.word).toLowerCase() === item.word.toLowerCase();
      });
      if (exists) return;
      state.words.push({ word: item.word, lang: item.lang, scene: resolveScene(item.word, item.lang) });
      added++;
    });
    save();
    renderParent();
    renderHome();
    toast(t('added') + ' (' + added + ')', 'success');
  }

  /* --------------------------------------------------------- modal help */

  /* Modals stack: opening the picture picker from inside the word dialog
     must bring it to the front, otherwise it renders underneath. */
  var modalStackZ = 90;

  function openModal(id) {
    var el = $(id);
    if (!el) return;
    modalStackZ += 1;
    el.style.zIndex = modalStackZ;
    el.setAttribute('data-open', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(id) {
    var el = $(id);
    if (el) el.removeAttribute('data-open');
    if (!document.querySelector('.modal[data-open="true"]')) document.body.style.overflow = '';
  }

  /* -------------------------------------------------------- view routing */

  function showView(name) {
    $('viewHome').classList.toggle('hidden', name !== 'home');
    $('viewPractice').classList.toggle('hidden', name !== 'practice');
    $('viewParent').classList.toggle('hidden', name !== 'parent');
    $('btnBack').hidden = name === 'home';
    if (name === 'parent') renderParent();
    if (name === 'home') renderHome();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ------------------------------------------------------------- theme */

  function applyTheme() {
    var pref = state.settings.theme;
    if (pref === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', pref);

    var isDark = pref === 'dark' ||
      (pref === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    $('btnTheme').textContent = isDark ? '☀️' : '🌙';
    $('btnTheme').setAttribute('aria-label', 'Switch colour theme');
  }

  function cycleTheme() {
    var order = ['auto', 'light', 'dark'];
    var i = order.indexOf(state.settings.theme);
    state.settings.theme = order[(i + 1) % order.length];
    save();
    applyTheme();
  }

  /* ------------------------------------------------------------- wiring */

  function bind() {
    $('btnStart').addEventListener('click', startPractice);
    $('btnParent').addEventListener('click', function () { showView('parent'); });
    $('btnBack').addEventListener('click', function () {
      if (celebrateOpen) { closeCelebrate(); return; }
      showView('home');
    });
    $('btnTheme').addEventListener('click', cycleTheme);

    $('modeSeg').addEventListener('click', function (e) {
      var b = e.target.closest('.seg__btn');
      if (!b) return;
      state.settings.mode = b.dataset.mode;
      save();
      renderHome();
    });

    $('addLangSeg').addEventListener('click', function (e) {
      var b = e.target.closest('.seg__btn');
      if (!b) return;
      state.settings.lang = b.dataset.lang;
      save();
      renderParent();
      renderHome();
      applyLanguageToDocument();
    });

    $('modalLangSeg').addEventListener('click', function (e) {
      var b = e.target.closest('.seg__btn');
      if (!b) return;
      modalLang = b.dataset.lang;
      Array.prototype.forEach.call($('modalLangSeg').children, function (x) {
        x.setAttribute('aria-pressed', String(x.dataset.lang === modalLang));
      });
      refreshModalPreview();
    });

    $('btnAddWord').addEventListener('click', function () {
      var w = $('newWord').value.trim();
      if (!w) { toast(t('noMatch'), 'error'); return; }
      openWordModal(-1);
      $('modalWord').value = w;
      modalScene = resolveScene(w, modalLang);
      $('wordModalPicture').innerHTML = sceneMarkup(modalScene, '❓');
      refreshModalPreview();
    });

    $('newWord').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); $('btnAddWord').click(); }
    });

    $('btnAddStarter').addEventListener('click', addStarterSet);
    $('btnModalSave').addEventListener('click', saveModalWord);
    $('btnModalBrowse').addEventListener('click', function () {
      var word = $('modalWord').value.trim();
      var lang = modalLang;
      // reuse the picker for choosing a picture for a new word
      pickerTarget = { word: word, lang: lang };
      $('pickerSearch').value = word;
      $('pickerCurrent').innerHTML = sceneMarkup(modalScene, '❓');
      $('pickerCurrentLabel').textContent = word;
      renderPickerGrid(word, lang);
      openModal('pickerModal');
    });
    $('btnModalAuto').addEventListener('click', function () {
      var word = $('modalWord').value.trim();
      if (!word) return;
      modalScene = resolveScene(word, modalLang);
      $('wordModalPicture').innerHTML = sceneMarkup(modalScene, '❓');
      refreshModalPreview();
    });
    $('modalWord').addEventListener('input', function () {
      if (modalIndex < 0) { modalScene = null; refreshModalPreview(); }
    });

    $('pickerSearch').addEventListener('input', function () {
      var q = $('pickerSearch').value.trim();
      var lang = pickerTarget && pickerTarget.lang ? pickerTarget.lang : state.settings.lang;
      var word = pickerTarget && pickerTarget.word ? pickerTarget.word : q;
      renderPickerGrid(q || word, lang);
    });

    document.addEventListener('click', function (e) {
      var closeBtn = e.target.closest('[data-close]');
      if (closeBtn) { closeModal(closeBtn.dataset.close); return; }
      if (e.target.classList && e.target.classList.contains('modal')) {
        closeModal(e.target.id);
      }
    });

    $('btnListenSpell').addEventListener('click', function () { speak(session.active.word, session.lang, this); });
    $('btnListenPlay').addEventListener('click', function () { speak(session.active.word, session.lang, this); });
    $('btnListenZh').addEventListener('click', function () { speak(session.active.word, session.lang, this); });
    $('btnUndo').addEventListener('click', undoLetter);
    $('btnClear').addEventListener('click', clearAnswer);
    $('btnHint').addEventListener('click', giveHint);
    $('btnZhHint').addEventListener('click', showHanziHint);
    $('btnPrev').addEventListener('click', previousWord);
    $('btnNext').addEventListener('click', nextWord);

    $('btnCelebrateNext').addEventListener('click', function () {
      var finish = this.dataset.finish === '1';
      closeCelebrate();
      if (finish) { showView('home'); return; }
      nextWord();
    });

    $('btnCheckVoices').addEventListener('click', function () {
      loadVoices().then(renderVoiceStatus);
      toast(t('voiceOk'));
    });

    $('btnSound').addEventListener('click', function () {
      state.settings.sound = !state.settings.sound;
      this.setAttribute('aria-pressed', String(state.settings.sound));
      this.textContent = state.settings.sound ? t('on') : t('off');
      save();
    });
    $('btnAutoSpeak').addEventListener('click', function () {
      state.settings.autoSpeak = !state.settings.autoSpeak;
      this.setAttribute('aria-pressed', String(state.settings.autoSpeak));
      this.textContent = state.settings.autoSpeak ? t('on') : t('off');
      save();
    });

    $('btnExport').addEventListener('click', exportWords);
    $('btnImport').addEventListener('click', function () { $('importFile').click(); });
    $('importFile').addEventListener('change', importWords);
    $('btnReset').addEventListener('click', function () {
      if (!confirm('Remove every word and reset all progress? This cannot be undone.')) return;
      state.words = [];
      state.stats = { stars: 0, streak: 0, lastPracticeDay: '', bestStreak: 0, mastered: {} };
      save();
      renderParent();
      renderHome();
      toast(t('resetOk'));
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal[data-open="true"]').forEach(function (m) { closeModal(m.id); });
        if (celebrateOpen) closeCelebrate();
      }
    });
  }

  function exportWords() {
    var payload = JSON.stringify({ version: APP_VERSION, words: state.words }, null, 2);
    var blob = new Blob([payload], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'ejaan-kids-words.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast(t('exportOk'), 'success');
  }

  function importWords(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(String(reader.result));
        var list = Array.isArray(data) ? data : (data.words || []);
        var count = 0;
        list.forEach(function (item) {
          if (!item || !item.word) return;
          var exists = state.words.some(function (w) {
            return w.lang === (item.lang || 'english') &&
                   String(w.word).toLowerCase() === String(item.word).toLowerCase();
          });
          if (exists) return;
          state.words.push({
            word: String(item.word),
            lang: item.lang || 'english',
            scene: item.scene || resolveScene(item.word, item.lang || 'english')
          });
          count++;
        });
        save();
        renderParent();
        renderHome();
        toast(t('importOk').replace('{n}', count), 'success');
      } catch (err) {
        toast('Import failed: ' + err.message, 'error');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  /* ---------------------------------------------------------------- PWA */

  var installPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installPrompt = e;
    var btn = $('btnInstall');
    if (btn) btn.hidden = false;
  });
  $('btnInstall').addEventListener('click', function () {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt = null;
    this.hidden = true;
  });

  // The service worker is skipped on localhost so that local development
  // always sees the latest files instead of a cached copy.
  var isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  if ('serviceWorker' in navigator && !isLocalHost && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (e) {
        console.warn('Service worker registration failed:', e);
      });
    });
  }

  window.addEventListener('online', function () { toast(t('offline')); });
  window.addEventListener('offline', function () { toast(t('offline')); });

  /* ---------------------------------------------------------------- init */

  function init() {
    load();
    applyTheme();
    applyLanguageToDocument();
    bind();

    $('btnSound').setAttribute('aria-pressed', String(state.settings.sound));
    $('btnSound').textContent = state.settings.sound ? t('on') : t('off');
    $('btnAutoSpeak').setAttribute('aria-pressed', String(state.settings.autoSpeak));
    $('btnAutoSpeak').textContent = state.settings.autoSpeak ? t('on') : t('off');

    renderHome();
    showView('home');

    loadVoices().then(renderVoiceStatus);
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
