/**
 * storage.js — thin wrapper over chrome.storage.local for PinMate config.
 * All user data (API key, language, models) stays local. Never hard-code a key.
 */
const DEFAULT_CONFIG = {
  lang: "en",
  provider: "siliconflow",
  apiKey: "",
  apiBase: "https://api.siliconflow.cn/v1",
  model: "Qwen/Qwen3-Omni-30B-A3B-Captioner",
  generationLang: "en",
  panelCollapsed: false
};

const Storage = {
  async getConfig() {
    const data = await chrome.storage.local.get("pinmate_config");
    return Object.assign({}, DEFAULT_CONFIG, data.pinmate_config || {});
  },

  async setConfig(partial) {
    const current = await this.getConfig();
    const next = Object.assign({}, current, partial);
    await chrome.storage.local.set({ pinmate_config: next });
    return next;
  },

  async getLang() {
    const cfg = await this.getConfig();
    return cfg.lang || "en";
  },

  async hasApiKey() {
    const cfg = await this.getConfig();
    return !!(cfg.apiKey && cfg.apiKey.trim());
  }
};
