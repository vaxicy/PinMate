/**
 * i18n.js — Runtime bilingual dictionary for PinMate.
 * All dynamic UI text MUST go through I18N so language toggling updates every region.
 * Static HTML uses data-i18n / data-i18n-ph attributes handled by applyStaticI18n().
 */
const I18N = {
  en: {
    aiReady: "AI Ready",
    aiNotConfigured: "API Key not set",
    aiLocalReady: "Local model · no API key",

    analyzeImage: "Analyze Image",
    generateContent: "Generate Content",
    oneClickGenerate: "Generate",
    analyzing: "Analyzing image...",
    generating: "Generating...",
    oneClickGenerating: "Generating...",
    stageFindingImage: "Generating...",
    stageCallingAI: "Generating...",
    titleField: "Title",
    descriptionField: "Description",
    keywordsField: "Tags",
    altTextField: "Alt Text",
    insertedFields: "Filled: {fields} ✓",

    analysisTitle: "Image Analysis",
    titleCard: "Title",
    descriptionCard: "Description",
    keywordsCard: "Tags",
    altTextCard: "Alt Text",
    regenTitle: "Regenerate title",
    regenDescription: "Regenerate description",
    regenKeywords: "Regenerate tags",
    regenAltText: "Regenerate alt text",
    regeneratingShort: "…",
    altTextTruncated: "Auto-trimmed to 500 chars (Pinterest alt limit)",
    fieldsTruncated: "Trimmed to fit Pinterest limits: {fields}",

    copy: "Copy",
    copied: "Copied!",
    copyAll: "Copy All",
    copyTagHint: "Click to copy this tag",
    copiedChip: "Copied tag: {tag}",
    insertToPinterest: "Insert to Pinterest",
    insertAll: "Fill All",
    addToPinterestTags: "Insert to Pinterest",
    inserted: "Inserted!",
    titleInserted: "Title inserted ✓",
    descInserted: "Description inserted ✓  If it looks blank, refresh to restore",
    titleDescInserted: "Title & description inserted ✓  If description looks blank, refresh to restore",
    clear: "Clear",
    cleared: "Cleared!",
    panelAutoCleared: "New image detected — panel cleared",
    panelNoImage: "Image removed — panel cleared",

    settings: "Settings",
    settingsTitle: "PinMate Settings",
    language: "Language",
    uiLanguage: "Interface Language",
    panelSection: "Panel",
    settingsInjectLabel: "Panel Visibility",
    settingsInjectFull: "All Pinterest pages",
    settingsInjectCreateOnly: "Only on Create Pin",
    panelDefaultState: "Panel Default State",
    panelStateExpanded: "Expanded",
    panelStateCollapsed: "Collapsed",
    panelDefaultStateHint: "How the panel looks right after a page loads — you can still expand or collapse it anytime.",
    autoFill: "Auto-fill the generated result into Pinterest",
    autoFillHint: "The title, description, tags and alt text are written into the form as soon as generation finishes — no need to press Fill All.",
    autoFillDone: "Auto-filled: {fields}",
    autoClearPanel: "Auto-clear the panel when the image changes or is removed",
    autoClearPanelHint: "Clears the generated text and the product link only — never the fields you typed on Pinterest.",
    aiConfiguration: "AI Configuration",
    apiProvider: "API Provider",
    providerSiliconflow: "SiliconFlow",
    providerOpenai: "OpenAI",
    providerGemini: "Gemini",
    providerCustom: "Custom / OpenAI Compatible",
    providerOllama: "Local (Ollama / LM Studio)",
    ollamaHint: "Runs on your own machine — images never leave it. Start Ollama, then allow this extension once (PowerShell, then restart Ollama):",
    ollamaOriginCmd: "[Environment]::SetEnvironmentVariable('OLLAMA_ORIGINS','*','User')",
    ollamaHint2: "Pull a vision model first, e.g. `ollama pull qwen2.5vl:7b`. If a VPN/accelerator proxies localhost, add localhost;127.0.0.1 to its bypass list.",
    apiBaseUrl: "API Base URL",
    apiBaseUrlPlaceholder: "https://your-endpoint/v1",
    apiBaseUrlHint: "OpenAI-compatible endpoints usually end with /v1",
    apiKey: "API Key",
    apiKeyPlaceholder: "",
    apiKeyHint: "Stored locally in your browser. Never sent to anyone but the provider.",
    apiKeysLabel: "API Keys",
    addKey: "+ Add Key",
    removeKey: "Remove",
    activeKeyLabel: "Active key",
    keyModeLabel: "Rotation",
    keyModeAuto: "Auto-failover",
    keyModeManual: "Manual",
    apiKeysHint: "Add multiple keys; PinMate will automatically switch to the next key when one runs out of tokens.",
    errQuotaExhausted: "API key quota exhausted, switching to the next key...",
    errAllKeysFailed: "All API keys failed. Please add new keys or check your provider.",
    show: "Show",
    hide: "Hide",
    model: "Model",
    analysisLanguage: "Analysis Language",
    generationLanguage: "Generation Language",
    generationLanguageHint: "The language the AI uses for titles, descriptions and tags.",
    save: "Save",
    saved: "Saved successfully",
    savedShort: "Saved",
    testConnection: "Test Connection",
    testing: "Testing...",

    statusConnected: "Connected",
    statusModelMissing: "Connected, but the selected model is not in this endpoint's list.",
    statusNotConnected: "Not Connected",

    errNoApiKey: "Please set your API Key in Settings first.",
    errAuth: "API Key is invalid or lacks permission.",
    errBadUrl: "Endpoint path is wrong (expected https://host/v1).",
    errTimeout: "Request timed out. Please check your network or try again.",
    slowGenHint: "Generation is taking longer than usual.",
    errNoImage: "No image found on the current page. If the image is still loading, wait a moment and try again, or reload the extension.",
    errNoAnalysis: "Please analyze an image before generating content.",
    errNetwork: "Network error. Please check your connection and try again.",
    errLocalOrigin: "Ollama refused the extension's origin. Set OLLAMA_ORIGINS (see Settings) and restart Ollama, then try again.",
    errLocalDown: "Cannot reach the local model server. Is Ollama running? (`ollama serve`) Also check that a VPN/accelerator is not proxying localhost.",
    errApi: "AI request failed. Please verify your API Key and model.",
    errNotPinterest: "Please open the Pinterest Create Pin page first.",
    errFieldsNotFound: "Could not find Pinterest title/description fields on the page.",
    tagsInserted: "Tags added to Pinterest ✓",
    errNoKeywords: "No tags were generated for this image.",
    errTagFieldNotFound: "Could not find Pinterest 'Tagged topics' field on the page.",
    altInserted: "Alt text inserted ✓",
    errNoAlt: "No alt text was generated for this image.",
    errNoContent: "Generate content first, then use the ↻ button to regenerate a single field.",

    openSettings: "Open full settings",
    resultPlaceholder: "Click Generate to create SEO title, description, tags & alt text from the image.",
    descNeedsRefresh: "Title inserted ✓  If description is blank, refresh page",
    descOnlyNeedsRefresh: "Description written. Refresh page if blank",
    targetAudience: "Target audience",
    keywords: "Keywords",
    subject: "Subject",
    productType: "Product type",
    scene: "Scene",
    style: "Style",
    tagline: "AI-powered Pinterest copy & SEO",
    panelName: "PinMate",
    close: "Close",
    openPanel: "Open panel",
    closePanel: "Collapse panel",
    launcherTip: "Open PinMate",
    dragHint: "Drag to move",
    popupHint: "Open a Pinterest Create Pin page, then use the floating PinMate panel to analyze images and generate content.",
    refreshHint: "If panel doesn't appear, refresh the page",
    openSettingsBtn: "Open Settings",

    gettingStarted: "Getting Started",
    usageGuide: "How to use",
    viewFullGuide: "See the full guide →",
    // Full guide body (HTML). Rendered with innerHTML by settings.js renderGuide(),
    // so it can stay readable with headings, lists and inline <code>.
    guideHtml: `
      <section class="guide-sec">
        <h4>1 · Set up a provider</h4>
        <p>Open <b>AI Configuration</b>, pick a provider, fill in the base URL / key / model and press <b>Test Connection</b> until the pill turns green. The model must accept image input (multimodal).</p>
        <div class="guide-kv"><div class="k">SiliconFlow</div><div class="v">Key: siliconflow.cn console → API keys<br>URL: <code>https://api.siliconflow.cn/v1</code><br>Model: Qwen3-VL-8B-Instruct (direct access in China)</div></div>
        <div class="guide-kv"><div class="k">OpenAI</div><div class="v">Key: platform.openai.com → API keys<br>URL: <code>https://api.openai.com/v1</code><br>Model: gpt-4o-mini / gpt-4o</div></div>
        <div class="guide-kv"><div class="k">Gemini</div><div class="v">Key: aistudio.google.com → Get API key<br>URL: <code>https://generativelanguage.googleapis.com/v1beta</code><br>Model: gemini-2.5-flash</div></div>
        <div class="guide-kv"><div class="k">Custom</div><div class="v">Any OpenAI-compatible endpoint: your own <code>/v1</code> URL, key and model id (pick “Custom” in the model list to type it).</div></div>
      </section>

      <section class="guide-sec">
        <h4>2 · Local Ollama (images never leave your machine)</h4>
        <ol class="guide-ol">
          <li>Install Ollama and pull a vision model: <code>ollama pull qwen2.5vl:7b</code> (use <code>qwen2.5vl:3b</code> on a small GPU)</li>
          <li>Allow the extension once — run in PowerShell: <code>[Environment]::SetEnvironmentVariable('OLLAMA_ORIGINS','*','User')</code>, then restart Ollama</li>
          <li>Pick “Local (Ollama / LM Studio)”, keep <code>http://localhost:11434/v1</code>, choose <code>qwen2.5vl:7b</code> and press <b>Test Connection</b></li>
        </ol>
        <p class="guide-note">A local 7B model takes about 20–60s per pin; the extension allows up to 180s for local endpoints. A 403 means the origin is not allowed; “cannot reach” usually means Ollama is not running, or a VPN/accelerator is proxying localhost (add localhost;127.0.0.1 to its bypass list).</p>
      </section>

      <section class="guide-sec">
        <h4>3 · Use it on Pinterest</h4>
        <ol class="guide-ol">
          <li>Open Pinterest’s <b>Create Pin</b> page with an image — the panel appears on the right</li>
          <li>Press <b>Generate</b>: the vision model writes title, description, tags and alt text</li>
          <li>Press <b>Fill All</b> to write everything into Pinterest, or “Insert into Pinterest” on a single card</li>
          <li>On the Tags card, <b>Copy All</b> copies every keyword at once</li>
        </ol>
      </section>

      <section class="guide-sec">
        <h4>4 · Product / affiliate links</h4>
        <ul class="guide-ul">
          <li>Turn on “Show product-link card” in Settings first</li>
          <li>Paste the product link into the panel’s box and press <b>Fill Link</b>: it writes Pinterest’s Link field and adds the product tag</li>
          <li>“Auto-fill the product link as soon as a link is pasted” saves that click</li>
          <li>For affiliate links, enable “Auto-check Affiliate link or sponsored product” so the disclosure is ticked while the tag is added</li>
        </ul>
      </section>

      <section class="guide-sec">
        <h4>5 · Other panel switches</h4>
        <ul class="guide-ul">
          <li><b>Auto-fill the generated result</b>: writes into Pinterest right after generation</li>
          <li><b>Auto-clear when the image changes or is removed</b>: clears the panel only, never your own fields</li>
          <li><b>EN / 中文</b> at the bottom-right of the panel switches the UI language</li>
        </ul>
      </section>

      <section class="guide-sec">
        <h4>6 · Troubleshooting</h4>
        <div class="guide-kv"><div class="k">Invalid key / 401</div><div class="v">Check the key is complete and belongs to the selected provider</div></div>
        <div class="guide-kv"><div class="k">Bad path / 404</div><div class="v">Base URLs usually end with <code>/v1</code> (Gemini uses <code>/v1beta</code>)</div></div>
        <div class="guide-kv"><div class="k">Local 403</div><div class="v"><code>OLLAMA_ORIGINS</code> not set — set it and restart Ollama</div></div>
        <div class="guide-kv"><div class="k">Cannot reach local</div><div class="v">Make sure <code>ollama serve</code> runs; exempt localhost from any proxy</div></div>
        <div class="guide-kv"><div class="k">Timeout</div><div class="v">Use a smaller local model (3b) or switch to a cloud provider</div></div>
        <div class="guide-kv"><div class="k">No image found</div><div class="v">Wait for the image to finish loading, or reload the page</div></div>
      </section>

      <p class="guide-foot">Keys and settings stay in your browser. With a cloud provider the image is sent to that provider; with a local model it never leaves your machine.</p>
    `,
    howToGetApiKey: "How to get API Key?",
    apiStep1Title: "Choose a provider",
    apiStep1Desc: "Pick SiliconFlow (direct access in China) or OpenAI in the settings above.",
    apiStep2Title: "Get your API Key",
    apiStep2Desc: "Sign up on the provider's site and create an API Key.",
    apiStep3Title: "Paste & test",
    apiStep3Desc: "Return here, paste the Key and model, then click Test Connection.",
    supportAuthor: "Support Author",
    supportTitle: "Support Author",
    supportSub: "Scan with WeChat to buy me a coffee ☕",
    wechatCaption: "Open WeChat → tap \"+\" → scan to support",
    paypalCta: "Support with PayPal",

    modelsLabel: "Models",
    addModel: "Add",
    modelListHint: "Click a model to select it as active; set one as default for this provider.",
    noModels: "No models yet. Add one above.",
    defaultTag: "Default",
    setDefault: "Set default",
    deleteModel: "Delete model",
    setAsDefaultInterface: "Set as Default Interface",
    currentDefaultInterface: "Default Interface",
    defaultInterfaceHint: "The default interface is the provider used whenever PinMate generates.",
    defaultInterfaceSet: "Default interface saved.",
    modelNamePlaceholder: "Add a model name, e.g. Qwen/Qwen3-VL-235B",
    modelPlaceholder: "e.g. Qwen/Qwen3-VL-235B",
    modelCustomOption: "Custom (manual input)",
    modelPlaceholderCustom: "Enter any model id, e.g. my-private-model",

    productLinkSection: "Product Link",
    productLinkEnabled: "Show product-link card, fill product links in one click",
    autoFillLink: "Auto-fill the product link as soon as a link is pasted",
    autoFillLinkHint: "About a second after a link lands in the product-link box, “Fill Link” and “Add Product Tag” run by themselves. Each link is filled once — clearing the box lets the next paste run again.",
    affiliateDisclosure: "Auto-check “Affiliate link or sponsored product”",
    affiliateDisclosureHint: "Ticks that disclosure checkbox in the Product Tags dialog while a product link is being added. Only enable it if you may receive compensation for these products.",
    publishSection: "Publishing",
    scheduleLater: "Turn on “Publish at a later date” for me",
    scheduleLaterHint: "On the Create Pin page PinMate switches Pinterest's “Publish at a later date” on, so the Pin is scheduled instead of published right away. Pinterest fills in its own date and time (usually tomorrow at noon) — change it on the page if you want another slot.",
    productLinkPlaceholder: "Paste product link for this image…",
    productLinkFill: "Fill Link",
    productLinkAddProduct: "Add Product Tag",
    productLinkFillAll: "One-click Fill",
    productLinkNoticeFilledAll: "Link filled & product added ✓",
    productLinkNoticeFilled: "Link filled ✓",
    productLinkNoticeProduct: "Product added, searching…",
    productLinkErrEmpty: "Please enter a link first.",
    productLinkErrLinkField: "Could not find Pinterest link field.",
    productLinkErrDialog: "Could not open the Add products dialog.",
    productLinkErrTab: "Could not switch to the link tab in the dialog."
  },
  zh: {
    aiReady: "AI 就绪",
    aiNotConfigured: "未配置 API Key",
    aiLocalReady: "本地模型 · 无需 API Key",

    analyzeImage: "分析图片",
    generateContent: "生成内容",
    oneClickGenerate: "一键生成",
    analyzing: "正在分析图片…",
    generating: "正在生成中…",
    oneClickGenerating: "正在生成中…",
    stageFindingImage: "正在生成中…",
    stageCallingAI: "正在生成中…",
    titleField: "标题",
    descriptionField: "描述",
    keywordsField: "标签",
    altTextField: "替代文本",
    insertedFields: "已填入：{fields} ✓",

    analysisTitle: "图片分析",
    titleCard: "标题",
    descriptionCard: "描述",
    keywordsCard: "标签",
    altTextCard: "替代文本",

    copy: "复制",
    copied: "已复制！",
    copyAll: "全部复制",
    copyTagHint: "点击复制此标签",
    copiedChip: "已复制标签：{tag}",
    insertToPinterest: "填入 Pinterest",
    insertAll: "全部填入",
    addToPinterestTags: "填入 Pinterest",
    inserted: "已填入！",
    titleInserted: "标题已填入 ✓",
    descInserted: "描述已填入 ✓  若显示空白，刷新页面即可恢复",
    titleDescInserted: "标题与描述已填入 ✓  若描述显示空白，刷新页面即可恢复",
    clear: "清空",
    cleared: "已清空！",
    panelAutoCleared: "检测到新图片，面板已自动清空",
    panelNoImage: "图片已移除，面板已自动清空",

    settings: "设置",
    settingsTitle: "PinMate 设置",
    language: "语言",
    uiLanguage: "界面语言",
    panelSection: "面板",
    settingsInjectLabel: "面板显示范围",
    settingsInjectFull: "全站显示",
    settingsInjectCreateOnly: "仅创建 Pin 图时",
    panelDefaultState: "面板默认状态",
    panelStateExpanded: "展开",
    panelStateCollapsed: "折叠",
    panelDefaultStateHint: "刚进入页面时面板的状态，随时可以手动展开或折叠。",
    autoFill: "生成结果后自动填入 Pinterest",
    autoFillHint: "生成完成即自动写入标题、描述、标签与替代文本，无需再点「全部填入」。",
    autoFillDone: "已自动填入：{fields}",
    autoClearPanel: "换图或图片被移除时自动清空面板",
    autoClearPanelHint: "只清空生成的内容与产品链接，绝不改动你在 Pinterest 里填写的字段。",
    aiConfiguration: "AI 配置",
    apiProvider: "API 提供商",
    providerSiliconflow: "硅基流动",
    providerOpenai: "OpenAI",
    providerGemini: "Gemini",
    providerCustom: "自定义 / OpenAI 兼容",
    providerOllama: "本地（Ollama / LM Studio）",
    ollamaHint: "模型跑在你自己电脑上，图片不出本机。先启动 Ollama，再放行本扩展的来源（PowerShell 执行一次，然后重启 Ollama）：",
    ollamaOriginCmd: "[Environment]::SetEnvironmentVariable('OLLAMA_ORIGINS','*','User')",
    ollamaHint2: "先拉取一个视觉模型，例如 `ollama pull qwen2.5vl:7b`。若加速器/VPN 代理了 localhost，请把 localhost;127.0.0.1 加进不代理列表。",
    apiBaseUrl: "API 地址",
    apiBaseUrlPlaceholder: "https://你的接口地址/v1",
    apiBaseUrlHint: "OpenAI 兼容接口通常以 /v1 结尾",
    apiKey: "API Key",
    apiKeyPlaceholder: "",
    apiKeyHint: "仅保存在你的浏览器本地，不会发送给除模型服务商之外的任何人。",
    apiKeysLabel: "API 密钥",
    addKey: "+ 添加密钥",
    removeKey: "删除",
    activeKeyLabel: "当前使用",
    keyModeLabel: "切换模式",
    keyModeAuto: "故障自动转移",
    keyModeManual: "手动",
    apiKeysHint: "可添加多个密钥；某个密钥配额耗尽时，PinMate 会自动切换到下一个可用密钥。",
    errQuotaExhausted: "API 密钥配额已耗尽，正在切换下一个密钥…",
    errAllKeysFailed: "所有密钥均失败，请添加新密钥或检查服务商。",
    show: "显示",
    hide: "隐藏",
    model: "模型",
    analysisLanguage: "分析语言",
    generationLanguage: "生成语言",
    generationLanguageHint: "AI 生成标题、描述与标签时使用的语言。",
    save: "保存",
    saved: "保存成功",
    savedShort: "已保存",
    testConnection: "测试连接",
    testing: "测试中…",

    statusConnected: "已连接",
    statusModelMissing: "已连接，但所选模型不在该端点的模型列表中。",
    statusNotConnected: "未连接",

    errNoApiKey: "请先在设置中填写你的 API Key。",
    errAuth: "API Key 无效或权限不足。",
    errBadUrl: "端点路径错误（应为 https://host/v1）。",
    errTimeout: "请求超时，请检查网络或稍后重试。",
    slowGenHint: "生成较慢，请耐心等待。",
    errNoImage: "当前页面未找到图片。若图片仍在加载，请稍等片刻再试，或刷新页面后重试。",
    errNoAnalysis: "请先分析图片再生成内容。",
    errNetwork: "网络错误，请检查网络后重试。",
    errLocalOrigin: "Ollama 拒绝了扩展的来源。请按设置页的说明设置 OLLAMA_ORIGINS 并重启 Ollama 后重试。",
    errLocalDown: "连不上本地模型服务。请确认 Ollama 已启动（ollama serve），并检查加速器/VPN 是否代理了 localhost。",
    errApi: "AI 请求失败，请检查 API Key 和模型是否正确。",
    errNotPinterest: "请先打开 Pinterest 创建 Pin 页面。",
    errFieldsNotFound: "未能在页面上找到 Pinterest 标题/描述输入框。",
    tagsInserted: "标签已添加到 Pinterest ✓",
    errNoKeywords: "本次未生成可用标签。",
    errTagFieldNotFound: "未能在页面上找到 Pinterest「标签话题」输入框。",
    altInserted: "Alt 文本已填入 ✓",
    errNoAlt: "本次未生成 Alt 文本。",
    errNoContent: "请先生成内容，再点 ↻ 按钮单独重新生成某个字段。",

    openSettings: "打开完整设置",
    resultPlaceholder: "点击生成，即可从图片一键生成 SEO 标题、描述、标签和替代文本。",
    descNeedsRefresh: "标题已填入 ✓  描述若空白，刷新页面即可",
    descOnlyNeedsRefresh: "描述已写入，若空白请刷新页面",
    targetAudience: "目标受众",
    keywords: "关键词",
    subject: "主体",
    productType: "产品类型",
    scene: "场景",
    style: "风格",
    tagline: "AI 驱动的 Pinterest 文案与 SEO",
    panelName: "PinMate",
    close: "关闭",
    openPanel: "打开面板",
    closePanel: "折叠面板",
    launcherTip: "打开 PinMate",
    dragHint: "拖动移动",
    popupHint: "打开 Pinterest 创建 Pin 页面，然后使用页面上的 PinMate 悬浮面板分析图片、生成内容。",
    refreshHint: "如果面板未出现，请刷新页面",
    openSettingsBtn: "打开设置",

    gettingStarted: "使用教程",
    usageGuide: "使用教程",
    viewFullGuide: "查看完整教程 →",
    // 教程正文（HTML），由 settings.js renderGuide() 注入，所以可以写标题/列表/行内 code。
    guideHtml: `
      <section class="guide-sec">
        <h4>① 先配好一个 AI 提供商</h4>
        <p>在「AI 配置」里选一家，填好服务地址 / 密钥 / 模型，点 <b>测试连接</b> 变成绿色「已连接」即可。模型必须支持图片输入（多模态）。</p>
        <div class="guide-kv"><div class="k">SiliconFlow</div><div class="v">密钥：siliconflow.cn 控制台 → API 密钥<br>地址：<code>https://api.siliconflow.cn/v1</code><br>模型：Qwen3-VL-8B-Instruct（中国大陆可直连）</div></div>
        <div class="guide-kv"><div class="k">OpenAI</div><div class="v">密钥：platform.openai.com → API keys<br>地址：<code>https://api.openai.com/v1</code><br>模型：gpt-4o-mini / gpt-4o</div></div>
        <div class="guide-kv"><div class="k">Gemini</div><div class="v">密钥：aistudio.google.com → Get API key<br>地址：<code>https://generativelanguage.googleapis.com/v1beta</code><br>模型：gemini-2.5-flash</div></div>
        <div class="guide-kv"><div class="k">自定义</div><div class="v">任何 OpenAI 兼容端点：填你自己的 <code>/v1</code> 地址、密钥和模型名（模型末项选「自定义」可手填）。</div></div>
      </section>

      <section class="guide-sec">
        <h4>② 本地 Ollama（图片不出本机）</h4>
        <ol class="guide-ol">
          <li>安装 Ollama 后拉一个视觉模型：<code>ollama pull qwen2.5vl:7b</code>（显存小就用 <code>qwen2.5vl:3b</code>）</li>
          <li>放行扩展来源：PowerShell 执行 <code>[Environment]::SetEnvironmentVariable('OLLAMA_ORIGINS','*','User')</code>，然后重启 Ollama</li>
          <li>提供商选「本地（Ollama / LM Studio）」，地址保持 <code>http://localhost:11434/v1</code>，模型选 <code>qwen2.5vl:7b</code>，点 <b>测试连接</b></li>
        </ol>
        <p class="guide-note">本地 7B 模型单次约 20–60 秒，扩展对本地端点超时放宽到 180 秒。报 403 是来源未放行；报「连不上」多为 Ollama 没启动，或加速器/VPN 代理了 localhost（把 localhost;127.0.0.1 加入不代理列表）。</p>
      </section>

      <section class="guide-sec">
        <h4>③ 在 Pinterest 上使用</h4>
        <ol class="guide-ol">
          <li>打开 Pinterest 的 <b>创建 Pin</b> 页面并选好图片，面板会出现在页面右侧</li>
          <li>点 <b>一键生成</b>：AI 看图后写出标题、描述、标签、替代文本</li>
          <li>点 <b>全部填入</b> 一次写进 Pinterest；或点每张卡片里的「插入 Pinterest」只填单项</li>
          <li>「标签」卡片点 <b>全部复制</b> 可一次性复制所有关键词</li>
        </ol>
      </section>

      <section class="guide-sec">
        <h4>④ 产品链接 / 联盟链接</h4>
        <ul class="guide-ul">
          <li>先在设置里打开「显示产品链接卡片」</li>
          <li>把商品链接粘进面板的链接框，点 <b>一键填入链接</b>：写入 Pinterest 的 Link 字段 + 添加产品 Tag</li>
          <li>可开「链接一粘进面板就自动填入」，省掉这次点击</li>
          <li>联盟链接可在设置里开「自动勾选 Affiliate link 声明」，添加 Tag 时自动勾上披露开关</li>
        </ul>
      </section>

      <section class="guide-sec">
        <h4>⑤ 面板上的其它开关</h4>
        <ul class="guide-ul">
          <li><b>生成结果后自动填入</b>：生成完直接写进 Pinterest</li>
          <li><b>换图或图片被移除时自动清空面板</b>：只清面板，不动你手填的字段</li>
          <li>面板右下角 <b>EN / 中文</b> 随时切换界面语言</li>
        </ul>
      </section>

      <section class="guide-sec">
        <h4>⑥ 常见问题</h4>
        <div class="guide-kv"><div class="k">Key 无效 / 401</div><div class="v">核对密钥是否复制完整、是否与所选提供商匹配</div></div>
        <div class="guide-kv"><div class="k">路径错误 / 404</div><div class="v">地址一般以 <code>/v1</code> 结尾（Gemini 用 <code>/v1beta</code>）</div></div>
        <div class="guide-kv"><div class="k">本地 403</div><div class="v">未设置 <code>OLLAMA_ORIGINS</code>，设置后需重启 Ollama</div></div>
        <div class="guide-kv"><div class="k">连不上本地服务</div><div class="v">确认 <code>ollama serve</code> 在跑；把 localhost 加入代理白名单</div></div>
        <div class="guide-kv"><div class="k">请求超时</div><div class="v">本地换小一号模型（3b），或改用云端提供商</div></div>
        <div class="guide-kv"><div class="k">找不到图片</div><div class="v">等图片加载完再点生成，或刷新页面</div></div>
      </section>

      <p class="guide-foot">密钥与设置只存在你的浏览器里；云端模式下图片会发送给所选服务商，本地模式下图片不出本机。</p>
    `,
    howToGetApiKey: "如何获取 API Key？",
    apiStep1Title: "选择服务商",
    apiStep1Desc: "在上方设置中选择 SiliconFlow（中国大陆可直连）或 OpenAI。",
    apiStep2Title: "获取 API Key",
    apiStep2Desc: "前往对应官网注册并创建一个 API Key。",
    apiStep3Title: "粘贴并测试",
    apiStep3Desc: "回到本页粘贴 Key 和模型，点击「测试连接」验证。",
    supportAuthor: "支持作者",
    supportTitle: "支持作者",
    supportSub: "用微信扫码请我喝杯咖啡 ☕",
    wechatCaption: "打开微信 → 点「+」→ 扫码支持",
    paypalCta: "用 PayPal 支持",

    modelsLabel: "模型列表",
    addModel: "添加",
    modelListHint: "点击模型将其设为当前使用，并可为该服务商指定默认模型。",
    noModels: "暂无模型，请在上方添加。",
    defaultTag: "默认",
    setDefault: "设为默认",
    deleteModel: "删除模型",
    setAsDefaultInterface: "设为默认接口",
    currentDefaultInterface: "当前默认接口",
    defaultInterfaceHint: "默认接口即 PinMate 生成内容时使用的服务商。",
    defaultInterfaceSet: "默认接口已保存。",
    modelNamePlaceholder: "输入模型名称，如 Qwen/Qwen3-VL-235B",
    modelPlaceholder: "如 Qwen/Qwen3-VL-235B",
    modelCustomOption: "自定义（手动输入）",
    modelPlaceholderCustom: "输入任意模型 ID，例如 my-private-model",

    productLinkSection: "产品链接",
    productLinkEnabled: "显示产品链接卡片，支持一键填入产品链接",
    autoFillLink: "链接一粘进面板就自动填入",
    autoFillLinkHint: "链接进入产品链接框约 1 秒后，自动执行「填入链接」与「添加产品 Tag」；同一个链接只自动执行一次，清空输入框后可再次自动执行。",
    affiliateDisclosure: "自动勾选 Affiliate link 声明",
    affiliateDisclosureHint: "添加产品 Tag 时自动勾选 Pinterest 的「Affiliate link or sponsored product」；仅当你确实可能因该商品获得佣金时才开启。",
    publishSection: "发布",
    scheduleLater: "自动打开「稍后发布」",
    scheduleLaterHint: "在创建 Pin 页面自动把 Pinterest 的「Publish at a later date / 稍后发布」打开，这样 Pin 会进入定时发布而不是立即发布。日期与时间由 Pinterest 预填（通常是明天中午），需要别的时段请在页面上自行调整。",
    productLinkPlaceholder: "粘贴本图的产品链接…",
    productLinkFill: "填入链接",
    productLinkAddProduct: "添加产品 Tag",
    productLinkFillAll: "一键填入链接",
    productLinkNoticeFilledAll: "链接已填入，产品已添加 ✓",
    productLinkNoticeFilled: "链接已填入 ✓",
    productLinkNoticeProduct: "已添加产品，正在搜索…",
    productLinkErrEmpty: "请先填写链接。",
    productLinkErrLinkField: "未能找到 Pinterest 链接输入框。",
    productLinkErrDialog: "未能打开「添加产品」对话框。",
    productLinkErrTab: "未能切换到对话框中的链接选项卡。",
    regenTitle: "重新生成标题",
    regenDescription: "重新生成描述",
    regenKeywords: "重新生成标签",
    regenAltText: "重新生成替代文本",
    regeneratingShort: "生成中…",
    altTextTruncated: "已自动截断至 500 字符（Pinterest 替代文本上限）",
    fieldsTruncated: "超出 Pinterest 上限，已自动截断：{fields}"
  }
};

let CURRENT_LANG = "en";

/**
 * Resolve initial UI language: saved preference > browser UI language > en.
 * Maps zh-CN/zh-TW/zh-Hans/zh-Hant -> zh; everything else -> en.
 */
function resolveInitialLang(savedLang) {
  if (savedLang && I18N[savedLang]) return savedLang;
  try {
    const uiLang = (chrome.i18n && typeof chrome.i18n.getUILanguage === "function")
      ? chrome.i18n.getUILanguage()
      : (navigator.language || navigator.userLanguage || "en");
    const tag = uiLang.toLowerCase().split("-")[0]; // "zh-cn" -> "zh"
    if (tag === "zh") return "zh";
  } catch (_) {}
  return "en";
}

function setLang(lang) {
  CURRENT_LANG = I18N[lang] ? lang : "en";
}

/** Translate a key for the current language. Supports {placeholder} substitution. */
function t(key, params) {
  const dict = I18N[CURRENT_LANG] || I18N.en;
  let str = dict[key] != null ? dict[key] : (I18N.en[key] != null ? I18N.en[key] : key);
  if (params) {
    for (const p in params) {
      str = str.replace(new RegExp("\\{" + p + "\\}", "g"), params[p]);
    }
  }
  return str;
}

/**
 * Apply translations to static HTML.
 * - [data-i18n]      -> textContent
 * - [data-i18n-ph]   -> placeholder attribute
 */
function applyStaticI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  root.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
  });
}
