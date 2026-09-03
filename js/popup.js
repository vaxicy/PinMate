/**
 * popup.js — minimal popup: status + settings entry + language switch.
 * The main workflow lives in the in-page panel (content.js).
 */
(function () {
  const els = {
    statusPill: document.getElementById("statusPill"),
    statusText: document.getElementById("statusText"),
    btnSettings: document.getElementById("btnSettings"),
    langBtns: document.querySelectorAll(".lang-btn")
  };

  let cfg = null;
  let active = null; // active provider config (apiKey/apiBase/model/...)

  function refreshStatus() {
    const hasKey = !!(active && active.apiKey && active.apiKey.trim());
    els.statusText.textContent = hasKey ? t("aiReady") : t("aiNotConfigured");
    els.statusPill.className = "status-pill" + (hasKey ? "" : " off");
  }

  function applyAll() {
    applyStaticI18n(document);
    refreshStatus();
    els.langBtns.forEach((b) => b.classList.toggle("active", b.dataset.lang === CURRENT_LANG));
  }

  async function onLang(lang) {
    setLang(lang);
    cfg = await Storage.setConfig({ lang });
    applyAll();
  }

  async function init() {
    try {
      cfg = await Storage.getConfig();
      active = await Storage.getActiveProviderConfig();
      const lang = resolveInitialLang(cfg.lang);
      setLang(lang);
      // Persist auto-detected language so it survives reloads
      if (!cfg.lang) await Storage.setConfig({ lang });
      document.documentElement.lang = CURRENT_LANG;
      applyAll();

      // Set logo image via chrome.runtime.getURL (reliable path resolution)
      const logoEl = document.querySelector(".logo");
      if (logoEl) {
        logoEl.src = chrome.runtime.getURL("assets/icons/icon48.png");
        logoEl.onerror = () => { logoEl.style.display = "none"; };
      }

      els.btnSettings.addEventListener("click", () => chrome.runtime.openOptionsPage());
      els.langBtns.forEach((b) => b.addEventListener("click", () => onLang(b.dataset.lang)));
    } catch (e) {
      console.error("[PinMate] popup init error:", e && e.message ? e.message : e);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
