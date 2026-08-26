/**
 * ai.js — AI API client for PinMate.
 * Exposes:
 *   AI.testConnection(cfg)
 *   AI.analyzeImage(cfg, { imageUrl, pageText, lang })
 *   AI.generateContent(cfg, { analysis, lang })
 *   AI.generateDirect(cfg, { imageUrl, pageText, lang })
 *   AI.generateSingle(cfg, { analysis, lang, field, imageUrl })
 *
 * Supports three API shapes:
 *   - OpenAI-compatible (siliconflow / openai / custom): POST {base}/chat/completions
 *   - Gemini: POST {base}/models/{model}:generateContent?key=KEY
 *
 * Multi-key rotation: cfg.apiKeys (array). On a 401/403 (key rejected) we rotate
 * to the next non-empty key and remember the working index in chrome.storage so
 * subsequent calls keep using a healthy key. Best for free-tier round-robin pools.
 *
 * No API key is bundled; keys come from chrome.storage.local.
 */
const AI = {
  // Per-provider rotation cursor (index into apiKeys that worked last time).
  _rotationKey: "pinmate_rotation",

  _normalizeBase(input) {
    let b = (input || "").trim().replace(/\/+$/, "");
    if (!b) return "https://api.siliconflow.cn/v1";
    b = b.replace(/\/(chat|images|embeddings|audio)\/(completions|messages)$/i, "");
    b = b.replace(/\/v1\/messages$/i, "");
    return b;
  },

  _isGemini(cfg) {
    return (cfg.provider || "") === "gemini";
  },

  /** Pick the starting key index for rotation, based on last successful index. */
  async _rotationStart(provider, keys) {
    const valid = keys.filter((k) => k && k.trim());
    if (valid.length <= 1) return 0;
    try {
      const data = await chrome.storage.local.get(this._rotationKey);
      const map = (data && data[this._rotationKey]) || {};
      const idx = map[provider];
      if (typeof idx === "number" && idx >= 0 && idx < keys.length && keys[idx] && keys[idx].trim()) {
        return idx;
      }
    } catch (_) {}
    return 0;
  },

  async _saveRotation(provider, idx) {
    try {
      const data = await chrome.storage.local.get(this._rotationKey);
      const map = (data && data[this._rotationKey]) || {};
      map[provider] = idx;
      await chrome.storage.local.set({ [this._rotationKey]: map });
    } catch (_) {}
  },

  /**
   * Run an async API call against the provider with key rotation.
   * `runner(key)` should perform the actual fetch and:
   *   - throw an error with e.code = "AUTH" on 401/403 (key rejected)
   *   - throw other errors (network/timeout/api) as-is
   * Returns { result, keyIndex } so caller can persist rotation on success.
   */
  async _withRotation(cfg, runner) {
    const keys = Array.isArray(cfg.apiKeys)
      ? cfg.apiKeys.map((k) => String(k || "").trim()).filter(Boolean)
      : (cfg.apiKey && cfg.apiKey.trim() ? [cfg.apiKey.trim()] : []);
    if (!keys.length) {
      const e = new Error("NO_API_KEY");
      e.code = "NO_API_KEY";
      throw e;
    }
    const provider = cfg.provider || "siliconflow";
    const start = await this._rotationStart(provider, keys);
    const order = [];
    for (let i = 0; i < keys.length; i++) order.push((start + i) % keys.length);

    let lastErr = null;
    for (const idx of order) {
      try {
        const result = await runner(keys[idx]);
        await this._saveRotation(provider, idx);
        return { result, keyIndex: idx };
      } catch (err) {
        lastErr = err;
        if (err && err.code === "AUTH") continue; // try next key
        throw err; // non-auth errors stop immediately
      }
    }
    throw lastErr || (() => { const e = new Error("NO_API_KEY"); e.code = "NO_API_KEY"; return e; })();
  },

  // ---------- OpenAI-compatible chat ----------
  _endpoint(cfg) {
    const base = this._normalizeBase(cfg.apiBase).replace(/\/chat\/completions$/, "");
    return base + "/chat/completions";
  },

  async _openaiChat(cfg, { model, messages, jsonMode = false, maxTokens = 800, apiKey }) {
    const body = {
      model,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens
    };
    if (jsonMode) body.response_format = { type: "json_object" };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);

    let resp;
    try {
      resp = await fetch(this._endpoint(cfg), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + apiKey
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } catch (netErr) {
      clearTimeout(timer);
      const e = new Error((netErr && netErr.name === "AbortError") ? "TIMEOUT" : "NETWORK");
      e.code = (netErr && netErr.name === "AbortError") ? "TIMEOUT" : "NETWORK";
      throw e;
    }
    clearTimeout(timer);

    if (resp.status === 401 || resp.status === 403) {
      const e = new Error("INVALID_API_KEY");
      e.code = "AUTH";
      throw e;
    }
    if (!resp.ok) {
      let detail = "";
      try { detail = (await resp.text()).slice(0, 300); } catch (_) {}
      const e = new Error("API " + resp.status + " " + detail);
      e.code = "API";
      e.status = resp.status;
      throw e;
    }

    const data = await resp.json();
    const content = data && data.choices && data.choices[0] &&
      data.choices[0].message && data.choices[0].message.content;
    if (!content) {
      const e = new Error("EMPTY");
      e.code = "API";
      throw e;
    }
    return content;
  },

  // ---------- Gemini chat ----------
  _geminiEndpoint(cfg, model) {
    const base = this._normalizeBase(cfg.apiBase) || "https://generativelanguage.googleapis.com/v1beta";
    return base + "/models/" + encodeURIComponent(model) + ":generateContent";
  },

  async _geminiChat(cfg, { model, messages, jsonMode = false, maxTokens = 800, apiKey }) {
    // Convert OpenAI-style messages into Gemini contents.
    const contents = [];
    let systemInstruction = "";
    for (const m of messages) {
      if (m.role === "system") { systemInstruction += (systemInstruction ? "\n" : "") + m.content; continue; }
      const role = m.role === "assistant" ? "model" : "user";
      const parts = [];
      const content = m.content;
      if (typeof content === "string") {
        parts.push({ text: content });
      } else if (Array.isArray(content)) {
        for (const part of content) {
          if (part.type === "text") parts.push({ text: part.text });
          else if (part.type === "image_url") {
            const url = part.image_url && part.image_url.url;
            if (url) {
              if (url.startsWith("data:")) {
                const m = url.match(/^data:([^;]+);base64,(.*)$/);
                if (m) parts.push({ inline_data: { mime_type: m[1], data: m[2] } });
              } else {
                parts.push({ file_data: { file_uri: url } });
              }
            }
          }
        }
      }
      if (parts.length) contents.push({ role, parts });
    }

    const generationConfig = { maxOutputTokens: maxTokens, temperature: 0.7 };
    if (jsonMode) generationConfig.responseMimeType = "application/json";

    const payload = { contents };
    if (systemInstruction) payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    payload.generationConfig = generationConfig;

    const url = this._geminiEndpoint(cfg, model) + "?key=" + encodeURIComponent(apiKey);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);

    let resp;
    try {
      resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } catch (netErr) {
      clearTimeout(timer);
      const e = new Error((netErr && netErr.name === "AbortError") ? "TIMEOUT" : "NETWORK");
      e.code = (netErr && netErr.name === "AbortError") ? "TIMEOUT" : "NETWORK";
      throw e;
    }
    clearTimeout(timer);

    if (resp.status === 400 && jsonMode) {
      // Gemini may reject JSON mode for some models; retry once without it.
      try {
        const retry = await this._geminiChatRaw(cfg, { model, messages, maxTokens, apiKey });
        return retry;
      } catch (_) {}
    }
    if (resp.status === 400) {
      // Could be an invalid model name; surface a clearer error.
      let detail = "";
      try { detail = (await resp.text()).slice(0, 300); } catch (_) {}
      const e = new Error("API 400 " + detail);
      e.code = "API";
      e.status = 400;
      throw e;
    }
    if (resp.status === 403) {
      const e = new Error("INVALID_API_KEY");
      e.code = "AUTH";
      throw e;
    }
    if (!resp.ok) {
      let detail = "";
      try { detail = (await resp.text()).slice(0, 300); } catch (_) {}
      const e = new Error("API " + resp.status + " " + detail);
      e.code = "API";
      e.status = resp.status;
      throw e;
    }

    const data = await resp.json();
    const text = data && data.candidates && data.candidates[0] &&
      data.candidates[0].content && data.candidates[0].content.parts &&
      data.candidates[0].content.parts.map((p) => p.text || "").join("");
    if (!text) {
      const e = new Error("EMPTY");
      e.code = "API";
      throw e;
    }
    return text;
  },

  async _geminiChatRaw(cfg, { model, messages, maxTokens, apiKey }) {
    const contents = [];
    let systemInstruction = "";
    for (const m of messages) {
      if (m.role === "system") { systemInstruction += (systemInstruction ? "\n" : "") + m.content; continue; }
      const role = m.role === "assistant" ? "model" : "user";
      const parts = [];
      const content = m.content;
      if (typeof content === "string") parts.push({ text: content });
      else if (Array.isArray(content)) {
        for (const part of content) {
          if (part.type === "text") parts.push({ text: part.text });
          else if (part.type === "image_url") {
            const url = part.image_url && part.image_url.url;
            if (url && url.startsWith("data:")) {
              const mm = url.match(/^data:([^;]+);base64,(.*)$/);
              if (mm) parts.push({ inline_data: { mime_type: mm[1], data: mm[2] } });
            }
          }
        }
      }
      if (parts.length) contents.push({ role, parts });
    }
    const payload = { contents, generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 } };
    if (systemInstruction) payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    const url = this._geminiEndpoint(cfg, model) + "?key=" + encodeURIComponent(apiKey);
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    const t = data && data.candidates && data.candidates[0] &&
      data.candidates[0].content && data.candidates[0].content.parts &&
      data.candidates[0].content.parts.map((p) => p.text || "").join("");
    if (!t) { const e = new Error("EMPTY"); e.code = "API"; throw e; }
    return t;
  },

  /** Unified chat entry: routes to OpenAI or Gemini, with key rotation. */
  async _chat(cfg, opts) {
    const self = this;
    const { result } = await this._withRotation(cfg, async (key) => {
      if (self._isGemini(cfg)) {
        return self._geminiChat(cfg, Object.assign({}, opts, { apiKey: key }));
      }
      return self._openaiChat(cfg, Object.assign({}, opts, { apiKey: key }));
    });
    return result;
  },

  /** Lightweight probe: validate key + endpoint by hitting the models list. */
  async testConnection(cfg) {
    const provider = cfg.provider || "siliconflow";
    const keys = Array.isArray(cfg.apiKeys)
      ? cfg.apiKeys.map((k) => String(k || "").trim()).filter(Boolean)
      : (cfg.apiKey && cfg.apiKey.trim() ? [cfg.apiKey.trim()] : []);
    if (!keys.length) {
      const e = new Error("NO_API_KEY");
      e.code = "NO_API_KEY";
      throw e;
    }

    const self = this;
    const base = this._normalizeBase(cfg.apiBase);
    const model = cfg.model || "";

    // Try each key; on AUTH rotate.
    const start = await this._rotationStart(provider, keys);
    const order = [];
    for (let i = 0; i < keys.length; i++) order.push((start + i) % keys.length);

    let lastErr = null;
    for (const idx of order) {
      const key = keys[idx];
      let res;
      try {
        if (self._isGemini(cfg)) {
          const url = base + "/models?key=" + encodeURIComponent(key);
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 15000);
          try {
            res = await fetch(url, { method: "GET", signal: controller.signal });
          } finally { clearTimeout(timer); }
        } else {
          const url = base + "/models";
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 15000);
          try {
            res = await fetch(url, {
              method: "GET",
              headers: { Authorization: "Bearer " + key },
              signal: controller.signal
            });
          } finally { clearTimeout(timer); }
        }
      } catch (err) {
        lastErr = new Error((err && err.name === "AbortError") ? "TIMEOUT" : "NETWORK_ERROR");
        lastErr.code = (err && err.name === "AbortError") ? "TIMEOUT" : "NETWORK";
        continue; // network error: try next key (maybe this key's quota/region down)
      }

      if (res.status === 401 || res.status === 403) {
        lastErr = new Error("INVALID_API_KEY");
        lastErr.code = "AUTH";
        continue;
      }
      if (res.status === 404) {
        const e = new Error("MODEL_NOT_FOUND");
        e.code = "BAD_URL";
        throw e;
      }
      if (!res.ok) {
        let detail = "";
        try { detail = (await res.text()).slice(0, 200); } catch (_) {}
        const e = new Error("HTTP_" + res.status + (detail ? ": " + detail : ""));
        e.code = "API";
        throw e;
      }

      let models = [];
      try {
        const data = await res.json();
        if (self._isGemini(cfg)) {
          const list = data.models || [];
          models = list.map((m) => (m && (m.name || m.model)) || "").filter(Boolean)
            .map((n) => n.replace(/^models\//, ""));
        } else {
          const list = data.models || data.data || data.list || (Array.isArray(data) ? data : []);
          models = list.map((m) => (m && (m.id || m.name || m.model)) || "").filter(Boolean);
        }
      } catch (_) {}

      const hasModel = !model || models.some((id) => id.toLowerCase() === model.toLowerCase());
      await this._saveRotation(provider, idx);
      return { ok: true, models, hasModel };
    }

    throw lastErr || (() => { const e = new Error("NO_API_KEY"); e.code = "NO_API_KEY"; return e; })();
  },

  /** Analyze the Pinterest image with a vision model. Returns a structured object. */
  async analyzeImage(cfg, { imageUrl, pageText = "", lang = "en" }) {
    const isZh = lang === "zh";
    const langLabel = isZh ? "Chinese (简体中文)" : "English";
    const sys = isZh
      ? "你是一名 Pinterest SEO 专家与图片分析师。请分析图片并以严格 JSON 格式返回，不要使用 markdown 代码块。所有文本字段必须用中文。"
      : "You are a Pinterest SEO expert and image analyst. " +
        "Analyze the image and return STRICT JSON only, no markdown fences.";
    const userText = isZh
      ? "分析这张图片用于 Pinterest，用中文回答。\n" +
        "页面上下文（可能为空）：" + (pageText || "无").slice(0, 500) + "\n\n" +
        "返回严格 JSON，包含以下字段：\n" +
        "{\n" +
        '  "subject": string,        // 图片主体\n' +
        '  "productType": string,    // 产品/品类（如有）\n' +
        '  "scene": string,          // 场景/环境\n' +
        '  "style": string,          // 视觉风格/氛围\n' +
        '  "audience": string,       // 目标 Pinterest 受众\n' +
        '  "keywords": string[]      // 6-10 个 Pinterest 搜索关键词（中文）\n' +
        "}"
      : "Analyze this image for Pinterest. Respond in " + langLabel + ".\n" +
        "Page context (may be empty): " + (pageText || "N/A").slice(0, 500) + "\n\n" +
        "Return JSON with exactly these keys:\n" +
        "{\n" +
        '  "subject": string,        // main subject of the image\n' +
        '  "productType": string,    // product/category if any\n' +
        '  "scene": string,          // scene/context\n' +
        '  "style": string,          // visual style/mood\n' +
        '  "audience": string,       // target Pinterest audience\n' +
        '  "keywords": string[]      // 6-10 Pinterest search keywords\n' +
        "}";

    const messages = [
      { role: "system", content: sys },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ];

    const raw = await this._chat(cfg, {
      model: cfg.model || "Qwen/Qwen3-Omni-30B-A3B-Instruct",
      messages,
      jsonMode: false,
      maxTokens: 700
    });

    return this._parseAnalysis(raw);
  },

  _parseAnalysis(raw) {
    let text = String(raw).trim();
    text = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1) text = text.slice(start, end + 1);

    let obj = {};
    try {
      obj = JSON.parse(text);
    } catch (_) {
      obj = { subject: String(raw).slice(0, 120) };
    }

    const arr = (v) => Array.isArray(v) ? v.filter(Boolean).map(String) : (v ? [String(v)] : []);
    return {
      subject: obj.subject || "",
      productType: obj.productType || obj.product_type || "",
      scene: obj.scene || "",
      style: obj.style || "",
      audience: obj.audience || obj.targetAudience || "",
      keywords: arr(obj.keywords)
    };
  },

  /** Generate Pinterest title + description (with hashtags) from an analysis object. */
  async generateContent(cfg, { analysis, lang = "en" }) {
    const isZh = lang === "zh";
    const sys = isZh
      ? "你是一名 Pinterest SEO 文案专家。请撰写高点击率、利于搜索的内容。只返回严格 JSON，不要使用 markdown 代码块。所有文本必须用中文。"
      : "You are a Pinterest SEO copywriter. Write high-CTR, search-friendly content. " +
        "Return STRICT JSON only, no markdown fences.";

    const user = isZh
      ? "基于以下分析，用中文撰写 Pinterest 内容：\n" +
        JSON.stringify(analysis) + "\n\n" +
        "规则：\n" +
        "- title：SEO 友好、简洁（不超过 100 字）、包含核心关键词，符合 Pinterest 搜索习惯。\n" +
        "- description：2-3 句自然流畅的中文描述，包含相关关键词，提升点击率。\n" +
        "- 将 3-6 个话题标签（#关键词）自然融入描述句子中。**绝对禁止**输出「Hashtags:」或「标签:」等前缀词，也不要把 hashtag 单独成行。\n" +
        "- keywords：另外返回 6-10 个独立的 Pinterest 搜索关键词（不含 # 号，纯关键词），用于标签/话题推荐。\n" +
        "- altText：1-2 句英文或中文（与生成语言一致）的图片替代文字（alt text），客观描述图片的视觉主体与场景，便于屏幕阅读器，不要堆砌关键词。\n" +
        "返回 JSON：{ \"title\": string, \"description\": string, \"keywords\": string[], \"altText\": string }"
      : "Write Pinterest content in " + (lang === "zh" ? "Chinese (简体中文)" : "English") +
        " based on this analysis:\n" +
        JSON.stringify(analysis) + "\n\n" +
        "Rules:\n" +
        "- title: SEO-friendly, concise (<= 100 chars), includes core keyword, matches Pinterest search habits.\n" +
        "- description: 2-3 natural sentences describing the image, includes relevant keywords, boosts click-through.\n" +
        "- Weave 3-6 hashtags (#Keyword) naturally into the description sentences. **NEVER** output a 'Hashtags:' or 'Tags:' prefix line, and never put hashtags on their own line.\n" +
        "- keywords: ALSO return 6-10 separate Pinterest search keywords (without the # sign, plain keywords) for tag/topic suggestions.\n" +
        "- altText: 1-2 sentences of image alt text (in the same language as the generation) describing the visual subject and scene objectively for screen readers, without stuffing keywords.\n" +
        "Return JSON: { \"title\": string, \"description\": string, \"keywords\": string[], \"altText\": string }";

    const raw = await this._chat(cfg, {
      model: cfg.model || "Qwen/Qwen3-Omni-30B-A3B-Instruct",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user }
      ],
      jsonMode: true,
      maxTokens: 600
    });

    return this._parseContent(raw, analysis);
  },

  _parseContent(raw, analysis) {
    let text = String(raw).trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1) text = text.slice(start, end + 1);

    let obj = {};
    try {
      obj = JSON.parse(text);
    } catch (_) {}

    let title = (obj.title || "").trim();
    let description = (obj.description || "").trim();
    const keywords = Array.isArray(obj.keywords) ? obj.keywords.filter(Boolean).map(String) : [];
    const altText = (obj.altText || "").trim();

    description = description.replace(/\n?[Hh]ashtags?\s*[:：]?\s*\n?(.*)/g, (match, tagsPart) => {
      return " " + tagsPart.trim();
    }).replace(/\n?[Tt]ags?\s*[:：]?\s*\n?(.*)/g, (match, tagsPart) => {
      return " " + tagsPart.trim();
    });

    if (description && !/#[^\s#]+/.test(description)) {
      const tags = (analysis && analysis.keywords ? analysis.keywords : [])
        .slice(0, 4)
        .map((k) => "#" + String(k).replace(/[^\p{L}\p{N}]/gu, ""))
        .filter((s) => s.length > 1);
      if (tags.length) description += " " + tags.join(" ");
    }

    return { title, description, keywords, altText };
  },

  /**
   * One-shot: analyze the image AND write title/description in a single call.
   */
  async generateDirect(cfg, { imageUrl, pageText = "", lang = "en" }) {
    const isZh = lang === "zh";
    const sys = isZh
      ? "你是一名 Pinterest SEO 文案专家。请直接基于图片生成高点击率、利于搜索的标题与描述。只返回严格 JSON，不要使用 markdown 代码块。所有文本必须用中文。"
      : "You are a Pinterest SEO copywriter. Generate high-CTR, search-friendly title and description directly from the image. Return STRICT JSON only, no markdown fences.";

    const userText = isZh
      ? "分析这张图片，直接为 Pinterest 生成 SEO 友好的标题和描述。\n" +
        "页面上下文（可能为空）：" + (pageText || "无").slice(0, 500) + "\n\n" +
        "要求：\n" +
        "- title：SEO 友好、简洁（不超过 100 字）、包含核心关键词，符合 Pinterest 搜索习惯。\n" +
        "- description：2-3 句自然流畅的中文描述，包含相关关键词，提升点击率。\n" +
        "- 将 3-6 个话题标签（#关键词）自然融入描述句子中。**绝对禁止**输出「Hashtags:」或「标签:」等前缀词，也不要把 hashtag 单独成行。\n" +
        "- keywords：另外返回 6-10 个独立的 Pinterest 搜索关键词（不含 # 号，纯关键词），用于标签/话题推荐。\n" +
        "- altText：1-2 句英文或中文（与生成语言一致）的图片替代文字（alt text），客观描述图片的视觉主体与场景，便于屏幕阅读器，不要堆砌关键词。\n" +
        "返回 JSON：{ \"title\": string, \"description\": string, \"keywords\": string[], \"altText\": string }"
      : "Analyze this image and directly write Pinterest title + description.\n" +
        "Page context (may be empty): " + (pageText || "N/A").slice(0, 500) + "\n\n" +
        "Rules:\n" +
        "- title: SEO-friendly, concise (<= 100 chars), includes core keyword, matches Pinterest search habits.\n" +
        "- description: 2-3 natural sentences describing the image, includes relevant keywords, boosts click-through.\n" +
        "- Weave 3-6 hashtags (#Keyword) naturally into the description sentences. **NEVER** output a 'Hashtags:' or 'Tags:' prefix line, and never put hashtags on their own line.\n" +
        "- keywords: ALSO return 6-10 separate Pinterest search keywords (without the # sign, plain keywords) for tag/topic suggestions.\n" +
        "- altText: 1-2 sentences of image alt text (in the same language as the generation) describing the visual subject and scene objectively for screen readers, without stuffing keywords.\n" +
        "Return JSON: { \"title\": string, \"description\": string, \"keywords\": string[], \"altText\": string }";

    const messages = [
      { role: "system", content: sys },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ];

    const raw = await this._chat(cfg, {
      model: cfg.model || "Qwen/Qwen3-Omni-30B-A3B-Instruct",
      messages,
      jsonMode: true,
      maxTokens: 800
    });

    return this._parseContent(raw, null);
  },

  /**
   * Regenerate a SINGLE field (title | description | keywords | altText) from an
   * existing analysis object. Avoids re-running vision analysis, so it is cheap.
   */
  _FIELD_LIMITS: { title: 100, description: 500, keywords: 300, altText: 500 },

  async generateSingle(cfg, { analysis, lang = "en", field, imageUrl }) {
    const isZh = lang === "zh";
    const LIMIT = this._FIELD_LIMITS[field] || 500;
    const FIELD_PROMPT = {
      title:
        isZh
          ? "- title：SEO 友好、简洁（不超过 100 字）、包含核心关键词，符合 Pinterest 搜索习惯。"
          : "- title: SEO-friendly, concise (<= 100 chars), includes core keyword, matches Pinterest search habits.",
      description:
        isZh
          ? "- description：2-3 句自然流畅的中文描述，包含相关关键词，提升点击率；将 3-6 个话题标签（#关键词）自然融入描述句子中，**绝对禁止**输出「Hashtags:」或「标签:」前缀词。"
          : "- description: 2-3 natural sentences describing the image, includes relevant keywords, boosts click-through; weave 3-6 hashtags (#Keyword) naturally into the sentences. **NEVER** output a 'Hashtags:' or 'Tags:' prefix line.",
      keywords:
        isZh
          ? "- keywords：返回 6-10 个独立的 Pinterest 搜索关键词（不含 # 号，纯关键词）。"
          : "- keywords: return 6-10 separate Pinterest search keywords (without the # sign, plain keywords).",
      altText:
        isZh
          ? "- altText：用中文写图片替代文字（alt text），1 句话即可，客观描述图片的视觉主体与场景，便于屏幕阅读器，不要堆砌关键词、不要编造图中没有的东西。"
          : "- altText: 1 sentence ONLY of image alt text (in English) describing the actual visual subject and scene objectively for screen readers, without stuffing keywords and without inventing objects not present in the image."
    };
    const LIMIT_LINE = isZh
      ? "\n- 硬性限制：本字段总长度**绝对不得超过 " + LIMIT + " 个字符**（含空格）。必须严格遵守。"
      : "\n- HARD LIMIT: this field MUST NOT exceed " + LIMIT + " characters total (including spaces). Strictly enforced.";
    const sys = isZh
      ? "你是一名 Pinterest SEO 文案专家。请基于图片（你真正看到的画面）生成指定字段。只返回严格 JSON，不要使用 markdown 代码块。所有文本必须用中文。"
      : "You are a Pinterest SEO copywriter. Generate the requested field from the actual image you see. Return STRICT JSON only, no markdown fences.";

    const userText = (isZh
      ? "基于这张图片（请看图），仅生成「" + field + "」字段。\n\n"
      : "Based on THIS image (look at it), generate ONLY the \"" + field + "\" field.\n\n") +
      "Image analysis context (use as reference, but trust what you actually see):\n" +
      JSON.stringify(analysis) + "\n\n" +
      "Rules:\n" + FIELD_PROMPT[field] + LIMIT_LINE + "\n" +
      "Return JSON: { \"" + field + "\": " + (field === "keywords" ? "string[]" : "string") + " }";

    const userContent = imageUrl
      ? [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      : userText;

    const raw = await this._chat(cfg, {
      model: cfg.model || "Qwen/Qwen3-Omni-30B-A3B-Instruct",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: userContent }
      ],
      jsonMode: true,
      maxTokens: field === "keywords" ? 300 : (field === "altText" ? 200 : 400)
    });

    const partial = this._parseSingle(raw, field, analysis);
    let truncated = false;
    let out = partial;
    if (typeof partial === "string") {
      if (partial.length > LIMIT) {
        out = partial.slice(0, LIMIT);
        truncated = true;
      }
    }
    return { [field]: out, __truncated: truncated };
  },

  _parseSingle(raw, field, analysis) {
    let text = String(raw).trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1) text = text.slice(start, end + 1);

    let obj = {};
    try { obj = JSON.parse(text); } catch (_) {}

    if (field === "keywords") {
      let kws = Array.isArray(obj.keywords) ? obj.keywords.filter(Boolean).map(String) : [];
      if (!kws.length && Array.isArray(obj[field])) kws = obj[field].filter(Boolean).map(String);
      return kws;
    }
    let val = (obj[field] || "").trim();
    if (field === "description") {
      val = val.replace(/\n?[Hh]ashtags?\s*[:：]?\s*\n?(.*)/g, (m, tags) => " " + tags.trim())
               .replace(/\n?[Tt]ags?\s*[:：]?\s*\n?(.*)/g, (m, tags) => " " + tags.trim());
      if (val && !/#[^\s#]+/.test(val)) {
        const tags = (analysis && analysis.keywords ? analysis.keywords : [])
          .slice(0, 4)
          .map((k) => "#" + String(k).replace(/[^\p{L}\p{N}]/gu, ""))
          .filter((s) => s.length > 1);
        if (tags.length) val += " " + tags.join(" ");
      }
    }
    return val;
  },

  /** Map an error to an i18n key for friendly UI messages. */
  errorKey(err) {
    if (!err) return "errApi";
    if (err.code === "NO_API_KEY") return "errNoApiKey";
    if (err.code === "AUTH") return "errAuth";
    if (err.code === "BAD_URL") return "errBadUrl";
    if (err.code === "NETWORK") return "errNetwork";
    if (err.code === "TIMEOUT") return "errTimeout";
    return "errApi";
  }
};
