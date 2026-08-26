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
    apiBase: "https://api.siliconflow.cn/v1",
    model: "Qwen/Qwen3-Omni-30B-A3B-Instruct",
  },
  openai: {
    apiKey: "",
    apiBase: "https://api.openai.com/v1",
    model: "gpt-4o",
  },
  gemini: {
    apiKey: "",
    apiBase: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.5-flash",
  },
  custom: {
    apiKey: "",
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
    // Migrate legacy multi-key shape (apiKeys array) into single apiKey.
    let apiKey = "";
    if (typeof s.apiKey === "string" && s.apiKey.trim()) {
      apiKey = s.apiKey;
    } else if (Array.isArray(s.apiKeys) && s.apiKeys.length) {
      const first = s.apiKeys.find((k) => k && String(k).trim());
      apiKey = first || "";
    }
    out[p] = {
      apiKey: apiKey,
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
    return !!(slot.apiKey && slot.apiKey.trim());
  },

  // Returns the active (default) provider's full config.
  async getActiveProviderConfig() {
    const cfg = await this.getConfig();
    const name = cfg.defaultProvider || "siliconflow";
    const slot = (cfg.providers && cfg.providers[name]) || DEFAULT_PROVIDERS[name] || DEFAULT_PROVIDERS.siliconflow;
    return {
      provider: name,
      apiKey: slot.apiKey || "",
      apiBase: slot.apiBase || "",
      model: slot.model || "",
    };
  },

  isContextInvalidated() {
    return _ctxInvalidated;
  },
};
