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
    // Key-pool (multi-key) UI.
    apiKeysList: document.getElementById("apiKeysList"),
    apiKeyAdd: document.getElementById("apiKeyAdd"),
    activeKeySelect: document.getElementById("activeKeySelect"),
    rotationAuto: document.getElementById("rotationAuto"),
    rotationManual: document.getElementById("rotationManual"),
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

  // Eye icons for the per-key show/hide toggle. Inline SVG so the affordance is
  // always visible (no dependency on i18n text), stroke follows currentColor.
  const EYE_OPEN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

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
    const apiKeys = readApiKeysFromUI();
    const activeKeyIndex = Math.max(0, Math.min(apiKeys.length - 1, parseInt(els.activeKeySelect.value, 10) || 0));
    const rotationMode = (els.rotationManual && els.rotationManual.checked) ? "manual" : "auto";
    slot.apiKeys = apiKeys;
    slot.activeKeyIndex = activeKeyIndex;
    slot.rotationMode = rotationMode;
    slot.apiKey = apiKeys[activeKeyIndex] || "";  // mirror for back-compat
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

  /**
   * Feedback after any save (auto or manual): the Save button turns green and its
   * label switches to "✓ 已保存" / "✓ Saved" for ~2s, then reverts to its normal
   * color and the "保存" / "Save" label. No toast is shown (the button itself is
   * the only signal, per user preference).
   */
  function flashSaveButton() {
    if (!els.btnSave) return;
    els.btnSave.classList.add("saved");
    els.btnSave.textContent = t("savedShort");
    clearTimeout(_saveBtnTimer);
    _saveBtnTimer = setTimeout(() => {
      els.btnSave.classList.remove("saved");
      els.btnSave.textContent = t("save");
    }, 2000);
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
    const apiKeys = readApiKeysFromUI();
    slot.apiKeys = apiKeys;
    slot.activeKeyIndex = Math.max(0, Math.min(apiKeys.length - 1, parseInt(els.activeKeySelect.value, 10) || 0));
    slot.rotationMode = (els.rotationManual && els.rotationManual.checked) ? "manual" : "auto";
    slot.apiKey = apiKeys[slot.activeKeyIndex] || "";
    slot.apiBase = els.apiBase.value.trim() || PROVIDER_BASE[currentProvider] || "";
    slot.model = readModelFromUI(currentProvider);
    return slot;
  }

  /**
   * Render the multi-key pool for the active provider slot. Each row is:
   *   [#n] [password input] [Show] [×]
   * The row matching activeKeyIndex is highlighted. The Active-key select
   * mirrors activeKeyIndex. Rotation-mode radios mirror `rotationMode`.
   */
  function renderApiKeyPool(slot) {
    const apiKeys = (Array.isArray(slot.apiKeys) && slot.apiKeys.length)
      ? slot.apiKeys.map((k) => typeof k === "string" ? k : "")
      : [""];
    const activeIdx = (Number.isInteger(slot.activeKeyIndex) && slot.activeKeyIndex >= 0 && slot.activeKeyIndex < apiKeys.length)
      ? slot.activeKeyIndex
      : 0;
    const mode = slot.rotationMode === "manual" ? "manual" : "auto";

    // Re-render rows.
    els.apiKeysList.innerHTML = "";
    apiKeys.forEach((k, idx) => {
      els.apiKeysList.appendChild(buildApiKeyRow(idx, k, idx === activeIdx));
    });

    // Active-key dropdown.
    refreshActiveKeyOptions();
    els.activeKeySelect.value = String(activeIdx);

    // Rotation mode radios.
    if (els.rotationAuto) els.rotationAuto.checked = (mode !== "manual");
    if (els.rotationManual) els.rotationManual.checked = (mode === "manual");
  }

  /** Build one key row DOM node with wired input/toggle/remove handlers. */
  function buildApiKeyRow(idx, value, isActive) {
    const row = document.createElement("div");
    row.className = "api-key-row" + (isActive ? " is-active" : "");
    row.dataset.idx = String(idx);

    const num = document.createElement("span");
    num.className = "api-key-num";
    num.textContent = "#" + (idx + 1);
    row.appendChild(num);

    const input = document.createElement("input");
    input.className = "input api-key-input";
    input.type = "password";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.value = value || "";
    input.dataset.idx = String(idx);
    input.addEventListener("input", () => onApiKeyRowInput(idx));
    row.appendChild(input);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "api-key-toggle";
    toggle.dataset.idx = String(idx);
    // Inline SVG eye icons (open = masked, slashed = revealed) so the affordance
    // stays visible even if the i18n strings for show/hide are unavailable.
    toggle.innerHTML = EYE_OPEN;
    toggle.setAttribute("aria-label", t("show"));
    toggle.title = t("show");
    toggle.addEventListener("click", () => {
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      toggle.innerHTML = showing ? EYE_OPEN : EYE_OFF;
      toggle.setAttribute("aria-label", showing ? t("show") : t("hide"));
      toggle.title = showing ? t("show") : t("hide");
      toggle.classList.toggle("is-visible", !showing);
    });
    row.appendChild(toggle);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "api-key-remove";
    remove.dataset.idx = String(idx);
    remove.setAttribute("aria-label", t("removeKey"));
    remove.textContent = "×";
    remove.addEventListener("click", () => removeApiKeyRow(idx));
    row.appendChild(remove);

    return row;
  }

  /** Mask an api key for display: "…last4" (preserves last 4 chars). */
  function maskKey(k) {
    if (!k || typeof k !== "string") return "—";
    const s = k.trim();
    if (s.length <= 6) return "••••";
    return "…" + s.slice(-4);
  }

  /** Read all keys from the UI inputs (in order). */
  function readApiKeysFromUI() {
    const inputs = els.apiKeysList.querySelectorAll(".api-key-input");
    const out = [];
    inputs.forEach((inp) => out.push(inp.value.trim()));
    if (out.length === 0) out.push("");
    return out;
  }

  /** Append a blank key row and refresh the active-key dropdown. */
  function addApiKeyRow() {
    const inputs = els.apiKeysList.querySelectorAll(".api-key-row");
    const newIdx = inputs.length;
    els.apiKeysList.appendChild(buildApiKeyRow(newIdx, "", false));
    refreshActiveKeyOptions();
    refreshActiveRowHighlight();
    autoSaveField("apiKeys");
  }

  /** Remove a key row by index; keep at least one row.
   *  Rows are rebuilt from the remaining values so the "#N" labels renumber
   *  immediately (deleting #1 turns the old #2 into the new #1). The active
   *  index is adjusted for the shortened list: removed==active -> 0,
   *  removed<active -> shift down one, removed>active -> unchanged. */
  function removeApiKeyRow(idx) {
    const rows = els.apiKeysList.querySelectorAll(".api-key-row");
    if (rows.length <= 1) {
      // Always keep at least one row — clear it instead.
      rows[0].querySelector(".api-key-input").value = "";
      refreshActiveKeyOptions();
      refreshActiveRowHighlight();
      autoSaveField("apiKeys");
      return;
    }
    // Snapshot the values BEFORE mutating the DOM.
    const inputs = Array.from(els.apiKeysList.querySelectorAll(".api-key-input"));
    const kept = inputs.filter((_, i) => i !== idx).map((el) => el.value.trim());

    // Adjust the active index for the shortened list.
    const oldActive = parseInt(els.activeKeySelect.value, 10) || 0;
    let newActive;
    if (oldActive === idx) newActive = 0;
    else if (oldActive > idx) newActive = oldActive - 1;
    else newActive = oldActive;

    // Rebuild every row so numbering and data-idx stay in sync.
    els.apiKeysList.innerHTML = "";
    kept.forEach((v, i) => {
      els.apiKeysList.appendChild(buildApiKeyRow(i, v, i === newActive));
    });
    // Set before refreshActiveKeyOptions(): it re-selects using the current value.
    els.activeKeySelect.value = String(newActive);
    refreshActiveKeyOptions();
    refreshActiveRowHighlight();
    autoSaveField("apiKeys");
  }

  /** When a row input changes, refresh active options + auto-save. */
  function onApiKeyRowInput() {
    refreshActiveKeyOptions();
    autoSaveField("apiKeys");
  }

  /** Rebuild the active-key dropdown options from current rows. */
  function refreshActiveKeyOptions() {
    const inputs = els.apiKeysList.querySelectorAll(".api-key-input");
    const prevIdx = parseInt(els.activeKeySelect.value, 10) || 0;
    els.activeKeySelect.innerHTML = "";
    inputs.forEach((inp, idx) => {
      const opt = document.createElement("option");
      opt.value = String(idx);
      opt.textContent = "Key #" + (idx + 1) + " (" + maskKey(inp.value) + ")";
      if (idx === prevIdx) opt.selected = true;
      els.activeKeySelect.appendChild(opt);
    });
  }

  /** Highlight the row matching activeKeyIndex. */
  function refreshActiveRowHighlight() {
    const activeIdx = parseInt(els.activeKeySelect.value, 10) || 0;
    const rows = els.apiKeysList.querySelectorAll(".api-key-row");
    rows.forEach((row, idx) => {
      row.classList.toggle("is-active", idx === activeIdx);
    });
  }

  function onActiveKeyChange() {
    refreshActiveRowHighlight();
    autoSaveField("apiKeys");
  }

  function onRotationModeChange() {
    autoSaveField("apiKeys");
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
      const apiKeys = Array.isArray(s.apiKeys) && s.apiKeys.length ? s.apiKeys.map((k) => typeof k === "string" ? k : "") : [""];
      const activeKeyIndex = (Number.isInteger(s.activeKeyIndex) && s.activeKeyIndex >= 0 && s.activeKeyIndex < apiKeys.length)
        ? s.activeKeyIndex
        : 0;
      out[p] = {
        apiKey: apiKeys[activeKeyIndex] || "",
        apiKeys: apiKeys,
        activeKeyIndex: activeKeyIndex,
        rotationMode: s.rotationMode === "manual" ? "manual" : "auto",
        apiBase: s.apiBase || "",
        model: s.model || ""
      };
    }
    return out;
  }

  function cloneProvider(name) {
    const s = (cfg.providers && cfg.providers[name]) || {};
    const apiKeys = Array.isArray(s.apiKeys) && s.apiKeys.length ? s.apiKeys.map((k) => typeof k === "string" ? k : "") : [""];
    const activeKeyIndex = (Number.isInteger(s.activeKeyIndex) && s.activeKeyIndex >= 0 && s.activeKeyIndex < apiKeys.length)
      ? s.activeKeyIndex
      : 0;
    return {
      apiKey: apiKeys[activeKeyIndex] || "",
      apiKeys: apiKeys,
      activeKeyIndex: activeKeyIndex,
      rotationMode: s.rotationMode === "manual" ? "manual" : "auto",
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
    renderApiKeyPool(slot);
    els.apiBase.value = slot.apiBase || PROVIDER_BASE[currentProvider] || "";
    if (currentProvider !== "custom" && !slot.apiBase) {
      els.apiBase.value = PROVIDER_BASE[currentProvider] || "";
    }
    els.apiBaseField.style.display = (currentProvider === "custom") ? "block" : "none";
    renderModelSelect(currentProvider, slot.model || "");
    flashSaveButton();
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
    // Removed: per-key Show/Hide is now wired inside each row (buildApiKeyRow).
    // This stub remains only so old code paths don't break if anything still
    // references the name — safe to delete in a follow-up.
  }

  async function onLangChange() {
    setLang(els.langSelect.value);
    cfg = await Storage.setConfig({ lang: els.langSelect.value });
    applyAll();
    flashSaveButton();
  }

  async function onGenLangChange() {
    cfg = await Storage.setConfig({ generationLang: els.generationLangSelect.value });
    flashSaveButton();
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
    els.langSelect.addEventListener("change", onLangChange);
    els.generationLangSelect.addEventListener("change", onGenLangChange);
    els.providerSelect.addEventListener("change", syncProvider);

    // Key-pool wiring.
    if (els.apiKeyAdd) els.apiKeyAdd.addEventListener("click", addApiKeyRow);
    if (els.activeKeySelect) els.activeKeySelect.addEventListener("change", onActiveKeyChange);
    if (els.rotationAuto) els.rotationAuto.addEventListener("change", onRotationModeChange);
    if (els.rotationManual) els.rotationManual.addEventListener("change", onRotationModeChange);

    // Per-field independent auto-save: each provider field patches only its own
    // slot, so editing the base never clobbers the keys, etc.
    els.apiBase.addEventListener("input", () => autoSaveField("apiBase"));
    // The model custom free-form input's "input" listener is wired lazily inside
    // renderModelSelect so it only fires while the custom input is actually visible.
    if (els.injectModeSelect) els.injectModeSelect.addEventListener("change", autoSaveInjectMode);

    initSupport();
  }

  document.addEventListener("DOMContentLoaded", init);
})();