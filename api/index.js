import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, config } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "Missing OPENAI_API_KEY environment variable."
      });
    }

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Message is required."
      });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const businessName = config?.business_name || "Business";
    const tone = config?.tone || "friendly and professional";
    const language = config?.language || "English";
    const handoff = config?.handoff_text || "Please contact support.";
    const rules = config?.rules || [];

    const instructions = `
You are an AI assistant for ${businessName}.
Language: ${language}.
Tone: ${tone}.

Rules:
${rules.map(rule => "- " + rule).join("\n")}

If you are unsure about something, respond with:
"${handoff}"
`;

const response = await client.responses.create({
  model: "gpt-4o-mini",
  max_output_tokens: 300,
  instructions: instructions,
  input: message
});

    res.json({
      reply: response.output_text || "No response generated."
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Internal server error."
    });
  }
});

if (process.env.NODE_ENV !== "production") {
  app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
  });
}

export default app;
