# Ejaan Kids - 儿童拼写学习应用

一个支持英语、马来文和中文的儿童拼写学习应用，专为儿童设计，结合图片、emoji和语音帮助儿童学习文字拼写和发音。

## 功能特性

### 核心功能

#### 1. 多语言支持
- **英语** (English)
- **马来文** (Bahasa Melayu)
- **中文** (Chinese)

#### 2. 两种学习模式

**拼写模式 (Spelling Mode)**
- 显示单词的emoji/图片
- 播放单词发音
- 点击字母按钮拼写单词
- 自动检查答案
- 显示庆祝动画

**听读模式 (Listen & Learn Mode)**
- 显示单词和emoji/图片
- 自动播放发音
- 可重复听发音
- 前进/后退按钮自由切换单词
- 纯复习模式，无需拼写

#### 3. 智能图片生成
- 自动匹配emoji图标
- 支持Unsplash API搜索真实图片
- 三重降级机制：图片 → emoji → 默认图标
- 支持英语、马来文、中文关键词搜索

#### 4. 智能语音系统 (TTS)
- 本地TTS语音优先
- 自动检测语言包可用性
- 马来文语音自动回退到Google Translate TTS
- 手机移动端友好
- 实时语音状态显示

### 管理功能

#### 家长管理界面
- 添加/删除单词
- 独立语言选择（添加单词时可选择不同语言）
- 单词列表管理
- 语音状态检测
- Unsplash API密钥配置

#### 语音状态指示器
- 实时显示可用的TTS语音
- 英文、马来文、中文语音分别检测
- 提供语音安装指导

## 使用指南

### 首次使用

1. **打开应用**
   - 应用默认显示Parent管理界面

2. **配置语音**（可选）
   - 查看语音状态指示器
   - 如需要马来文语音，可安装系统语音包

3. **添加单词**
   - 选择语言：English / Melayu / 中文
   - 输入单词（如：fish, ikan, 鱼）
   - 点击"Add"添加
   - 系统自动匹配emoji或图片

4. **开始学习**
   - 方法1：点击顶部语言按钮 → "🎮 Start Quiz"
   - 方法2：在Parent界面 → "🎮 Start Quiz!"

### 学习流程

#### 拼写模式
1. 应用显示emoji/图片
2. 自动播放单词发音
3. 点击字母按钮拼写单词
4. 可重复点击"🔊 Listen"听发音
5. 完成拼写后自动检查答案
6. 正确显示庆祝动画
7. 点击"Next →"进入下一个单词

#### 听读模式
1. 切换到"Listen & Learn Mode"
2. 自动显示单词和emoji/图片
3. 自动播放发音
4. 重复点击"🔊 Listen"听发音
5. 点击"⬅️ Previous"返回上一个单词
6. 点击"Next ➡️"进入下一个单词
7. 查看进度条了解学习进度

### 模式切换
- 两种模式可以随时切换
- 切换模式时单词自动同步
- 进度保持一致

## 最近更新

### v2026.02.18 - 重大更新

#### 修复的问题

1. **拼写模式重复字母逻辑修复**
   - 问题：单词"susu"有两个"s"时，必须点击特定的"s"
   - 修复：现在可以点击任何一个可用字母，逻辑更直观
   - 改进：字母按钮点击后立即禁用，避免混淆

2. **Listen模式文字显示修复**
   - 问题：切换到Listen模式时文字不显示
   - 修复：切换模式时自动重新加载当前单词
   - 改进：文字、emoji、进度同步显示

3. **模式切换单词同步修复**
   - 问题：Listen模式切换到Spelling模式时显示错误的单词
   - 修复：切换模式时调用`loadWord()`重新加载
   - 改进：确保Spelling和Listen模式始终显示同一单词

4. **语言切换逻辑修复**
   - 问题：点击语言按钮后按钮不高亮，逻辑失效
   - 修复：重写`setMode()`函数，正确更新按钮状态
   - 改进：语言切换更可靠

#### 新增功能

1. **添加单词时的语言选择**
   - 独立的语言选择按钮：English / Melayu / 中文
   - 输入框placeholder根据语言自动切换
   - 错误提示支持三语言
   - 清晰的视觉反馈

2. **导航改进**
   - Listen模式添加"⬅️ Previous"按钮
   - 顶部菜单添加"🎮 Start Quiz"按钮
   - 可直接从语言选择启动Quiz
   - 更好的用户流程

3. **Quiz完成返回功能**
   - Quiz完成后"Next →"按钮变为"🏠 Back to Home"
   - 点击后返回Parent管理界面
   - 重置Quiz状态

4. **初始界面优化**
   - 启动时显示Parent模式
   - 更符合使用流程
   - 避免混淆

5. **手机马来文TTS支持**
   - 自动检测马来文语音可用性
   - 本地TTS不可用时自动使用Google Translate TTS
   - 需要网络连接
   - 双重保障机制

#### 界面改进

1. **语音状态指示器**
   - 实时显示英文、马来文、中文语音可用性
   - "🔄 Check Voices"按钮手动刷新
   - 语音不可用时提供安装指引

2. **Listen模式界面重设计**
   - 大号字体显示单词（48px）
   - 大号emoji/图片（80px/150px）
   - 醒目的Listen按钮
   - 学习指引提示
   - 独立进度条

3. **语言选择视觉反馈**
   - 选中按钮高亮显示
   - 渐变色背景
   - 清晰的边框区分

## 技术架构

### 核心技术
- **前端**：纯HTML/CSS/JavaScript
- **存储**：LocalStorage（单词列表）
- **TTS**：Web Speech API + Google Translate TTS备选
- **图片**：Emoji映射 + Unsplash API

### 文件结构
```
ejaan-kids/
├── good.html              # 主应用文件
├── word-emoji-map.json    # Emoji映射配置
├── index.html             # 备用版本
└── README.md              # 本文档
```

### 主要函数

#### TTS语音管理
- `loadVoices()` - 加载可用语音
- `checkVoiceAvailability()` - 检查语音可用性
- `getBestVoiceForLanguage()` - 获取最佳语音
- `speakWord()` - 朗读单词
- `speakWithGoogleTTS()` - Google Translate TTS备选

#### 学习模式
- `setupLatinSpelling()` - 设置字母拼写（英语/马来文）
- `initChineseWriter()` - 设置汉字书写（中文）
- `loadListenSelectGame()` - 加载听读模式
- `toggleGameMode()` - 切换学习模式

#### 单词管理
- `addWord()` - 添加单词
- `deleteWord()` - 删除单词
- `renderWordList()` - 渲染单词列表
- `setAddWordLanguage()` - 设置添加单词的语言

#### Quiz功能
- `startQuiz()` - 开始Quiz
- `loadWord()` - 加载单词
- `nextWord()` - 下一个单词
- `previousWord()` - 上一个单词（Listen模式）
- `checkAnswer()` - 检查答案

### 数据结构

#### 单词对象
```javascript
{
    word: "fish",           // 单词文本
    scene: {                // 场景对象
        type: "emoji",      // 类型：emoji 或 image
        value: "🐟"         // 值：emoji字符或图片URL
    },
    lang: "english"         // 语言：english, malay, chinese
}
```

#### 当前状态
```javascript
currentMode = 'english'     // 当前语言模式
currentGameMode = 'spelling' // 当前游戏模式
currentWordIndex = 0        // 当前单词索引
quizWords = []              // Quiz单词列表
wordList = []               // 所有单词列表
```

## 配置选项

### Unsplash API（可选）
- 注册：https://unsplash.com/developers
- 免费：1,000 请求/小时
- 在Parent界面输入API密钥
- 获取真实图片替代emoji

### 系统语音（推荐）
- **Windows**: 设置 → 时间和语言 → 语音
- **macOS**: 系统偏好设置 → 辅助功能 → 语音
- **Android**: 设置 → 语言和输入 → 文字转语音
- **iOS**: 设置 → 辅助功能 → 语音内容 → 语音

## 浏览器兼容性

### 桌面浏览器
- ✅ Chrome（推荐）
- ✅ Firefox
- ✅ Safari
- ✅ Edge

### 移动浏览器
- ✅ iOS Safari
- ✅ Android Chrome
- ✅ Android Firefox

### 注意事项
- 部分移动浏览器可能不支持所有语音
- 建议使用Chrome获得最佳体验
- 马来文语音会自动回退到Google TTS

## 使用技巧

### 针对家长
1. 先在Parent界面添加常用单词
2. 查看语音状态，确保语音可用
3. 从简单的单词开始
4. 定期检查学习进度

### 针对儿童
1. 先用Listen模式熟悉单词
2. 再切换到Spelling模式练习拼写
3. 不确定时可重复点击Listen
4. 使用Previous按钮复习之前的单词

## 常见问题

### Q: 马来文语音不工作？
A: 
1. 检查语音状态指示器
2. 安装马来文语音包（参考系统语音配置）
3. 确保有网络连接（Google TTS备选）

### Q: 图片不显示？
A: 
1. 检查单词是否在emoji映射中
2. 配置Unsplash API密钥
3. 检查网络连接

### Q: 如何删除单词？
A: 
1. 进入Parent界面
2. 点击单词旁边的"×"按钮

### Q: 如何重置进度？
A: 
1. 完成所有单词后会自动提示
2. 点击"🏠 Back to Home"返回管理界面
3. 可以重新开始Quiz

## 未来计划

- [ ] 添加发音评分功能
- [ ] 支持更多语言
- [ ] 添加学习进度追踪
- [ ] 支持自定义emoji/图片
- [ ] 添加成就系统
- [ ] 云端同步功能

## 贡献

欢迎提交问题和改进建议！

## 许可

MIT License

---

**版本**: 2026.02.18  
**作者**: Ejaan Kids Team  
**最后更新**: 2026年2月18日
