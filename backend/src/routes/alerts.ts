import { Router, type IRouter } from "express";
import { db, alertConfigsTable, sentimentAnalysesTable } from "../db";
import { UpdateAlertConfigBody } from "../api-zod";
import { gte, count } from "drizzle-orm";
import { apiKeyAuth } from "../lib/apiKeyAuth";

const router: IRouter = Router();

async function getOrCreateConfig() {
  const configs = await db.select().from(alertConfigsTable).limit(1);
  if (configs[0]) return configs[0];

  const [config] = await db
    .insert(alertConfigsTable)
    .values({ threshold: 30, windowMinutes: 60, enabled: true })
    .returning();
  return config!;
}

router.get("/alerts/config", apiKeyAuth, async (_req, res): Promise<void> => {
  const config = await getOrCreateConfig();
  res.json(config);
});

router.put("/alerts/config", apiKeyAuth, async (req, res): Promise<void> => {
  const parsed = UpdateAlertConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const config = await getOrCreateConfig();
  const updates: Partial<typeof alertConfigsTable.$inferSelect> = {};

  if (parsed.data.threshold !== undefined) updates.threshold = parsed.data.threshold;
  if (parsed.data.windowMinutes !== undefined) updates.windowMinutes = parsed.data.windowMinutes;
  if (parsed.data.enabled !== undefined) updates.enabled = parsed.data.enabled;

  const { eq } = await import("drizzle-orm");
  const [updated] = await db
    .update(alertConfigsTable)
    .set(updates)
    .where(eq(alertConfigsTable.id, config.id))
    .returning();

  res.json(updated);
});

router.get("/alerts/status", apiKeyAuth, async (_req, res): Promise<void> => {
  const config = await getOrCreateConfig();

  const windowStart = new Date(Date.now() - config.windowMinutes * 60 * 1000);

  const rows = await db
    .select({ sentiment: sentimentAnalysesTable.sentiment, count: count() })
    .from(sentimentAnalysesTable)
    .where(gte(sentimentAnalysesTable.createdAt, windowStart))
    .groupBy(sentimentAnalysesTable.sentiment);

  let recentNegative = 0;
  let recentTotal = 0;
  for (const row of rows) {
    recentTotal += row.count;
    if (row.sentiment === "negative") recentNegative = row.count;
  }

  const negativePercent = recentTotal > 0 ? (recentNegative / recentTotal) * 100 : 0;
  const alertTriggered = config.enabled && negativePercent >= config.threshold;

  res.json({
    alertTriggered,
    negativePercent,
    threshold: config.threshold,
    windowMinutes: config.windowMinutes,
    recentNegative,
    recentTotal,
  });
});

export default router;
