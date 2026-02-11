import OpenAI from "openai";

export default async function handler(req, res) {
  // Health endpoint
  if (req.method === "GET") {
    return res.status(200).json({ status: "ok" });
  }

  // Chat endpoint
  if (req.method === "POST") {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "Missing OPENAI_API_KEY." });
      }

      const { message, config } = req.body || {};

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required." });
      }

      const businessName = config?.business_name || "Business";
      const tone = config?.tone || "friendly, professional";
      const language = config?.language || "English";
      const handoff = config?.handoff_text || "Please contact support.";
      const rules = Array.isArray(config?.rules) ? config.rules : [];

      const instructions =
        `You are an AI assistant for ${businessName}.\n` +
        `Language: ${language}.\n` +
        `Tone: ${tone}.\n\n` +
        `Rules:\n${rules.map((r) => `- ${r}`).join("\n")}\n\n` +
        `If unsure, respond with:\n"${handoff}"`;

      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const response = await client.responses.create({
        model: "gpt-4o-mini",
        max_output_tokens: 300,
        instructions,
        input: message
      });

      return res.status(200).json({
        reply: response.output_text || ""
      });

    } catch (err) {
      return res.status(500).json({
        error: err?.message || "Internal server error."
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed." });
}
