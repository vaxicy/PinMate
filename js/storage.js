/**
 * storage.js — thin wrapper over chrome.storage.local for PinMate config.
 * All user data (API key, language, models) stays local. Never hard-code a key.
 *
 * Storage shape (multi-provider, single API key per provider):
 *   pinmate_config = {
 *     lang, generationLang, panelCollapsed, injectMode, autoFill,
 *     defaultProvider: "siliconflow",
 *     providers: {
 *       siliconflow: { apiKey, apiBase, model },
 *       openai:      { apiKey, apiBase, model },
 *       gemini:      { apiKey, apiBase, model },
 *       custom:      { apiKey, apiBase, model }
 *     }
 *   }
 * Legacy shapes (flat provider/apiKey/apiBase/model, or provider slot with apiKeys[]) are
 * migrated into the canonical single-key slot on first read.
 */
const PROVIDERS = Object.freeze(["siliconflow", "openai", "gemini", "custom"]);

const DEFAULT_PROVIDERS = Object.freeze({
  siliconflow: {
    apiKey: "",
    apiKeys: [""],
    activeKeyIndex: 0,
    rotationMode: "auto",
    apiBase: "https://api.siliconflow.cn/v1",
    model: "Qwen/Qwen3-Omni-30B-A3B-Instruct",
  },
  openai: {
    apiKey: "",
    apiKeys: [""],
    activeKeyIndex: 0,
    rotationMode: "auto",
    apiBase: "https://api.openai.com/v1",
    model: "gpt-4o",
  },
  gemini: {
    apiKey: "",
    apiKeys: [""],
    activeKeyIndex: 0,
    rotationMode: "auto",
    apiBase: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.5-flash",
  },
  custom: {
    apiKey: "",
    apiKeys: [""],
    activeKeyIndex: 0,
    rotationMode: "auto",
    apiBase: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
});

const DEFAULT_CONFIG = Object.freeze({
  lang: "en",
  generationLang: "en",
  panelCollapsed: false,
  injectMode: "full", // "full" = show panel on all pinterest pages; "createOnly" = only on Create Pin pages
  autoFill: false,
  defaultProvider: "siliconflow",
  providers: {
    siliconflow: Object.assign({}, DEFAULT_PROVIDERS.siliconflow),
    openai: Object.assign({}, DEFAULT_PROVIDERS.openai),
    gemini: Object.assign({}, DEFAULT_PROVIDERS.gemini),
    custom: Object.assign({}, DEFAULT_PROVIDERS.custom),
  },
});

let _ctxInvalidated = false;
function _isCtxError(e) {
  return !!e && /Extension context invalidated/i.test(e.message || String(e));
}
function _markCtxInvalidated() {
  _ctxInvalidated = true;
}

function _deepMergeProviders(stored) {
  const out = {};
  for (const p of PROVIDERS) {
    const def = DEFAULT_PROVIDERS[p];
    const s = (stored && stored[p]) || {};
    // Migrate legacy models[]/defaultModel fields into a single model string.
    let model = typeof s.model === "string" ? s.model : def.model;
    if ((!model || !s.model) && Array.isArray(s.models) && s.models.length) {
      model = s.models[0];
    }
    // Build apiKeys array. Precedence (dedup, order-preserving):
    //   1. Stored apiKeys[] (each entry trimmed; empties dropped)
    //   2. Legacy single apiKey string (prepended if not already present)
    // Always end with at least one slot so the UI can render an input row.
    let apiKeys = [];
    if (Array.isArray(s.apiKeys)) {
      for (const k of s.apiKeys) {
        if (typeof k === "string" && k.trim()) apiKeys.push(k.trim());
      }
    }
    if (typeof s.apiKey === "string" && s.apiKey.trim() && apiKeys.indexOf(s.apiKey.trim()) === -1) {
      apiKeys.unshift(s.apiKey.trim());
    }
    if (apiKeys.length === 0) apiKeys = [""];
    // activeKeyIndex: bounds-check against apiKeys length; default 0.
    let activeKeyIndex = 0;
    if (Number.isInteger(s.activeKeyIndex) && s.activeKeyIndex >= 0 && s.activeKeyIndex < apiKeys.length) {
      activeKeyIndex = s.activeKeyIndex;
    }
    // rotationMode: "auto" (failover on quota/invalid) | "manual" (stick to active); default "auto".
    const rotationMode = (s.rotationMode === "manual" || s.rotationMode === "auto") ? s.rotationMode : "auto";
    // Mirror the active key as `apiKey` for back-compat (popup/content still read cfg.apiKey).
    const apiKey = apiKeys[activeKeyIndex] || "";
    out[p] = {
      apiKey: apiKey,
      apiKeys: apiKeys,
      activeKeyIndex: activeKeyIndex,
      rotationMode: rotationMode,
      apiBase: typeof s.apiBase === "string" ? s.apiBase : def.apiBase,
      model: model,
    };
  }
  return out;
}

// One-time migration: legacy flat provider/apiKey/apiBase/model -> siliconflow slot.
function _migrateLegacy(stored) {
  if (!stored || typeof stored !== "object") return null;
  if (stored.provider || stored.apiKey || stored.apiBase || stored.model) {
    const legacy = {
      apiKey: stored.apiKey || "",
      apiBase: stored.apiBase || "https://api.siliconflow.cn/v1",
      model: stored.model || "Qwen/Qwen3-Omni-30B-A3B-Instruct",
    };
    return {
      defaultProvider: "siliconflow",
      providers: {
        siliconflow: Object.assign({}, DEFAULT_PROVIDERS.siliconflow, legacy),
      },
    };
  }
  return null;
}

const Storage = {
  PROVIDERS,

  async getConfig() {
    if (_ctxInvalidated) return Object.assign({}, DEFAULT_CONFIG);
    try {
      const data = await chrome.storage.local.get("pinmate_config");
      const stored = data.pinmate_config || {};
      if (Object.keys(stored).length === 0) return Object.assign({}, DEFAULT_CONFIG);

      const migrated = _migrateLegacy(stored);
      if (migrated) {
        const next = Object.assign({}, DEFAULT_CONFIG, migrated);
        next.providers = _deepMergeProviders(migrated.providers);
        await chrome.storage.local.set({ pinmate_config: next });
        return next;
      }

      const next = Object.assign({}, DEFAULT_CONFIG, stored);
      next.defaultProvider = stored.defaultProvider || "siliconflow";
      next.providers = _deepMergeProviders(stored.providers);
      return next;
    } catch (e) {
      if (_isCtxError(e)) {
        _markCtxInvalidated();
        return Object.assign({}, DEFAULT_CONFIG);
      }
      throw e;
    }
  },

  async setConfig(partial) {
    if (_ctxInvalidated) return Object.assign({}, DEFAULT_CONFIG, partial);
    try {
      const current = await this.getConfig();
      const next = Object.assign({}, current, partial);
      await chrome.storage.local.set({ pinmate_config: next });
      return next;
    } catch (e) {
      if (_isCtxError(e)) {
        _markCtxInvalidated();
        return Object.assign({}, DEFAULT_CONFIG, partial);
      }
      throw e;
    }
  },

  async getLang() {
    const cfg = await this.getConfig();
    return cfg.lang || "en";
  },

  async hasApiKey() {
    const cfg = await this.getConfig();
    const slot = (cfg.providers && cfg.providers[cfg.defaultProvider || "siliconflow"]) || {};
    return Array.isArray(slot.apiKeys) && slot.apiKeys.some((k) => typeof k === "string" && k.trim());
  },

  // Returns the active (default) provider's full config.
  async getActiveProviderConfig() {
    const cfg = await this.getConfig();
    const name = cfg.defaultProvider || "siliconflow";
    const slot = (cfg.providers && cfg.providers[name]) || {};
    const apiKeys = Array.isArray(slot.apiKeys) && slot.apiKeys.length ? slot.apiKeys : [""];
    const activeKeyIndex = (Number.isInteger(slot.activeKeyIndex) && slot.activeKeyIndex >= 0 && slot.activeKeyIndex < apiKeys.length)
      ? slot.activeKeyIndex
      : 0;
    return {
      provider: name,
      apiKeys: apiKeys,
      activeKeyIndex: activeKeyIndex,
      rotationMode: slot.rotationMode === "manual" ? "manual" : "auto",
      apiKey: apiKeys[activeKeyIndex] || "",  // back-compat mirror of active key
      apiBase: slot.apiBase || "",
      model: slot.model || "",
    };
  },

  /**
   * Persist the active key index for a provider. Called by the AI layer after
   * auto-failover flips to a different key, so manual / restart picks up where
   * the auto-failover left off.
   */
  async setActiveKeyIndex(providerName, idx) {
    if (_ctxInvalidated) return null;
    const cfg = await this.getConfig();
    const slot = (cfg.providers && cfg.providers[providerName]) || null;
    if (!slot) return cfg;
    const apiKeys = Array.isArray(slot.apiKeys) ? slot.apiKeys : [""];
    if (!Number.isInteger(idx) || idx < 0 || idx >= apiKeys.length) return cfg;
    const next = Object.assign({}, cfg);
    next.providers = Object.assign({}, cfg.providers);
    next.providers[providerName] = Object.assign({}, slot, {
      activeKeyIndex: idx,
      apiKey: apiKeys[idx] || "",
    });
    await chrome.storage.local.set({ pinmate_config: next });
    return next;
  },

  isContextInvalidated() {
    return _ctxInvalidated;
  },
};
