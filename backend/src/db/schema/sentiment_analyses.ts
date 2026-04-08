import { pgTable, text, serial, timestamp, real, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sentimentAnalysesTable = pgTable("sentiment_analyses", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  sentiment: text("sentiment").notNull(), // 'positive' | 'negative' | 'neutral'
  confidence: real("confidence").notNull(),
  source: text("source"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSentimentAnalysisSchema = createInsertSchema(sentimentAnalysesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSentimentAnalysis = z.infer<typeof insertSentimentAnalysisSchema>;
export type SentimentAnalysis = typeof sentimentAnalysesTable.$inferSelect;
