/**
 * ai.js — SiliconFlow API client for PinMate.
 * Exposes:
 *   AI.testConnection(cfg)
 *   AI.analyzeImage(cfg, { imageUrl, pageText, lang })
 *   AI.generateContent(cfg, { analysis, lang })
 *
 * Uses OpenAI-compatible chat/completions endpoint.
 * No API key is bundled; cfg.apiKey comes from chrome.storage.local.
 */
const AI = {
  _endpoint(cfg) {
    const base = (cfg.apiBase || "https://api.siliconflow.cn/v1").replace(/\/+$/, "");
    return base + "/chat/completions";
  },

  async _chat(cfg, { model, messages, jsonMode = false, maxTokens = 800 }) {
    if (!cfg.apiKey || !cfg.apiKey.trim()) {
      const e = new Error("NO_API_KEY");
      e.code = "NO_API_KEY";
      throw e;
    }

    const body = {
      model,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens
    };
    if (jsonMode) body.response_format = { type: "json_object" };

    // Hard timeout via AbortController so the user is never left
    // staring at a spinner if the upstream provider stalls (cold-start,
    // network drop, model load, etc.). 60s is generous enough for vision
    // models to warm up but short enough to surface failures quickly.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);

    let resp;
    try {
      resp = await fetch(this._endpoint(cfg), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + cfg.apiKey.trim()
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } catch (netErr) {
      clearTimeout(timer);
      const e = new Error(
        (netErr && netErr.name === "AbortError") ? "TIMEOUT" : "NETWORK"
      );
      e.code = (netErr && netErr.name === "AbortError") ? "TIMEOUT" : "NETWORK";
      throw e;
    }
    clearTimeout(timer);

    if (!resp.ok) {
      let detail = "";
      try {
        detail = (await resp.text()).slice(0, 300);
      } catch (_) {}
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

  /** Pick a sensible model for the lightweight connection ping. */
  _pingModel(cfg) {
    if (cfg.provider === "openai") return cfg.model || "gpt-4o-mini";
    if (cfg.provider === "siliconflow") return cfg.model || "Qwen/Qwen2.5-7B-Instruct";
    return cfg.model || cfg.textModel || "gpt-4o-mini";
  },

  /** Lightweight ping to validate key + model. */
  async testConnection(cfg) {
    const content = await this._chat(cfg, {
      model: this._pingModel(cfg),
      messages: [{ role: "user", content: "ping" }],
      maxTokens: 5
    });
    return typeof content === "string";
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
      model: cfg.model || "Qwen/Qwen3-Omni-30B-A3B-Captioner",
      messages,
      jsonMode: false,
      maxTokens: 700
    });

    return this._parseAnalysis(raw);
  },

  _parseAnalysis(raw) {
    let text = String(raw).trim();
    // strip code fences if the model added them
    text = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    // extract first {...} block
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
      model: cfg.model || "Qwen/Qwen3-Omni-30B-A3B-Captioner",
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

    // Post-process: if model still outputs "Hashtags:" / "标签:" prefix line,
    // strip it and weave hashtags into the preceding sentence.
    description = description.replace(/\n?[Hh]ashtags?\s*[:：]?\s*\n?(.*)/g, (match, tagsPart) => {
      return " " + tagsPart.trim();
    }).replace(/\n?[Tt]ags?\s*[:：]?\s*\n?(.*)/g, (match, tagsPart) => {
      return " " + tagsPart.trim();
    });

    // Fallback: ensure hashtags exist, woven naturally into the text
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
   * Skips the intermediate analysis step to save tokens.
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
      model: cfg.model || "Qwen/Qwen3-Omni-30B-A3B-Captioner",
      messages,
      jsonMode: true,
      maxTokens: 800
    });

    return this._parseContent(raw, null);
  },

  /** Map an error to an i18n key for friendly UI messages. */
  errorKey(err) {
    if (!err) return "errApi";
    if (err.code === "NO_API_KEY") return "errNoApiKey";
    if (err.code === "NETWORK") return "errNetwork";
    return "errApi";
  }
};
