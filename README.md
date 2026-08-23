# PinMate — Pinterest 标题与描述 AI 助手

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

> **PinMate** 是一款 Chrome 扩展，利用 AI 视觉模型自动分析 Pinterest Pin 图片，一键生成 SEO 优化的标题、描述、话题标签与替代文本，并直接填入 Pinterest 发布表单。

---

## ✨ 功能

- **🧠 智能图片分析** — 调用多模态 AI（视觉模型）理解 Pin 图片内容，识别主题、场景、风格、受众等
- **✍️ SEO 内容生成** — 基于分析结果生成 Pinterest 友好的标题、描述和标签，提升搜索曝光
- **⚡ 一键填入** — 将生成的内容直接填入 Pinterest 创建 Pin 的表单，无需复制粘贴
- **🔄 双模式工作流** — 支持「分析 → 生成」分步执行或「一键生成」合并执行
- **🌐 双语支持** — 中英文界面运行时切换，生成内容语言自动匹配
- **🔧 多 AI 提供商** — 支持 SiliconFlow、OpenAI 及任意 OpenAI 兼容端点
- **🔒 隐私优先** — API Key 仅存储在本地 `chrome.storage.local`，无内置密钥
- **🖱️ 可拖拽浮层面板** — 在 Pinterest 页面上浮动显示，可自由拖拽位置

---

## 📸 截图

| 设置页 | 一键生成 | 填入 Pinterest |
|:---:|:---:|:---:|
| ![设置页](store-assets/screenshots/zh/screenshot-1-settings.png) | ![一键生成](store-assets/screenshots/zh/screenshot-2-result.png) | ![填入 Pinterest](store-assets/screenshots/zh/screenshot-3-filled.png) |

---

## 🚀 安装

### Chrome Web Store（推荐）
> *即将上架*

### 开发者模式手动安装
1. 下载或克隆本仓库：
   ```bash
   git clone https://github.com/vaxicy/PinMate.git
   ```
2. 打开 Chrome → `chrome://extensions/`
3. 开启右上角 **开发者模式**
4. 点击 **加载已解压的扩展程序**，选择项目目录
5. 在扩展管理页点击 PinMate 的 **详情** → **扩展程序选项** 进入设置
6. 配置 API Key 和 AI 提供商，即可使用

---

## 📖 使用指南

### 三步工作流

1. **设置 API**
   - 右键 PinMate 图标 → **选项** 进入设置
   - 选择 AI 提供商（SiliconFlow / OpenAI / 自定义）
   - 填入你的 API Key 并保存

2. **打开 Pinterest 创建 Pin 页面**
   - 进入任意 Pinterest 创建 Pin 页面（`https://www.pinterest.com/pin-builder/`）
   - PinMate 浮层面板自动出现

3. **生成内容并填入**
   - **分析图片** — 点击分析按钮，AI 解读图片内容
   - **生成内容** — 基于分析结果生成标题、描述和标签
   - **一键生成** — 合并以上两步，直接产出完整内容
   - **填入** — 点击填入按钮，内容自动写入 Pinterest 表单

> 💡 **提示**：填入后请手动检查标题/描述区域，Pinterest 可能偶尔切换焦点导致填入不完整；如遇到可再次点击填入。

---

## ⚙️ 配置

### AI 提供商

| 提供商 | 默认模型 | 备注 |
|--------|---------|------|
| SiliconFlow | `Qwen/Qwen3-Omni-30B-A3B-Instruct` | 推荐中国用户，国内可直连 |
| OpenAI | `gpt-4o` | 需国际网络 |
| 自定义 | 用户指定 | 任意 OpenAI 兼容端点 |

### 设置选项
- **语言**：中文 / English（运行时切换，无需重载）
- **AI 提供商**：选择上述三种之一
- **API Key**：你的个人密钥（仅存本地）
- **模型名称**：可自定义使用的 AI 模型

---

## 🔐 商店主机权限理由（Chrome Web Store 表单填写）

本扩展的 `host_permissions` 包含一条宽泛权限 `https://*/*`，用于在「自定义」提供商模式下请求用户自己填写的任意 OpenAI 兼容端点。提交商店审核时请按以下文案填写「主机权限理由」：

```
https://*/*：扩展支持用户自定义任意 OpenAI 兼容端点（Custom OpenAI-compatible endpoint）。当用户在设置中选择自定义并填入自有 Base URL 时，扩展需通过用户自己的 API 密钥向该端点发送请求，因此需申请对所有 HTTPS 网站的访问权限。该权限仅在用户主动配置并使用自定义端点时生效，扩展不会后台静默访问或读取任何无关网站内容。
```

（具体域名 `https://*.pinterest.com/*` 用于向 Pinterest 创建页注入浮层面板，属内容脚本注入所需，与生成请求无关。）

---

## 🛠️ 技术架构

```
PinMate/
├── manifest.json          # 扩展清单 (Manifest V3)
├── popup.html             # 弹出窗 UI
├── settings.html          # 设置页（选项页）
├── _locales/
│   ├── en/                # 英文翻译
│   └── zh_CN/             # 中文翻译
├── js/
│   ├── background.js      # Service Worker（AI 请求转发）
│   ├── content.js         # Pinterest 页面注入的浮层面板
│   ├── ai.js              # AI API 客户端
│   ├── i18n.js            # 运行时双语引擎
│   ├── storage.js         # chrome.storage 封装
│   ├── popup.js           # 弹出窗控制器
│   └── settings.js        # 设置页控制器
├── css/
│   ├── style.css          # 弹出窗 & 设置页样式
│   └── panel.css          # 浮层面板样式
└── assets/
    └── icons/             # 扩展图标 (16/48/128)
```

### 核心流程
1. `content.js` 在 Pinterest 创建 Pin 页面注入可拖拽浮层面板
2. 用户通过面板触发的 AI 请求经 `background.js` Service Worker 转发，规避 CORS
3. AI 返回的内容由 `content.js` 直接填入 Pinterest DOM 表单
4. 所有配置（API Key、语言、模型等）存储在 `chrome.storage.local`

---

## 📦 打包构建

使用项目内打包脚本：

```powershell
.\tools\pack.ps1
```

输出 `PinMate-1.1.0.zip`，包含：
- 核心代码（`manifest.json`, `js/`, `css/`, `_locales/`, `popup.html`, `settings.html`）
- 扩展图标（`assets/icons/`）
- 微信赞赏码（`assets/wechat-reward.png`）

---

## 🤝 支持项目

如果你觉得这个工具有用，欢迎通过以下方式支持：

- [PayPal 捐赠](https://www.paypal.com/ncp/payment/WVD4GLTERHKNQ)
- 微信赞赏（见设置页）

---

## 📄 许可证

本作品采用 **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License** ([CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)).

### 你可以：
- **共享** — 在任何媒介以任何形式复制、发行本作品
- **演绎** — 修改、转换或基于本作品创作

### 须遵守：
- **署名** — 必须标注原作者，提供许可证链接，并说明是否修改
- **非商业性使用** — 不得将本作品用于商业目的
- **相同方式共享** — 如果修改本作品，必须以相同许可证发布

### 例外
如果你希望获得商业授权，请联系：huangzero2004@gmail.com

完整许可证文本见 [LICENSE](./LICENSE) 文件。

---

## 🔗 相关链接

- [隐私政策](https://vaxicy.github.io/pinmate-privacy/privacy-policy.html)
- [GitHub 仓库](https://github.com/vaxicy/PinMate)
- [提 Issue](https://github.com/vaxicy/PinMate/issues)
- [Chrome Web Store（即将上架）]()
