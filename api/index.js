import OpenAI from "openai";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  // Route: /api/health
  if (req.method === "GET" && (req.url === "/api/health" || req.url?.endsWith("/api/health"))) {
    return json(res, 200, { status: "ok" });
  }

  // Route: /api/chat
  if (req.method === "POST" && (req.url === "/api/chat" || req.url?.endsWith("/api/chat"))) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return json(res, 500, { error: "Missing OPENAI_API_KEY environment variable." });
      }

      let body = "";
      await new Promise((resolve) => {
        req.on("data", (chunk) => (body += chunk));
        req.on("end", resolve);
      });

      const parsed = body ? JSON.parse(body) : {};
      const message = parsed.message;
      const config = parsed.config || {};

      if (!message || typeof message !== "string") {
        return json(res, 400, { error: "Message is required." });
      }

      const businessName = config.business_name || "Business";
      const tone = config.tone || "friendly, professional";
      const language = config.language || "English";
      const handoff = config.handoff_text || "Please contact support.";
      const rules = Array.isArray(config.rules) ? config.rules : [];

      const instructions =
        `You are an AI assistant for ${businessName}.\n` +
        `Language: ${language}.\n` +
        `Tone: ${tone}.\n\n` +
        `Rules:\n${rules.map((r) => `- ${r}`).join("\n")}\n\n` +
        `If you are unsure about something, respond with:\n"${handoff}"`;

      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await client.responses.create({
        model: "gpt-4o-mini",
        max_output_tokens: 300,
        instructions,
        input: message
      });

      return json(res, 200, { reply: response.output_text || "" });
    } catch (err) {
      const status = err?.status || 500;
      if (status === 429) {
        return json(res, 429, { error: "Quota exceeded. Check billing/credits and usage limits." });
      }
      return json(res, 500, { error: "Internal server error." });
    }
  }

  return json(res, 404, { error: "Not found." });
}
