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

  // Manifest handles URL filtering — panel always builds on match.
  const state = {
    content: null, // { title, description }
    hasKey: false,
    generationLang: "en"
  };

  let root, panel, els;

  // ---------- DOM scraping / filling (same page context) ----------
  // exclude tracking pixels / tiny icons
  // Allow blob: URLs (upload previews) and normal http(s) URLs.
  function isTiny(src) {
    if (!src) return true;
    if (src.startsWith("data:image/gif")) return true;
    // width <= 32px query param is likely a tracking/icon
    if (/[?&]w=\d{1,2}(&|$)/.test(src)) return true;
    return false;
  }

  function srcOf(el) {
    return (el && (el.currentSrc || el.src)) || "";
  }

  // ---------- shadow-DOM / deep tree helpers ----------
  // Recursively walk shadow roots and iframes so we can find images inside
  // Pinterest's React/Web Component trees.
  function querySelectorAllDeep(selector, rootNode = document) {
    const results = [];
    try {
      rootNode.querySelectorAll(selector).forEach((el) => results.push(el));
      rootNode.querySelectorAll("*").forEach((el) => {
        if (el.shadowRoot) {
          results.push(...querySelectorAllDeep(selector, el.shadowRoot));
        }
        if (el.tagName === "IFRAME" && el.contentDocument) {
          try {
            results.push(...querySelectorAllDeep(selector, el.contentDocument));
          } catch (_) {}
        }
      });
    } catch (_) {}
    return results;
  }
  function querySelectorDeep(selector, rootNode = document) {
    const all = querySelectorAllDeep(selector, rootNode);
    return all[0] || null;
  }

  function allImagesDeep() {
    return querySelectorAllDeep("img");
  }
  function allCanvasesDeep() {
    return querySelectorAllDeep("canvas");
  }

  // Wait until an image element has a real src / natural size.
  async function waitForImageReady(imgEl, timeout = 2000) {
    return new Promise((resolve) => {
      if (!imgEl) return resolve(false);
      if (imgEl.complete && imgEl.naturalWidth > 0) return resolve(true);
      const done = () => resolve(imgEl.complete && imgEl.naturalWidth > 0);
      imgEl.addEventListener("load", done, { once: true });
      imgEl.addEventListener("error", done, { once: true });
      setTimeout(done, timeout);
    });
  }

  // Pinterest may render the pin preview as a CSS background-image
  function pickBackgroundImage() {
    const cand = [];
    const walk = (node) => {
      node.querySelectorAll("div, section, figure, a, span").forEach((el) => {
        if (root && root.contains(el)) return;
        const r = el.getBoundingClientRect();
        if (r.width < 100 || r.height < 100) return;
        const bi = getComputedStyle(el).backgroundImage || "";
        const m = bi.match(/url\(["']?(.*?)["']?\)/);
        if (m && m[1] && !m[1].startsWith("data:")) {
          cand.push({ url: m[1], area: r.width * r.height });
        }
      });
      // Also descend into shadow roots
      node.querySelectorAll("*").forEach((el) => {
        if (el.shadowRoot) walk(el.shadowRoot);
      });
    };
    walk(document);
    if (!cand.length) return null;
    cand.sort((a, b) => b.area - a.area);
    return cand[0].url;
  }

  // Best-effort image locator. Returns { kind:'img'|'canvas'|'url', value } or null.
  async function pickImageElement() {
    const logs = [];
    const note = (tag, el, url) => {
      const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : { width: 0, height: 0 };
      logs.push(`${tag} ${Math.round(r.width)}x${Math.round(r.height)} ${String(url || "").slice(0, 60)}`);
    };
    const insidePanel = (el) => root && root.contains(el);

    // 1) Known Pinterest image containers (deep search through shadow DOM / iframes).
    const pinterestSels = [
      'div[data-test-id="pin-draft-image"] img',
      'div[data-test-id="storyboard-image"] img',
      'div[data-test-id="pin-image"] img',
      '[data-test-id="pin-closeup-image"] img',
      'div[data-test-id="storyboard-selector-image"] img',
      'div[data-test-id="pin-builder-draft-image"] img',
      'div[data-test-id="imageUploader"] img',
      'div[data-test-id="uploaded-image"] img',
      'div[data-test-id="draggable-image"] img',
      '[data-test-id="pin-builder-image"] img',
      'div[data-test-id="image-cropper"] img',
      'div[data-test-id="media-image"] img',
      ".pin-draft-image img",
      ".pin-draft img",
      "#image-container img",
      ".Upload img",
      ".upload img",
      'picture img',
      '[role="img"] img',
      '[role="image"] img',
      'img[fetchpriority="high"]',
      'img[srcset]'
    ];
    for (const s of pinterestSels) {
      const hits = querySelectorAllDeep(s);
      for (const el of hits) {
        if (insidePanel(el)) continue;
        const url = srcOf(el);
        note("pinterest", el, url);
        if (url && !isTiny(url)) {
          if (el.tagName === "IMG") await waitForImageReady(el, 500);
          console.debug("[PinMate] img candidates:\n" + logs.join("\n"));
          return { kind: "img", value: el };
        }
        // URL missing / suspicious, but element has real rendered size -> use it anyway
        if (el.tagName === "IMG" && (el.naturalWidth > 50 || el.naturalHeight > 50)) {
          console.debug("[PinMate] pinterest selector img with natural size " + el.naturalWidth + "x" + el.naturalHeight);
          console.debug("[PinMate] img candidates:\n" + logs.join("\n"));
          return { kind: "img", value: el };
        }
      }
    }

    // 2) ARIA image role container (Pinterest Create Pin sometimes uses div[role="image"])
    const ariaImgSels = ['[role="image"]', '[role="img"]'];
    for (const s of ariaImgSels) {
      const hits = querySelectorAllDeep(s);
      for (const el of hits) {
        if (insidePanel(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 60 || r.height < 60) continue;
        note("aria", el);
        const childTags = Array.from(el.children).map(c => c.tagName.toLowerCase() +
          (c.className ? '.' + String(c.className).split(' ')[0].slice(0, 20) : '')).join(', ');
        console.debug("[PinMate] found " + s + " (" + Math.round(r.width) + "x" + Math.round(r.height) +
          ") children: [" + childTags + "] innerHTML-len: " + (el.innerHTML || "").length);

        // 2a) inner <img>
        let innerImg = el.querySelector(":scope > img");
        if (!innerImg) innerImg = el.querySelector("img");
        if (innerImg) {
          const url = srcOf(innerImg);
          console.debug("[PinMate]   inner img src: " + String(url).slice(0, 120) +
            " naturalSize: " + innerImg.naturalWidth + "x" + innerImg.naturalHeight);
          if (url && !isTiny(url)) {
            await waitForImageReady(innerImg, 500);
            console.debug("[PinMate] img candidates:\n" + logs.join("\n"));
            return { kind: "img", value: innerImg };
          }
          if (innerImg.naturalWidth > 50 || innerImg.naturalHeight > 50) {
            console.debug("[PinMate]   using img despite suspicious src (has natural size)");
            console.debug("[PinMate] img candidates:\n" + logs.join("\n"));
            return { kind: "img", value: innerImg };
          }
        }

        // 2b) inner <canvas>
        const innerCv = el.querySelector("canvas");
        if (innerCv) {
          const cr = innerCv.getBoundingClientRect();
          if (cr.width > 50 && cr.height > 50) {
            console.debug("[PinMate] img candidates:\n" + logs.join("\n") + "\naria-canvas");
            return { kind: "canvas", value: innerCv };
          }
        }

        // 2c) CSS background-image on the container itself
        const bi = getComputedStyle(el).backgroundImage || "";
        const m = bi.match(/url\(["']?(.*?)["']?\)/);
        if (m && m[1] && !m[1].startsWith("data:")) {
          console.debug("[PinMate] img candidates:\n" + logs.join("\n") + "\naria-bg " + m[1].slice(0, 60));
          return { kind: "url", value: m[1] };
        }

        // 2d) deep recursive <img> search
        const allImgs = el.querySelectorAll("img");
        let bestDeepImg = null, bestDeepArea = 0;
        allImgs.forEach((img) => {
          const area = (img.naturalWidth || img.width) * (img.naturalHeight || img.height);
          if (area > bestDeepArea) { bestDeepImg = img; bestDeepArea = area; }
        });
        if (bestDeepImg && bestDeepArea > 2500) {
          console.debug("[PinMate]   deep-recursive img found: " + srcOf(bestDeepImg).slice(0, 100) +
            " area: " + bestDeepArea);
          console.debug("[PinMate] img candidates:\n" + logs.join("\n") + "\naria-deep-img");
          return { kind: "img", value: bestDeepImg };
        }

        console.debug("[PinMate]   WARNING: [role=\"image\"] found but NO extractable image source!" +
          " html-preview: " + (el.outerHTML || "").slice(0, 300));
      }
    }

    // 3) <picture> with <source> (Pinterest sometimes uses responsive picture)
    const pictures = querySelectorAllDeep("picture");
    for (const pic of pictures) {
      if (insidePanel(pic)) continue;
      const img = pic.querySelector("img");
      if (img) {
        const url = srcOf(img);
        if (url && !isTiny(url)) {
          note("picture", img, url);
          await waitForImageReady(img, 500);
          console.debug("[PinMate] img candidates:\n" + logs.join("\n"));
          return { kind: "img", value: img };
        }
      }
    }

    // 4) canvas (Pinterest upload preview is sometimes a <canvas>)
    let bestCanvas = null, bestC = 0;
    allCanvasesDeep().forEach((cv) => {
      if (insidePanel(cv)) return;
      const r = cv.getBoundingClientRect();
      const area = r.width * r.height;
      if (r.width > 80 && r.height > 80 && area > bestC) { bestCanvas = cv; bestC = area; }
    });
    if (bestCanvas) {
      console.debug("[PinMate] img candidates:\n" + logs.join("\n") + "\ncanvas " + Math.round(bestCanvas.width) + "x" + Math.round(bestCanvas.height));
      return { kind: "canvas", value: bestCanvas };
    }

    // 5) CSS background-image on any reasonably-sized element
    const bg = pickBackgroundImage();
    if (bg) return { kind: "url", value: bg };

    // 6) Broadest fallback: largest reasonably visible <img> (incl. blob: previews)
    let best = null, bestArea = 0;
    allImagesDeep().forEach((img) => {
      if (insidePanel(img)) return;
      const url = srcOf(img);
      if (isTiny(url)) return;
      const r = img.getBoundingClientRect();
      const area = r.width * r.height;
      if (area > bestArea && r.width > 60 && r.height > 60) { best = img; bestArea = area; }
    });
    if (best) {
      note("fallback", best, srcOf(best));
      await waitForImageReady(best, 500);
      console.debug("[PinMate] img candidates:\n" + logs.join("\n"));
      return { kind: "img", value: best };
    }

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

  // Convert a fetched blob to a base64 data URL.
  async function blobToDataUrl(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
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

  // Fetch a URL (blob or http(s)) and return a JPEG data URL.
  async function fetchAsDataUrl(src) {
    try {
      const res = await fetch(src);
      if (!res.ok) return null;
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) return null;
      const du = await blobToDataUrl(blob);
      return du;
    } catch (e) {
      return null;
    }
  }

  // Build a payload SiliconFlow can consume: a data URL when possible,
  // otherwise the raw http(s) URL (fetched server-side by SiliconFlow).
  async function getImagePayload() {
    const found = await pickImageElement();
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
      const src = found.value;
      if (src.startsWith("blob:")) {
        const du = await fetchAsDataUrl(src);
        if (du) return du;
      }
      const im = await loadCrossOrigin(src);
      if (im) {
        const du = await toDataUrl(im);
        if (du) return du;
      }
      return src; // raw URL fallback (SiliconFlow fetches server-side)
    }

    // <img> element
    const el = found.value;
    const url = srcOf(el);

    // Blob previews (common after uploading in Pinterest) are same-origin;
    // fetch + FileReader is more reliable than canvas drawImage.
    if (url.startsWith("blob:")) {
      const du = await fetchAsDataUrl(url);
      if (du) return du;
    }

    const du = await toDataUrl(el);
    if (du) return du;

    const im = await loadCrossOrigin(url);
    if (im) {
      const du2 = await toDataUrl(im);
      if (du2) return du2;
    }

    // Last resort: return the raw URL and let the AI provider fetch it server-side.
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
  // Fill a contenteditable (Draft.js) field — IMPROVED click-to-fill.
  //
  // Pinterest uses Draft.js (React-based rich text editor) for the description.
  // Draft.js renders from INTERNAL React state, NOT from the DOM, so a naive
  // `textContent = value` only changes the DOM and gets overwritten on the next
  // React re-render (e.g. when the user clicks/focuses the field).
  //
  // The reliable path is to let Draft.js capture the edit itself: focus the
  // editor, select all, then `document.execCommand('insertText')`. This fires
  // Draft.js's `editOnBeforeInput` -> `onChange`, which commits the text into
  // React state. From then on clicking/focusing does NOT revert it.
  //
  // Title (<input>) is handled in setNativeValue(); this only runs for
  // contenteditable fields.
  async function fillEditable(el, value) {
    if (!el) return false;
    const want = (value || "").replace(/\s+/g, "");
    if (!want) return false;

    // Wait for Draft.js editor to be present and editable
    await new Promise((resolve) => {
      let checks = 0;
      const ready = () =>
        el.matches('[contenteditable="true"]') ||
        el.querySelector('[contenteditable="true"], .public-DraftEditor-content');
      const iv = setInterval(() => {
        checks++;
        if (ready() || checks >= 15) { clearInterval(iv); resolve(); }
      }, 200);
    });

    // Resolve the deepest contenteditable element
    const editable = el.matches('[contenteditable="true"]')
      ? el
      : (el.querySelector('[contenteditable="true"]') || el);

    // Focus so the caret lives inside the Draft.js editor
    editable.focus();
    await new Promise((r) => setTimeout(r, 30));

    // Select everything (replaces any existing text / placeholder)
    const sel = window.getSelection();
    sel.removeAllRanges();
    const range = document.createRange();
    range.selectNodeContents(editable);
    sel.addRange(range);

    // Let Draft.js process the insertion itself -> committed into React state
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      try {
        ok = document.execCommand("insertText", false, value);
      } catch (_) { ok = false; }
      if (!ok) await new Promise((r) => setTimeout(r, 50));
    }

    if (!ok) {
      // Last-resort fallback: directly write the DOM (may revert on refocus)
      console.debug("[PinMate] fillEditable: execCommand failed, using DOM fallback");
      const target = editable.querySelector('span[data-text="true"]') || editable;
      target.textContent = value;
      editable.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }));
      ok = true;
    }
    editable.dispatchEvent(new Event("change", { bubbles: true }));
    // Hand focus back so the panel / page behaves normally
    editable.blur();

    console.debug("[PinMate] fillEditable: committed via execCommand =", ok);
    return true;
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

  // Shared description selectors (Draft.js contenteditable on Pinterest)
  const DescSels = [
    '.public-DraftEditor-content[contenteditable="true"]',
    'div[aria-label*="描述你的 Pin" i]',
    'div[aria-label*="describe your pin" i]',
    '#pin-draft-description [contenteditable="true"]',
    '#pin-draft-description',
    'div[data-test-id="pin-draft-description"] [contenteditable="true"]',
    'div[data-test-id="pin-draft-description"]',
    'textarea[id*="description" i]',
    'textarea[placeholder*="description" i]',
    'textarea[aria-label*="description" i]',
    'div[contenteditable="true"][aria-label*="description" i]',
    'div[contenteditable="true"][placeholder*="description" i]',
    'div[contenteditable="true"][data-test-id*="description" i]',
    'div[placeholder*="描述" i]',
    'div[aria-label*="描述" i]',
    'div[placeholder*="description" i]',
    'div[aria-label*="description" i]',
    '[contenteditable="true"][placeholder*="pin" i]',
    '[contenteditable="true"][aria-label*="pin" i]'
  ];

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
    const okTitle = await fillField(titleSels, title, "title");
    const okDesc = await fillField(DescSels, description, "description");
    return { okTitle, okDesc };
  }

  // Alt Text lives inside Pinterest's "More options" disclosure. We must expand
  // that section first, then target the textarea by its label / placeholder.
  const AltTextSels = [
    'textarea[id*="alt" i]',
    'textarea[aria-label*="alt text" i]',
    'textarea[aria-label*="visual details" i]',
    'textarea[placeholder*="alt text" i]',
    'textarea[placeholder*="visual details" i]',
    'textarea[placeholder*="替代文字" i]',
    'textarea[aria-label*="替代文字" i]',
    'div[contenteditable="true"][aria-label*="alt text" i]',
    'div[contenteditable="true"][placeholder*="alt text" i]'
  ];

  async function fillAltText(value) {
    // 1) Expand "More options" if it is collapsed.
    //    F12 confirms Pinterest's pin-draft "More options" button uses
    //    data-test-id="storyboard-show-more-options-button" and
    //    aria-controls="more-options-menu-items".
    //    NEVER match by aria-label: the top-nav account menu button also
    //    contains "options" and would open the profile dropdown instead.
    const moreBtn =
      document.querySelector('[data-test-id="storyboard-show-more-options-button"]') ||
      document.querySelector('button[aria-controls="more-options-menu-items"]') ||
      document.querySelector('button[aria-expanded][aria-controls*="more-options" i]');

    if (moreBtn && moreBtn.getAttribute("aria-expanded") !== "true") {
      try {
        moreBtn.click();
        await new Promise((r) => setTimeout(r, 400));
        console.debug("[PinMate] clicked 'More options' to reveal Alt Text field");
      } catch (e) {
        console.debug("[PinMate] could not click 'More options':", e.message || e);
      }
    }
    // 2) Fill the alt text field once it is available.
    return await fillField(AltTextSels, value, "altText");
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
  let _noticeKey = null;
  let _noticeType = "info";
  /**
   * Show a notice. Pass an i18n KEY (not the translated string) so that
   * applyAll() can re-render it when the user toggles language.
   * If you pass an unknown string, it's stored as-is and won't auto-refresh.
   */
  function showNotice(keyOrText, type = "info") {
    // Support an object form: showNotice({ type: "ok", text: "..." })
    if (keyOrText && typeof keyOrText === "object") {
      _noticeKey = null;
      _noticeType = keyOrText.type || "info";
      els.notice.textContent = keyOrText.text || "";
      els.notice.className = "pm-notice show " + _noticeType;
      return;
    }
    const isKey = I18N.en[keyOrText] != null || (I18N.zh && I18N.zh[keyOrText] != null);
    _noticeKey = isKey ? keyOrText : null;
    _noticeType = type;
    els.notice.textContent = isKey ? t(keyOrText) : keyOrText;
    els.notice.className = "pm-notice show " + type;
  }
  function clearNotice() {
    _noticeKey = null;
    els.notice.className = "pm-notice";
  }
  function setLoading(on, key) {
    els.loading.className = on ? "pm-loading show" : "pm-loading";
    if (on) els.loadingText.textContent = t(key);
  }
  function busy(on) {
    els.btnGenerate.disabled = on;
    els.btnInsert.disabled = on;
    els.btnInsertTitle.disabled = on;
    els.btnInsertDesc.disabled = on;
    if (els.btnInsertTags) els.btnInsertTags.disabled = on;
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
      if (els.keywordsCard) els.keywordsCard.style.display = "none";
      if (els.altCard) els.altCard.style.display = "none";
      return;
    }
    els.titleBody.textContent = c.title || "";
    els.descBody.textContent = c.description || "";
    els.titleCard.style.display = "block";
    els.descCard.style.display = "block";
    els.insertRow.style.display = "flex";

    // Alt Text card
    if (els.altCard && els.altBody) {
      const alt = (c.altText || "").trim();
      if (alt) {
        els.altBody.textContent = alt;
        els.altCard.style.display = "block";
        if (els.btnInsertAlt) els.btnInsertAlt.disabled = false;
      } else {
        els.altCard.style.display = "none";
        if (els.btnInsertAlt) els.btnInsertAlt.disabled = true;
      }
    }

    // Keywords (tags)
    const kws = (c.keywords || []).filter(Boolean);
    if (els.keywordsCard && els.keywordsList) {
      if (kws.length) {
        els.keywordsList.innerHTML = "";
        kws.forEach((kw) => {
          const chip = document.createElement("span");
          chip.className = "pm-chip";
          chip.textContent = kw;
          els.keywordsList.appendChild(chip);
        });
        els.keywordsCard.style.display = "block";
        if (els.btnInsertTags) els.btnInsertTags.disabled = false;
      } else {
        els.keywordsCard.style.display = "none";
      }
    }
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
    // Re-render notice so it follows the current language
    if (_noticeKey && els.notice.classList.contains("show")) {
      els.notice.textContent = t(_noticeKey);
      els.notice.className = "pm-notice show " + _noticeType;
    }
    // Safety: if the loading overlay is currently visible, refresh its label
    // immediately on language switch so we never see a stale translation.
    if (els.loading && els.loading.classList.contains("show")) {
      els.loadingText.textContent = t("oneClickGenerating");
    }
    els.langBtns.forEach((b) => b.classList.toggle("active", b.dataset.lang === CURRENT_LANG));
  }

  // ---------- actions ----------
  async function onGenerate() {
    clearNotice();
    if (!state.hasKey) return showNotice("errNoApiKey", "error");

    setLoading(true, "generating");
    // Retry a few times: Pinterest renders the uploaded image asynchronously,
    // so the first click right after upload may run before the <img>/<canvas>
    // has appeared in the DOM. First 2 attempts run back-to-back (selector
    // glitch); remaining 3 wait 500ms each. Worst case ≈ 1.5s, not 3.5s.
    let payload = null;
    for (let attempt = 0; attempt < 5 && !payload; attempt++) {
      if (attempt >= 2) await new Promise((r) => setTimeout(r, 500));
      payload = await getImagePayload();
    }
    if (!payload) {
      setLoading(false);
      return showNotice("errNoImage", "error");
    }
    const s = scrape();

    setLoading(true, "generating");
    busy(true);

    // After 15s with no response, surface a hint that the user can refresh
    // the page to retry. We don't abort the request — vision models often
    // legitimately take 20-40s — but the hint reassures the user that the
    // extension is still alive and offers a path forward.
    let slowTimer = null;
    let slowHinted = false;
    slowTimer = setTimeout(() => {
      slowHinted = true;
      showNotice({
        type: "info",
        text: t("slowGenHint") + " · " + t("refreshHint")
      });
    }, 15000);

    let res;
    try {
      res = await ask({
        type: "PINMATE_GENERATE_DIRECT",
        imageUrl: payload,
        pageText: s.pageText,
        lang: state.generationLang
      });
    } catch (e) {
      clearTimeout(slowTimer);
      busy(false); setLoading(false);
      // If background errored with TIMEOUT code, surface a clear message.
      const code = e && (e.code || (e.message && e.message.includes("TIMEOUT") ? "TIMEOUT" : ""));
      if (code === "TIMEOUT") return showNotice("errTimeout", "error");
      return showNotice("errApi", "error");
    }
    clearTimeout(slowTimer);
    if (slowHinted) clearNotice();
    busy(false); setLoading(false);

    if (!res.ok) return showNotice(res.errorKey || "errApi", "error");
    state.content = res.data;
    renderContent(); renderPlaceholder();
  }

  async function onInsert() {
    clearNotice();
    if (!state.content) return;
    busy(true);

    // Blur any currently focused field so Pinterest's React tree can flush
    // pending state before we touch multiple inputs in sequence. Without this,
    // filling tags right after Draft.js description commit leaves the tag
    // input in a half-mounted state and only ~2 keywords stick.
    try { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); } catch (_) {}

    const results = [];

    // Order matters: fill tags FIRST, before the heavyweight Draft.js
    // description commit. Draft.js triggers a full re-render of the form
    // and can detach / re-mount the tag input mid-loop, silently dropping
    // any keywords still queued. Filling tags while the form is quiet
    // matches the behavior of clicking the dedicated "Insert tags" button.
    const kws = (state.content.keywords || []).filter(Boolean);
    if (kws.length) {
      const tagsOk = await fillTaggedTopics(kws);
      if (tagsOk) results.push("keywords");
    }
    // Alt Text — only if generated
    const alt = (state.content.altText || "").trim();
    if (alt) {
      const altOk = await fillAltText(alt);
      if (altOk) results.push("altText");
    }

    // Title + description last: Draft.js description commit is the slowest
    // (React state propagation) and we don't want it to interrupt earlier work.
    const titleOk = await fillField([
      '#storyboard-selector-title',
      'input[id*="title" i]',
      'textarea[id*="title" i]',
      'input[placeholder*="title" i]',
      'textarea[placeholder*="title" i]',
      'input[aria-label*="title" i]',
      'textarea[aria-label*="title" i]'
    ], state.content.title || "", "title");
    if (titleOk) results.push("title");
    // Description: committed into Draft.js state (no refresh needed)
    const okDesc = await fillField(DescSels, state.content.description || "", "description");
    if (okDesc) results.push("description");

    busy(false);

    if (results.length === 0) {
      return showNotice("errFieldsNotFound", "error");
    }
    // Build a localized notice based on which fields were filled.
    const labels = results.map((k) => t(k + "Field")).join("、");
    showNotice({ type: "ok", text: t("insertedFields", { fields: labels }) });
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
    if (ok) showNotice("inserted", "ok");
    else showNotice("errFieldsNotFound", "error");
  }
  async function onInsertDesc() {
    clearNotice();
    if (!state.content) return;
    busy(true);
    const ok = await fillField(DescSels, state.content.description || "", "description");
    busy(false);
    if (ok) showNotice("descInserted", "ok");
    else showNotice("errFieldsNotFound", "error");
  }

  // (persistentFillDescription removed — Draft.js cannot be filled programmatically.
  //  Use fillEditable() which does a direct DOM write; user must refresh to see content.)

  async function onClear() {
    clearNotice();
    // Clear the Pinterest title + description fields we filled.
    await fillPinterest("", "");
    state.content = null;
    renderContent();
    renderPlaceholder();
    showNotice("cleared", "ok");
  }

  async function onCopy(kind, btn) {
    let text;
    if (kind === "title") text = state.content && state.content.title;
    else if (kind === "desc") text = state.content && state.content.description;
    else if (kind === "keywords") text = (state.content && state.content.keywords || []).filter(Boolean).join(", ");
    else if (kind === "alt") text = state.content && state.content.altText;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const old = btn.textContent;
      btn.textContent = t("copied");
      setTimeout(() => { btn.textContent = old; }, 1200);
    } catch (_) {}
  }

  // Fill Pinterest "Alt Text" field (inside "More options") with the generated alt text.
  async function onInsertAlt() {
    clearNotice();
    const val = state.content && state.content.altText;
    if (!val) return showNotice("errNoAlt", "error");
    busy(true);
    const ok = await fillAltText(val);
    busy(false);
    if (ok) showNotice("altInserted", "ok");
    else showNotice("errFieldsNotFound", "error");
  }

  // Fill Pinterest "Tagged topics" field with the generated keywords.
  async function onInsertTags() {
    clearNotice();
    if (!state.content) return;
    const kws = (state.content.keywords || []).filter(Boolean);
    if (!kws.length) return showNotice("errNoKeywords", "error");

    busy(true);
    const ok = await fillTaggedTopics(kws);
    busy(false);
    if (ok) showNotice("tagsInserted", "ok");
    else showNotice("errTagFieldNotFound", "error");
  }

  // Pinterest's "Tagged topics" input: an input with placeholder/text containing
  // "tag", plus a Draft.js contenteditable that may appear after focusing.
  async function fillTaggedTopics(kws) {
    const sels = [
      'input[placeholder*="tag" i]',
      'input[aria-label*="tag" i]',
      'input[id*="tag" i]',
      'input[placeholder*="topic" i]',
      'input[aria-label*="topic" i]'
    ];
    // Resolve the current tag input. Must be called fresh each iteration:
    // after filling title/description Pinterest may re-render and replace the
    // input DOM node, leaving the old reference detached (writes silently lost).
    const findInput = () => {
      for (const sel of sels) {
        const el = document.querySelector(sel);
        if (el && el.isConnected) return el;
      }
      return null;
    };

    let input = findInput();
    if (!input) return false;

    let committed = 0;
    for (const kw of kws) {
      // Re-resolve before each keyword in case the previous commit replaced the node.
      input = findInput();
      if (!input) break;
      // Pinterest occasionally disables the tag input while it is mid-commit;
      // wait briefly for it to come back to a writable state.
      for (let waits = 0; waits < 5 && (input.disabled || input.readOnly); waits++) {
        await new Promise((r) => setTimeout(r, 80));
        input = findInput();
        if (!input) break;
      }
      if (!input) break;

      input.focus();
      setNativeValue(input, kw);
      await new Promise((r) => setTimeout(r, 120));
      // Pinterest commits a tag on Enter or comma keydown.
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keydown", { key: ",", code: "Comma", keyCode: 188, bubbles: true }));
      // Wait for Pinterest to actually commit the tag chip and reset the input.
      // 250ms is empirically the minimum that survives the Draft.js / React
      // re-render cycle on Pinterest Create Pin.
      await new Promise((r) => setTimeout(r, 250));
      // If the input is now disconnected (Pinterest swapped in a new node),
      // the next iteration will pick the fresh one via findInput() — that's
      // already covered at the top of the loop.
      if (input.isConnected && input.value !== "") {
        // Pinterest's controlled input did not clear; force-clear for the next kw.
        setNativeValue(input, "");
      }
      committed++;
    }
    return committed > 0;
  }

  async function onLang(lang) {
    // Apply language immediately; persistence is best-effort and must NOT
    // block the UI (a failed chrome.storage call would throw and make the
    // language buttons appear "dead").
    setLang(lang);
    try {
      await Storage.setConfig({ lang });
    } catch (e) {
      console.warn("[PinMate] failed to persist language:", e);
    }
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
          <span class="pm-brand-name" data-i18n="panelName">PinMate</span>
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
          <div class="pm-insert-row" id="pm-title-insert" style="display:flex; margin-top:8px;">
            <button class="pm-btn pm-btn-outline pm-btn-block" id="pm-insert-title" data-i18n="insertToPinterest"></button>
          </div>
        </div>

        <div class="pm-card" id="pm-desc-card" style="display:none;">
          <div class="pm-card-head">
            <span class="pm-card-title" data-i18n="descriptionCard"></span>
            <button class="pm-btn pm-btn-mini" data-copy="desc" data-i18n="copy"></button>
          </div>
          <div class="pm-card-body" id="pm-desc-body"></div>
          <div class="pm-insert-row" id="pm-desc-insert" style="display:flex; margin-top:8px;">
            <button class="pm-btn pm-btn-outline pm-btn-block" id="pm-insert-desc" data-i18n="insertToPinterest"></button>
          </div>
        </div>

        <div class="pm-card" id="pm-keywords-card" style="display:none;">
          <div class="pm-card-head">
            <span class="pm-card-title" data-i18n="keywordsCard"></span>
            <button class="pm-btn pm-btn-mini" data-copy="keywords" data-i18n="copyAll"></button>
          </div>
          <div class="pm-chips" id="pm-keywords-list"></div>
          <div class="pm-insert-row" id="pm-keywords-insert" style="display:flex; margin-top:8px;">
            <button class="pm-btn pm-btn-outline pm-btn-block" id="pm-insert-tags" data-i18n="insertToPinterest"></button>
          </div>
        </div>

        <div class="pm-card" id="pm-alt-card" style="display:none;">
          <div class="pm-card-head">
            <span class="pm-card-title" data-i18n="altTextCard"></span>
            <button class="pm-btn pm-btn-mini" data-copy="alt" data-i18n="copy"></button>
          </div>
          <div class="pm-card-body" id="pm-alt-body"></div>
          <div class="pm-insert-row" id="pm-alt-insert" style="display:flex; margin-top:8px;">
            <button class="pm-btn pm-btn-outline pm-btn-block" id="pm-insert-alt" data-i18n="insertToPinterest"></button>
          </div>
        </div>

        <div class="pm-insert-row" id="pm-insert-row" style="display:none;">
          <button class="pm-btn pm-btn-primary pm-btn-flex" id="pm-insert-all" data-i18n="insertAll"></button>
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
      keywordsCard: panel.querySelector("#pm-keywords-card"),
      keywordsList: panel.querySelector("#pm-keywords-list"),
      btnInsertTags: panel.querySelector("#pm-insert-tags"),
      altCard: panel.querySelector("#pm-alt-card"),
      altBody: panel.querySelector("#pm-alt-body"),
      btnInsertAlt: panel.querySelector("#pm-insert-alt"),
      placeholder: panel.querySelector("#pm-placeholder"),
      langBtns: panel.querySelectorAll(".pm-lang-btn")
    };

    // events
    els.btnGenerate.addEventListener("click", onGenerate);
    els.btnInsert.addEventListener("click", onInsert);
    els.btnInsertTitle.addEventListener("click", onInsertTitle);
    els.btnInsertDesc.addEventListener("click", onInsertDesc);
    els.btnInsertTags.addEventListener("click", onInsertTags);
    els.btnInsertAlt.addEventListener("click", onInsertAlt);
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

  // ---------- panel visibility by injection scope ----------
  // Determines whether the panel should show on the CURRENT URL/DOM.
  // mode "full"      -> always show (default, matches current stable behavior)
  // mode "createOnly"-> only on Pinterest Create Pin pages (create panel context)
  //   We combine URL signal + DOM signal so it works even when Pinterest's SPA
  //   URL lacks the expected path segment (e.g. query-only or no trailing slash).
  function isCreatePinContext() {
    const href = location.href.toLowerCase();
    const urlHit = /pin-creation-tool|pin-builder|create-pin|pin\/[^\/]+\/edit/.test(href);
    if (urlHit) return true;
    // DOM signal: Pinterest Create Pin form elements exist on the page.
    const domHit = !!(
      document.querySelector('[data-test-id="pin-draft-image"]') ||
      document.querySelector('[data-test-id="pin-builder-draft-image"]') ||
      document.querySelector('[data-test-id="pin-draft-description"]') ||
      document.querySelector('[data-test-id="pin-builder-description"]') ||
      document.querySelector('input[id*="title" i]') ||
      document.querySelector('textarea[id*="title" i]') ||
      document.querySelector('.public-DraftEditor-content') ||
      document.querySelector('[data-test-id="imageUploader"]')
    );
    return domHit;
  }

  function updatePanelVisibility() {
    if (!root) return;
    const mode = (state.injectMode || "full");
    const show = mode === "full" || isCreatePinContext();
    root.style.display = show ? "" : "none";
  }

  // ---------- init ----------
  async function doInit() {
    try {
      build();
      const cfg = await Storage.getConfig();
      const lang = resolveInitialLang(cfg.lang);
      setLang(lang);
      // Persist auto-detected language
      if (!cfg.lang) await Storage.setConfig({ lang });
      state.generationLang = cfg.generationLang || "en";
      state.injectMode = cfg.injectMode || "full";
      const res = await ask({ type: "PINMATE_HASKEY" });
      state.hasKey = !!(res && res.hasKey);
      // restore last panel state (default = expanded)
      togglePanel(!cfg.panelCollapsed);
      applyAll();
      // Apply injection-scope visibility immediately
      updatePanelVisibility();

      // Live-update visibility when settings change (no page refresh needed).
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === "local" && changes.pinmate_config) {
            const next = changes.pinmate_config.newValue || {};
            if (next.injectMode && next.injectMode !== state.injectMode) {
              state.injectMode = next.injectMode;
              updatePanelVisibility();
            }
          }
        });
      }

      // Re-evaluate on SPA route changes (Pinterest uses pushState, no reload).
      let lastHref = location.href;
      const recheck = () => {
        if (location.href !== lastHref) { lastHref = location.href; }
        updatePanelVisibility();
      };
      window.addEventListener("popstate", recheck);
      window.addEventListener("hashchange", recheck);
      // Patch pushState/replaceState so SPA navigation triggers a recheck.
      const wrapNav = (orig) => function () {
        const r = orig.apply(this, arguments);
        recheck();
        return r;
      };
      history.pushState = wrapNav(history.pushState);
      history.replaceState = wrapNav(history.replaceState);
      // Lightweight DOM poll as a fallback for SPA + async form rendering.
      setInterval(recheck, 1000);
    } catch (e) {
      console.error("[PinMate] init error:", e && e.message ? e.message : e);
    }
  }

  if (document.body) doInit();
  else document.addEventListener("DOMContentLoaded", doInit);
})();
