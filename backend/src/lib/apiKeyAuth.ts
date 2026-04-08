import { type Request, type Response, type NextFunction } from "express";
import { db, apiKeysTable } from "../db";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { logger } from "./logger";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const apiKey = req.headers["x-api-key"] as string | undefined;

  if (!apiKey) {
    res.status(401).json({ error: "API key required. Include X-API-Key header." });
    return;
  }

  const keyHash = hashApiKey(apiKey);
  const keys = await db.select().from(apiKeysTable).where(eq(apiKeysTable.keyHash, keyHash)).limit(1);

  if (keys.length === 0) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  // Update last used timestamp (fire and forget)
  db.update(apiKeysTable)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeysTable.id, keys[0]!.id))
    .catch((err: unknown) => {
      logger.warn({ err }, "Failed to update last used timestamp");
    });

  next();
}
