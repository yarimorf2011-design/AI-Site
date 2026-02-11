window.ChatbotWidget = (() => {
  const DEFAULTS = {
    apiBase: "",
    configUrl: "/config/default.json",
    position: "bottom-right", // bottom-right | bottom-left
    buttonText: "Chat",
    welcomeMessage: "Hi! How can I help?",
    placeholder: "Type your message...",
    title: "Support Chat",
    theme: {
      accent: "#111827",   // only used for inline styles; change if you want
      background: "#ffffff",
      text: "#111827",
      border: "#e5e7eb",
      muted: "#6b7280"
    }
  };

  async function loadConfig(configUrl) {
    const res = await fetch(configUrl, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load config.");
    return await res.json();
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function createStyles(theme) {
    const style = document.createElement("style");
    style.id = "chatbot-widget-styles";
    style.textContent = `
      .cbw-root { position: fixed; z-index: 999999; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; }
      .cbw-root * { box-sizing: border-box; }
      .cbw-button {
        width: 56px; height: 56px; border-radius: 999px; border: 1px solid ${theme.border};
        background: ${theme.accent}; color: white; cursor: pointer;
        box-shadow: 0 12px 30px rgba(0,0,0,0.18);
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; letter-spacing: 0.2px;
      }
      .cbw-panel {
        width: 360px; max-width: calc(100vw - 24px);
        height: 520px; max-height: calc(100vh - 120px);
        background: ${theme.background}; border: 1px solid ${theme.border};
        border-radius: 16px; box-shadow: 0 16px 40px rgba(0,0,0,0.18);
        overflow: hidden; display: none; flex-direction: column;
      }
      .cbw-header {
        padding: 12px 12px; border-bottom: 1px solid ${theme.border};
        display: flex; align-items: center; justify-content: space-between;
        background: ${theme.background};
      }
      .cbw-title { font-weight: 700; color: ${theme.text}; font-size: 14px; }
      .cbw-subtitle { font-size: 12px; color: ${theme.muted}; margin-top: 2px; }
      .cbw-header-left { display:flex; flex-direction: column; gap: 0px; }
      .cbw-header-actions { display: flex; gap: 8px; }
      .cbw-icon-btn {
        width: 34px; height: 34px; border-radius: 10px;
        border: 1px solid ${theme.border}; background: ${theme.background};
        color: ${theme.text}; cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center;
      }
      .cbw-log {
        flex: 1; overflow: auto; padding: 12px;
        display: flex; flex-direction: column; gap: 10px;
        background: ${theme.background};
      }
      .cbw-bubble {
        max-width: 85%;
        padding: 10px 12px;
        border-radius: 14px;
        border: 1px solid ${theme.border};
        color: ${theme.text};
        font-size: 13px;
        line-height: 1.35;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .cbw-bubble-user {
        align-self: flex-end;
        background: ${theme.accent};
        color: white;
        border-color: rgba(255,255,255,0.12);
      }
      .cbw-bubble-bot {
        align-self: flex-start;
        background: ${theme.background};
      }
      .cbw-footer {
        border-top: 1px solid ${theme.border};
        padding: 10px;
        background: ${theme.background};
      }
      .cbw-row { display:flex; gap: 8px; }
      .cbw-input {
        flex: 1; padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid ${theme.border};
        outline: none;
        font-size: 13px;
      }
      .cbw-send {
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid ${theme.border};
        background: ${theme.accent};
        color: white;
        cursor: pointer;
        font-weight: 700;
      }
      .cbw-meta {
        margin-top: 6px;
        font-size: 11px;
        color: ${theme.muted};
        display: flex;
        justify-content: space-between;
        gap: 10px;
      }
      .cbw-link {
        color: ${theme.muted};
        text-decoration: none;
      }
      .cbw-link:hover { text-decoration: underline; }
      @media (max-width: 420px) {
        .cbw-panel { height: 70vh; }
      }
    `;
    return style;
  }

  function getRootPosition(position) {
    const margin = 18;
    const rootStyle = { bottom: `${margin}px` };

    if (position === "bottom-left") {
      rootStyle.left = `${margin}px`;
    } else {
      rootStyle.right = `${margin}px`;
    }
    return rootStyle;
  }

  function mount(options = {}) {
    const opts = { ...DEFAULTS, ...options };

    // Avoid duplicates
    if (document.getElementById("chatbot-widget-root")) return;

    const root = document.createElement("div");
    root.className = "cbw-root";
    root.id = "chatbot-widget-root";

    const rootPos = getRootPosition(opts.position);
    Object.assign(root.style, rootPos);

    const button = document.createElement("button");
    button.className = "cbw-button";
    button.type = "button";
    button.setAttribute("aria-label", "Open chat");
    button.textContent = opts.buttonText;

    const panel = document.createElement("div");
    panel.className = "cbw-panel";

    panel.innerHTML = `
      <div class="cbw-header">
        <div class="cbw-header-left">
          <div class="cbw-title">${escapeHtml(opts.title)}</div>
          <div class="cbw-subtitle" id="cbw-subtitle">Online</div>
        </div>
        <div class="cbw-header-actions">
          <button class="cbw-icon-btn" id="cbw-minimize" type="button" aria-label="Minimize">–</button>
          <button class="cbw-icon-btn" id="cbw-close" type="button" aria-label="Close">×</button>
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
          <a class="cbw-link" href="#" id="cbw-powered" onclick="return false;">Powered by AI</a>
        </div>
      </div>
    `;

    document.head.appendChild(createStyles(opts.theme));
    document.body.appendChild(root);

    root.appendChild(panel);
    root.appendChild(button);

    const log = panel.querySelector("#cbw-log");
    const input = panel.querySelector("#cbw-input");
    const send = panel.querySelector("#cbw-send");
    const closeBtn = panel.querySelector("#cbw-close");
    const minimizeBtn = panel.querySelector("#cbw-minimize");
    const status = panel.querySelector("#cbw-status");

    let config = null;
    let isOpen = false;
    let isLoading = false;

    function addBubble(role, text) {
      const div = document.createElement("div");
      div.className = `cbw-bubble ${role === "user" ? "cbw-bubble-user" : "cbw-bubble-bot"}`;
      div.textContent = text;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
    }

    function setStatus(text) {
      status.textContent = text;
    }

    function openPanel() {
      panel.style.display = "flex";
      isOpen = true;
      button.style.display = "none";
      input.focus();

      // Welcome message only once
      if (log.childElementCount === 0) {
        addBubble("bot", opts.welcomeMessage);
      }
    }

    function closePanel() {
      panel.style.display = "none";
      isOpen = false;
      button.style.display = "flex";
    }

    function togglePanel() {
      if (isOpen) closePanel();
      else openPanel();
    }

    async function ensureConfigLoaded() {
      if (config) return config;
      setStatus("Loading...");
      config = await loadConfig(opts.configUrl);

      // Optional: apply simple theme overrides from config if provided
      if (config?.theme && typeof config.theme === "object") {
        // This template keeps theme static for simplicity.
        // If you want dynamic theming, you can regenerate styles here.
      }

      setStatus("Ready");
      return config;
    }

    async function sendMessage() {
      if (isLoading) return;

      const text = input.value.trim();
      if (!text) return;

      input.value = "";
      addBubble("user", text);

      isLoading = true;
      setStatus("Thinking...");

      try {
        const cfg = await ensureConfigLoaded();

        const res = await fetch(`${opts.apiBase}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, config: cfg })
        });

        const data = await res.json();
        const reply = data?.reply || data?.error || "Unknown error.";

        addBubble("bot", reply);
      } catch (err) {
        addBubble("bot", "Something went wrong. Please try again.");
      } finally {
        isLoading = false;
        setStatus("Ready");
      }
    }

    // Events
    button.addEventListener("click", openPanel);
    closeBtn.addEventListener("click", closePanel);
    minimizeBtn.addEventListener("click", closePanel);

    send.addEventListener("click", sendMessage);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendMessage();
      if (e.key === "Escape") closePanel();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen) closePanel();
    });

    // Public API (optional)
    return { open: openPanel, close: closePanel, toggle: togglePanel };
  }

  return { mount };
})();
