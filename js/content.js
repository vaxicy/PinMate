/**
 * content.js — PinMate in-page panel (runs on pinterest.com).
 * Injects a draggable floating panel that analyzes the page image, generates
 * SEO title/description via the background service worker, and fills the
 * Pinterest Create Pin fields directly in the page DOM.
 *
 * Depends on i18n.js (I18N/t/setLang/CURRENT_LANG) and storage.js (Storage),
 * which are injected before this file (see manifest content_scripts).
 */
(function () {
  if (window.__pinmateInjected) return;
  window.__pinmateInjected = true;

  const state = {
    content: null, // { title, description }
    hasKey: false,
    generationLang: "en"
  };

  let root, panel, els;

  // ---------- DOM scraping / filling (same page context) ----------
  // exclude tracking pixels / tiny icons
  function isTiny(src) {
    return !src || src.startsWith("data:image/gif") ||
      /[?&]w=\d{1,2}(&|$)/.test(src);
  }

  function srcOf(el) {
    return (el && (el.currentSrc || el.src)) || "";
  }

  // Pinterest may render the pin preview as a CSS background-image
  function pickBackgroundImage() {
    const cand = [];
    document.querySelectorAll("div, section, figure, a, span").forEach((el) => {
      if (root && root.contains(el)) return;
      const r = el.getBoundingClientRect();
      if (r.width < 150 || r.height < 150) return;
      const bi = getComputedStyle(el).backgroundImage || "";
      const m = bi.match(/url\(["']?(.*?)["']?\)/);
      if (m && m[1] && !m[1].startsWith("data:")) {
        cand.push({ url: m[1], area: r.width * r.height });
      }
    });
    if (!cand.length) return null;
    cand.sort((a, b) => b.area - a.area);
    return cand[0].url;
  }

  // Best-effort image locator. Returns { kind:'img'|'canvas'|'url', value } or null.
  function pickImageElement() {
    const logs = [];
    const note = (tag, el, url) => {
      const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : { width: 0, height: 0 };
      logs.push(`${tag} ${Math.round(r.width)}x${Math.round(r.height)} ${String(url || "").slice(0, 60)}`);
    };

    // 0) ARIA image role container (Pinterest Create Pin uses div[role="image"])
    const ariaImgSels = ['[role="image"]', '[role="img"]'];
    for (const s of ariaImgSels) {
      const el = document.querySelector(s);
      if (!el || (root && root.contains(el))) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 80 || r.height < 80) continue;
      note("aria", el);
      // Log container structure for debugging
      const childTags = Array.from(el.children).map(c => c.tagName.toLowerCase() +
        (c.className ? '.' + String(c.className).split(' ')[0].slice(0, 20) : '')).join(', ');
      console.debug("[PinMate] found " + s + " (" + Math.round(r.width) + "x" + Math.round(r.height) +
        ") children: [" + childTags + "] innerHTML-len: " + (el.innerHTML || "").length);

      // 0a) inner <img> — try direct child first, then any descendant
      let innerImg = el.querySelector(":scope > img");
      if (!innerImg) innerImg = el.querySelector("img");
      if (innerImg) {
        const url = srcOf(innerImg);
        console.debug("[PinMate]   inner img src: " + String(url).slice(0, 120) +
          " naturalSize: " + innerImg.naturalWidth + "x" + innerImg.naturalHeight);
        if (url && !isTiny(url)) {
          console.debug("[PinMate] img candidates:\n" + logs.join("\n"));
          return { kind: "img", value: innerImg };
        }
        // Even if url looks tiny/empty, keep this img as candidate if it has size
        if (innerImg.naturalWidth > 50 || innerImg.naturalHeight > 50) {
          console.debug("[PinMate]   using img despite suspicious src (has natural size)");
          console.debug("[PinMate] img candidates:\n" + logs.join("\n"));
          return { kind: "img", value: innerImg };
        }
      }

      // 0b) inner <canvas>
      const innerCv = el.querySelector("canvas");
      if (innerCv) {
        const cr = innerCv.getBoundingClientRect();
        if (cr.width > 50 && cr.height > 50) {
          console.debug("[PinMate] img candidates:\n" + logs.join("\n") + "\naria-canvas");
          return { kind: "canvas", value: innerCv };
        }
      }

      // 0c) CSS background-image on the container itself
      const bi = getComputedStyle(el).backgroundImage || "";
      const m = bi.match(/url\(["']?(.*?)["']?\)/);
      if (m && m[1] && !m[1].startsWith("data:")) {
        console.debug("[PinMate] img candidates:\n" + logs.join("\n") + "\naria-bg " + m[1].slice(0, 60));
        return { kind: "url", value: m[1] };
      }

      // 0d) deep recursive <img> search — Pinterest may nest img several levels down
      const allImgs = el.querySelectorAll("img");
      let bestDeepImg = null, bestDeepArea = 0;
      allImgs.forEach((img) => {
        const area = (img.naturalWidth || img.width) * (img.naturalHeight || img.height);
        if (area > bestDeepArea) { bestDeepImg = img; bestDeepArea = area; }
      });
      if (bestDeepImg && bestDeepArea > 4000) {
        console.debug("[PinMate]   deep-recursive img found: " + srcOf(bestDeepImg).slice(0, 100) +
          " area: " + bestDeepArea);
        console.debug("[PinMate] img candidates:\n" + logs.join("\n") + "\naria-deep-img");
        return { kind: "img", value: bestDeepImg };
      }

      // Found aria container but couldn't extract image — log full details for debugging
      console.debug("[PinMate]   WARNING: [role=\"image\"] found but NO extractable image source!" +
        " html-preview: " + (el.outerHTML || "").slice(0, 300));
    }

    // 1) known Pinterest image containers
    const imgSels = [
      'div[data-test-id="pin-draft-image"] img',
      'div[data-test-id="storyboard-image"] img',
      'div[data-test-id="pin-image"] img',
      '[data-test-id="pin-closeup-image"] img',
      ".pin-draft-image img",
      ".pin-draft img",
      "#image-container img",
      ".Upload img",
      ".upload img",
      'picture img',
      '[role="img"] img',
      'img[fetchpriority="high"]',
      'img[srcset]'
    ];
    for (const s of imgSels) {
      const el = document.querySelector(s);
      const url = srcOf(el);
      if (el && url && !isTiny(url)) { note("sel", el, url); console.debug("[PinMate] img candidates:\n" + logs.join("\n")); return { kind: "img", value: el }; }
    }

    // 2) canvas (Pinterest upload preview is often a <canvas>)
    let bestCanvas = null, bestC = 0;
    document.querySelectorAll("canvas").forEach((cv) => {
      if (root && root.contains(cv)) return;
      const r = cv.getBoundingClientRect();
      const area = r.width * r.height;
      if (r.width > 120 && r.height > 80 && area > bestC) { bestCanvas = cv; bestC = area; }
    });
    if (bestCanvas) { console.debug("[PinMate] img candidates:\n" + logs.join("\n") + "\ncanvas " + Math.round(bestCanvas.width) + "x" + Math.round(bestCanvas.height)); return { kind: "canvas", value: bestCanvas }; }

    // 3) CSS background-image
    const bg = pickBackgroundImage();
    if (bg) return { kind: "url", value: bg };

    // 4) broadest fallback: largest reasonably visible <img> (incl. blob: previews)
    let best = null, bestArea = 0;
    document.querySelectorAll("img").forEach((img) => {
      if (root && root.contains(img)) return;
      const url = srcOf(img);
      if (isTiny(url)) return;
      const r = img.getBoundingClientRect();
      const area = r.width * r.height;
      if (area > bestArea && r.width > 80 && r.height > 80) { best = img; bestArea = area; }
    });
    if (best) { note("fallback", best, srcOf(best)); console.debug("[PinMate] img candidates:\n" + logs.join("\n")); return { kind: "img", value: best }; }

    console.debug("[PinMate] no image element found");
    return null;
  }

  // Draw an <img> to a canvas and return a JPEG data URL (max 1024px wide).
  function toDataUrl(imgEl) {
    return new Promise((resolve) => {
      try {
        const w = imgEl.naturalWidth || imgEl.width;
        const h = imgEl.naturalHeight || imgEl.height;
        if (!w || !h) return resolve(null);
        const cv = document.createElement("canvas");
        cv.width = Math.min(w, 1024);
        cv.height = Math.max(1, Math.round(h * (cv.width / w)));
        cv.getContext("2d").drawImage(imgEl, 0, 0, cv.width, cv.height);
        resolve(cv.toDataURL("image/jpeg", 0.85));
      } catch (e) {
        resolve(null); // tainted canvas (cross-origin, no CORS)
      }
    });
  }

  // Load a URL as an Image with CORS so it can be read by canvas.
  function loadCrossOrigin(src) {
    return new Promise((resolve) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = src;
    });
  }

  // Build a payload SiliconFlow can consume: a data URL when possible,
  // otherwise the raw http(s) URL (fetched server-side by SiliconFlow).
  async function getImagePayload() {
    const found = pickImageElement();
    if (!found) return null;

    // Direct canvas (upload preview) -> data URL
    if (found.kind === "canvas") {
      try {
        return found.value.toDataURL("image/jpeg", 0.85);
      } catch (e) {
        return null;
      }
    }

    // CSS background-image -> load then read
    if (found.kind === "url") {
      const im = await loadCrossOrigin(found.value);
      if (im) {
        const du = await toDataUrl(im);
        if (du) return du;
      }
      return found.value; // raw URL fallback (SiliconFlow fetches server-side)
    }

    // <img> element
    const el = found.value;
    const url = srcOf(el);
    const du = await toDataUrl(el);
    if (du) return du;
    const im = await loadCrossOrigin(url);
    if (im) {
      const du2 = await toDataUrl(im);
      if (du2) return du2;
    }
    return url;
  }

  function scrape() {
    const text = (document.title || "") + " " +
      (document.querySelector('meta[name="description"]')?.content || "");
    return { pageText: text.trim().slice(0, 500) };
  }

  function setNativeValue(el, value) {
    const proto = el.tagName === "TEXTAREA"
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    el.focus();
    if (setter) setter.call(el, value); else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  // Fill a contenteditable (Draft.js) field robustly.
  // Pinterest uses Draft.js where the actual text lives inside
  // div.public-DraftStyleDefault-block > span.  Writing via execCommand
  // often lands the text in the DOM but Draft.js / React doesn't pick it
  // up, so the field looks empty until a refresh re-hydrates from server.
  //
  // 根治策略 for Draft.js editors (Pinterest description field):
  //   Phase 0 — Wait for Draft.js internal structure (span[data-offset-key])
  //   Phase 1 — Clipboard PASTE (primary; Draft.js handles paste natively)
  //   Phase 2 — execCommand insertText fallback (if paste didn't stick)
  //   Phase 3 — MUTATION OBSERVER GUARD (关键根治):
  //     Watch for 3 seconds after successful fill. If Draft.js overwrites our
  //     text, instantly re-paste within ~50ms (user never sees blank).
  //     Max 5 auto-repairs, then give up.
  async function fillEditable(el, value) {
    if (!el) return false;
    const want = (value || "").replace(/\s+/g, "");

    function isVisibleText() {
      const txt = (el.textContent || "").replace(/\s+/g, "");
      if (!txt) return false;
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (cs.opacity === "0" || cs.visibility === "hidden" || cs.display === "none") return false;
      if (rect.width < 10 && rect.height < 10) return false;
      return true;
    }

    // --- Core paste (reused by Phase 1 and guard repairs) ---
    async function doPaste() {
      el.click(); el.focus();
      await new Promise((r) => setTimeout(r, 100));
      document.execCommand("selectAll", false, null);
      await navigator.clipboard.writeText(value);
      document.execCommand("paste", false, null);
      el.dispatchEvent(new ClipboardEvent("paste", {
        bubbles: true, cancelable: true,
        dataType: "text/plain", data: value
      }));
      el.dispatchEvent(new InputEvent("input", {
        bubbles: true, data: value, inputType: "insertFromPaste"
      }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // --- Phase 0: Wait for Draft.js structure ---
    await new Promise((resolve) => {
      let checks = 0;
      const iv = setInterval(() => {
        checks++;
        if (el.querySelector("span[data-offset-key], .public-DraftStyleDefault-block")) {
          clearInterval(iv);
          console.debug("[PinMate] Draft.js ready after " + (checks * 200) + "ms");
          resolve();
        } else if (checks >= 25) {
          clearInterval(iv);
          resolve();
        }
      }, 200);
    });

    // --- Phase 1: Clipboard PASTE (primary) ---
    try {
      console.debug("[PinMate] fillEditable: clipboard-paste (primary)");
      await doPaste();
      await new Promise((r) => setTimeout(r, 400));

      if ((el.textContent || "").replace(/\s+/g, "") !== want) {
        console.debug("[PinMate] paste not retained, retrying once...");
        await new Promise((r) => setTimeout(r, 500));
        await doPaste();
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch (err) {
      console.debug("[PinMate] paste error: " + err.message);
    }

    // --- Phase 2: insertText fallback ---
    if ((el.textContent || "").replace(/\s+/g, "") !== want) {
      try {
        el.click(); el.focus();
        el.dispatchEvent(new KeyboardEvent("keydown", {
          bubbles: true, cancelable: true, key: "Process", keyCode: 229
        }));
        document.execCommand("selectAll", false, null);
        document.execCommand("insertText", false, value);
        el.dispatchEvent(new InputEvent("beforeinput", {
          bubbles: true, cancelable: true, inputType: "insertText", data: value
        }));
        el.dispatchEvent(new InputEvent("input", {
          bubbles: true, data: value, inputType: "insertText"
        }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        await new Promise((r) => setTimeout(r, 400));
      } catch (_) {}
    }

    // Check if we have the text at all
    if ((el.textContent || "").replace(/\s+/g, "") !== want) {
      console.debug("[PinMate] fillEditable FAILED after all attempts");
      return false;
    }

    // --- Phase 3: MUTATION OBSERVER GUARD (根治) ---
    return await new Promise((resolveGuard) => {
      let repairs = 0;
      const MAX_REPAIRS = 5;
      const GUARD_MS = 3000;
      let timeoutId;

      const obs = new MutationObserver(async () => {
        const now = (el.textContent || "").replace(/\s+/g, "");
        if (now === want) return; // still good

        if (repairs >= MAX_REPAIRS) {
          cleanup(false); return;
        }
        repairs++;
        console.debug("[PinMate] GUARD: text wiped! Repair #" + repairs);

        obs.disconnect();
        try {
          await doPaste();
          await new Promise((r) => setTimeout(r, 200));
        } catch (_) {}
        if (repairs < MAX_REPAIRS) obs.observe(el, {
          childList: true, subtree: true, characterData: true
        });
      });

      obs.observe(el, { childList: true, subtree: true, characterData: true });

      timeoutId = setTimeout(() => {
        const ok = (el.textContent || "").replace(/\s+/g, "") === want;
        console.debug("[PinMate] GUARD ended: repairs=" + repairs + " final=" + (ok ? "OK" : "FAIL"));
        cleanup(ok);
      }, GUARD_MS);

      function cleanup(success) {
        clearTimeout(timeoutId);
        obs.disconnect();
        resolveGuard(success);
      }
    });
  }
  async function fillField(selectors, value, label) {
    try {
      // Collect known title elements so we can avoid accidentally re-filling them
      const titleEl = document.querySelector('#storyboard-selector-title')
        || document.querySelector('input[id*="title" i]')
        || document.querySelector('textarea[id*="title" i]');

      for (let i = 0; i < selectors.length; i++) {
        const s = selectors[i];
        const el = document.querySelector(s);
        if (!el) {
          console.debug("[PinMate] " + label + " selector[" + i + "] \"" + s + "\" -> NOT FOUND");
          continue;
        }
        if (root && root.contains(el)) {
          console.debug("[PinMate] " + label + " selector[" + i + "] \"" + s + "\" -> FOUND but inside panel, skipping");
          continue;
        }
        // For description: skip if this element IS the title field or inside it
        if (label === "description" && titleEl && (el === titleEl || titleEl.contains(el))) {
          console.debug("[PinMate] " + label + " selector[" + i + "] \"" + s + "\" -> FOUND but is title field, skipping");
          continue;
        }
        console.debug("[PinMate] filling " + label + " via \"" + s + "\" -> " +
          el.tagName + (el.id ? "#" + el.id : "") +
          (el.className ? "." + String(el.className).split(" ")[0].slice(0, 30) : "") +
          (el.isContentEditable ? " [contenteditable]" : "") +
          (el.getAttribute("aria-label") ? ' aria-label="' + el.getAttribute("aria-label") + '"' : "") +
          (el.getAttribute("placeholder") ? ' placeholder="' + el.getAttribute("placeholder") + '"' : ""));
        const ok = el.isContentEditable ? await fillEditable(el, value) : setNativeValue(el, value);
        console.debug("[PinMate] " + label + " fill result via \"" + s + "\" -> " + (ok ? "OK" : "FAILED"));
        if (ok) return true;
      }
      // Fallback for Pinterest: find by position — desc field is usually the
      // contenteditable sibling right after the title input area.
      if (label === "description") {
        const titleEl = document.querySelector('#storyboard-selector-title')
          || document.querySelector('input[id*="title" i]')
          || document.querySelector('textarea[id*="title" i]');
        if (titleEl) {
          // Walk up to a common container, then look for next contenteditable
          const container = titleEl.closest('[class*="draft"]') || titleEl.parentElement?.parentElement;
          if (container) {
            const candidates = container.querySelectorAll('[contenteditable="true"], div[placeholder], div[aria-label]');
            for (const c of candidates) {
              if (c === titleEl || titleEl.contains(c)) continue;
              if (c.isContentEditable || c.getAttribute("placeholder") || c.getAttribute("aria-label")) {
                console.debug("[PinMate] filling " + label + " via POSITION fallback -> " +
                  c.tagName + (c.className ? "." + String(c.className).split(" ")[0].slice(0, 20) : "") +
                  (c.isContentEditable ? " [contenteditable]" : "") +
                  (c.getAttribute("placeholder") ? ' placeholder="' + c.getAttribute("placeholder") + '"' : ""));
                const ok = c.isContentEditable ? await fillEditable(c, value) : setNativeValue(c, value);
                if (ok) return true;
              }
            }
          }
        }
        // Last resort: find any contenteditable div with description-like placeholder on the whole page
        const allDivs = document.querySelectorAll('div[placeholder], div[aria-label]');
        for (const d of allDivs) {
          if (root && root.contains(d)) continue;
          const ph = d.getAttribute("placeholder") || "";
          const al = d.getAttribute("aria-label") || "";
          if (/描述|description/i.test(ph + " " + al)) {
            console.debug("[PinMate] filling " + label + " via PAGE-SCAN fallback -> " +
              d.tagName + "." + String(d.className).split(" ")[0].slice(0, 20) +
              ' placeholder="' + ph + '"');
            const ok = d.isContentEditable ? await fillEditable(d, value) : setNativeValue(d, value);
            if (ok) return true;
          }
        }
      }
      console.debug("[PinMate] could NOT find field for " + label);
      return false;
    } catch (e) {
      console.error("[PinMate] fillField error:", e.message || e);
      return false;
    }
  }
  async function fillPinterest(title, description) {
    const titleSels = [
      '#storyboard-selector-title',
      'input[id*="title" i]',
      'textarea[id*="title" i]',
      'input[placeholder*="title" i]',
      'textarea[placeholder*="title" i]',
      'input[aria-label*="title" i]',
      'textarea[aria-label*="title" i]'
    ];
    const descSels = [
      // Pinterest Draft.js editor (highest priority — confirmed 2026-07)
      '.public-DraftEditor-content[contenteditable="true"]',
      'div[aria-label*="描述你的 Pin" i]',
      'div[aria-label*="describe your pin" i]',
      // by id / test-id (legacy)
      '#pin-draft-description [contenteditable="true"]',
      '#pin-draft-description',
      'div[data-test-id="pin-draft-description"] [contenteditable="true"]',
      'div[data-test-id="pin-draft-description"]',
      // standard semantic attributes
      'textarea[id*="description" i]',
      'textarea[placeholder*="description" i]',
      'textarea[aria-label*="description" i]',
      'div[contenteditable="true"][aria-label*="description" i]',
      'div[contenteditable="true"][placeholder*="description" i]',
      'div[contenteditable="true"][data-test-id*="description" i]',
      // Pinterest dynamic classes: match by placeholder (CN + EN)
      'div[placeholder*="描述" i]',
      'div[aria-label*="描述" i]',
      'div[placeholder*="description" i]',
      'div[aria-label*="description" i]',
      '[contenteditable="true"][placeholder*="pin" i]',
      '[contenteditable="true"][aria-label*="pin" i]'
    ];
    const okTitle = await fillField(titleSels, title, "title");
    const okDesc = await fillField(descSels, description, "description");
    return { okTitle, okDesc };
  }

  // ---------- background messaging ----------
  function ask(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (res) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, errorKey: "errNetwork" });
        } else {
          resolve(res || { ok: false, errorKey: "errApi" });
        }
      });
    });
  }

  // ---------- helpers ----------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
  function showNotice(msg, type = "info") {
    els.notice.textContent = msg;
    els.notice.className = "pm-notice show " + type;
  }
  function clearNotice() { els.notice.className = "pm-notice"; }
  function setLoading(on, key) {
    els.loading.className = on ? "pm-loading show" : "pm-loading";
    if (on) els.loadingText.textContent = t(key);
  }
  function busy(on) {
    els.btnGenerate.disabled = on;
    els.btnInsert.disabled = on;
    els.btnInsertTitle.disabled = on;
    els.btnInsertDesc.disabled = on;
  }

  // ---------- render ----------
  function renderStatus() {
    els.statusText.textContent = state.hasKey ? t("aiReady") : t("aiNotConfigured");
    els.status.className = "pm-status" + (state.hasKey ? "" : " off");
  }
  function renderContent() {
    const c = state.content;
    if (!c) {
      els.titleCard.style.display = "none";
      els.descCard.style.display = "none";
      els.insertRow.style.display = "none";
      return;
    }
    els.titleBody.textContent = c.title || "";
    els.descBody.textContent = c.description || "";
    els.titleCard.style.display = "block";
    els.descCard.style.display = "block";
    els.insertRow.style.display = "flex";
  }
  function renderPlaceholder() {
    els.placeholder.style.display = state.content ? "none" : "block";
  }

  function applyAll() {
    // translate static labels inside panel
    panel.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    renderStatus();
    renderContent();
    renderPlaceholder();
    els.langBtns.forEach((b) => b.classList.toggle("active", b.dataset.lang === CURRENT_LANG));
  }

  // ---------- actions ----------
  async function onGenerate() {
    clearNotice();
    if (!state.hasKey) return showNotice(t("errNoApiKey"), "error");

    setLoading(true, "oneClickGenerating");
    const payload = await getImagePayload();
    if (!payload) {
      setLoading(false);
      return showNotice(t("errNoImage"), "error");
    }
    const s = scrape();

    busy(true);
    const res = await ask({
      type: "PINMATE_GENERATE_DIRECT",
      imageUrl: payload,
      pageText: s.pageText,
      lang: state.generationLang
    });
    busy(false); setLoading(false);

    if (!res.ok) return showNotice(t(res.errorKey || "errApi"), "error");
    state.content = res.data;
    renderContent(); renderPlaceholder();
  }

  async function onInsert() {
    clearNotice();
    if (!state.content) return;
    busy(true);
    const r = await fillPinterest(state.content.title || "", state.content.description || "");
    busy(false);
    // Title filled synchronously; description fills in background via persistentFillDescription
    if (r.okTitle) {
      showNotice(t("inserted"), "ok");
      persistentFillDescription(state.content.description || "");
    } else if (r.okDesc) {
      showNotice(t("inserted"), "ok");
    } else {
      showNotice(t("errFieldsNotFound"), "error");
    }
  }
  async function onInsertTitle() {
    clearNotice();
    if (!state.content) return;
    busy(true);
    const ok = await fillField([
      '#storyboard-selector-title',
      'input[id*="title" i]',
      'textarea[id*="title" i]',
      'input[placeholder*="title" i]',
      'textarea[placeholder*="title" i]',
      'input[aria-label*="title" i]',
      'textarea[aria-label*="title" i]'
    ], state.content.title || "");
    busy(false);
    if (ok) showNotice(t("inserted"), "ok");
    else showNotice(t("errFieldsNotFound"), "error");
  }
  async function onInsertDesc() {
    clearNotice();
    if (!state.content) return;
    // Description uses persistent background fill — show success immediately
    showNotice(t("inserted"), "ok");
    persistentFillDescription(state.content.description || "");
  }

  // persistentFillDescription — 根治 Draft.js 描述空白：
  // Pinterest 的 Draft.js 初始化时间不确定（2-15秒），一次性 paste 常被覆盖。
  // 改为后台每 500ms 重试 paste，最多 15 秒，一旦验证匹配即停止。
  // 用户看到：点「全部填入」→ 立即成功 → 描述在后台自动出现，无空白闪烁。
  let _descFillTimer = null;
  function persistentFillDescription(description) {
    if (!description || _descFillTimer) return;
    const want = (description || "").replace(/\s+/g, "");
    if (!want) return;
    const descSels = [
      '.public-DraftEditor-content[contenteditable="true"]',
      'div[aria-label*="描述你的 Pin" i]',
      'div[aria-label*="describe your pin" i]',
      '#pin-draft-description [contenteditable="true"]',
      '#pin-draft-description',
      'div[data-test-id="pin-draft-description"] [contenteditable="true"]',
      'div[data-test-id="pin-draft-description"]',
      'div[contenteditable="true"][aria-label*="description" i]',
      'div[placeholder*="描述" i]',
      'div[aria-label*="描述" i]',
      'div[placeholder*="description" i]',
      'div[aria-label*="description" i]',
      '[contenteditable="true"][placeholder*="pin" i]',
      '[contenteditable="true"][aria-label*="pin" i]'
    ];
    let attempts = 0;
    const MAX_ATTEMPTS = 30; // 30 × 500ms = 15s
    _descFillTimer = setInterval(async () => {
      attempts++;
      if (attempts > MAX_ATTEMPTS) {
        clearInterval(_descFillTimer);
        _descFillTimer = null;
        console.debug("[PinMate] desc-fill: gave up after " + MAX_ATTEMPTS + " attempts");
        return;
      }
      let el = null;
      for (const s of descSels) {
        const c = document.querySelector(s);
        if (c && (!root || !root.contains(c))) { el = c; break; }
      }
      if (!el) return;
      const current = (el.textContent || "").replace(/\s+/g, "");
      if (current === want) {
        clearInterval(_descFillTimer);
        _descFillTimer = null;
        console.debug("[PinMate] desc-fill: already has text (attempt " + attempts + ")");
        return;
      }
      try {
        el.click(); el.focus();
        await new Promise((r) => setTimeout(r, 80));
        document.execCommand("selectAll", false, null);
        await navigator.clipboard.writeText(description);
        document.execCommand("paste", false, null);
        el.dispatchEvent(new ClipboardEvent("paste", {
          bubbles: true, cancelable: true,
          dataType: "text/plain", data: description
        }));
        el.dispatchEvent(new InputEvent("input", {
          bubbles: true, data: description, inputType: "insertFromPaste"
        }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        await new Promise((r) => setTimeout(r, 200));
        const after = (el.textContent || "").replace(/\s+/g, "");
        if (after === want) {
          clearInterval(_descFillTimer);
          _descFillTimer = null;
          console.debug("[PinMate] desc-fill: SUCCESS on attempt " + attempts);
        }
      } catch (err) {
        // keep retrying
      }
    }, 500);
  }

  async function onClear() {
    clearNotice();
    // Clear the Pinterest title + description fields we filled.
    await fillPinterest("", "");
    state.content = null;
    renderContent();
    renderPlaceholder();
    showNotice(t("cleared"), "ok");
  }

  async function onCopy(kind, btn) {
    const text = kind === "title" ? (state.content && state.content.title)
      : (state.content && state.content.description);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const old = btn.textContent;
      btn.textContent = t("copied");
      setTimeout(() => { btn.textContent = old; }, 1200);
    } catch (_) {}
  }

  async function onLang(lang) {
    setLang(lang);
    await Storage.setConfig({ lang });
    applyAll();
  }

  function togglePanel(show) {
    const collapsed = typeof show === "boolean" ? !show : panel.classList.contains("pm-collapsed");
    panel.classList.toggle("pm-collapsed", collapsed);
    const btn = panel.querySelector("#pm-close");
    if (btn) btn.textContent = collapsed ? "+" : "−";
    Storage.setConfig({ panelCollapsed: collapsed });
  }

  // ---------- drag ----------
  let didDrag = false;
  function enableDrag(handle, target) {
    let sx, sy, sl, st, dragging = false, moved = false;
    handle.addEventListener("mousedown", (e) => {
      if (e.target.closest(".pm-close")) return;
      dragging = true; moved = false;
      const rect = target.getBoundingClientRect();
      sl = rect.left; st = rect.top; sx = e.clientX; sy = e.clientY;
      target.style.left = sl + "px";
      target.style.top = st + "px";
      target.style.right = "auto";
      document.body.style.userSelect = "none";
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
      let nl = sl + dx;
      let nt = st + dy;
      const maxL = window.innerWidth - target.offsetWidth - 4;
      const maxT = window.innerHeight - target.offsetHeight - 4;
      nl = Math.max(4, Math.min(nl, maxL));
      nt = Math.max(4, Math.min(nt, maxT));
      target.style.left = nl + "px";
      target.style.top = nt + "px";
    });
    window.addEventListener("mouseup", () => {
      if (!dragging) return;
      dragging = false;
      didDrag = moved;
      document.body.style.userSelect = "";
      setTimeout(() => { didDrag = false; }, 0);
    });
  }

  // ---------- build UI ----------
  function build() {
    root = document.createElement("div");
    root.id = "pinmate-root";

    // panel — shown by default; user can collapse to a compact strip
    panel = document.createElement("div");
    panel.id = "pinmate-panel";
    panel.innerHTML = `
      <div class="pm-header" id="pm-header">
        <div class="pm-brand">
          <span class="pm-brand-name">PinMate</span>
        </div>
        <div class="pm-head-right">
          <span class="pm-status off" id="pm-status">
            <span class="pm-dot"></span><span id="pm-status-text" data-i18n="aiNotConfigured"></span>
          </span>
          <button class="pm-close" id="pm-close" title="${t("close")}">−</button>
        </div>
      </div>
      <div class="pm-body">
        <div class="pm-actions">
          <button class="pm-btn pm-btn-primary pm-btn-block" id="pm-generate" data-i18n="oneClickGenerate"></button>
        </div>
        <div class="pm-notice" id="pm-notice"></div>
        <div class="pm-loading" id="pm-loading"><span class="pm-spinner"></span><span id="pm-loading-text"></span></div>

        <div class="pm-card" id="pm-title-card" style="display:none;">
          <div class="pm-card-head">
            <span class="pm-card-title" data-i18n="titleCard"></span>
            <button class="pm-btn pm-btn-mini" data-copy="title" data-i18n="copy"></button>
          </div>
          <div class="pm-card-body" id="pm-title-body"></div>
        </div>

        <div class="pm-card" id="pm-desc-card" style="display:none;">
          <div class="pm-card-head">
            <span class="pm-card-title" data-i18n="descriptionCard"></span>
            <button class="pm-btn pm-btn-mini" data-copy="desc" data-i18n="copy"></button>
          </div>
          <div class="pm-card-body" id="pm-desc-body"></div>
        </div>

        <div class="pm-insert-row" id="pm-insert-row" style="display:none;">
          <button class="pm-btn pm-btn-primary pm-btn-flex" id="pm-insert-all" data-i18n="insertAll"></button>
          <button class="pm-btn pm-btn-outline pm-btn-mini" id="pm-insert-title" data-i18n="insertTitleOnly"></button>
          <button class="pm-btn pm-btn-outline pm-btn-mini" id="pm-insert-desc" data-i18n="insertDescOnly"></button>
          <button class="pm-btn pm-btn-ghost" id="pm-clear" data-i18n="clear"></button>
        </div>

        <div class="pm-placeholder" id="pm-placeholder" data-i18n="resultPlaceholder"></div>
      </div>
      <div class="pm-footer">
        <button class="pm-btn pm-btn-ghost" id="pm-settings" data-i18n="settings"></button>
        <div class="pm-lang">
          <button class="pm-lang-btn" data-lang="en">EN</button>
          <button class="pm-lang-btn" data-lang="zh">中文</button>
        </div>
      </div>
    `;

    root.appendChild(panel);
    document.body.appendChild(root);

    els = {
      status: panel.querySelector("#pm-status"),
      statusText: panel.querySelector("#pm-status-text"),
      btnGenerate: panel.querySelector("#pm-generate"),
      btnInsert: panel.querySelector("#pm-insert-all"),
      btnInsertTitle: panel.querySelector("#pm-insert-title"),
      btnInsertDesc: panel.querySelector("#pm-insert-desc"),
      btnClear: panel.querySelector("#pm-clear"),
      insertRow: panel.querySelector("#pm-insert-row"),
      notice: panel.querySelector("#pm-notice"),
      loading: panel.querySelector("#pm-loading"),
      loadingText: panel.querySelector("#pm-loading-text"),
      titleCard: panel.querySelector("#pm-title-card"),
      titleBody: panel.querySelector("#pm-title-body"),
      descCard: panel.querySelector("#pm-desc-card"),
      descBody: panel.querySelector("#pm-desc-body"),
      placeholder: panel.querySelector("#pm-placeholder"),
      langBtns: panel.querySelectorAll(".pm-lang-btn")
    };

    // events
    els.btnGenerate.addEventListener("click", onGenerate);
    els.btnInsert.addEventListener("click", onInsert);
    els.btnInsertTitle.addEventListener("click", onInsertTitle);
    els.btnInsertDesc.addEventListener("click", onInsertDesc);
    els.btnClear.addEventListener("click", onClear);
    panel.querySelector("#pm-close").addEventListener("click", (e) => {
      e.stopPropagation();
      const collapsed = panel.classList.contains("pm-collapsed");
      togglePanel(collapsed); // if folded, expand; if expanded, fold
    });
    // Click header (when folded) to expand
    panel.querySelector("#pm-header").addEventListener("click", (e) => {
      if (e.target.closest(".pm-close")) return;
      if (didDrag) return;
      if (panel.classList.contains("pm-collapsed")) togglePanel(true);
    });
    panel.querySelector("#pm-settings").addEventListener("click", () =>
      chrome.runtime.sendMessage({ type: "PINMATE_OPEN_SETTINGS" }));
    panel.querySelectorAll("[data-copy]").forEach((btn) =>
      btn.addEventListener("click", () => onCopy(btn.dataset.copy, btn)));
    els.langBtns.forEach((b) => b.addEventListener("click", () => onLang(b.dataset.lang)));

    enableDrag(panel.querySelector("#pm-header"), panel);
  }

  // ---------- init ----------
  async function init() {
    build();
    const cfg = await Storage.getConfig();
    const lang = resolveInitialLang(cfg.lang);
    setLang(lang);
    // Persist auto-detected language
    if (!cfg.lang) await Storage.setConfig({ lang });
    state.generationLang = cfg.generationLang || "en";
    const res = await ask({ type: "PINMATE_HASKEY" });
    state.hasKey = !!(res && res.hasKey);
    // restore last panel state (default = expanded)
    togglePanel(!cfg.panelCollapsed);
    applyAll();
  }

  if (document.body) init();
  else document.addEventListener("DOMContentLoaded", init);
})();
