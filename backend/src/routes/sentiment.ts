import { Router, type IRouter } from "express";
import { db, sentimentAnalysesTable, alertConfigsTable } from "@workspace/db";
import { AnalyzeSentimentBody, BatchAnalyzeSentimentBody } from "../api-zod";
import { apiKeyAuth } from "../lib/apiKeyAuth";
import { analyzeSentiment } from "../lib/sentimentAnalyzer";
import { batchProcess } from "../integrations/batch/utils";
import { gte } from "drizzle-orm";

const router: IRouter = Router();

router.post("/sentiment/analyze", apiKeyAuth, async (req, res): Promise<void> => {
  const parsed = AnalyzeSentimentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { text, source, metadata } = parsed.data;

  const result = await analyzeSentiment(text);

  const [analysis] = await db
    .insert(sentimentAnalysesTable)
    .values({
      text,
      sentiment: result.sentiment,
      confidence: result.confidence,
      source: source ?? null,
      metadata: metadata ?? null,
    })
    .returning();

  res.json(analysis);
});

router.post("/sentiment/batch", apiKeyAuth, async (req, res): Promise<void> => {
  const parsed = BatchAnalyzeSentimentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { texts, source, metadata } = parsed.data;

  if (texts.length === 0) {
    res.status(400).json({ error: "At least one text is required" });
    return;
  }

  if (texts.length > 500) {
    res.status(400).json({ error: "Maximum 500 texts allowed per batch" });
    return;
  }

  const results = await batchProcess(
    texts,
    async (text: string) => {
      return analyzeSentiment(text);
    },
    { concurrency: 3, retries: 3 }
  );

  const insertValues = texts.map((text, i) => ({
    text,
    sentiment: results[i]?.sentiment ?? "neutral",
    confidence: results[i]?.confidence ?? 0.5,
    source: source ?? null,
    metadata: metadata ?? null,
  }));

  const inserted = await db.insert(sentimentAnalysesTable).values(insertValues).returning();

  const positive = inserted.filter((r) => r.sentiment === "positive").length;
  const negative = inserted.filter((r) => r.sentiment === "negative").length;
  const neutral = inserted.filter((r) => r.sentiment === "neutral").length;
  const total = inserted.length;

  // Check if alert threshold is exceeded
  const configs = await db.select().from(alertConfigsTable).limit(1);
  let alertTriggered = false;
  if (configs[0]?.enabled && negative > 0) {
    const negPercent = (negative / total) * 100;
    alertTriggered = negPercent >= configs[0].threshold;
  }

  res.json({
    results: inserted,
    total,
    positive,
    negative,
    neutral,
    alertTriggered,
  });
});

// Check alert status (checks recent analyses in the configured window)
router.get("/sentiment/alert-check", apiKeyAuth, async (req, res): Promise<void> => {
  const configs = await db.select().from(alertConfigsTable).limit(1);
  const config = configs[0];

  if (!config) {
    res.json({ alertTriggered: false });
    return;
  }

  const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000);
  const recent = await db
    .select()
    .from(sentimentAnalysesTable)
    .where(gte(sentimentAnalysesTable.createdAt, windowStart));

  const negCount = recent.filter((r) => r.sentiment === "negative").length;
  const total = recent.length;
  const negPercent = total > 0 ? (negCount / total) * 100 : 0;

  res.json({
    alertTriggered: config.enabled && negPercent >= config.threshold,
    negativePercent: negPercent,
  });
});

export default router;
