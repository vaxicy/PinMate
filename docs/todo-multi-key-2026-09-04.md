# TODO · 多 API Key 自动 + 手动切换

> 临时待办，写于 2026-09-04 睡前，明天再实现。
> 来源：Chrome Web Store 评论（Arie Zaenal Arifin, 2026-08-07）—— 希望多个 Gemini key，一个耗尽自动切下一个。

---

## 设计原则

1. **failover 而非轮询**：当前 key 失败时切下一个，不是 round-robin（评论原意是"耗尽切下一个"）
2. **通用**：所有 provider（gemini/openai/siliconflow/custom）都支持多 key，统一方案
3. **向后迁移**：旧 `apiKey: "xxx"` 自动升级为 `apiKeys: ["xxx"], activeKeyIndex: 0, rotationMode: "auto"`
4. **看得见**：用户知道当前在用哪个 key（脱敏显示末 4 位）

---

## 存储层 · `js/storage.js`

新形状：
```js
providers: {
  gemini: {
    apiBase, model,
    apiKeys: ["AIza...A", "AIza...B"],   // 新
    activeKeyIndex: 0,                     // 新
    rotationMode: "auto"                   // 新 · "auto" | "manual"
  }
  // openai / siliconflow / custom 同结构
}
```

`_deepMergeProviders` 增加迁移：
- 检测旧 `apiKey`（非空字符串）→ `apiKeys: [apiKey], activeKeyIndex: 0, rotationMode: "auto"`
- 已存在 `apiKeys: []` → 默认填 `[""]` 让 UI 可输入

新增 `Storage.setActiveKeyIndex(provider, idx)` helper。

---

## AI 调用层 · `js/ai.js`

- 替换 `_resolveKey(cfg)` → `_resolveKeyPool(cfg)` 返回 `{ keys: string[], index: number, mode: "auto" | "manual" }`
- `_chat` / `_openaiChat` / `_geminiChat` 接受 `keyIndex` 参数
- 失败分类决定是否切 key：
  - **切**（key 自身问题）：HTTP **401 / 403 / 429**
  - **不切**（与 key 无关）：400（请求错）/ 404（model 不存在）/ 5xx（服务端）/ TIMEOUT / NETWORK
- 自动模式：失败切下一个 + 重试 1 次；in-memory cooldown set（session 级别）避免每次都先试坏 key
- 手动模式：永远用 `activeKeyIndex`，失败抛错
- 自动模式切换后**写回 `activeKeyIndex`**（让重启后保留"上次成功 key"）
- 新 error code：
  - `QUOTA_EXHAUSTED`（429）
  - `KEY_INVALID`（401/403）
  - `ALL_KEYS_FAILED`（所有 key 都失败）
- `errorKey()` 映射新 code 到 i18n

---

## 设置 UI · `settings.html` + `js/settings.js`

API Key 区从单个 input 换成「Key 池」组件：

- **Key 列表**：每行 `password input` + 删除按钮（×），底部「+ Add Key」加行
- **Active 下拉**：`Active: Key #1 (…A3B)`，每项脱敏末 4 位
- **Mode radio**：
  - ○ Auto-failover（推荐 — 失败自动切下一个）
  - ○ Manual（只用 Active key）
- **Hint**：`Add multiple keys; PinMate will automatically switch to the next key when one runs out of tokens.`

面板 UI（可选，建议加上）：
- 状态条显示当前 key：`Gemini · key 2/3 (…f9A2)`
- 切换瞬间短 toast：`Switched to key 2 (key 1 quota exhausted)`

---

## i18n 新增（en + zh_CN）

| key | en | zh |
|---|---|---|
| `apiKeysLabel` | API Keys | API 密钥 |
| `addKey` | Add Key | 添加密钥 |
| `removeKey` | Remove | 删除 |
| `activeKeyLabel` | Active key | 当前使用 |
| `keyModeAuto` | Auto-failover | 故障自动转移 |
| `keyModeManual` | Manual | 手动 |
| `keySwitchedNotice` | Switched to key {n} | 已切换到密钥 #{n} |
| `errQuotaExhausted` | Key quota exhausted | 密钥配额已耗尽 |
| `errAllKeysFailed` | All keys failed | 所有密钥均失败 |

`keyMaskedLabel` 由 JS 拼末 4 位（无 i18n）。

---

## 工作量估算

- `storage.js`：迁移 + 形状 + helper · ~50 行
- `ai.js`：key pool resolver + 自动切 + cooldown + 新 error code · ~80 行
- `settings.html`：key 池 UI 替换 · ~40 行
- `settings.js`：渲染列表 + add/remove/select · ~120 行
- `i18n.js`（+ en/zh json）：~9 个新 key
- `content.js` / 面板：可选状态条 · ~20 行

合计 **~310 行**，半天到一天。

---

## 范围 · 明确不做

- ❌ 实时 quota 查询（多数 provider 不开放 quota API）
- ❌ key 加密（chrome.storage 本就 local；评论没要求）
- ❌ 云端同步（保持纯本地隐私）
- ❌ 跨 provider 混用（一次请求一个 provider，key 池只在同一 provider 内）

---

## 实现顺序建议

1. `storage.js` 先做完（迁移 + 形状），手动 verify 旧 key 不丢
2. `ai.js` 加 key pool resolver，**不改 UI**，在控制台/手测确认单 key 仍工作
3. `ai.js` 加自动 failover，手测（临时把第一个 key 改坏触发 401，看是否切下一个）
4. `settings.html/js` 替换 UI：动态行 + active 下拉 + mode
5. i18n 补全（中英文）
6. （可选）面板状态条 + 切换 toast
7. 端到端测试：每个 provider 都跑一遍多 key 切换

---

## 风险点

- **状态码区分**：401/403/429 vs 400/404/5xx 必须严格分——按 status code 走 switch
- **cooldown 边界**：session 内有效；刷新扩展会重置（可接受，因为重新加载后所有 key 都"健康"除非实际仍限流）
- **迁移不丢旧 key**：迁移时**保留**旧 `apiKey` 字段写入 `apiKeys[0]`，原字段清掉避免下次再迁移

---

> 提醒：实现完后按惯例升版本号 +0.01 并打包 zip。