/**
 * settings.js — PinMate options page controller.
 * Manages language, multi-provider API keys (with multi-key rotation), per-provider
 * model, and the active provider. Everything is stored in chrome.storage.local.
 *
 * Storage shape (see storage.js):
 *   defaultProvider: "siliconflow"
 *   providers: { <name>: { apiKeys: string[], apiBase, model } }
 */
(function () {
  const els = {
    notice: document.getElementById("notice"),
    langSelect: document.getElementById("langSelect"),
    providerSelect: document.getElementById("providerSelect"),
    apiBaseField: document.getElementById("apiBaseField"),
    apiBase: document.getElementById("apiBase"),
    apiKeysList: document.getElementById("apiKeysList"),
    addKeyBtn: document.getElementById("addKeyBtn"),
    model: document.getElementById("model"),
    generationLangSelect: document.getElementById("generationLangSelect"),
    injectModeSelect: document.getElementById("injectModeSelect"),
    btnSave: document.getElementById("btnSave"),
    btnTest: document.getElementById("btnTest"),
    connPill: document.getElementById("connPill"),
    connText: document.getElementById("connText")
  };

  // External links used by the support / guide UI.
  const SUPPORT = {
    paypalUrl: "https://www.paypal.com/ncp/payment/WVD4GLTERHKNQ"
  };

  // Preset endpoints per provider. Custom uses a user-supplied base.
  const PROVIDER_BASE = {
    siliconflow: "https://api.siliconflow.cn/v1",
    openai: "https://api.openai.com/v1",
    gemini: "https://generativelanguage.googleapis.com/v1beta",
    custom: ""
  };

  let cfg = null;          // full config (defaultProvider + providers)
  let currentProvider = "siliconflow";
  let _noticeKey = null;
  let _saveTimer = null;
  let _saveBtnTimer = null;

  /** Read current provider slot's apiKeys from the DOM (array of trimmed strings). */
  function readApiKeysFromDom() {
    const inputs = els.apiKeysList.querySelectorAll("input.key-input");
    const keys = [];
    inputs.forEach((inp) => {
      const v = inp.value.trim();
      if (v) keys.push(v);
    });
    // Always keep at least one slot so the UI never loses the editable row.
    if (!keys.length) keys.push("");
    return keys;
  }

  /** Render the multi-key rows for the current provider slot. */
  function renderApiKeys(slot) {
    const keys = Array.isArray(slot.apiKeys) && slot.apiKeys.length
      ? slot.apiKeys.map((k) => String(k))
      : [""];
    els.apiKeysList.innerHTML = "";
    keys.forEach((k, idx) => {
      const row = document.createElement("div");
      row.className = "key-row";
      const input = document.createElement("input");
      input.type = "password";
      input.className = "input key-input";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.placeholder = "sk-... / AIza...";
      input.value = k;
      input.addEventListener("input", () => autoSaveField("apiKeys"));
      row.appendChild(input);

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "key-toggle";
      toggle.textContent = (CURRENT_LANG === "zh") ? "显示" : "Show";
      toggle.addEventListener("click", () => {
        input.type = input.type === "password" ? "text" : "password";
        toggle.textContent = input.type === "password"
          ? (CURRENT_LANG === "zh" ? "显示" : "Show")
          : (CURRENT_LANG === "zh" ? "隐藏" : "Hide");
      });
      row.appendChild(toggle);

      if (keys.length > 1) {
        const del = document.createElement("button");
        del.type = "button";
        del.className = "key-remove";
        del.textContent = "✕";
        del.title = (CURRENT_LANG === "zh") ? "删除此 Key" : "Remove this key";
        del.addEventListener("click", () => {
          const cur = readApiKeysFromDom();
          // remove the idx-th non-empty-preserving entry
          cur.splice(idx, 1);
          const merged = cloneProvider(currentProvider);
          merged.apiKeys = (cur.length ? cur : [""]);
          cfg.providers[currentProvider] = merged;
          renderApiKeys(merged);
          Storage.setConfig({ providers: cloneProviders() }).then((c) => { cfg = c; });
        });
        row.appendChild(del);
      }
      els.apiKeysList.appendChild(row);
    });
  }

  /** Debounced auto-save of a single provider field (apiKeys / apiBase / model). */
  function autoSaveField(field) {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(async () => {
      const slot = cloneProvider(currentProvider);
      if (field === "apiKeys") slot.apiKeys = readApiKeysFromDom();
      if (field === "apiBase") slot.apiBase = els.apiBase.value.trim() || PROVIDER_BASE[currentProvider] || "";
      if (field === "model") slot.model = els.model.value.trim();
      cfg.providers[currentProvider] = slot;
      cfg = await Storage.setConfig({ providers: cloneProviders() });
      flashSaveButton();
    }, 500);
  }

  /** Briefly show "Saved" / "已保存" on the Save button after an auto-save. */
  function flashSaveButton() {
    const original = I18N[CURRENT_LANG].save;
    els.btnSave.textContent = t("savedShort");
    clearTimeout(_saveBtnTimer);
    _saveBtnTimer = setTimeout(() => {
      els.btnSave.textContent = original;
    }, 2500);
  }

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
    setConn(els.connPill.classList.contains("off") ? false : true);
  }

  /** Read the current provider slot from the form into a provider object. */
  function readProviderSlot() {
    const slot = cloneProvider(currentProvider);
    slot.apiKeys = readApiKeysFromDom();
    slot.apiBase = els.apiBase.value.trim() || PROVIDER_BASE[currentProvider] || "";
    slot.model = els.model.value.trim();
    return slot;
  }

  function readForm() {
    const providers = cloneProviders();
    providers[currentProvider] = readProviderSlot();
    return {
      lang: els.langSelect.value,
      defaultProvider: cfg.defaultProvider || currentProvider,
      providers: providers,
      generationLang: els.generationLangSelect.value,
      injectMode: els.injectModeSelect ? els.injectModeSelect.value : "full"
    };
  }

  function cloneProviders() {
    const out = {};
    for (const p of Storage.PROVIDERS) {
      const s = (cfg.providers && cfg.providers[p]) || {};
      out[p] = {
        apiKeys: Array.isArray(s.apiKeys) ? s.apiKeys.map(String) : [""],
        apiBase: s.apiBase || "",
        model: s.model || ""
      };
    }
    return out;
  }

  function cloneProvider(name) {
    const s = (cfg.providers && cfg.providers[name]) || {};
    return {
      apiKeys: Array.isArray(s.apiKeys) ? s.apiKeys.map(String) : [""],
      apiBase: s.apiBase || "",
      model: s.model || ""
    };
  }

  /** Switch the visible provider: load its slot into the form. */
  function syncProvider() {
    currentProvider = els.providerSelect.value;
    const slot = cloneProvider(currentProvider);
    renderApiKeys(slot);
    els.apiBase.value = slot.apiBase || PROVIDER_BASE[currentProvider] || "";
    if (currentProvider !== "custom" && !slot.apiBase) {
      els.apiBase.value = PROVIDER_BASE[currentProvider] || "";
    }
    els.apiBaseField.style.display = (currentProvider === "custom") ? "block" : "none";
    els.model.value = slot.model || "";
    // Persist the active provider selection immediately.
    Storage.setConfig({ defaultProvider: cfg.defaultProvider || currentProvider }).then((c) => { cfg = c; });
  }

  async function onSave() {
    cfg = await Storage.setConfig(readForm());
    showNotice("saved", "ok");
    flashSaveButton();
  }

  async function onTest() {
    const form = readForm();
    const slot = form.providers[currentProvider];
    if (!slot.apiKeys || !slot.apiKeys.some((k) => k && k.trim())) {
      return showNotice("errNoApiKey", "error");
    }
    // Save first so a successful test reflects persisted config.
    cfg = await Storage.setConfig(form);

    const old = els.btnTest.textContent;
    els.btnTest.disabled = true;
    els.btnTest.textContent = t("testing");
    try {
      const result = await AI.testConnection(slot);
      setConn(true);
      if (result.hasModel === false) {
        // Connected, but the chosen model id isn't on this endpoint's list.
        showNotice("statusModelMissing", "warn");
      } else {
        showNotice("statusConnected", "ok");
      }
    } catch (err) {
      setConn(false);
      showNotice(AI.errorKey(err), "error");
    } finally {
      els.btnTest.disabled = false;
      els.btnTest.textContent = old;
    }
  }

  async function onAddKey() {
    const cur = readApiKeysFromDom();
    cur.push("");
    const merged = cloneProvider(currentProvider);
    merged.apiKeys = cur;
    cfg.providers[currentProvider] = merged;
    renderApiKeys(merged);
    Storage.setConfig({ providers: cloneProviders() }).then((c) => { cfg = c; });
    // Focus the newly added input.
    const inputs = els.apiKeysList.querySelectorAll("input.key-input");
    if (inputs.length) inputs[inputs.length - 1].focus();
  }

  async function onLangChange() {
    setLang(els.langSelect.value);
    cfg = await Storage.setConfig({ lang: els.langSelect.value });
    applyAll();
  }

  async function onGenLangChange() {
    cfg = await Storage.setConfig({ generationLang: els.generationLangSelect.value });
  }

  async function autoSaveInjectMode() {
    cfg = await Storage.setConfig({ injectMode: els.injectModeSelect.value });
    flashSaveButton();
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
    currentProvider = cfg.defaultProvider || "siliconflow";
    const lang = resolveInitialLang(cfg.lang);
    setLang(lang);
    if (!cfg.lang) { cfg.lang = lang; await Storage.setConfig({ lang }); }
    document.documentElement.lang = CURRENT_LANG;

    els.langSelect.value = lang;
    els.providerSelect.value = currentProvider;
    els.generationLangSelect.value = cfg.generationLang || "en";
    if (els.injectModeSelect) els.injectModeSelect.value = cfg.injectMode || "full";

    syncProvider();
    setConn(false);
    applyAll();

    els.btnSave.addEventListener("click", onSave);
    els.btnTest.addEventListener("click", onTest);
    els.addKeyBtn.addEventListener("click", onAddKey);
    els.langSelect.addEventListener("change", onLangChange);
    els.generationLangSelect.addEventListener("change", onGenLangChange);
    els.providerSelect.addEventListener("change", syncProvider);

    // Per-field independent auto-save (LingoFlow style): each provider field
    // patches only its own slot, so editing the key never clobbers the base, etc.
    els.apiBase.addEventListener("input", () => autoSaveField("apiBase"));
    els.model.addEventListener("input", () => autoSaveField("model"));
    if (els.injectModeSelect) els.injectModeSelect.addEventListener("change", autoSaveInjectMode);

    initSupport();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
