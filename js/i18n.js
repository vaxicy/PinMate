/**
 * i18n.js — Runtime bilingual dictionary for PinMate.
 * All dynamic UI text MUST go through I18N so language toggling updates every region.
 * Static HTML uses data-i18n / data-i18n-ph attributes handled by applyStaticI18n().
 */
const I18N = {
  en: {
    aiReady: "AI Ready",
    aiNotConfigured: "API Key not set",

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
    regenTitle: "重新生成标题",
    regenDescription: "重新生成描述",
    regenKeywords: "重新生成标签",
    regenAltText: "重新生成替代文本",
    regeneratingShort: "…",
    regenTitle: "Regenerate title",
    regenDescription: "Regenerate description",
    regenKeywords: "Regenerate tags",
    regenAltText: "Regenerate alt text",
    regeneratingShort: "…",

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

    settings: "Settings",
    settingsTitle: "PinMate Settings",
    language: "Language",
    settingsInjectLabel: "Panel Visibility",
    settingsInjectFull: "All Pinterest pages",
    settingsInjectCreateOnly: "Only on Create Pin",
    aiConfiguration: "AI Configuration",
    apiProvider: "API Provider",
    providerSiliconflow: "SiliconFlow",
    providerOpenai: "OpenAI",
    providerCustom: "Custom / OpenAI Compatible",
    apiBaseUrl: "API Base URL",
    apiBaseUrlPlaceholder: "https://your-endpoint/v1",
    apiBaseUrlHint: "OpenAI-compatible endpoints usually end with /v1",
    apiKey: "API Key",
    apiKeyPlaceholder: "Enter your API Key",
    model: "Model",
    analysisLanguage: "Analysis Language",
    generationLanguage: "Generation Language",
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
    launcherTip: "Open PinMate",
    dragHint: "Drag to move",
    popupHint: "Open a Pinterest Create Pin page, then use the floating PinMate panel to analyze images and generate content.",
    refreshHint: "If panel doesn't appear, refresh the page",
    openSettingsBtn: "Open Settings",

    gettingStarted: "Getting Started",
    step1Title: "Open Pinterest Create Pin",
    step1Desc: "Go to the Pinterest Create Pin page with an image ready.",
    step2Title: "Set your API Key",
    step2Desc: "Choose a provider, enter your API Key & model, then test connection.",
    step3Title: "Generate & insert",
    step3Desc: "Click generate to analyze the image, then fill title & description into Pinterest.",
    usageGuide: "Usage Guide",
    viewFullGuide: "View full guide →",
    howToGetApiKey: "How to get API Key?",
    apiStep1Title: "Choose a provider",
    apiStep1Desc: "Pick SiliconFlow (recommended in China) or OpenAI in the settings above.",
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
    modelPlaceholder: "e.g. Qwen/Qwen3-VL-235B"
  },
  zh: {
    aiReady: "AI 就绪",
    aiNotConfigured: "未配置 API Key",

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

    settings: "设置",
    settingsTitle: "PinMate 设置",
    language: "语言",
    settingsInjectLabel: "面板显示范围",
    settingsInjectFull: "全站显示",
    settingsInjectCreateOnly: "仅创建 Pin 图时",
    aiConfiguration: "AI 配置",
    apiProvider: "API 提供商",
    providerSiliconflow: "硅基流动",
    providerOpenai: "OpenAI",
    providerCustom: "自定义 / OpenAI 兼容",
    apiBaseUrl: "API 地址",
    apiBaseUrlPlaceholder: "https://你的接口地址/v1",
    apiBaseUrlHint: "OpenAI 兼容接口通常以 /v1 结尾",
    apiKey: "API Key",
    apiKeyPlaceholder: "请输入你的 API Key",
    model: "模型",
    analysisLanguage: "分析语言",
    generationLanguage: "生成语言",
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
    launcherTip: "打开 PinMate",
    dragHint: "拖动移动",
    popupHint: "打开 Pinterest 创建 Pin 页面，然后使用页面上的 PinMate 悬浮面板分析图片、生成内容。",
    refreshHint: "如果面板未出现，请刷新页面",
    openSettingsBtn: "打开设置",

    gettingStarted: "使用教程",
    step1Title: "打开 Pinterest 创建 Pin",
    step1Desc: "进入 Pinterest 创建 Pin 页面，准备好一张图片。",
    step2Title: "填写 API Key",
    step2Desc: "选择服务商，填入 API Key 和模型，点击测试连接验证。",
    step3Title: "生成并填入",
    step3Desc: "点击生成分析图片，再一键把标题和描述填入 Pinterest。",
    usageGuide: "使用教程",
    viewFullGuide: "查看完整教程 →",
    howToGetApiKey: "如何获取 API Key？",
    apiStep1Title: "选择服务商",
    apiStep1Desc: "在上方设置中选择 SiliconFlow（国内推荐）或 OpenAI。",
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
    modelPlaceholder: "如 Qwen/Qwen3-VL-235B"
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
