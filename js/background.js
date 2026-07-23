/**
 * background.js — PinMate service worker.
 * The in-page panel (content.js) delegates AI calls here so requests run in the
 * extension context (host_permissions apply, no page CORS issues).
 */
importScripts("i18n.js", "ai.js", "storage.js");

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || !msg.type) return;

  (async () => {
    try {
      const cfg = await Storage.getConfig();

      if (msg.type === "PINMATE_HASKEY") {
        sendResponse({ ok: true, hasKey: !!(cfg.apiKey && cfg.apiKey.trim()), lang: resolveInitialLang(cfg.lang) });
        return;
      }

      if (!(cfg.apiKey && cfg.apiKey.trim())) {
        sendResponse({ ok: false, errorKey: "errNoApiKey" });
        return;
      }

      if (msg.type === "PINMATE_ANALYZE") {
        const data = await AI.analyzeImage(cfg, {
          imageUrl: msg.imageUrl,
          pageText: msg.pageText,
          lang: msg.lang
        });
        sendResponse({ ok: true, data });
      } else if (msg.type === "PINMATE_GENERATE") {
        const data = await AI.generateContent(cfg, {
          analysis: msg.analysis,
          lang: msg.lang
        });
        sendResponse({ ok: true, data });
      } else if (msg.type === "PINMATE_GENERATE_DIRECT") {
        const data = await AI.generateDirect(cfg, {
          imageUrl: msg.imageUrl,
          pageText: msg.pageText,
          lang: msg.lang
        });
        sendResponse({ ok: true, data });
      }
    } catch (err) {
      sendResponse({ ok: false, errorKey: AI.errorKey(err) });
    }
  })();

  return true; // async response
});

// Open settings when requested from the panel.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "PINMATE_OPEN_SETTINGS") {
    chrome.runtime.openOptionsPage();
  }
});
