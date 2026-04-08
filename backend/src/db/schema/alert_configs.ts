import { pgTable, serial, real, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const alertConfigsTable = pgTable("alert_configs", {
  id: serial("id").primaryKey(),
  threshold: real("threshold").notNull().default(30), // percentage 0-100
  windowMinutes: integer("window_minutes").notNull().default(60),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAlertConfigSchema = createInsertSchema(alertConfigsTable).omit({ id: true });
export type InsertAlertConfig = z.infer<typeof insertAlertConfigSchema>;
export type AlertConfig = typeof alertConfigsTable.$inferSelect;
