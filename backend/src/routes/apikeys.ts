import { Router, type IRouter } from "express";
import { db, apiKeysTable } from "../db";
import { CreateApiKeyBody, DeleteApiKeyParams } from "../api-zod";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { hashApiKey } from "../lib/apiKeyAuth";

const router: IRouter = Router();

router.get("/apikeys", async (_req, res): Promise<void> => {
  const keys = await db
    .select({
      id: apiKeysTable.id,
      name: apiKeysTable.name,
      keyPrefix: apiKeysTable.keyPrefix,
      createdAt: apiKeysTable.createdAt,
      lastUsedAt: apiKeysTable.lastUsedAt,
    })
    .from(apiKeysTable)
    .orderBy(apiKeysTable.createdAt);

  res.json(keys);
});

router.post("/apikeys", async (req, res): Promise<void> => {
  const parsed = CreateApiKeyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name } = parsed.data;
  const rawKey = `sa_${randomBytes(32).toString("hex")}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.substring(0, 8);

  const [key] = await db
    .insert(apiKeysTable)
    .values({
      name,
      keyHash,
      keyPrefix,
    })
    .returning();

  res.status(201).json({
    id: key!.id,
    name: key!.name,
    key: rawKey, // shown once
    keyPrefix: key!.keyPrefix,
    createdAt: key!.createdAt,
  });
});

router.delete("/apikeys/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params["id"]) ? req.params["id"][0] : req.params["id"];
  const params = DeleteApiKeyParams.safeParse({ id: parseInt(rawId ?? "0", 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(apiKeysTable)
    .where(eq(apiKeysTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "API key not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
