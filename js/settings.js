/**
 * settings.js — PinMate options page controller.
 * Manages language, multi-provider API keys, per-provider model lists, and
 * the default interface. Everything is stored in chrome.storage.local.
 *
 * Storage shape (see storage.js):
 *   defaultProvider: "siliconflow"
 *   providers: { <name>: { apiKey, apiBase, models[], model, defaultModel } }
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
    modelList: document.getElementById("modelList"),
    newModel: document.getElementById("newModel"),
    addModelBtn: document.getElementById("addModelBtn"),
    defaultInterfaceBtn: document.getElementById("defaultInterfaceBtn"),
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
    custom: ""
  };

  let cfg = null;          // full config (defaultProvider + providers)
  let currentProvider = "siliconflow";
  let _noticeKey = null;
  let _saveTimer = null;
  let _saveBtnTimer = null;

  /** Debounced auto-save of a single provider field (apiKey / apiBase). */
  function autoSaveField(field) {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(async () => {
      const slot = cloneProvider(currentProvider);
      if (field === "apiKey") slot.apiKey = els.apiKey.value.trim();
      if (field === "apiBase") slot.apiBase = els.apiBase.value.trim() || PROVIDER_BASE[currentProvider] || "";
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
    els.keyToggle.textContent = els.apiKey.type === "password"
      ? (CURRENT_LANG === "zh" ? "显示" : "Show")
      : (CURRENT_LANG === "zh" ? "隐藏" : "Hide");
    setConn(els.connPill.classList.contains("off") ? false : true);
  }

  /** Read the current provider slot from the form into a provider object. */
  function readProviderSlot() {
    const slot = cloneProvider(currentProvider);
    slot.apiKey = els.apiKey.value.trim();
    slot.apiBase = els.apiBase.value.trim() || PROVIDER_BASE[currentProvider] || "";
    // Preserve the model list but ensure the field's model name is reflected.
    const fieldModel = els.newModel.dataset.currentModel || slot.model;
    slot.model = fieldModel;
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
        apiKey: s.apiKey || "",
        apiBase: s.apiBase || "",
        models: Array.isArray(s.models) ? s.models.slice() : [],
        model: s.model || "",
        defaultModel: s.defaultModel || ""
      };
    }
    return out;
  }

  function cloneProvider(name) {
    const s = (cfg.providers && cfg.providers[name]) || {};
    return {
      apiKey: s.apiKey || "",
      apiBase: s.apiBase || "",
      models: Array.isArray(s.models) ? s.models.slice() : [],
      model: s.model || "",
      defaultModel: s.defaultModel || ""
    };
  }

  /** Render the model list (chips with delete + default marker) for currentProvider. */
  function renderModelList() {
    const slot = cloneProvider(currentProvider);
    const list = els.modelList;
    list.innerHTML = "";
    if (!slot.models.length) {
      const empty = document.createElement("div");
      empty.className = "model-empty";
      empty.textContent = t("noModels");
      list.appendChild(empty);
    }
    slot.models.forEach((m) => {
      const row = document.createElement("div");
      row.className = "model-row";

      const name = document.createElement("span");
      name.className = "model-name";
      name.textContent = m;
      name.title = m;
      row.appendChild(name);

      if (m === slot.defaultModel) {
        const tag = document.createElement("span");
        tag.className = "model-default-tag";
        tag.textContent = t("defaultTag");
        row.appendChild(tag);
      } else {
        const setDef = document.createElement("button");
        setDef.type = "button";
        setDef.className = "model-set-default";
        setDef.textContent = t("setDefault");
        setDef.addEventListener("click", () => onSetModelDefault(m));
        row.appendChild(setDef);
      }

      const del = document.createElement("button");
      del.type = "button";
      del.className = "model-delete";
      del.textContent = "×";
      del.title = t("deleteModel");
      del.addEventListener("click", () => onDeleteModel(m));
      row.appendChild(del);

      // Clicking a row (not on a button) selects it as the active model.
      row.addEventListener("click", (e) => {
        if (e.target.tagName === "BUTTON") return;
        onSelectModel(m);
      });

      list.appendChild(row);
    });
    // mark which model is currently active (selected) in the field
    els.newModel.dataset.currentModel = slot.model;
    els.newModel.placeholder = slot.model || t("modelNamePlaceholder");
  }

  /** Persist ONLY the current provider's slot (leave other providers untouched). */
  function saveCurrentSlot(slot) {
    cfg.providers[currentProvider] = slot;
    return Storage.setConfig({ providers: { [currentProvider]: slot } });
  }

  function onSelectModel(m) {
    const slot = cloneProvider(currentProvider);
    slot.model = m;
    els.newModel.dataset.currentModel = m;
    renderModelList();
    flashSaveButton();
    saveCurrentSlot(slot);
  }

  function onSetModelDefault(m) {
    const slot = cloneProvider(currentProvider);
    slot.defaultModel = m;
    slot.model = m;
    els.newModel.dataset.currentModel = m;
    renderModelList();
    flashSaveButton();
    saveCurrentSlot(slot);
  }

  function onDeleteModel(m) {
    const slot = cloneProvider(currentProvider);
    slot.models = slot.models.filter((x) => x !== m);
    if (slot.model === m) slot.model = slot.models[0] || "";
    if (slot.defaultModel === m) slot.defaultModel = slot.model;
    renderModelList();
    flashSaveButton();
    saveCurrentSlot(slot);
  }

  async function onAddModel() {
    const val = els.newModel.value.trim();
    if (!val) return;
    const slot = cloneProvider(currentProvider);
    if (!slot.models.includes(val)) {
      slot.models.push(val);
      // If this is the first model, make it the default + active too.
      if (!slot.defaultModel) slot.defaultModel = val;
      if (!slot.model) slot.model = val;
    }
    slot.model = val;
    els.newModel.value = "";
    renderModelList();
    flashSaveButton();
    cfg = await saveCurrentSlot(slot);
  }

  /** Switch the visible provider: load its slot into the form. */
  function syncProvider() {
    currentProvider = els.providerSelect.value;
    const slot = cloneProvider(currentProvider);
    els.apiKey.value = slot.apiKey || "";
    els.apiBase.value = slot.apiBase || PROVIDER_BASE[currentProvider] || "";
    if (currentProvider !== "custom" && !slot.apiBase) {
      els.apiBase.value = PROVIDER_BASE[currentProvider] || "";
    }
    els.apiBaseField.style.display = (currentProvider === "custom") ? "block" : "none";
    renderModelList();
    // Persist the active provider selection immediately.
    Storage.setConfig({ defaultProvider: cfg.defaultProvider || currentProvider }).then((c) => { cfg = c; });
    updateDefaultInterfaceBtn();
  }

  function updateDefaultInterfaceBtn() {
    if (!els.defaultInterfaceBtn) return;
    const isDefault = (cfg.defaultProvider || "siliconflow") === currentProvider;
    els.defaultInterfaceBtn.textContent = isDefault ? t("currentDefaultInterface") : t("setAsDefaultInterface");
    els.defaultInterfaceBtn.disabled = isDefault;
    els.defaultInterfaceBtn.classList.toggle("is-default", isDefault);
  }

  async function onSetDefaultInterface() {
    cfg.defaultProvider = currentProvider;
    await Storage.setConfig({ defaultProvider: currentProvider });
    showNotice("defaultInterfaceSet", "ok");
    updateDefaultInterfaceBtn();
  }

  async function onSave() {
    cfg = await Storage.setConfig(readForm());
    showNotice("saved", "ok");
    flashSaveButton();
  }

  async function onTest() {
    const form = readForm();
    const slot = form.providers[currentProvider];
    if (!slot.apiKey) {
      return showNotice("errNoApiKey", "error");
    }
    // Save first so a successful test reflects persisted config.
    cfg = await Storage.setConfig(form);

    const old = els.btnTest.textContent;
    els.btnTest.disabled = true;
    els.btnTest.textContent = t("testing");
    try {
      await AI.testConnection(slot);
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
    updateDefaultInterfaceBtn();

    els.btnSave.addEventListener("click", onSave);
    els.btnTest.addEventListener("click", onTest);
    els.keyToggle.addEventListener("click", onToggleKey);
    els.langSelect.addEventListener("change", onLangChange);
    els.generationLangSelect.addEventListener("change", onGenLangChange);
    els.providerSelect.addEventListener("change", syncProvider);
    if (els.defaultInterfaceBtn) els.defaultInterfaceBtn.addEventListener("click", onSetDefaultInterface);
    if (els.addModelBtn) els.addModelBtn.addEventListener("click", onAddModel);

    // Per-field independent auto-save (LingoFlow style): each provider field
    // patches only its own slot, so editing the key never clobbers the base, etc.
    els.apiKey.addEventListener("input", () => autoSaveField("apiKey"));
    els.apiBase.addEventListener("input", () => autoSaveField("apiBase"));
    // newModel text is only committed via the Add button; no live auto-save.
    if (els.injectModeSelect) els.injectModeSelect.addEventListener("change", autoSaveInjectMode);

    initSupport();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
