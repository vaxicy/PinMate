/**
 * storage.js — thin wrapper over chrome.storage.local for PinMate config.
 * All user data (API key, language, models) stays local. Never hard-code a key.
 *
 * Storage shape (multi-provider + per-provider multi-key rotation):
 *   pinmate_config = {
 *     lang, generationLang, panelCollapsed, injectMode, autoFill,
 *     defaultProvider: "siliconflow",
 *     providers: {
 *       siliconflow: { apiKeys: string[], apiBase, model },
 *       openai:      { apiKeys: string[], apiBase, model },
 *       gemini:      { apiKeys: string[], apiBase, model },
 *       custom:      { apiKeys: string[], apiBase, model }
 *     }
 *   }
 * Legacy flat config (provider/apiKey/apiBase/model) and single apiKey are migrated
 * into the siliconflow slot's apiKeys array on first read.
 */
const PROVIDERS = Object.freeze(["siliconflow", "openai", "gemini", "custom"]);

const DEFAULT_PROVIDERS = Object.freeze({
  siliconflow: {
    apiKeys: [""],
    apiBase: "https://api.siliconflow.cn/v1",
    model: "Qwen/Qwen3-Omni-30B-A3B-Instruct",
  },
  openai: {
    apiKeys: [""],
    apiBase: "https://api.openai.com/v1",
    model: "gpt-4o",
  },
  gemini: {
    apiKeys: [""],
    apiBase: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.5-flash",
  },
  custom: {
    apiKeys: [""],
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
    // Migrate legacy single apiKey -> apiKeys array (rotation support).
    let apiKeys;
    if (Array.isArray(s.apiKeys) && s.apiKeys.some((k) => typeof k === "string" && String(k).trim())) {
      apiKeys = s.apiKeys.map((k) => String(k));
    } else if (typeof s.apiKey === "string" && s.apiKey.trim()) {
      apiKeys = [s.apiKey];
    } else if (Array.isArray(s.apiKeys) && s.apiKeys.length) {
      apiKeys = s.apiKeys.map((k) => String(k));
    } else {
      apiKeys = [""];
    }
    out[p] = {
      apiKeys: apiKeys,
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
        siliconflow: Object.assign({}, DEFAULT_PROVIDERS.siliconflow, {
          apiKey: legacy.apiKey,
          apiBase: legacy.apiBase,
          model: legacy.model,
        }),
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
    const keys = Array.isArray(slot.apiKeys) ? slot.apiKeys : [];
    return keys.some((k) => k && k.trim());
  },

  // Returns the active (default) provider's full config.
  async getActiveProviderConfig() {
    const cfg = await this.getConfig();
    const name = cfg.defaultProvider || "siliconflow";
    const slot = (cfg.providers && cfg.providers[name]) || DEFAULT_PROVIDERS[name] || DEFAULT_PROVIDERS.siliconflow;
    const keys = Array.isArray(slot.apiKeys) ? slot.apiKeys : [""];
    return {
      provider: name,
      apiKey: keys.find((k) => k && k.trim()) || keys[0] || "",
      apiKeys: keys,
      apiBase: slot.apiBase || "",
      model: slot.model || "",
    };
  },

  isContextInvalidated() {
    return _ctxInvalidated;
  },
};
