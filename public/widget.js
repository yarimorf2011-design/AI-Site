window.ChatbotWidget = (() => {
  const DEFAULTS = {
    apiBase: "", // e.g. "https://mysiteaitesting.vercel.app" when embedding on other domains
    configUrl: "/config/default.json",
    position: "bottom-right", // "bottom-right" | "bottom-left"
    title: "Live Support",
    subtitle: "Online",
    buttonText: "Chat",
    welcomeMessage: "Hi! How can I help?",
    placeholder: "Type your message...",
    maxMessageLength: 2000,
    requestTimeoutMs: 30000,
    showPoweredBy: true
  };

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function loadConfig(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load config (${res.status}).`);
    return await res.json();
  }

  function createStyles() {
    const style = document.createElement("style");
    style.id = "cbw-styles";
    style.textContent = `
      .cbw-root { position: fixed; z-index: 999999; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; }
      .cbw-root * { box-sizing: border-box; }
      .cbw-btn {
        width: 56px; height: 56px; border-radius: 999px; border: 1px solid rgba(0,0,0,0.08);
        background: #111827; color: #fff; cursor: pointer;
        box-shadow: 0 12px 30px rgba(0,0,0,0.18);
        display: flex; align-items: center; justify-content: center;
        font-weight: 700;
      }
      .cbw-panel {
        width: 360px; max-width: calc(100vw - 24px);
        height: 520px; max-height: calc(100vh - 120px);
        background: #fff; border: 1px solid rgba(0,0,0,0.10);
        border-radius: 16px; box-shadow: 0 16px 40px rgba(0,0,0,0.18);
        overflow: hidden; display: none; flex-direction: column;
      }
      .cbw-header {
        padding: 12px; border-bottom: 1px solid rgba(0,0,0,0.08);
        display: flex; align-items: center; justify-content: space-between;
        background: #fff;
      }
      .cbw-title { font-weight: 800; color: #111827; font-size: 14px; }
      .cbw-subtitle { font-size: 12px; color: #6b7280; margin-top: 2px; }
      .cbw-header-left { display:flex; flex-direction: column; }
      .cbw-header-actions { display: flex; gap: 8px; }
      .cbw-icon {
        width: 34px; height: 34px; border-radius: 10px;
        border: 1px solid rgba(0,0,0,0.10); background: #fff;
        color: #111827; cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center;
        font-weight: 900;
        line-height: 1;
      }
      .cbw-log {
        flex: 1; overflow: auto; padding: 12px;
        display: flex; flex-direction: column; gap: 10px;
        background: #fff;
      }
      .cbw-bubble {
        max-width: 85%;
        padding: 10px 12px;
        border-radius: 14px;
        border: 1px solid rgba(0,0,0,0.10);
        font-size: 13px;
        line-height: 1.35;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .cbw-bot { align-self: flex-start; background: #fff; color: #111827; }
      .cbw-user { align-self: flex-end; background: #111827; color: #fff; border-color: rgba(255,255,255,0.12); }
      .cbw-footer {
        border-top: 1px solid rgba(0,0,0,0.08);
        padding: 10px;
        background: #fff;
      }
      .cbw-row { display:flex; gap: 8px; }
      .cbw-input {
        flex: 1; padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(0,0,0,0.12);
        outline: none;
        font-size: 13px;
      }
      .cbw-send {
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(0,0,0,0.12);
        background: #111827;
        color: #fff;
        cursor: pointer;
        font-weight: 800;
      }
      .cbw-send:disabled { opacity: 0.6; cursor: not-allowed; }
      .cbw-meta {
        margin-top: 6px;
        font-size: 11px;
        color: #6b7280;
        display: flex;
        justify-content: space-between;
        gap: 10px;
      }
      .cbw-link { color: #6b7280; text-decoration: none; }
      .cbw-link:hover { text-decoration: underline; }
      @media (max-width: 420px) {
        .cbw-panel { height: 70vh; }
      }
    `;
    return style;
  }

  function rootPosition(position) {
    const margin = 18;
    const pos = { bottom: `${margin}px` };
    if (position === "bottom-left") pos.left = `${margin}px`;
    else pos.right = `${margin}px`;
    return pos;
  }

  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  function mount(options = {}) {
    const opts = { ...DEFAULTS, ...options };

    if (document.getElementById("cbw-root")) return;

    // Normalize apiBase: no trailing slash
    if (typeof opts.apiBase === "string" && opts.apiBase.endsWith("/")) {
      opts.apiBase = opts.apiBase.slice(0, -1);
    }

    document.head.appendChild(createStyles());

    const root = document.createElement("div");
    root.id = "cbw-root";
    root.className = "cbw-root";
    Object.assign(root.style, rootPosition(opts.position));

    const button = document.createElement("button");
    button.className = "cbw-btn";
    button.type = "button";
    button.setAttribute("aria-label", "Open chat");
    button.textContent = opts.buttonText;

    const panel = document.createElement("div");
    panel.className = "cbw-panel";
    panel.innerHTML = `
      <div class="cbw-header">
        <div class="cbw-header-left">
          <div class="cbw-title">${escapeHtml(opts.title)}</div>
          <div class="cbw-subtitle" id="cbw-subtitle">${escapeHtml(opts.subtitle)}</div>
        </div>
        <div class="cbw-header-actions">
          <button class="cbw-icon" id="cbw-min" type="button" aria-label="Minimize">–</button>
          <button class="cbw-icon" id="cbw-close" type="button" aria-label="Close">×</button>
        </div>
      </div>

      <div class="cbw-log" id="cbw-log"></div>

      <div class="cbw-footer">
        <div class="cbw-row">
          <input class="cbw-input" id="cbw-input" placeholder="${escapeHtml(opts.placeholder)}" />
          <button class="cbw-send" id="cbw-send" type="button">Send</button>
        </div>
        <div class="cbw-meta">
          <span id="cbw-status">Ready</span>
          ${opts.showPoweredBy ? `<a class="cbw-link" href="#" onclick="return false;">Powered by AI</a>` : `<span></span>`}
        </div>
      </div>
    `;

    root.appendChild(panel);
    root.appendChild(button);
    document.body.appendChild(root);

    const log = panel.querySelector("#cbw-log");
    const input = panel.querySelector("#cbw-input");
    const send = panel.querySelector("#cbw-send");
    const closeBtn = panel.querySelector("#cbw-close");
    const minBtn = panel.querySelector("#cbw-min");
    const statusEl = panel.querySelector("#cbw-status");

    let isOpen = false;
    let isLoading = false;
    let config = null;
    let welcomed = false;

    function setStatus(text) {
      statusEl.textContent = text;
    }

    function addBubble(role, text) {
      const div = document.createElement("div");
      div.className = `cbw-bubble ${role === "user" ? "cbw-user" : "cbw-bot"}`;
      div.textContent = text;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
    }

    function open() {
      panel.style.display = "flex";
      button.style.display = "none";
      isOpen = true;
      input.focus();

      if (!welcomed) {
        welcomed = true;
        addBubble("bot", opts.welcomeMessage);
      }
    }

    function close() {
      panel.style.display = "none";
      button.style.display = "flex";
      isOpen = false;
    }

    async function ensureConfig() {
      if (config) return config;
      setStatus("Loading config...");
      config = await loadConfig(opts.configUrl);
      setStatus("Ready");
      return config;
    }

    async function sendMessage() {
      if (isLoading) return;

      const text = (input.value || "").trim();
      if (!text) return;

      if (text.length > opts.maxMessageLength) {
        addBubble("bot", `Message too long (max ${opts.maxMessageLength} characters).`);
        return;
      }

      input.value = "";
      addBubble("user", text);

      isLoading = true;
      send.disabled = true;
      setStatus("Thinking...");

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), opts.requestTimeoutMs);

      try {
        const cfg = await ensureConfig();

        const base = opts.apiBase || ""; // if empty, same-origin
        const url = `${base}/api/chat`;

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, config: cfg }),
          signal: controller.signal
        });

        const data = await safeJson(res);

        if (!res.ok) {
          const msg =
            (data && (data.error || data.message)) ||
            `Request failed (status ${res.status}).`;
          addBubble("bot", msg);
          return;
        }

        addBubble("bot", (data && data.reply) ? data.reply : "No reply.");
      } catch (err) {
        if (err && err.name === "AbortError") {
          addBubble("bot", "Request timed out. Please try again.");
        } else {
          addBubble("bot", `Request failed: ${err?.message || "Unknown error"}`);
        }
      } finally {
        clearTimeout(timeout);
        isLoading = false;
        send.disabled = false;
        setStatus("Ready");
      }
    }

    // Events
    button.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    minBtn.addEventListener("click", close);

    send.addEventListener("click", sendMessage);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendMessage();
      if (e.key === "Escape") close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen) close();
    });

    // Return optional controls
    return { open, close };
  }

  return { mount };
})();
