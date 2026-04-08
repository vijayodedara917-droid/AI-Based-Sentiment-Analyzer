import { openai } from "../integrations/client";

export interface SentimentAnalysisResult {
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
}

export async function analyzeSentiment(text: string): Promise<SentimentAnalysisResult> {
  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 100,
    messages: [
      {
        role: "system",
        content: `You are a sentiment analysis model. Analyze the sentiment of the given text and respond ONLY with a JSON object in this exact format:
{"sentiment": "positive" | "negative" | "neutral", "confidence": 0.0-1.0}
Where confidence is how certain you are about the classification (1.0 = completely certain).
Do not include any other text.`,
      },
      {
        role: "user",
        content: `Analyze the sentiment of this text: "${text.substring(0, 1000)}"`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim() ?? "";

  try {
    const parsed = JSON.parse(content) as { sentiment: string; confidence: number };
    const sentiment = ["positive", "negative", "neutral"].includes(parsed.sentiment)
      ? (parsed.sentiment as "positive" | "negative" | "neutral")
      : "neutral";
    const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5));
    return { sentiment, confidence };
  } catch {
    return { sentiment: "neutral", confidence: 0.5 };
  }
}
