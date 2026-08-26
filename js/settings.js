/**
 * settings.js — PinMate options page controller.
 * Manages language, multi-provider single API key, per-provider model,
 * and the active provider. Everything is stored in chrome.storage.local.
 *
 * Storage shape (see storage.js):
 *   defaultProvider: "siliconflow"
 *   providers: { <name>: { apiKey, apiBase, model } }
 */
(function () {
  const els = {
    notice: document.getElementById("notice"),
    langSelect: document.getElementById("langSelect"),
    providerSelect: document.getElementById("providerSelect"),
    apiBaseField: document.getElementById("apiBaseField"),
    apiBase: document.getElementById("apiBase"),
    apiKey: document.getElementById("apiKey"),
    apiKeyToggle: document.getElementById("apiKeyToggle"),
    modelCustom: document.getElementById("model-custom"),
    // Per-provider model select containers (one per provider, JS shows the active one).
    modelSelects: {},
    generationLangSelect: document.getElementById("generationLangSelect"),
    injectModeSelect: document.getElementById("injectModeSelect"),
    btnSave: document.getElementById("btnSave"),
    btnTest: document.getElementById("btnTest"),
    connPill: document.getElementById("connPill"),
    connText: document.getElementById("connText")
  };

  // Map provider name → its .pm-model-select container.
  document.querySelectorAll(".pm-model-select[data-provider]").forEach((wrap) => {
    els.modelSelects[wrap.dataset.provider] = wrap;
  });

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
  let _saveTimer = null;
  let _saveBtnTimer = null;

  /**
   * Build a fresh providers snapshot from the live UI for the given provider,
   * falling back to the stored value for every other provider. This guarantees
   * that an in-progress edit is committed and never silently clobbered by an
   * older `cfg` snapshot held in the closure.
   */
  function buildProvidersFromUI(activeProvider) {
    const next = cloneProviders();
    const slot = next[activeProvider];
    slot.apiKey = els.apiKey.value.trim();
    slot.apiBase = els.apiBase.value.trim() || PROVIDER_BASE[activeProvider] || "";
    slot.model = readModelFromUI(activeProvider);
    next[activeProvider] = slot;
    return next;
  }

  /** Debounced auto-save of a single provider field (apiKey / apiBase / model). */
  function autoSaveField(field) {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(async () => {
      cfg = await Storage.setConfig({ providers: buildProvidersFromUI(currentProvider) });
      flashSaveButton();
    }, 200);
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
    els.notice.textContent = isKey ? t(keyOrText) : keyOrText;
    els.notice.className = "notice show " + type;
    setTimeout(() => {
      els.notice.className = "notice";
    }, 2500);
  }

  function setConn(connected) {
    els.connPill.className = "status-pill" + (connected ? "" : " off");
    els.connText.textContent = connected ? t("statusConnected") : t("statusNotConnected");
  }

  function applyAll() {
    applyStaticI18n(document);
    setConn(els.connPill.classList.contains("off") ? false : true);
    // Re-render the model dropdown so its dynamic list items (e.g. the
    // "__custom__" sentinel row uses t("modelCustomOption")) reflect the
    // current CURRENT_LANG. renderModelSelect's `menu.dataset.populated`
    // guard takes the else branch and just refreshes text — no duplicate
    // event handlers, no DOM rebuild, selection preserved via aria-selected.
    renderModelSelect(currentProvider, readModelFromUI(currentProvider));
  }

  /**
   * Read the currently-selected model id from the UI for `provider`.
   *  - Preset pick → returns the preset's id (e.g. "Qwen/Qwen3-Omni-30B-A3B-Captioner")
   *  - Custom pick or value outside preset list → returns the free-form input value
   *
   * Operates entirely on the DOM (no closure state), so it's safe to call from
   * anywhere (applyAll, readForm, save handlers, etc.).
   */
  function readModelFromUI(provider) {
    const selected = _getSelectedPresetId(provider);
    if (selected === "__custom__") {
      return els.modelCustom.value.trim();
    }
    return selected || "";
  }

  /**
   * Get the preset id currently highlighted in the dropdown for `provider`.
   * Returns "__custom__" if the user picked the custom option (or the stored
   * value doesn't match any preset). Returns "" if the menu hasn't been rendered yet.
   */
  function _getSelectedPresetId(provider) {
    const wrap = els.modelSelects[provider];
    if (!wrap) return "";
    const li = wrap.querySelector(".pm-model-select-menu li[aria-selected='true']");
    if (!li) {
      // Fallback to the trigger's data-id (set when an option is clicked).
      const t = wrap.querySelector(".pm-model-select-trigger");
      return t && t.dataset.id ? t.dataset.id : "";
    }
    return li.dataset.id || "";
  }

  /** Read the current provider slot from the form into a provider object. */
  function readProviderSlot() {
    const slot = cloneProvider(currentProvider);
    slot.apiKey = els.apiKey.value.trim();
    slot.apiBase = els.apiBase.value.trim() || PROVIDER_BASE[currentProvider] || "";
    slot.model = readModelFromUI(currentProvider);
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
        apiKey: typeof s.apiKey === "string" ? s.apiKey : "",
        apiBase: s.apiBase || "",
        model: s.model || ""
      };
    }
    return out;
  }

  function cloneProvider(name) {
    const s = (cfg.providers && cfg.providers[name]) || {};
    return {
      apiKey: typeof s.apiKey === "string" ? s.apiKey : "",
      apiBase: s.apiBase || "",
      model: s.model || ""
    };
  }

  /** Switch the visible provider: flush current edits, then load the next slot. */
  async function syncProvider() {
    const prev = currentProvider;
    currentProvider = els.providerSelect.value;

    // Flush any pending edit in the slot we are leaving (e.g. the user typed a
    // key but the 500ms auto-save debounce hasn't fired yet) before we reload
    // the form with the next provider's data — otherwise those edits are lost.
    if (prev !== currentProvider) {
      cfg = await Storage.setConfig({
        providers: buildProvidersFromUI(prev),
        defaultProvider: currentProvider
      });
    } else {
      // Same provider (e.g. re-entrancy) — just persist the selection.
      cfg = await Storage.setConfig({ defaultProvider: currentProvider });
    }

    const slot = cloneProvider(currentProvider);
    els.apiKey.value = slot.apiKey || "";
    els.apiBase.value = slot.apiBase || PROVIDER_BASE[currentProvider] || "";
    if (currentProvider !== "custom" && !slot.apiBase) {
      els.apiBase.value = PROVIDER_BASE[currentProvider] || "";
    }
    els.apiBaseField.style.display = (currentProvider === "custom") ? "block" : "none";
    renderModelSelect(currentProvider, slot.model || "");
  }

  /**
   * Render the model dropdown for the active provider and reflect the stored
   * model id. Behaviour:
   *   - Show the matching provider's `.pm-model-select`, hide the others.
   *   - Populate its menu from AI.VISION_MODEL_PRESETS[provider].
   *   - If `storedModel` matches a preset exactly → select that preset, hide custom input.
   *   - Otherwise → select "__custom__", show custom input, fill it with `storedModel`.
   *   - Set up click + keyboard + outside-click handlers (lazy init).
   */
  function renderModelSelect(provider, storedModel) {
    const presets = AI.VISION_MODEL_PRESETS[provider] || AI.VISION_MODEL_PRESETS.custom;

    // Show only the active provider's container.
    Object.entries(els.modelSelects).forEach(([p, wrap]) => {
      wrap.hidden = (p !== provider);
    });

    const wrap = els.modelSelects[provider];
    if (!wrap) return;
    const trigger = wrap.querySelector(".pm-model-select-trigger");
    const triggerText = wrap.querySelector(".pm-model-select-text");
    const menu = wrap.querySelector(".pm-model-select-menu");

    // Lazily populate menu items (only once per provider).
    if (!menu.dataset.populated) {
      const frag = document.createDocumentFragment();
      presets.forEach((opt) => {
        const li = document.createElement("li");
        li.dataset.id = opt.id;
        li.setAttribute("role", "option");
        li.textContent = opt.id === "__custom__" ? t("modelCustomOption") : opt.id;
        li.tabIndex = 0;
        frag.appendChild(li);
      });
      menu.appendChild(frag);
      menu.dataset.populated = "1";

      // Close menu when clicking outside.
      document.addEventListener("click", (e) => {
        if (!wrap.contains(e.target)) _closeMenu(wrap);
      });
      // Close on Escape.
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") _closeMenu(wrap);
      });
    } else {
      // Refresh item text (in case presets changed between provider switches — rare).
      const items = menu.querySelectorAll("li");
      presets.forEach((opt, idx) => {
        const li = items[idx];
        if (!li) return;
        li.dataset.id = opt.id;
        li.textContent = opt.id === "__custom__" ? t("modelCustomOption") : opt.id;
      });
      // Trim if the list shrank.
      while (items.length > presets.length) {
        items[items.length - 1].remove();
      }
    }

    // Decide initial selection: exact preset match vs custom.
    const matched = presets.find((p) => p.id === storedModel);
    const useCustom = !matched || storedModel === "__custom__";

    if (useCustom) {
      _selectItem(wrap, "__custom__", storedModel);
    } else {
      _selectItem(wrap, matched.id, matched.id);
    }

    // Wire click / keyboard only once (use a guard to avoid duplicate handlers on re-render).
    if (!wrap.dataset.wired) {
      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        _toggleMenu(wrap);
      });
      menu.addEventListener("click", (e) => {
        const li = e.target.closest("li");
        if (!li) return;
        _selectItem(wrap, li.dataset.id, li.textContent);
        _closeMenu(wrap);
        // Persist immediately so users don't lose their pick.
        autoSaveField("model");
      });
      menu.addEventListener("keydown", (e) => {
        const li = e.target.closest("li");
        if (!li) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          _selectItem(wrap, li.dataset.id, li.textContent);
          _closeMenu(wrap);
          autoSaveField("model");
        } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const items = Array.from(menu.querySelectorAll("li"));
          const idx = items.indexOf(li);
          const next = e.key === "ArrowDown" ? items[idx + 1] : items[idx - 1];
          if (next) next.focus();
        }
      });
      // Custom free-form input → debounced auto-save.
      els.modelCustom.addEventListener("input", () => autoSaveField("model"));
      wrap.dataset.wired = "1";
    }
  }

  function _openMenu(wrap) {
    const menu = wrap.querySelector(".pm-model-select-menu");
    const trigger = wrap.querySelector(".pm-model-select-trigger");
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    // Focus the selected item for keyboard users.
    const sel = wrap.querySelector(".pm-model-select-menu li[aria-selected='true']");
    if (sel) requestAnimationFrame(() => sel.focus());
  }
  function _closeMenu(wrap) {
    const menu = wrap.querySelector(".pm-model-select-menu");
    const trigger = wrap.querySelector(".pm-model-select-trigger");
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }
  function _toggleMenu(wrap) {
    const menu = wrap.querySelector(".pm-model-select-menu");
    if (menu.hidden) _openMenu(wrap);
    else _closeMenu(wrap);
  }

  /** Visually mark `id` as selected, update trigger label, and toggle the custom input. */
  function _selectItem(wrap, id, triggerLabel) {
    const menu = wrap.querySelector(".pm-model-select-menu");
    const trigger = wrap.querySelector(".pm-model-select-trigger");
    const triggerText = wrap.querySelector(".pm-model-select-text");
    menu.querySelectorAll("li").forEach((li) => {
      li.setAttribute("aria-selected", li.dataset.id === id ? "true" : "false");
    });
    trigger.dataset.id = id;

    if (id === "__custom__") {
      triggerText.textContent = _presetLabelById(wrap, "__custom__") || t("modelCustomOption");
      els.modelCustom.hidden = false;
      // If the triggerLabel came from a stored-value fallback, populate the input.
      // (Only happens via renderModelSelect's custom branch.)
      if (triggerLabel && triggerLabel !== t("modelCustomOption")) {
        els.modelCustom.value = triggerLabel;
      }
    } else {
      triggerText.textContent = triggerLabel || _presetLabelById(wrap, id) || id;
      els.modelCustom.hidden = true;
    }
  }
  function _presetLabelById(wrap, id) {
    const li = wrap.querySelector(`.pm-model-select-menu li[data-id="${CSS.escape(id)}"]`);
    if (!li) return "";
    return id === "__custom__" ? t("modelCustomOption") : li.textContent;
  }

  async function onSave() {
    cfg = await Storage.setConfig(readForm());
    showNotice("saved", "ok");
    flashSaveButton();
  }

  async function onTest() {
    const form = readForm();
    const slot = Object.assign({}, form.providers[currentProvider], { provider: currentProvider });
    if (!slot.apiKey) {
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

  function toggleApiKeyVisibility() {
    if (!els.apiKey || !els.apiKeyToggle) return;
    const showing = els.apiKey.type === "text";
    els.apiKey.type = showing ? "password" : "text";
    els.apiKeyToggle.textContent = showing
      ? (CURRENT_LANG === "zh" ? "显示" : "Show")
      : (CURRENT_LANG === "zh" ? "隐藏" : "Hide");
  }

  async function onLangChange() {
    setLang(els.langSelect.value);
    cfg = await Storage.setConfig({ lang: els.langSelect.value });
    applyAll();
    if (els.apiKeyToggle) {
      const showing = els.apiKey && els.apiKey.type === "text";
      els.apiKeyToggle.textContent = showing
        ? (CURRENT_LANG === "zh" ? "隐藏" : "Hide")
        : (CURRENT_LANG === "zh" ? "显示" : "Show");
    }
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
    if (els.apiKeyToggle) els.apiKeyToggle.addEventListener("click", toggleApiKeyVisibility);
    els.langSelect.addEventListener("change", onLangChange);
    els.generationLangSelect.addEventListener("change", onGenLangChange);
    els.providerSelect.addEventListener("change", syncProvider);

    // Per-field independent auto-save: each provider field patches only its own
    // slot, so editing the key never clobbers the base, etc.
    if (els.apiKey) els.apiKey.addEventListener("input", () => autoSaveField("apiKey"));
    els.apiBase.addEventListener("input", () => autoSaveField("apiBase"));
    // The model custom free-form input's "input" listener is wired lazily inside
    // renderModelSelect so it only fires while the custom input is actually visible.
    if (els.injectModeSelect) els.injectModeSelect.addEventListener("change", autoSaveInjectMode);

    initSupport();
  }

  document.addEventListener("DOMContentLoaded", init);
})();