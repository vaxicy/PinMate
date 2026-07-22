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
    oneClickGenerate: "Generate Title & Description",
    analyzing: "Analyzing image...",
    generating: "Generating content...",
    oneClickGenerating: "Generating title & description...",

    analysisTitle: "Image Analysis",
    titleCard: "Pinterest Title",
    descriptionCard: "Pinterest Description",

    copy: "Copy",
    copied: "Copied!",
    insertToPinterest: "Insert to Pinterest",
    insertAll: "Fill All",
    insertTitleOnly: "Title",
    insertDescOnly: "Description",
    inserted: "Inserted!",
    clear: "Clear",
    cleared: "Cleared!",

    settings: "Settings",
    settingsTitle: "PinMate Settings",
    language: "Language",
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
    testConnection: "Test Connection",
    testing: "Testing...",

    statusConnected: "Connected",
    statusNotConnected: "Not Connected",

    errNoApiKey: "Please set your API Key in Settings first.",
    errNoImage: "No image found on the current page. Open a Pinterest Pin page with an image.",
    errNoAnalysis: "Please analyze an image before generating content.",
    errNetwork: "Network error. Please check your connection and try again.",
    errApi: "AI request failed. Please verify your API Key and model.",
    errNotPinterest: "Please open the Pinterest Create Pin page first.",
    errFieldsNotFound: "Could not find Pinterest title/description fields on the page.",

    openSettings: "Open full settings",
    resultPlaceholder: "Click Generate to create SEO title & description from the image.",
    targetAudience: "Target audience",
    keywords: "Keywords",
    subject: "Subject",
    productType: "Product type",
    scene: "Scene",
    style: "Style",
    tagline: "AI Pinterest Assistant",
    close: "Close",
    launcherTip: "Open PinMate",
    dragHint: "Drag to move",
    popupHint: "Open a Pinterest Create Pin page, then use the floating PinMate panel to analyze images and generate content.",
    openSettingsBtn: "Open Settings"
  },
  zh: {
    aiReady: "AI 就绪",
    aiNotConfigured: "未配置 API Key",

    analyzeImage: "分析图片",
    generateContent: "生成内容",
    oneClickGenerate: "一键生成标题描述",
    analyzing: "正在分析图片…",
    generating: "正在生成内容…",
    oneClickGenerating: "正在生成标题描述…",

    analysisTitle: "图片分析",
    titleCard: "Pinterest 标题",
    descriptionCard: "Pinterest 描述",

    copy: "复制",
    copied: "已复制！",
    insertToPinterest: "填入 Pinterest",
    insertAll: "全部填入",
    insertTitleOnly: "仅标题",
    insertDescOnly: "仅描述",
    inserted: "已填入！",
    clear: "清空",
    cleared: "已清空！",

    settings: "设置",
    settingsTitle: "PinMate 设置",
    language: "语言",
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
    testConnection: "测试连接",
    testing: "测试中…",

    statusConnected: "已连接",
    statusNotConnected: "未连接",

    errNoApiKey: "请先在设置中填写你的 API Key。",
    errNoImage: "当前页面未找到图片。请打开带图片的 Pinterest Pin 页面。",
    errNoAnalysis: "请先分析图片再生成内容。",
    errNetwork: "网络错误，请检查网络后重试。",
    errApi: "AI 请求失败，请检查 API Key 和模型是否正确。",
    errNotPinterest: "请先打开 Pinterest 创建 Pin 页面。",
    errFieldsNotFound: "未能在页面上找到 Pinterest 标题/描述输入框。",

    openSettings: "打开完整设置",
    resultPlaceholder: "点击生成，即可从图片一键生成 SEO 标题与描述。",
    targetAudience: "目标受众",
    keywords: "关键词",
    subject: "主体",
    productType: "产品类型",
    scene: "场景",
    style: "风格",
    tagline: "AI Pinterest 助手",
    close: "关闭",
    launcherTip: "打开 PinMate",
    dragHint: "拖动移动",
    popupHint: "打开 Pinterest 创建 Pin 页面，然后使用页面上的 PinMate 悬浮面板分析图片、生成内容。",
    openSettingsBtn: "打开设置"
  }
};

let CURRENT_LANG = "en";

function setLang(lang) {
  CURRENT_LANG = I18N[lang] ? lang : "en";
}

/** Translate a key for the current language. */
function t(key) {
  const dict = I18N[CURRENT_LANG] || I18N.en;
  return dict[key] != null ? dict[key] : (I18N.en[key] != null ? I18N.en[key] : key);
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
