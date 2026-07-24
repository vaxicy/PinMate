# PinMate 商店素材生成指南（明天执行）

> 生成日期目标：2026-07-25
> 项目路径：`D:\迅雷下载\vibe coding\Chrome Extensions\PinMate`

---

## 一、需要生成的素材清单

| # | 类型 | 尺寸 | 数量 | 语言 | 存放目录 |
|---|------|------|------|------|----------|
| 1 | 教程式截图 | 1280×800 | 3 张 | 中文 | `store-assets/screenshots/zh/` |
| 2 | 教程式截图 | 1280×800 | 3 张 | 英文 | `store-assets/screenshots/en/` |
| 3 | 小型宣传图 | 440×280 | 1 张 | 中英双语 | `store-assets/promo/` |
| 4 | 顶部宣传图 | 1400×560 | 1 张 | 中英双语 | `store-assets/promo/` |

**总计：8 张图片**（6 截图 + 2 宣传图）

---

## 二、规格要求（来自 Chrome Web Store）

### 截图（Screenshots）
- **尺寸**：1280×800 或 640×400（**推荐用 1280×800**，更清晰）
- **格式**：JPEG 或 24 位 PNG（无 alpha 透明层）
- **数量**：每语言 1–5 张，我们做 **3 张教程式**
- **命名**：`screenshot-1.png`, `screenshot-2.png`, `screenshot-3.png`

### 宣传图（Promo Tiles）
- **小型（Marquee）**：440×280，JPEG/PNG（无 alpha）
- **顶部大图（Featured）**：1400×560，JPEG/PNG（无 alpha）
- **必须中英双语同图**：同一张图内同时出现中文+英文文案

---

## 三、教程式截图内容设计（3 张 × 2 语言）

### 核心原则
- 每张截图模拟一个**使用步骤**，带编号（①②③）
- 采用 **mockup 风格**：浏览器窗口框 + 内部模拟 UI（不是真实截图，是手绘/PIL 渲染的精美 mockup）
- 底部或侧边配**步骤说明文字**
- 所有"动态文本"（按钮标签、提示文字等）必须随语言切换

---

### 中文版（`store-assets/screenshots/zh/`）

#### Screenshot 1 — 打开 Pinterest + 配置 API Key

**画面内容**：
- 浏览器窗口 mockup，地址栏显示 `pinterest.com/pin-builder/...`
- 左侧/中间：Pinterest 创建 Pin 页面（简化版），有一张美食/穿搭/家居类 Pin 图片
- 右侧或浮层：**PinMate 弹窗面板**，显示「设置」界面
  - 顶部：PinMate logo + "AI Pinterest 助手"
  - 表单区域：
    - API 提供商：下拉选中「硅基流动」✓
    - API Key 输入框：`sk-xxxxxxxxxxxx`（打码显示）
    - 模型：`Qwen/Qwen2.5-VL-72B-Instruct`
    - 「测试连接」按钮旁绿色勾 ✓ 已连接
- 底部步骤条：**① 打开 Pinterest 创建页 → 配置 AI 服务商与 API Key**

**底部说明文字**：
```
第 1 步：在 Pinterest 创建 Pin 页面打开扩展，
选择 AI 服务商（硅基流动 / OpenAI），
填入 API Key 并测试连接。
```

#### Screenshot 2 — 一键分析图片并生成标题描述

**画面内容**：
- 同样浏览器窗口，Pinterest 页面
- PinMate 面板切换到**主操作界面**：
  - 大按钮：「一键生成标题描述」（高亮主色，视觉焦点）
  - 按钮下方状态：「正在分析图片…」→ 或直接展示结果（更有信息量）
- **推荐展示结果态**（比加载态更有说服力）：
  - 「图片分析」卡片：显示识别出的图片内容摘要
    - 例：「一张现代简约风格的客厅布置图，白色沙发、绿植、木质茶几」
  - 「Pinterest 标题」卡片（带复制按钮）：
    - 例：`🏡 现代简约客厅灵感 | 10㎡小户型也能拥有的高级感家居布置`
  - 「Pinterest 描述」卡片（带复制按钮）：
    - 例：包含目标受众 + 关键词的完整描述
      ```
      📌 目标受众：正在装修或改造居住空间的房主、租房党 DIY 爱好者
      
      ✨ 这套现代简约风客厅布置方案，用最少的预算打造高级感——
      白色布艺沙发搭配原木茶几，大型绿植点亮空间…
      
      🔑 关键词：#家居灵感 #小户型 #简约风格 #客厅设计 #DIY装修
      ```
- 底部步骤条：**② 点击「一键生成标题描述」，AI 自动分析图片并输出 SEO 优化内容**

**底部说明文字**：
```
第 2 步：点击「一键生成标题描述」，
AI 自动分析 Pin 图片，生成带有
目标受众和关键词的 SEO 优化标题与描述。
```

#### Screenshot 3 — 一键填入 Pinterest

**画面内容**：
- 浏览器窗口，Pinterest 创建页面
- PinMate 面板底部操作区：
  - 「全部填入」按钮（高亮主色）← 视觉焦点
  - 旁边：「仅标题」「仅描述」次要按钮
  - 状态提示：「已填入！」✓ 绿色成功标记
- Pinterest 页面输入框**可视化填充效果**：
  - 标题框：已填入上面生成的标题文字（高亮/淡色背景表示已填充）
  - 描述框：已填入描述文字
  - 用箭头或连线从 PinMate 面板指向 Pinterest 输入框，表达"一键写入"
- 底部步骤条：**③ 点击「全部填入」，标题和描述自动写入 Pinterest，发布即可**

**底部说明文字**：
```
第 3 步：审核生成的内容后，
点击「全部填入」将标题和描述
一键写入 Pinterest 输入框，直接发布。
```

---

### 英文版（`store-assets/screenshots/en/`）

#### Screenshot 1 — Open Pinterest + Configure API Key

**Visual content**: Same layout as Chinese version, all UI text in English.

**PinMate panel shows Settings**:
- Header: PinMate logo + "AI Pinterest Assistant"
- Form:
  - API Provider: dropdown showing **SiliconFlow** selected ✓
  - API Key: `sk-xxxxxxxxxxxx` (masked)
  - Model: `Qwen/Qwen2.5-VL-72B-Instruct`
  - "Test Connection" button with green checkmark ✓ Connected

**Step caption (bottom)**:
```
Step 1: Open the Pinterest Create Pin page, launch PinMate,
choose your AI provider (SiliconFlow / OpenAI),
enter your API key and test the connection.
```

#### Screenshot 2 — One-Click Generate Title & Description

**PinMate panel shows Results**:
- Big button: "**Generate Title & Description**" (highlighted primary color)
- Result cards displayed:

  **Image Analysis** card:
  > A modern minimalist living room setup with white sofa, potted plants, wooden coffee table

  **Pinterest Title** card (with Copy button):
  > 🏡 Modern Minimalist Living Room | Premium Look for Small Spaces Under 10m²

  **Pinterest Description** card (with Copy button):
  > ```
  > 📌 Target audience: Homeowners renovating their space, DIY renters
  > 
  > ✨ This modern minimalist living room setup delivers a premium look on a budget—
  > white fabric sofa paired with a raw wood coffee table, large plants bring life…
  > 
  > 🔑 Keywords: #HomeInspo #SmallSpace #Minimalism #LivingRoomDIY #InteriorDesign
  > ```

**Step caption (bottom)**:
```
Step 2: Click "Generate Title & Description" to analyze
the Pin image with AI and get SEO-optimized titles
and descriptions with target audience & keywords.
```

#### Screenshot 3 — Fill into Pinterest

**PinMate panel shows Fill actions**:
- "**Fill All**" button (primary highlight) ← focal point
- Beside it: "**Title only**", "**Description only**" secondary buttons
- Status: "**Inserted!**" ✓ green success badge

**Pinterest page shows filled fields**:
- Title field: filled with generated title (highlighted bg)
- Description field: filled with description text
- Arrow/connector line from PinMate panel → Pinterest inputs

**Step caption (bottom)**:
```
Step 3: Review the result, click "Fill All" to insert
the title and description into Pinterest in one click,
then publish your Pin.
```

---

## 四、宣传图内容设计（Promo Tiles）

### 设计原则
- **品牌色**：参考 popup.css 的主色调（查看 `css/style.css` 中 `--primary` 等 CSS 变量）
- **CTA 按钮**：中英双语用 `·` 分隔，如 `立即体验 · Try It Now`
- 图标：使用 `assets/icons/icon128.png` 作为产品图标
- 布局：左/上图 + 右/下文案，或居中大字 slogan

---

### 小型宣传图（440×280）

**布局建议**：左图右文 或 上图下文

**文案**：

| 区域 | 内容 |
|------|------|
| 主标题（中文） | AI 生成 Pinterest |
| 主标题（英文） | SEO Titles & Descriptions |
| 副标题（中文） | 一键分析图片 · 智能填入 |
| 副标题（英文） | Analyze & Auto-Fill in Seconds |
| CTA 按钮 | `立即体验 · Try It Now` |
| 特性标签（可选 2–3 个） | `⚡ 一键生成` `🔍 智能 SEO` `🔒 隐私安全` |

**视觉元素**：
- 左侧放 Pinterest 风格的 Pin 图片缩略图（模拟）
- 右侧放 PinMate logo + 文案
- 底部细线装饰

---

### 顶部大宣传图（1400×560）

**布局建议**：左中右三段式 或 居中冲击式

**文案**：

| 区域 | 内容 |
|------|------|
| 大标语（中文） | 让每张 Pin 都被看见 |
| 大标语（英文） | Make Every Pin Discoverable |
| 说明行 | AI 一键生成 SEO 标题与描述 · 填入 Pinterest 只需一秒 |
| CTA 按钮（居中偏下） | `立即免费使用 · Free to Install` |

**特性区（3–4 列卡片式排列）**：

| 列 1 | 列 2 | 列 3 | 列 4 |
|------|------|------|------|
| ⚡ 一键生成 | 🤖 AI 驱动 | 📊 SEO 优化 | 🔒 隐私优先 |
| Analyze & Generate | Powered by AI | Smart SEO | Privacy First |

**视觉元素**：
- 背景：渐变色（品牌主色到浅色）
- 左侧：大的 PinMate logo / 产品 icon
- 中间：大标语
- 右侧或底部：模拟的 Pinterest 创建页面 mini mockup（带箭头指向"填充"效果）

---

## 五、技术实现方式（Python PIL 脚本）

### 推荐方案
用 Python PIL（Pillow）手绘 mockup 风格素材，和之前项目（daily-tracker、FolderMark 等）保持一致。

### 脚本结构建议

```
assets/
├── generate-store-screenshots.py   ← 截图生成脚本（接受 lang 参数）
├── generate-store-promo.py         ← 宣传图生成脚本
└── icons/
    └── icon128.png                 ← 产品图标（已有）

store-assets/
├── screenshots/
│   ├── zh/
│   │   ├── screenshot-1.png
│   │   ├── screenshot-2.png
│   │   └── screenshot-3.png
│   └── en/
│       ├── screenshot-1.png
│       ├── screenshot-2.png
│       └── screenshot-3.png
└── promo/
    ├── promo-small.png     (440×280)
    └── promo-large.png     (1400×560)
```

### 关键代码要点

```python
# 1. 字体：使用系统中文字体（如 Microsoft YaHei / 微软雅黑）
#    英文用 Segoe UI 或 Arial
FONT_ZH = "C:/Windows/Fonts/msyh.ttc"      # 微软雅黑
FONT_EN = "C:/Windows/Fonts/seguib.ttf"     # Segoe UI
FONT_MONO = "C:/Windows/Fonts/consola.ttf"  # 等宽字体（用于 API Key 打码）

# 2. 品牌色（从 css/style.css 读取或硬编码）
PRIMARY = "#E60023"        # Pinterest 红（或 PinMate 自定义主色）
BG_LIGHT = "#FFFFFF"
BG_DARK = "#123456"
TEXT_DARK = "#1a1a1a"
TEXT_SUB = "#666666"
SUCCESS = "#22c55e"

# 3. 截图通用函数
def draw_browser_mockup(canvas, x, y, w, h):
    """绘制浏览器外框（含地址栏、标签栏）"""
    ...

def draw_pinmate_panel(canvas, x, y, w, h, lang):
    """绘制 PinMate 弹窗面板"""
    ...

def draw_pinterest_page(canvas, x, y, w, h):
    """绘制 Pinterest 创建页背景"""
    ...
```

### 截图生成命令示例

```bash
# 生成中文截图
python assets/generate-store-screenshots.py --lang zh --output store-assets/screenshots/zh/

# 生成英文截图
python assets/generate-store-screenshots.py --lang en --output store-assets/screenshots/en/

# 生成宣传图
python assets/generate-store-promo.py --output store-assets/promo/
```

---

## 六、文案速查表（复制即用）

### 产品名称
| 语言 | 名称 |
|------|------|
| 中文 | PinMate - Pinterest 标题和描述小助手 |
| 英文 | PinMate - Pinterest Title & Description Helper |

### 三步教程文案

| 步骤 | 中文 | 英文 |
|------|------|------|
| 1 | 打开 Pinterest 创建页 → 配置 AI 服务商与 API Key | Open Pinterest Create Pin → Configure AI provider & API key |
| 2 | 点击「一键生成标题描述」，AI 分析图片输出 SEO 内容 | Click "Generate" → AI analyzes image & outputs SEO content |
| 3 | 点击「全部填入」，一键写入 Pinterest 发布 | Click "Fill All" → Auto-fill into Pinterest & publish |

### 功能卖点（用于宣传图）

| 中文 | 英文 |
|------|------|
| 一键生成 | One-Click Generation |
| AI 驱动 | AI-Powered |
| SEO 优化 | Smart SEO |
| 自动填入 | Auto-Fill |
| 多语言 | Multilingual |
| 隐私安全 | Privacy First |

### CTA 按钮

| 场景 | 文案 |
|------|------|
| 截图/宣传图通用 | `立即体验 · Try It Now` |
| 顶部大图 | `立即免费使用 · Free to Install` |

---

## 七、QA 自查清单（生成后逐项检查）

### 截图 QA
- [ ] 尺寸严格 1280×800 px（不超过）
- [ ] 格式为 PNG（24 位）或 JPEG（无 alpha）
- [ ] 所有文字清晰可读，无截断/溢出
- [ ] 中英文版本分别只有对应语言（不混排）
- [ ] Mockup 内动态文本（按钮、提示、结果）与截图语言一致
- [ ] 3 张截图步骤连贯（配置 → 生成 → 填入）
- [ ] 编号清晰（①②③ 或 Step 1/2/3）
- [ ] 底部步骤说明文字完整

### 宣传图 QA
- [ ] 小图 440×280，大图 1400×560（精确像素）
- [ ] 同一张图内有**中英双语**文案（让商店识别多语言）
- [ ] CTA 按钮文字垂直居中，不贴边
- [ ] 无溢出：所有元素在画布边界内 ≥ 12px
- [ ] 区块间不重叠
- [ ] 对比度达标：文字对背景 ≥ 4.5:1
- [ ] 卡片网格整齐（偶数，无孤儿行）

### 通用 QA
- [ ] 文件名规范：`screenshot-{N}.png` / `promo-small.png` / `promo-large.png`
- [ ] 存放目录正确：`store-assets/screenshots/{zh,en}/` 和 `store-assets/promo/`
- [ ] 用图片查看器逐张预览确认无误

---

## 八、项目关键信息速查

| 项目 | 值 |
|------|-----|
| 扩展名 | PinMate |
| 版本 | 1.0.0 |
| 默认语言 | en |
| 支持语言 | zh_CN, en |
| 产品图标 | `assets/icons/icon128.png` |
| 主功能 | AI 分析 Pin 图片 → 生成 SEO 标题描述 → 一键填入 Pinterest |
| 支持 AI | SiliconFlow, OpenAI, Custom OpenAI-compatible |
| 隐私政策 | https://vaxicy.github.io/pinmate-privacy/privacy-policy.html |
| GitHub | https://github.com/vaxicy/PinMate |

---

## 九、执行顺序（明天按此顺序操作）

1. **创建目录结构**：`store-assets/screenshots/{zh,en}/` + `store-assets/promo/`
2. **确认品牌色**：读 `css/style.css` 取 `--primary` 等变量值
3. **写截图脚本**：`assets/generate-store-screenshots.py`（先跑中文版调试）
4. **生成中文截图 3 张** → 预览检查 → 调整直到通过 QA
5. **加英文版** → 生成英文截图 3 张 → 预览检查
6. **写宣传图脚本**：`assets/generate-store-promo.py`
7. **生成小宣传图 440×280** → 预览检查
8. **生成顶部大图 1400×560** → 预览检查
9. **全量 QA 过一遍**（第七节清单）
10. **交付**：告知用户所有文件位置，可直接上传商店
