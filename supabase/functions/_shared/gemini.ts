export interface GeminiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class GeminiError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
    this.body = body;
  }
}

interface GeminiChatRequest {
  messages: GeminiMessage[];
  temperature?: number;
  model?: string;
}

const DEFAULT_MODEL = "gemini-1.5-flash";
const COMPAT_FALLBACK_MODEL = "gemini-1.5-flash";

export async function generateGeminiChat({
  messages,
  temperature = 0.7,
  model = DEFAULT_MODEL,
}: GeminiChatRequest): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const systemMessages = messages
    .filter((msg) => msg.role === "system")
    .map((msg) => msg.content.trim())
    .filter(Boolean);

  const contents = messages
    .filter((msg) => msg.role !== "system")
    .map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

  if (contents.length === 0) {
    contents.push({ role: "user", parts: [{ text: "Respond to this request." }] });
  }

  const payload: Record<string, unknown> = {
    contents,
    generationConfig: { temperature },
  };

  if (systemMessages.length > 0) {
    payload.systemInstruction = {
      parts: [{ text: systemMessages.join("\n\n") }],
    };
  }

  const tryGenerate = async (modelName: string) => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new GeminiError("Gemini request failed", response.status, errorBody);
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts) || parts.length === 0) {
      throw new Error("Gemini returned an empty response");
    }

    return parts
      .map((part: { text?: string }) => part?.text ?? "")
      .join("")
      .trim();
  };

  try {
    return await tryGenerate(model);
  } catch (error) {
    const canFallback =
      model !== COMPAT_FALLBACK_MODEL &&
      error instanceof GeminiError &&
      (error.status === 404 || (error.status === 400 && /model/i.test(error.body)));

    if (canFallback) {
      return await tryGenerate(COMPAT_FALLBACK_MODEL);
    }

    throw error;
  }
}

export function extractJSON<T>(text: string): T {
  try {
    // Try to find a JSON block in the text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback: try parsing the whole thing
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON parse error:", e, "Text:", text);
    throw new Error("Failed to parse AI response as JSON");
  }
}
