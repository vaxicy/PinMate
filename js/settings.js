/**
 * settings.js — PinMate options page controller.
 * Manages language, API key, and models. Everything is stored in chrome.storage.local.
 */
(function () {
  const els = {
    notice: document.getElementById("notice"),
    langSelect: document.getElementById("langSelect"),
    providerSelect: document.getElementById("providerSelect"),
    apiBaseField: document.getElementById("apiBaseField"),
    apiBase: document.getElementById("apiBase"),
    apiKey: document.getElementById("apiKey"),
    keyToggle: document.getElementById("keyToggle"),
    model: document.getElementById("model"),
    generationLangSelect: document.getElementById("generationLangSelect"),
    btnSave: document.getElementById("btnSave"),
    btnTest: document.getElementById("btnTest"),
    connPill: document.getElementById("connPill"),
    connText: document.getElementById("connText")
  };

  // External links used by the support / guide UI.
  const SUPPORT = {
    paypalUrl: "https://www.paypal.com/ncp/payment/WVD4GLTERHKNQ"
  };

  // Preset endpoints + default models per provider. Custom uses a user-supplied base.
  const PROVIDER_BASE = {
    siliconflow: "https://api.siliconflow.cn/v1",
    openai: "https://api.openai.com/v1",
    custom: ""
  };
  const PROVIDER_MODEL = {
    siliconflow: "Qwen/Qwen3-Omni-30B-A3B-Captioner",
    openai: "gpt-4o-mini",
    custom: ""
  };

  let cfg = null;
  let _noticeKey = null;

  function showNotice(keyOrText, type = "ok") {
    const isKey = I18N.en[keyOrText] != null || (I18N.zh && I18N.zh[keyOrText] != null);
    _noticeKey = isKey ? keyOrText : null;
    els.notice.textContent = isKey ? t(keyOrText) : keyOrText;
    els.notice.className = "notice show " + type;
    setTimeout(() => {
      els.notice.className = "notice";
      _noticeKey = null;
    }, 2500);
  }

  function setConn(connected) {
    els.connPill.className = "status-pill" + (connected ? "" : " off");
    els.connText.textContent = connected ? t("statusConnected") : t("statusNotConnected");
  }

  function applyAll() {
    applyStaticI18n(document);
    // Modal is inside document body, so applyStaticI18n already covers it.
    // But also refresh dynamic text (key toggle label, connection status).
    els.keyToggle.textContent = els.apiKey.type === "password"
      ? (CURRENT_LANG === "zh" ? "显示" : "Show")
      : (CURRENT_LANG === "zh" ? "隐藏" : "Hide");
    // keep current connection label localized
    setConn(els.connPill.classList.contains("off") ? false : true);
  }

  function readForm() {
    const provider = els.providerSelect.value;
    return {
      lang: els.langSelect.value,
      provider: provider,
      apiBase: els.apiBase.value.trim() || PROVIDER_BASE[provider] || DEFAULT_CONFIG.apiBase,
      apiKey: els.apiKey.value.trim(),
      model: els.model.value.trim() || DEFAULT_CONFIG.model,
      generationLang: els.generationLangSelect.value
    };
  }

  /** Reflect provider selection: show base URL only for custom, auto-fill presets. */
  function syncProvider() {
    const p = els.providerSelect.value;
    if (p === "custom") {
      els.apiBaseField.style.display = "block";
    } else {
      els.apiBaseField.style.display = "none";
      els.apiBase.value = PROVIDER_BASE[p] || "";
      // Always suggest a sensible default for preset providers
      if (PROVIDER_MODEL[p]) els.model.value = PROVIDER_MODEL[p];
    }
  }

  async function onSave() {
    cfg = await Storage.setConfig(readForm());
    showNotice("saved", "ok");
  }

  async function onTest() {
    const form = readForm();
    if (!form.apiKey) {
      return showNotice("errNoApiKey", "error");
    }
    // Save first so a successful test reflects persisted config.
    cfg = await Storage.setConfig(form);

    const old = els.btnTest.textContent;
    els.btnTest.disabled = true;
    els.btnTest.textContent = t("testing");
    try {
      await AI.testConnection(cfg);
      setConn(true);
      showNotice("statusConnected", "ok");
    } catch (err) {
      setConn(false);
      showNotice(AI.errorKey(err), "error");
    } finally {
      els.btnTest.disabled = false;
      els.btnTest.textContent = old;
    }
  }

  function onToggleKey() {
    els.apiKey.type = els.apiKey.type === "password" ? "text" : "password";
    els.keyToggle.textContent = els.apiKey.type === "password"
      ? (CURRENT_LANG === "zh" ? "显示" : "Show")
      : (CURRENT_LANG === "zh" ? "隐藏" : "Hide");
  }

  async function onLangChange() {
    setLang(els.langSelect.value);
    cfg = await Storage.setConfig({ lang: els.langSelect.value });
    applyAll();
  }

  async function onGenLangChange() {
    cfg = await Storage.setConfig({ generationLang: els.generationLangSelect.value });
  }

  function initSupport() {
    const paypalBtn = document.getElementById("paypalBtn");
    if (paypalBtn) paypalBtn.href = SUPPORT.paypalUrl;

    const guideLink = document.getElementById("apiKeyGuide");
    const apiLink = document.getElementById("apiGuide");
    const supportLink = document.getElementById("supportAuthor");
    const guideModal = document.getElementById("guideModal");
    const apiModal = document.getElementById("apiModal");
    const supportModal = document.getElementById("supportModal");

    function bindModal(link, modal) {
      if (!link || !modal) return;
      const close = modal.querySelector(".modal-close");
      link.addEventListener("click", (e) => { e.preventDefault(); modal.classList.add("show"); });
      if (close) close.addEventListener("click", () => modal.classList.remove("show"));
      modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("show"); });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("show")) modal.classList.remove("show");
      });
    }

    bindModal(guideLink, guideModal);
    bindModal(apiLink, apiModal);
    bindModal(supportLink, supportModal);
  }

  async function init() {
    cfg = await Storage.getConfig();
    const lang = resolveInitialLang(cfg.lang);
    setLang(lang);
    // Persist auto-detected language
    if (!cfg.lang) { cfg.lang = lang; await Storage.setConfig({ lang }); }
    document.documentElement.lang = CURRENT_LANG;

    els.langSelect.value = lang;
    els.providerSelect.value = cfg.provider || "siliconflow";
    els.apiBase.value = cfg.apiBase || PROVIDER_BASE[cfg.provider || "siliconflow"] || "";
    els.apiKey.value = cfg.apiKey || "";
    els.model.value = cfg.model || "";
    els.generationLangSelect.value = cfg.generationLang || "en";

    setConn(false);
    syncProvider();
    applyAll();

    els.btnSave.addEventListener("click", onSave);
    els.btnTest.addEventListener("click", onTest);
    els.keyToggle.addEventListener("click", onToggleKey);
    els.langSelect.addEventListener("change", onLangChange);
    els.generationLangSelect.addEventListener("change", onGenLangChange);
    els.providerSelect.addEventListener("change", syncProvider);
    initSupport();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
