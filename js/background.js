/**
 * background.js — PinMate service worker.
 * The in-page panel (content.js) delegates AI calls here so requests run in the
 * extension context (host_permissions apply, no page CORS issues).
 */
importScripts("i18n.js", "ai.js", "storage.js");

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || !msg.type) return;

  // No-response control message: handled synchronously, never sendResponse.
  if (msg.type === "PINMATE_OPEN_SETTINGS") {
    chrome.runtime.openOptionsPage();
    return; // do NOT return true — this message needs no async response
  }

  (async () => {
    try {
      const cfg = await Storage.getConfig();
      // Active provider config (apiKey/apiBase/model/models/all scoped to default provider).
      const pcfg = await Storage.getActiveProviderConfig();

      if (msg.type === "PINMATE_HASKEY") {
        sendResponse({ ok: true, hasKey: !!(pcfg.apiKey && pcfg.apiKey.trim()), lang: resolveInitialLang(cfg.lang) });
        return;
      }

      if (!(pcfg.apiKey && pcfg.apiKey.trim())) {
        sendResponse({ ok: false, errorKey: "errNoApiKey" });
        return;
      }

      if (msg.type === "PINMATE_ANALYZE") {
        const data = await AI.analyzeImage(pcfg, {
          imageUrl: msg.imageUrl,
          pageText: msg.pageText,
          lang: msg.lang
        });
        sendResponse({ ok: true, data });
      } else if (msg.type === "PINMATE_GENERATE") {
        const data = await AI.generateContent(pcfg, {
          analysis: msg.analysis,
          lang: msg.lang
        });
        sendResponse({ ok: true, data });
      } else       if (msg.type === "PINMATE_GENERATE_DIRECT") {
        const data = await AI.generateDirect(pcfg, {
          imageUrl: msg.imageUrl,
          pageText: msg.pageText,
          lang: msg.lang
        });
        // Cache the image payload so a later single-field regen can re-analyze
        // without the user having to re-pick the image.
        try {
          await chrome.storage.local.set({ pinmate_last_image: msg.imageUrl });
        } catch (_) {}
        sendResponse({ ok: true, data });
      } else if (msg.type === "PINMATE_REGENERATE") {
        const field = msg.field;
        // Reuse cached image if the caller didn't pass one (cheaper + reliable).
        const imageUrl = msg.imageUrl ||
          (await chrome.storage.local.get("pinmate_last_image")).pinmate_last_image;
        if (!imageUrl) {
          sendResponse({ ok: false, errorKey: "errNoImage" });
          return;
        }
        // Reuse cached analysis if present; otherwise analyze the image once.
        const cached = await chrome.storage.local.get("pinmate_last_analysis");
        let analysis = (cached.pinmate_last_analysis || {}).analysis || null;
        if (!analysis) {
          analysis = await AI.analyzeImage(pcfg, { imageUrl, pageText: msg.pageText || "", lang: msg.lang });
          try {
            await chrome.storage.local.set({ pinmate_last_analysis: { analysis } });
          } catch (_) {}
        }
        const partial = await AI.generateSingle(pcfg, { analysis, lang: msg.lang, field, imageUrl });
        sendResponse({ ok: true, data: partial });
      } else {
        // Unknown type: respond anyway so the sender never waits forever.
        sendResponse({ ok: false, errorKey: "errApi" });
      }
    } catch (err) {
      sendResponse({ ok: false, errorKey: AI.errorKey(err) });
    }
  })();

  return true; // async response
});
