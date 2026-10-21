/**
 * Ejaan Kids — Picture Library (v3.0.0)
 * ---------------------------------------------------------------------------
 * Single source of truth for word -> picture matching.
 *
 * Every entry pairs ONE concept with ONE picture, expressed in all three
 * languages. This is the fix for the old "picture does not match the word"
 * bug: previously each language had its own separate table, so Malay words
 * fell through to a 🇲🇾 flag placeholder and English words fell through to a
 * ⭐ placeholder whenever the word was not in that table.
 *
 * Pictures are plain emoji on purpose:
 *   - they render identically on every device (no missing-font boxes),
 *   - they work fully offline (no API key, no network, no rate limits),
 *   - they never show an unrelated stock photo for a concept like "purple".
 *
 * RULES (enforced by tools/validate-library.cjs):
 *   1. A picture is used by at most ONE entry, so dictation is never
 *      ambiguous. A word and its picture must mean the same thing.
 *   2. Within one language, a word string maps to at most one entry. Where
 *      two real words collide ("orange" the fruit vs "orange" the colour),
 *      the alternatives are kept as separate `variants` of one entry and the
 *      picture picker shows every option.
 *   3. Every entry carries all three languages.
 *
 * This file is plain JS (not JSON) so the app also works when opened
 * directly from the filesystem (file://), where fetch() of a local JSON file
 * is blocked by the browser's CORS rules.
 */
(function (global) {
  'use strict';

  var CATEGORIES = [
    {
      id: 'animals',
      icon: '🐾',
      label: { en: 'Animals', ms: 'Haiwan', zh: '动物' },
      words: [
        { en: 'fish', ms: 'ikan', zh: '鱼', pic: '🐟' },
        { en: 'cat', ms: 'kucing', zh: '猫', pic: '🐱' },
        { en: 'dog', ms: 'anjing', zh: '狗', pic: '🐕' },
        { en: 'bird', ms: 'burung', zh: '鸟', pic: '🐦' },
        { en: 'rabbit', ms: 'arnab', zh: '兔', pic: '🐰' },
        { en: 'mouse', ms: 'tikus', zh: '老鼠', pic: '🐭' },
        { en: 'bear', ms: 'bear', zh: '熊', pic: '🐻' },
        { en: 'lion', ms: 'singa', zh: '狮子', pic: '🦁' },
        { en: 'tiger', ms: 'harimau', zh: '老虎', pic: '🐯' },
        { en: 'horse', ms: 'kuda', zh: '马', pic: '🐴' },
        { en: 'cow', ms: 'lembu', zh: '牛', pic: '🐮' },
        { en: 'buffalo', ms: 'kerbau', zh: '水牛', pic: '🐃' },
        { en: 'pig', ms: 'babi', zh: '猪', pic: '🐷' },
        { en: 'goat', ms: 'kambing', zh: '山羊', pic: '🐐' },
        { en: 'sheep', ms: 'biri-biri', zh: '绵羊', pic: '🐑' },
        { en: 'deer', ms: 'rusa', zh: '鹿', pic: '🦌' },
        { en: 'fox', ms: 'rubah', zh: '狐狸', pic: '🦊' },
        { en: 'wolf', ms: 'serigala', zh: '狼', pic: '🐺' },
        { en: 'crocodile', ms: 'buaya', zh: '鳄鱼', pic: '🐊' },
        { en: 'camel', ms: 'unta', zh: '骆驼', pic: '🐫' },
        { en: 'monkey', ms: 'monkey', zh: '猴子', pic: '🐒' },
        { en: 'frog', ms: 'katak', zh: '青蛙', pic: '🐸' },
        { en: 'chicken', ms: 'ayam', zh: '鸡', pic: '🐔' },
        { en: 'duck', ms: 'itik', zh: '鸭子', pic: '🦆' },
        { en: 'elephant', ms: 'gajah', zh: '大象', pic: '🐘' },
        { en: 'panda', ms: 'panda', zh: '熊猫', pic: '🐼' },
        { en: 'koala', ms: 'koala', zh: '考拉', pic: '🐨' },
        { en: 'owl', ms: 'burung hantu', zh: '猫头鹰', pic: '🦉' },
        { en: 'parrot', ms: 'burung kakaktua', zh: '鹦鹉', pic: '🦜' },
        { en: 'peacock', ms: 'merak', zh: '孔雀', pic: '🦚' },
        { en: 'butterfly', ms: 'kupu-kupu', zh: '蝴蝶', pic: '🦋' },
        { en: 'bee', ms: 'lebah', zh: '蜜蜂', pic: '🐝' },
        { en: 'ant', ms: 'semut', zh: '蚂蚁', pic: '🐜' },
        { en: 'spider', ms: 'laba-laba', zh: '蜘蛛', pic: '🕷️' },
        { en: 'ladybird', ms: 'kumbang', zh: '瓢虫', pic: '🐞' },
        { en: 'snail', ms: 'siput', zh: '蜗牛', pic: '🐌' },
        { en: 'turtle', ms: 'kura-kura', zh: '乌龟', pic: '🐢' },
        { en: 'shark', ms: 'jerung', zh: '鲨鱼', pic: '🦈' },
        { en: 'whale', ms: 'ikan paus', zh: '鲸鱼', pic: '🐳' },
        { en: 'dolphin', ms: 'ikan lumba', zh: '海豚', pic: '🐬' },
        { en: 'octopus', ms: 'oktopus', zh: '章鱼', pic: '🐙' },
        { en: 'crab', ms: 'ketam', zh: '螃蟹', pic: '🦀' },
        { en: 'snake', ms: 'ular', zh: '蛇', pic: '🐍' },
        { en: 'dragon', ms: 'naga', zh: '龙', pic: '🐉' },
        { en: 'dinosaur', ms: 'dinosaurus', zh: '恐龙', pic: '🦕' },
        { en: 'penguin', ms: 'penguin', zh: '企鹅', pic: '🐧' },
        { en: 'seal', ms: 'anjing laut', zh: '海豹', pic: '🦭' },
        { en: 'squirrel', ms: 'tupai', zh: '松鼠', pic: '🐿️' }
      ]
    },
    {
      id: 'food',
      icon: '🍔',
      label: { en: 'Food & Drink', ms: 'Makanan & Minuman', zh: '食物与饮料' },
      words: [
        { en: 'rice', ms: 'nasi', zh: '米饭', pic: '🍚' },
        { en: 'bread', ms: 'roti', zh: '面包', pic: '🍞' },
        { en: 'noodles', ms: 'mi', zh: '面条', pic: '🍜' },
        { en: 'egg', ms: 'telur', zh: '鸡蛋', pic: '🥚' },
        { en: 'milk', ms: 'susu', zh: '牛奶', pic: '🥛' },
        { en: 'water', ms: 'air', zh: '水', pic: '💧' },
        { en: 'juice', ms: 'jus', zh: '果汁', pic: '🧃' },
        { en: 'tea', ms: 'teh', zh: '茶', pic: '🍵' },
        { en: 'coffee', ms: 'kopi', zh: '咖啡', pic: '☕' },
        { en: 'cake', ms: 'kek', zh: '蛋糕', pic: '🍰' },
        { en: 'cookie', ms: 'biskut', zh: '饼干', pic: '🍪' },
        { en: 'chocolate', ms: 'coklat', zh: '巧克力', pic: '🍫' },
        { en: 'candy', ms: 'manisan', zh: '糖果', pic: '🍬' },
        { en: 'ice cream', ms: 'ais krim', zh: '冰淇淋', pic: '🍦' },
        { en: 'pizza', ms: 'piza', zh: '披萨', pic: '🍕' },
        { en: 'sandwich', ms: 'sandwich', zh: '三明治', pic: '🥪' },
        { en: 'fries', ms: 'kentang goreng', zh: '薯条', pic: '🍟' },
        { en: 'soup', ms: 'supe', zh: '汤', pic: '🍲' },
        { en: 'meat', ms: 'daging', zh: '肉', pic: '🍖' },
        { en: 'salad', ms: 'salad', zh: '沙拉', pic: '🥗' },
        { en: 'cheese', ms: 'keju', zh: '奶酪', pic: '🧀' },
        { en: 'yam', ms: 'ubat', zh: '红薯', pic: '🍠' },
        { en: 'corn', ms: 'jagung', zh: '玉米', pic: '🌽' },
        { en: 'coconut', ms: 'kelapa', zh: '椰子', pic: '🥥' },
        { en: 'mango', ms: 'mangga', zh: '芒果', pic: '🥭' },
        { en: 'banana', ms: 'pisang', zh: '香蕉', pic: '🍌' },
        { en: 'orange', ms: 'oren', zh: '橙子', pic: '🍊' },
        { en: 'apple', ms: 'apel', zh: '苹果', pic: '🍎' },
        { en: 'watermelon', ms: 'tembikai', zh: '西瓜', pic: '🍉' },
        { en: 'grape', ms: 'anggur', zh: '葡萄', pic: '🍇' },
        { en: 'strawberry', ms: 'strawberi', zh: '草莓', pic: '🍓' },
        { en: 'pineapple', ms: 'nanas', zh: '菠萝', pic: '🍍' },
        { en: 'lemon', ms: 'lemon', zh: '柠檬', pic: '🍋' },
        { en: 'kiwi', ms: 'kiwi', zh: '猕猴桃', pic: '🥝' },
        { en: 'papaya', ms: 'paya', zh: '木瓜', pic: '🫑' },
        { en: 'durian', ms: 'durian', zh: '榴莲', pic: '🍈' },
        { en: 'jackfruit', ms: 'nangka', zh: '菠萝蜜', pic: '🫒' },
        { en: 'tomato', ms: 'tomato', zh: '番茄', pic: '🍅' },
        { en: 'carrot', ms: 'lobak', zh: '胡萝卜', pic: '🥕' },
        { en: 'potato', ms: 'ubat kentang', zh: '土豆', pic: '🥔' },
        { en: 'pumpkin', ms: 'labu', zh: '南瓜', pic: '🎃' },
        { en: 'chilli', ms: 'lada cili', zh: '辣椒', pic: '🌶️' },
        { en: 'cucumber', ms: 'timun', zh: '黄瓜', pic: '🥒' },
        { en: 'onion', ms: 'bawang', zh: '洋葱', pic: '🧅' },
        { en: 'garlic', ms: 'bawang putih', zh: '大蒜', pic: '🧄' },
        { en: 'broccoli', ms: 'brokoli', zh: '西兰花', pic: '🥦' },
        { en: 'spinach', ms: 'bayam', zh: '菠菜', pic: '🍃' },
        { en: 'mushroom', ms: 'cendawan', zh: '蘑菇', pic: '🍄' },
        { en: 'bean', ms: 'kacang', zh: '豆子', pic: '🫘' },
        { en: 'salt', ms: 'garam', zh: '盐', pic: '🧂' }
      ]
    },
    {
      id: 'family',
      icon: '👪',
      label: { en: 'Family & People', ms: 'Keluarga & Orang', zh: '家庭与人' },
      words: [
        { en: 'family', ms: 'keluarga', zh: '家庭', pic: '👪' },
        { en: 'mother', ms: 'ibu', zh: '妈妈', pic: '👩' },
        { en: 'father', ms: 'abah', zh: '爸爸', pic: '👨' },
        { en: 'sister', ms: 'kakak', zh: '姐姐', pic: '👧' },
        { en: 'brother', ms: 'abang', zh: '哥哥', pic: '👦' },
        { en: 'grandmother', ms: 'nenek', zh: '奶奶', pic: '👵' },
        { en: 'grandfather', ms: 'datuk', zh: '爷爷', pic: '👴' },
        { en: 'baby', ms: 'bayi', zh: '婴儿', pic: '👶' },
        { en: 'child', ms: 'kanak-kanak', zh: '儿童', pic: '🧒' },
        { en: 'friend', ms: 'rakan', zh: '朋友', pic: '🧑‍🤝‍🧑' },
        { en: 'crown', ms: 'mahkota', zh: '王冠', pic: '👑' }
      ]
    },
    {
      id: 'body',
      icon: '🫱',
      label: { en: 'Body Parts', ms: 'Bahagian Badan', zh: '身体部位' },
      words: [
        { en: 'head', ms: 'kepala', zh: '头', pic: '🧠' },
        { en: 'eye', ms: 'mata', zh: '眼睛', pic: '👁️' },
        { en: 'ear', ms: 'telinga', zh: '耳朵', pic: '👂' },
        { en: 'nose', ms: 'hidung', zh: '鼻子', pic: '👃' },
        { en: 'mouth', ms: 'mulut', zh: '嘴巴', pic: '👄' },
        { en: 'tooth', ms: 'gigi', zh: '牙齿', pic: '🦷' },
        { en: 'tongue', ms: 'lidah', zh: '舌头', pic: '👅' },
        { en: 'hair', ms: 'rambut', zh: '头发', pic: '💇' },
        { en: 'hand', ms: 'tangan', zh: '手', pic: '✋' },
        { en: 'finger', ms: 'jari', zh: '手指', pic: '👆' },
        { en: 'arm', ms: 'lengan', zh: '手臂', pic: '💪' },
        { en: 'leg', ms: 'paha', zh: '腿', pic: '🦵' },
        { en: 'foot', ms: 'kaki', zh: '脚', pic: '🦶' },
        { en: 'heart', ms: 'jantung', zh: '心脏', pic: '❤️' },
        { en: 'bone', ms: 'tulang', zh: '骨头', pic: '🦴' }
      ]
    },
    {
      id: 'colours',
      icon: '🎨',
      label: { en: 'Colours', ms: 'Warna', zh: '颜色' },
      words: [
        { en: 'red', ms: 'merah', zh: '红色', pic: '🔴' },
        { en: 'blue', ms: 'biru', zh: '蓝色', pic: '🔵' },
        { en: 'green', ms: 'hijau', zh: '绿色', pic: '🟢' },
        { en: 'yellow', ms: 'kuning', zh: '黄色', pic: '🟡' },
        { en: 'purple', ms: 'ungu', zh: '紫色', pic: '🟣' },
        { en: 'orange', ms: 'oren', zh: '橙色', pic: '🟠' },
        { en: 'pink', ms: 'merah jambu', zh: '粉色', pic: '🩷' },
        { en: 'brown', ms: 'coklat', zh: '棕色', pic: '🟤' },
        { en: 'black', ms: 'hitam', zh: '黑色', pic: '⚫' },
        { en: 'white', ms: 'putih', zh: '白色', pic: '⚪' },
        { en: 'grey', ms: 'kelabu', zh: '灰色', pic: '🩶' },
        { en: 'gold', ms: 'emas', zh: '金色', pic: '🥇' },
        { en: 'silver', ms: 'perak', zh: '银色', pic: '🥈' }
      ]
    },
    {
      id: 'numbers',
      icon: '1️⃣',
      label: { en: 'Numbers', ms: 'Nombor', zh: '数字' },
      words: [
        { en: 'zero', ms: 'nol', zh: '零', pic: '0️⃣' },
        { en: 'one', ms: 'satu', zh: '一', pic: '1️⃣' },
        { en: 'two', ms: 'dua', zh: '二', pic: '2️⃣' },
        { en: 'three', ms: 'tiga', zh: '三', pic: '3️⃣' },
        { en: 'four', ms: 'empat', zh: '四', pic: '4️⃣' },
        { en: 'five', ms: 'lima', zh: '五', pic: '5️⃣' },
        { en: 'six', ms: 'enam', zh: '六', pic: '6️⃣' },
        { en: 'seven', ms: 'tujuh', zh: '七', pic: '7️⃣' },
        { en: 'eight', ms: 'lapan', zh: '八', pic: '8️⃣' },
        { en: 'nine', ms: 'sembilan', zh: '九', pic: '9️⃣' },
        { en: 'ten', ms: 'sepuluh', zh: '十', pic: '🔟' }
      ]
    },
    {
      id: 'home',
      icon: '🏠',
      label: { en: 'Home & Furniture', ms: 'Rumah & Perabot', zh: '家与家具' },
      words: [
        { en: 'house', ms: 'rumah', zh: '房子', pic: '🏠' },
        { en: 'door', ms: 'pintu', zh: '门', pic: '🚪' },
        { en: 'window', ms: 'jendela', zh: '窗户', pic: '🪟' },
        { en: 'bed', ms: 'tilam', zh: '床', pic: '🛏️' },
        { en: 'chair', ms: 'kursi', zh: '椅子', pic: '🪑' },
        { en: 'sofa', ms: 'ruang tamu', zh: '沙发', pic: '🛋️' },
        { en: 'lamp', ms: 'lampu', zh: '台灯', pic: '🪔' },
        { en: 'clock', ms: 'jam', zh: '时钟', pic: '⏰' },
        { en: 'television', ms: 'television', zh: '电视', pic: '📺' },
        { en: 'radio', ms: 'radio', zh: '收音机', pic: '📻' },
        { en: 'computer', ms: 'komputer', zh: '电脑', pic: '🖥️' },
        { en: 'laptop', ms: 'laptop', zh: '笔记本电脑', pic: '💻' },
        { en: 'kitchen', ms: 'dapur', zh: '厨房', pic: '🍳' },
        { en: 'key', ms: 'kunci', zh: '钥匙', pic: '🔑' },
        { en: 'broom', ms: 'penyapu', zh: '扫帚', pic: '🧹' },
        { en: 'bucket', ms: 'bekal', zh: '水桶', pic: '🪣' },
        { en: 'mirror', ms: 'cermin', zh: '镜子', pic: '🪞' },
        { en: 'pot', ms: 'pasu', zh: '花盆', pic: '🪴' }
      ]
    },
    {
      id: 'school',
      icon: '📚',
      label: { en: 'School & Stationery', ms: 'Sekolah & Alat Tulis', zh: '学校与文具' },
      words: [
        { en: 'book', ms: 'buku', zh: '书', pic: '📕' },
        { en: 'notebook', ms: 'nota', zh: '笔记本', pic: '📓' },
        { en: 'pen', ms: 'pen', zh: '笔', pic: '🖊️' },
        { en: 'pencil', ms: 'pensil', zh: '铅笔', pic: '✏️' },
        { en: 'crayon', ms: 'krayon', zh: '蜡笔', pic: '🖍️' },
        { en: 'eraser', ms: 'pemadam', zh: '橡皮擦', pic: '🧽' },
        { en: 'ruler', ms: 'penukur', zh: '尺子', pic: '📏' },
        { en: 'scissors', ms: 'turis', zh: '剪刀', pic: '✂️' },
        { en: 'bag', ms: 'beg', zh: '书包', pic: '🎒' },
        { en: 'glasses', ms: 'cermin mata', zh: '眼镜', pic: '👓' },
        { en: 'paper', ms: 'kertas', zh: '纸', pic: '📄' },
        { en: 'envelope', ms: 'sampul', zh: '信封', pic: '✉️' },
        { en: 'map', ms: 'peta', zh: '地图', pic: '🗺️' },
        { en: 'globe', ms: 'glob', zh: '地球仪', pic: '🌍' },
        { en: 'flag', ms: 'bendera', zh: '旗子', pic: '🚩' },
        { en: 'bell', ms: 'loceng', zh: '铃铛', pic: '🔔' },
        { en: 'compass', ms: 'kompas', zh: '指南针', pic: '🧭' }
      ]
    },
    {
      id: 'transport',
      icon: '🚌',
      label: { en: 'Transport', ms: 'Pengangkutan', zh: '交通' },
      words: [
        { en: 'car', ms: 'kereta', zh: '汽车', pic: '🚗' },
        { en: 'bus', ms: 'bas', zh: '公共汽车', pic: '🚌' },
        { en: 'taxi', ms: 'teksi', zh: '出租车', pic: '🚕' },
        { en: 'train', ms: 'kereta api', zh: '火车', pic: '🚂' },
        { en: 'motorcycle', ms: 'motor', zh: '摩托车', pic: '🏍️' },
        { en: 'bicycle', ms: 'basikal', zh: '自行车', pic: '🚲' },
        { en: 'scooter', ms: 'skuter', zh: '滑板车', pic: '🛴' },
        { en: 'skateboard', ms: 'skateboard', zh: '滑板', pic: '🛹' },
        { en: 'airplane', ms: 'kapal terbang', zh: '飞机', pic: '✈️' },
        { en: 'helicopter', ms: 'helikopter', zh: '直升机', pic: '🚁' },
        { en: 'rocket', ms: 'roket', zh: '火箭', pic: '🚀' },
        { en: 'boat', ms: 'bot', zh: '小船', pic: '⛵' },
        { en: 'ship', ms: 'kapal besar', zh: '轮船', pic: '🚢' },
        { en: 'submarine', ms: 'kapal selam', zh: '潜艇', pic: '🛳️' },
        { en: 'truck', ms: 'lori', zh: '卡车', pic: '🚚' },
        { en: 'ambulance', ms: 'ambulans', zh: '救护车', pic: '🚑' },
        { en: 'fire engine', ms: 'lori bomba', zh: '消防车', pic: '🚒' },
        { en: 'tractor', ms: 'tractor', zh: '拖拉机', pic: '🚜' },
        { en: 'tram', ms: 'tram', zh: '有轨电车', pic: '🚋' }
      ]
    },
    {
      id: 'nature',
      icon: '🌍',
      label: { en: 'Nature & Weather', ms: 'Alam & Cuaca', zh: '自然与天气' },
      words: [
        { en: 'sun', ms: 'matahari', zh: '太阳', pic: '☀️' },
        { en: 'moon', ms: 'bulan', zh: '月亮', pic: '🌙' },
        { en: 'star', ms: 'bintang', zh: '星星', pic: '⭐' },
        { en: 'cloud', ms: 'awan', zh: '云', pic: '☁️' },
        { en: 'rain', ms: 'hujan', zh: '雨', pic: '🌧️' },
        { en: 'snow', ms: 'salji', zh: '雪', pic: '❄️' },
        { en: 'wind', ms: 'angin', zh: '风', pic: '🌬️' },
        { en: 'storm', ms: 'badai', zh: '暴风雨', pic: '⛈️' },
        { en: 'rainbow', ms: 'pelangi', zh: '彩虹', pic: '🌈' },
        { en: 'tree', ms: 'pokok', zh: '树', pic: '🌳' },
        { en: 'flower', ms: 'bunga', zh: '花', pic: '🌸' },
        { en: 'leaf', ms: 'daun', zh: '叶子', pic: '🍂' },
        { en: 'grass', ms: 'rumput', zh: '草', pic: '🌱' },
        { en: 'mountain', ms: 'gunung', zh: '山', pic: '⛰️' },
        { en: 'sea', ms: 'laut', zh: '大海', pic: '🌊' },
        { en: 'island', ms: 'pulau', zh: '岛', pic: '🏝️' },
        { en: 'beach', ms: 'pantai', zh: '海滩', pic: '🏖️' },
        { en: 'cactus', ms: 'kaktus', zh: '仙人掌', pic: '🌵' },
        { en: 'stone', ms: 'batu', zh: '石头', pic: '🪨' },
        { en: 'volcano', ms: 'gunung berapi', zh: '火山', pic: '🌋' },
        { en: 'desert', ms: 'padang gurun', zh: '沙漠', pic: '🏜️' },
        { en: 'earth', ms: 'bumi', zh: '地球', pic: '🌎' },
        { en: 'planet', ms: 'planet', zh: '行星', pic: '🪐' },
        { en: 'snowman', ms: 'patung salji', zh: '雪人', pic: '⛄' },
        { en: 'comet', ms: 'komet', zh: '彗星', pic: '☄️' }
      ]
    },
    {
      id: 'places',
      icon: '🏫',
      label: { en: 'Places & Buildings', ms: 'Tempat & Bangunan', zh: '地点与建筑' },
      words: [
        { en: 'school', ms: 'sekolah', zh: '学校', pic: '🏫' },
        { en: 'hospital', ms: 'hospital', zh: '医院', pic: '🏥' },
        { en: 'bank', ms: 'bank', zh: '银行', pic: '🏦' },
        { en: 'market', ms: 'pasar', zh: '市场', pic: '🏪' },
        { en: 'shop', ms: 'kedai', zh: '商店', pic: '🏬' },
        { en: 'restaurant', ms: 'restoran', zh: '餐厅', pic: '🍴' },
        { en: 'park', ms: 'taman', zh: '公园', pic: '🏞️' },
        { en: 'church', ms: 'gereja', zh: '教堂', pic: '⛪' },
        { en: 'mosque', ms: 'masjid', zh: '清真寺', pic: '🕌' },
        { en: 'factory', ms: 'kilang', zh: '工厂', pic: '🏭' },
        { en: 'station', ms: 'stesen', zh: '车站', pic: '🚉' },
        { en: 'zoo', ms: 'zoo', zh: '动物园', pic: '🦓' },
        { en: 'farm', ms: 'ladang', zh: '农场', pic: '🌾' },
        { en: 'castle', ms: 'castle', zh: '城堡', pic: '🏰' },
        { en: 'museum', ms: 'muzium', zh: '博物馆', pic: '🏛️' },
        { en: 'library', ms: 'perpustakaan', zh: '图书馆', pic: '📚' },
        { en: 'theatre', ms: 'teater', zh: '剧场', pic: '🎭' }
      ]
    },
    {
      id: 'clothes',
      icon: '👕',
      label: { en: 'Clothing', ms: 'Pakaian', zh: '衣物' },
      words: [
        { en: 'shirt', ms: 'baju', zh: '衬衫', pic: '👕' },
        { en: 'dress', ms: 'baju kurung', zh: '连衣裙', pic: '👗' },
        { en: 'pants', ms: 'seluar', zh: '裤子', pic: '👖' },
        { en: 'shorts', ms: 'seluar pendek', zh: '短裤', pic: '🩳' },
        { en: 'sock', ms: 'stoking', zh: '袜子', pic: '🧦' },
        { en: 'shoe', ms: 'kasut', zh: '鞋子', pic: '👞' },
        { en: 'boot', ms: 'boot', zh: '靴子', pic: '🥾' },
        { en: 'sandal', ms: 'sandal', zh: '凉鞋', pic: '🩴' },
        { en: 'hat', ms: 'topi', zh: '帽子', pic: '🎩' },
        { en: 'cap', ms: 'topi keledar', zh: '鸭舌帽', pic: '🧢' },
        { en: 'watch', ms: 'jam tangan', zh: '手表', pic: '⌚' },
        { en: 'handbag', ms: 'beg tangan', zh: '手提包', pic: '👜' },
        { en: 'glove', ms: 'sarung tangan', zh: '手套', pic: '🧤' },
        { en: 'jacket', ms: 'jaket', zh: '夹克', pic: '🧥' },
        { en: 'ring', ms: 'cincin', zh: '戒指', pic: '💍' },
        { en: 'scarf', ms: 'selendang', zh: '围巾', pic: '🧣' }
      ]
    },
    {
      id: 'actions',
      icon: '🏃',
      label: { en: 'Actions', ms: 'Tindakan', zh: '动作' },
      words: [
        { en: 'run', ms: 'lari', zh: '跑步', pic: '🏃' },
        { en: 'jump', ms: 'lompat', zh: '跳', pic: '🦘' },
        { en: 'swim', ms: 'renang', zh: '游泳', pic: '🏊' },
        { en: 'dance', ms: 'tari', zh: '跳舞', pic: '💃' },
        { en: 'sing', ms: 'nyanyi', zh: '唱歌', pic: '🎤' },
        { en: 'eat', ms: 'makan', zh: '吃饭', pic: '🍽️' },
        { en: 'drink', ms: 'minum', zh: '喝水', pic: '🥤' },
        { en: 'sleep', ms: 'tidur', zh: '睡觉', pic: '😴' },
        { en: 'play', ms: 'main', zh: '玩', pic: '🎮' },
        { en: 'read', ms: 'baca', zh: '阅读', pic: '📖' },
        { en: 'write', ms: 'tulis', zh: '写字', pic: '✍️' },
        { en: 'draw', ms: 'lukis', zh: '画画', pic: '🎨' },
        { en: 'listen', ms: 'dengar', zh: '听', pic: '🎧' },
        { en: 'talk', ms: 'cakap', zh: '说话', pic: '🗣️' },
        { en: 'walk', ms: 'jalan', zh: '走路', pic: '🚶' },
        { en: 'clap', ms: 'tepuk', zh: '拍手', pic: '👏' },
        { en: 'wave', ms: 'lambai', zh: '挥手', pic: '👋' },
        { en: 'hug', ms: 'peluk', zh: '拥抱', pic: '🤗' },
        { en: 'kiss', ms: 'cium', zh: '亲吻', pic: '💋' },
        { en: 'sit', ms: 'duduk', zh: '坐', pic: '🧎' },
        { en: 'stand', ms: 'berdiri', zh: '站立', pic: '🧍' },
        { en: 'fly', ms: 'terbang', zh: '飞', pic: '🕊️' },
        { en: 'cook', ms: 'masak', zh: '烹饪', pic: '👩‍🍳' },
        { en: 'clean', ms: 'bersih', zh: '打扫', pic: '✨' },
        { en: 'wash', ms: 'cuci', zh: '洗', pic: '🫧' },
        { en: 'help', ms: 'tolong', zh: '帮忙', pic: '🤝' },
        { en: 'give', ms: 'beri', zh: '给予', pic: '🎁' },
        { en: 'take', ms: 'ambil', zh: '拿', pic: '🤏' },
        { en: 'open', ms: 'buka', zh: '打开', pic: '🔓' },
        { en: 'close', ms: 'tutup', zh: '关闭', pic: '🔒' },
        { en: 'throw', ms: 'buang', zh: '扔', pic: '🗑️' },
        { en: 'point', ms: 'tunjuk', zh: '指', pic: '👉' },
        { en: 'carry', ms: 'bawa', zh: '搬', pic: '🧳' },
        { en: 'climb', ms: 'panjat', zh: '爬', pic: '🧗' },
        { en: 'think', ms: 'fikir', zh: '思考', pic: '🤔' },
        { en: 'count', ms: 'hitung', zh: '数数', pic: '🧮' },
        { en: 'wait', ms: 'tunggu', zh: '等待', pic: '⏳' },
        { en: 'look', ms: 'tengok', zh: '看', pic: '👀' },
        { en: 'love', ms: 'suka', zh: '爱', pic: '🥰' },
        { en: 'share', ms: 'kongsi', zh: '分享', pic: '🤲' },
        { en: 'wake up', ms: 'bangun', zh: '醒来', pic: '🌅' }
      ]
    },
    {
      id: 'emotions',
      icon: '😊',
      label: { en: 'Feelings', ms: 'Emosi', zh: '情绪' },
      words: [
        { en: 'happy', ms: 'gembira', zh: '开心', pic: '😊' },
        { en: 'smile', ms: 'senyum', zh: '微笑', pic: '😄' },
        { en: 'laugh', ms: 'tertawa', zh: '大笑', pic: '😆' },
        { en: 'excited', ms: 'teruja', zh: '兴奋', pic: '🤩' },
        { en: 'sad', ms: 'sedih', zh: '难过', pic: '😢' },
        { en: 'cry', ms: 'menangis', zh: '哭', pic: '😭' },
        { en: 'angry', ms: 'marah', zh: '生气', pic: '😠' },
        { en: 'scared', ms: 'penakut', zh: '害怕', pic: '😨' },
        { en: 'tired', ms: 'penat', zh: '累', pic: '😪' },
        { en: 'surprised', ms: 'terkejut', zh: '惊讶', pic: '😲' },
        { en: 'shy', ms: 'malu', zh: '害羞', pic: '😳' },
        { en: 'proud', ms: 'bangga', zh: '自豪', pic: '😎' },
        { en: 'worried', ms: 'khuatir', zh: '担心', pic: '😰' },
        { en: 'sick', ms: 'sakit', zh: '生病', pic: '🤒' },
        { en: 'brave', ms: 'berani', zh: '勇敢', pic: '🦸' },
        { en: 'kind', ms: 'baik', zh: '善良', pic: '💗' },
        { en: 'silly', ms: 'lucu', zh: '搞笑', pic: '🤪' },
        { en: 'lonely', ms: 'kesunyian', zh: '孤单', pic: '🥺' },
        { en: 'calm', ms: 'tenang', zh: '平静', pic: '😌' },
        { en: 'quiet', ms: 'senyap', zh: '安静', pic: '🤫' }
      ]
    },
    {
      id: 'time',
      icon: '📅',
      label: { en: 'Time & Calendar', ms: 'Masa & Kalendar', zh: '时间与日历' },
      words: [
        { en: 'day', ms: 'hari', zh: '天', pic: '📅' },
        { en: 'night', ms: 'malam', zh: '夜晚', pic: '🌃' },
        { en: 'morning', ms: 'pagi', zh: '早上', pic: '🌄' },
        { en: 'evening', ms: 'petang', zh: '傍晚', pic: '🌆' },
        { en: 'afternoon', ms: 'tengah hari', zh: '下午', pic: '🌇' },
        { en: 'today', ms: 'hari ini', zh: '今天', pic: '🌤️' },
        { en: 'tomorrow', ms: 'esok', zh: '明天', pic: '⏭️' },
        { en: 'yesterday', ms: 'semalam', zh: '昨天', pic: '⏮️' },
        { en: 'week', ms: 'minggu', zh: '星期', pic: '📆' },
        { en: 'month', ms: 'bulan', zh: '月份', pic: '🗓️' },
        { en: 'year', ms: 'tahun', zh: '年', pic: '🎊' },
        { en: 'minute', ms: 'minit', zh: '分钟', pic: '⏱️' },
        { en: 'time', ms: 'masa', zh: '时间', pic: '⌛' },
        { en: 'birthday', ms: 'hari jadi', zh: '生日', pic: '🎂' },
        { en: 'holiday', ms: 'cuti', zh: '假期', pic: '🎉' }
      ]
    },
    {
      id: 'toys',
      icon: '🧸',
      label: { en: 'Toys & Sports', ms: 'Mainan & Sukan', zh: '玩具与运动' },
      words: [
        { en: 'ball', ms: 'bola', zh: '球', pic: '⚽' },
        { en: 'basketball', ms: 'basket', zh: '篮球', pic: '🏀' },
        { en: 'tennis', ms: 'tenis', zh: '网球', pic: '🎾' },
        { en: 'badminton', ms: 'badminton', zh: '羽毛球', pic: '🏸' },
        { en: 'golf', ms: 'golf', zh: '高尔夫', pic: '⛳' },
        { en: 'kite', ms: 'kayang', zh: '风筝', pic: '🪁' },
        { en: 'doll', ms: 'doll', zh: '洋娃娃', pic: '🪆' },
        { en: 'teddy', ms: 'arnak beruang', zh: '泰迪熊', pic: '🧸' },
        { en: 'blocks', ms: 'balok', zh: '积木', pic: '🧱' },
        { en: 'puzzle', ms: 'puzzle', zh: '拼图', pic: '🧩' },
        { en: 'robot', ms: 'robot', zh: '机器人', pic: '🤖' },
        { en: 'yoyo', ms: 'layang-layang', zh: '悠悠球', pic: '🪀' },
        { en: 'balloon', ms: 'ballon', zh: '气球', pic: '🎈' },
        { en: 'trophy', ms: 'pingan', zh: '奖杯', pic: '🏆' },
        { en: 'medal', ms: 'medal', zh: '奖牌', pic: '🎖️' },
        { en: 'gym', ms: 'gim', zh: '健身房', pic: '🏋️' },
        { en: 'race', ms: 'larian', zh: '赛跑', pic: '🏁' },
        { en: 'dice', ms: 'dadu', zh: '骰子', pic: '🎲' }
      ]
    },
    {
      id: 'tech',
      icon: '📱',
      label: { en: 'Technology', ms: 'Teknologi', zh: '科技' },
      words: [
        { en: 'phone', ms: 'telefon', zh: '手机', pic: '📱' },
        { en: 'printer', ms: 'mesin pencetak', zh: '打印机', pic: '🖨️' },
        { en: 'camera', ms: 'kamera', zh: '相机', pic: '📷' },
        { en: 'keyboard', ms: 'papan kekunci', zh: '键盘', pic: '⌨️' },
        { en: 'usb', ms: 'pen drive', zh: 'U盘', pic: '💾' },
        { en: 'battery', ms: 'bateri', zh: '电池', pic: '🔋' },
        { en: 'satellite', ms: 'satelit', zh: '卫星', pic: '🛰️' }
      ]
    },
    {
      id: 'jobs',
      icon: '👩‍🏫',
      label: { en: 'Jobs', ms: 'Pekerjaan', zh: '职业' },
      words: [
        { en: 'teacher', ms: 'guru', zh: '老师', pic: '👩‍🏫' },
        { en: 'doctor', ms: 'doktor', zh: '医生', pic: '🧑‍⚕️' },
        { en: 'nurse', ms: 'kejururawat', zh: '护士', pic: '👩‍⚕️' },
        { en: 'police', ms: 'polisi', zh: '警察', pic: '👮' },
        { en: 'firefighter', ms: 'ahli bomba', zh: '消防员', pic: '🧑‍🚒' },
        { en: 'soldier', ms: 'askar', zh: '士兵', pic: '🦺' },
        { en: 'farmer', ms: 'petani', zh: '农民', pic: '👨‍🌾' },
        { en: 'chef', ms: 'koki', zh: '厨师', pic: '👨‍🍳' },
        { en: 'singer', ms: 'penyanyi', zh: '歌手', pic: '🧑‍🎤' },
        { en: 'artist', ms: 'seniman', zh: '艺术家', pic: '🧑‍🎨' },
        { en: 'writer', ms: 'penulis', zh: '作家', pic: '📝' },
        { en: 'pilot', ms: 'penerbang', zh: '飞行员', pic: '🧑‍✈️' },
        { en: 'astronaut', ms: 'astronaut', zh: '宇航员', pic: '🧑‍🚀' },
        { en: 'hairdresser', ms: 'pemotong rambut', zh: '理发师', pic: '💈' },
        { en: 'postman', ms: 'posman', zh: '邮递员', pic: '📮' }
      ]
    },
    {
      id: 'bathroom',
      icon: '🧼',
      label: { en: 'Bathroom & Household', ms: 'Bilik Mandi & Rumah', zh: '卫浴与家居' },
      words: [
        { en: 'soap', ms: 'sabun', zh: '肥皂', pic: '🧼' },
        { en: 'towel', ms: 'tuala', zh: '毛巾', pic: '🧻' },
        { en: 'toothbrush', ms: 'berus gigi', zh: '牙刷', pic: '🪥' },
        { en: 'toothpaste', ms: 'pasta gigi', zh: '牙膏', pic: '🧴' },
        { en: 'comb', ms: 'sikat', zh: '梳子', pic: '🪮' },
        { en: 'shower', ms: 'mandi', zh: '淋浴', pic: '🚿' },
        { en: 'bathtub', ms: 'bekas mandi', zh: '浴缸', pic: '🛁' },
        { en: 'toilet', ms: 'tandas', zh: '厕所', pic: '🚽' },
        { en: 'washing machine', ms: 'mesin basuh', zh: '洗衣机', pic: '🧺' }
      ]
    },
    {
      id: 'music',
      icon: '🎵',
      label: { en: 'Music & Art', ms: 'Muzik & Seni', zh: '音乐与艺术' },
      words: [
        { en: 'guitar', ms: 'gitar', zh: '吉他', pic: '🎸' },
        { en: 'piano', ms: 'piano', zh: '钢琴', pic: '🎹' },
        { en: 'drum', ms: 'kembang', zh: '鼓', pic: '🥁' },
        { en: 'violin', ms: 'biolin', zh: '小提琴', pic: '🎻' },
        { en: 'trumpet', ms: 'trumpet', zh: '小号', pic: '🎺' },
        { en: 'music note', ms: 'nada', zh: '音符', pic: '🎵' },
        { en: 'brush', ms: 'berus', zh: '画笔', pic: '🖌️' },
        { en: 'statue', ms: 'patung', zh: '雕像', pic: '🗿' }
      ]
    },
    {
      id: 'adjectives',
      icon: '🌡️',
      label: { en: 'Describing Words', ms: 'Kata Sifat', zh: '形容词' },
      words: [
        { en: 'hot', ms: 'supi', zh: '热', pic: '🔥' },
        { en: 'cold', ms: 'sejuk', zh: '冷', pic: '🥶' },
        { en: 'new', ms: 'baru', zh: '新', pic: '🆕' },
        { en: 'old', ms: 'lama', zh: '旧', pic: '🕰️' },
        { en: 'fast', ms: 'laju', zh: '快', pic: '⚡' },
        { en: 'tall', ms: 'tinggi', zh: '高', pic: '📐' },
        { en: 'light', ms: 'ringan', zh: '轻', pic: '🪶' },
        { en: 'loud', ms: 'kuat', zh: '大声', pic: '🔊' },
        { en: 'yummy', ms: 'sedap', zh: '好吃', pic: '😋' },
        { en: 'sweet', ms: 'manis', zh: '甜', pic: '🍯' },
        { en: 'yucky', ms: 'taina', zh: '难吃', pic: '🤢' }
      ]
    }
  ];

  /**
   * Some words genuinely have two meanings in the same language
   * ("orange" the fruit and "orange" the colour, Malay "bulan" = moon and
   * month, Malay "coklat" = chocolate and brown). Both senses live in the
   * normal category tables, so the lookup index naturally returns every
   * candidate and the picture picker lets the parent choose the right one.
   */

  /**
   * Malay -> English dictionary used ONLY as a fallback for the optional
   * online photo search. The built-in picture library above is the primary
   * source, so a missing dictionary entry never causes a wrong picture.
   */
  var DICTIONARY = {
    'air': 'water', 'air mata': 'tear', 'abu': 'ash', 'adik': 'sibling',
    'ajaib': 'magic', 'akar': 'root', 'alang': 'somewhat', 'aman': 'safe',
    '.READ': 'read', 'baju': 'shirt', 'balon': 'balloon', 'bambu': 'bamboo',
    'bantal': 'pillow', 'bapa': 'father', 'bata': 'brick', 'bawah': 'under',
    'bekerja': 'work', 'berani': 'brave', 'berat': 'heavy', 'berjalan': 'walk',
    'berlari': 'run', 'bersih': 'clean', 'bertanya': 'ask', 'besar': 'big',
    'bintang': 'star', 'biru': 'blue', 'bola': 'ball', 'botol': 'bottle',
    'buku': 'book', 'bulan': 'moon', 'bunga': 'flower', 'buru': 'hunt',
    'busa': 'bus', 'cahaya': 'light', 'cincin': 'ring', 'cinta': 'love',
    'dapur': 'kitchen', 'duduk': 'sit', 'dukung': 'support', 'empat': 'four',
    'gajah': 'elephant', 'gambar': 'picture', 'gembira': 'happy', 'guna': 'use',
    'gunung': 'mountain', 'guru': 'teacher', 'hari': 'day', 'hujan': 'rain',
    'ikan': 'fish', 'indah': 'beautiful', 'isi': 'fill', 'jadi': 'become',
    'jaga': 'guard', 'jam': 'hour', 'jantung': 'heart', 'kata': 'word',
    'kayu': 'wood', 'keluarga': 'family', 'keluar': 'exit', 'kepala': 'head',
    'kertas': 'paper', 'kota': 'city', 'kursi': 'chair', 'lalu': 'pass',
    'lampu': 'lamp', 'langit': 'sky', 'lapis': 'layer', 'lima': 'five',
    'lompat': 'jump', 'luas': 'wide', 'main': 'play', 'makan': 'eat',
    'malam': 'night', 'mata': 'eye', 'melukis': 'paint', 'membaca': 'read',
    'menari': 'dance', 'minum': 'drink', 'muda': 'young', 'nasional': 'national',
    'nilai': 'value', 'nyanyi': 'sing', 'orang': 'person', 'pagi': 'morning',
    'pahit': 'bitter', 'pakai': 'wear', 'paling': 'most', 'pantai': 'beach',
    'patah': 'broken', 'patung': 'statue', 'pekerja': 'worker', 'pesta': 'party',
    'petak': 'box', 'peta': 'map', 'petang': 'evening', 'pilih': 'choose',
    'pintu': 'door', 'pohon': 'tree', 'potong': 'cut', 'pula': 'again',
    'putih': 'white', 'rasa': 'taste', 'rumah': 'house', 'rusa': 'deer',
    'sakit': 'pain', 'sama': 'same', 'satu': 'one', 'saya': 'i',
    'sekolah': 'school', 'sembilan': 'nine', 'semua': 'all', 'seni': 'art',
    'sepuluh': 'ten', 'suka': 'like', 'tahan': 'endure', 'tahu': 'know',
    'takut': 'fear', 'tali': 'rope', 'taman': 'garden', 'tanah': 'ground',
    'tangan': 'hand', 'tapis': 'sieve', 'tarik': 'pull', 'tata': 'order',
    'tekan': 'press', 'telur': 'egg', 'teman': 'friend', 'tidak': 'not',
    'tiga': 'three', 'tinggi': 'tall', 'toko': 'shop', 'tuang': 'pour',
    'tugas': 'task', 'tunjuk': 'show', 'turun': 'down', 'tutur': 'speak',
    'ucap': 'say', 'ukur': 'measure', 'ulang': 'repeat', 'untuk': 'for',
    'urus': 'manage', 'waktu': 'time', 'warna': 'colour', 'yakin': 'certain'
  };

  /** Extra aliases: variant spellings -> canonical English word. */
  var ALIASES = {
    'air mata': 'water',
    'bola sepak': 'ball',
    'kura': 'turtle',
    'gula-gula': 'candy',
    'lumba-lumba': 'dolphin',
    'ubat kentang': 'potato',
    'kapal api': 'fire engine',
    'kereta api': 'train',
    'kapal terbang': 'airplane',
    'pensil': 'pencil',
    'tuala': 'towel'
  };

  var LANGS = ['en', 'ms', 'zh'];

  var API = {
    version: '3.0.0',
    langs: LANGS,
    categories: CATEGORIES,
    dictionary: DICTIONARY,
    aliases: ALIASES,

    /** Flat index: normalised word -> array of entries. */
    index: null,

    /** Normalise a word for lookup: lowercase, trim, collapse spaces. */
    normalize: function (word) {
      return String(word == null ? '' : word)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/^[\s'‘’]+|[\s'‘’]+$/g, '');
    },

    /** Build (once) and return the flat lookup index. */
    buildIndex: function () {
      if (API.index) return API.index;

      var index = Object.create(null);
      var pics = Object.create(null);

      function add(entry, category) {
        LANGS.forEach(function (lang) {
          var key = API.normalize(entry[lang]);
          if (!key) return;
          if (!index[key]) index[key] = [];
          var bucket = index[key];
          if (!bucket.some(function (e) { return e.pic === entry.pic; })) {
            bucket.push({
              en: entry.en,
              ms: entry.ms,
              zh: entry.zh,
              pic: entry.pic,
              category: category,
              matchedOn: lang
            });
          }
        });
        pics[entry.pic] = (pics[entry.pic] || 0) + 1;
      }

      CATEGORIES.forEach(function (cat) {
        cat.words.forEach(function (w) { add(w, cat.id); });
      });

      API.index = index;
      API.picUsage = pics;
      return index;
    },

    /**
     * Every candidate picture for a word, best first.
     * `lang` narrows the search to that language's spelling when possible.
     */
    findAll: function (word, lang) {
      var idx = API.buildIndex();
      var key = API.normalize(word);
      if (!key) return [];

      function hits(k) {
        return (idx[k] || []).slice();
      }

      var direct = hits(key);
      if (direct.length) return direct;

      // Known alias.
      if (API.aliases[key]) {
        var aliased = hits(API.normalize(API.aliases[key]));
        if (aliased.length) return aliased;
      }

      // Malay word -> English equivalent -> picture. The dictionary is
      // applied in every interface language: a parent may type a Malay word
      // while the app is set to English.
      var translated = hits(API.normalize(API.dictionary[key]));
      if (translated.length) return translated;

      // Loose match: ignore spaces and hyphens ("icecream" -> "ice cream").
      var loose = key.replace(/[\s\-]/g, '');
      var looseHits = [];
      Object.keys(idx).forEach(function (k) {
        if (k.replace(/[\s\-]/g, '') === loose) {
          looseHits = looseHits.concat(idx[k]);
        }
      });
      if (looseHits.length) return looseHits;

      // English plural / singular.
      if (lang !== 'chinese' && lang !== 'zh') {
        var singulars = [];
        if (/ies$/.test(key)) singulars.push(key.slice(0, -3) + 'y');
        if (/ves$/.test(key)) singulars.push(key.slice(0, -3) + 'f');
        if (/(ses|xes|zes|ches|shes)$/.test(key)) singulars.push(key.replace(/es$/, ''));
        if (/s$/.test(key)) singulars.push(key.replace(/s$/, ''));
        for (var i = 0; i < singulars.length; i++) {
          var s = hits(singulars[i]);
          if (s.length) return s;
        }
      }

      return [];
    },

    /**
     * The single best picture for a word, or null when nothing matches.
     * `categoryHint` disambiguates collisions like "orange" (fruit vs colour).
     */
    find: function (word, lang, categoryHint) {
      var candidates = API.findAll(word, lang);
      if (!candidates.length) return null;
      if (categoryHint) {
        var hinted = candidates.filter(function (c) { return c.category === categoryHint; });
        if (hinted.length) return hinted[0];
      }
      return candidates[0];
    },

    /** Search the library by any language term (used by the picture picker). */
    search: function (query, limit) {
      var idx = API.buildIndex();
      var q = API.normalize(query);
      var out = [];
      if (!q) return out;

      Object.keys(idx).forEach(function (k) {
        idx[k].forEach(function (item) {
          var en = API.normalize(item.en);
          var ms = API.normalize(item.ms);
          var zh = API.normalize(item.zh);
          if (en.indexOf(q) === -1 && ms.indexOf(q) === -1 && zh.indexOf(q) === -1) return;
          if (!out.some(function (o) { return o.pic === item.pic; })) {
            out.push({
              pic: item.pic, en: item.en, ms: item.ms, zh: item.zh,
              category: item.category
            });
          }
        });
      });

      out.sort(function (a, b) {
        var ap = API.normalize(a.en).indexOf(q) === 0 ? 0 : 1;
        var bp = API.normalize(b.en).indexOf(q) === 0 ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return a.en < b.en ? -1 : 1;
      });

      return limit ? out.slice(0, limit) : out;
    },

    /** All library entries, flattened, for the picker grid. */
    all: function () {
      var seen = Object.create(null);
      var out = [];
      CATEGORIES.forEach(function (cat) {
        cat.words.forEach(function (w) {
          if (seen[w.pic]) return;
          seen[w.pic] = true;
          out.push({
            pic: w.pic, en: w.en, ms: w.ms, zh: w.zh,
            category: cat.id, categoryIcon: cat.icon
          });
        });
      });
      return out;
    }
  };

  global.EjaanKidsData = API;
})(typeof window !== 'undefined' ? window : globalThis);
