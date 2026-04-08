import { Router, type IRouter } from "express";
import { db, sentimentAnalysesTable, alertConfigsTable } from "../db";
import {
  ListAnalysesQueryParams,
  GetAnalysisParams,
  DeleteAnalysisParams,
  GetSentimentDistributionQueryParams,
  GetSentimentTrendsQueryParams,
  ExportAnalysesCsvQueryParams,
} from "../api-zod";
import { eq, desc, and, gte, lte, count, avg, sql } from "drizzle-orm";
import { apiKeyAuth } from "../lib/apiKeyAuth";

const router: IRouter = Router();

router.get("/analyses", apiKeyAuth, async (req, res): Promise<void> => {
  const params = ListAnalysesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { page = 1, limit = 20, sentiment, from, to, source } = params.data;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (sentiment) conditions.push(eq(sentimentAnalysesTable.sentiment, sentiment));
  if (source) conditions.push(eq(sentimentAnalysesTable.source, source));
  if (from) conditions.push(gte(sentimentAnalysesTable.createdAt, new Date(from)));
  if (to) conditions.push(lte(sentimentAnalysesTable.createdAt, new Date(to)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, totalRows] = await Promise.all([
    db
      .select()
      .from(sentimentAnalysesTable)
      .where(where)
      .orderBy(desc(sentimentAnalysesTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(sentimentAnalysesTable).where(where),
  ]);

  const total = totalRows[0]?.count ?? 0;
  const pages = Math.ceil(total / limit);

  res.json({ data, total, page, limit, pages });
});

router.get("/analyses/stats/distribution", apiKeyAuth, async (req, res): Promise<void> => {
  const params = GetSentimentDistributionQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { from, to, source } = params.data;

  const conditions = [];
  if (from) conditions.push(gte(sentimentAnalysesTable.createdAt, new Date(from)));
  if (to) conditions.push(lte(sentimentAnalysesTable.createdAt, new Date(to)));
  if (source) conditions.push(eq(sentimentAnalysesTable.source, source));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      sentiment: sentimentAnalysesTable.sentiment,
      count: count(),
    })
    .from(sentimentAnalysesTable)
    .where(where)
    .groupBy(sentimentAnalysesTable.sentiment);

  let positive = 0, negative = 0, neutral = 0;
  for (const row of rows) {
    if (row.sentiment === "positive") positive = row.count;
    else if (row.sentiment === "negative") negative = row.count;
    else if (row.sentiment === "neutral") neutral = row.count;
  }
  const total = positive + negative + neutral;

  res.json({
    positive,
    negative,
    neutral,
    total,
    positivePercent: total > 0 ? (positive / total) * 100 : 0,
    negativePercent: total > 0 ? (negative / total) * 100 : 0,
    neutralPercent: total > 0 ? (neutral / total) * 100 : 0,
  });
});

router.get("/analyses/stats/trends", apiKeyAuth, async (req, res): Promise<void> => {
  const params = GetSentimentTrendsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const days = params.data.days ?? 30;
  const source = params.data.source;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const conditions = [gte(sentimentAnalysesTable.createdAt, since)];
  if (source) conditions.push(eq(sentimentAnalysesTable.source, source));

  const rows = await db
    .select({
      date: sql<string>`DATE(${sentimentAnalysesTable.createdAt})`.as("date"),
      sentiment: sentimentAnalysesTable.sentiment,
      count: count(),
    })
    .from(sentimentAnalysesTable)
    .where(and(...conditions))
    .groupBy(sql`DATE(${sentimentAnalysesTable.createdAt})`, sentimentAnalysesTable.sentiment)
    .orderBy(sql`DATE(${sentimentAnalysesTable.createdAt})`);

  // Group by date
  const dateMap = new Map<string, { date: string; positive: number; negative: number; neutral: number; total: number }>();

  for (const row of rows) {
    if (!dateMap.has(row.date)) {
      dateMap.set(row.date, { date: row.date, positive: 0, negative: 0, neutral: 0, total: 0 });
    }
    const entry = dateMap.get(row.date)!;
    entry[row.sentiment as "positive" | "negative" | "neutral"] = row.count;
    entry.total += row.count;
  }

  const data = Array.from(dateMap.values());

  res.json({ data, days });
});

router.get("/analyses/stats/summary", apiKeyAuth, async (req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalRow, todayRow, avgRow, sourceRows, configs] = await Promise.all([
    db.select({ count: count() }).from(sentimentAnalysesTable),
    db.select({ count: count() }).from(sentimentAnalysesTable).where(gte(sentimentAnalysesTable.createdAt, today)),
    db.select({ avgConf: avg(sentimentAnalysesTable.confidence) }).from(sentimentAnalysesTable),
    db
      .select({ source: sentimentAnalysesTable.source, count: count() })
      .from(sentimentAnalysesTable)
      .where(sql`${sentimentAnalysesTable.source} IS NOT NULL`)
      .groupBy(sentimentAnalysesTable.source)
      .orderBy(desc(count()))
      .limit(5),
    db.select().from(alertConfigsTable).limit(1),
  ]);

  const totalAnalyses = totalRow[0]?.count ?? 0;
  const todayCount = todayRow[0]?.count ?? 0;
  const avgConfidence = parseFloat(String(avgRow[0]?.avgConf ?? 0)) || 0;

  // Get negative percent for alert check
  const config = configs[0];
  let negativeSentimentPercent = 0;
  let alertTriggered = false;

  if (config) {
    const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000);
    const recentRows = await db
      .select({ sentiment: sentimentAnalysesTable.sentiment, count: count() })
      .from(sentimentAnalysesTable)
      .where(gte(sentimentAnalysesTable.createdAt, windowStart))
      .groupBy(sentimentAnalysesTable.sentiment);

    let negCount = 0, totalCount = 0;
    for (const row of recentRows) {
      totalCount += row.count;
      if (row.sentiment === "negative") negCount = row.count;
    }
    negativeSentimentPercent = totalCount > 0 ? (negCount / totalCount) * 100 : 0;
    alertTriggered = config.enabled && negativeSentimentPercent >= config.threshold;
  }

  const topSources = sourceRows
    .filter((r) => r.source != null)
    .map((r) => ({ source: r.source as string, count: r.count }));

  res.json({
    totalAnalyses,
    todayCount,
    avgConfidence,
    negativeSentimentPercent,
    alertTriggered,
    topSources,
  });
});

router.get("/analyses/export/csv", apiKeyAuth, async (req, res): Promise<void> => {
  const params = ExportAnalysesCsvQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { from, to, sentiment } = params.data;

  const conditions = [];
  if (from) conditions.push(gte(sentimentAnalysesTable.createdAt, new Date(from)));
  if (to) conditions.push(lte(sentimentAnalysesTable.createdAt, new Date(to)));
  if (sentiment) conditions.push(eq(sentimentAnalysesTable.sentiment, sentiment));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db
    .select()
    .from(sentimentAnalysesTable)
    .where(where)
    .orderBy(desc(sentimentAnalysesTable.createdAt));

  const headers = ["id", "text", "sentiment", "confidence", "source", "created_at"];
  const rows = data.map((row) => [
    row.id,
    `"${String(row.text).replace(/"/g, '""')}"`,
    row.sentiment,
    (row.confidence * 100).toFixed(1) + "%",
    row.source ?? "",
    row.createdAt.toISOString(),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="sentiment-analyses-${Date.now()}.csv"`);
  res.send(csv);
});

router.get("/analyses/:id", apiKeyAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const params = GetAnalysisParams.safeParse({ id: parseInt(rawId ?? "0", 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [analysis] = await db
    .select()
    .from(sentimentAnalysesTable)
    .where(eq(sentimentAnalysesTable.id, params.data.id));

  if (!analysis) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }

  res.json(analysis);
});

router.delete("/analyses/:id", apiKeyAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const params = DeleteAnalysisParams.safeParse({ id: parseInt(rawId ?? "0", 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(sentimentAnalysesTable)
    .where(eq(sentimentAnalysesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
