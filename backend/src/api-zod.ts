import { z } from 'zod';

// Health
export const HealthCheckResponse = z.object({
  status: z.string(),
});

// Sentiment Analysis
export const AnalyzeSentimentBody = z.object({
  text: z.string().min(1),
  source: z.string().optional(),
  metadata: z.record(z.string(),z.unknown()).optional(),
});

export const BatchAnalyzeSentimentBody = z.object({
  texts: z.array(z.string()).max(500),
  source: z.string().optional(),
  metadata: z.record(z.string(),z.unknown()).optional(),
});

// API Keys
export const CreateApiKeyBody = z.object({
  name: z.string().min(1),
});

export const DeleteApiKeyParams = z.object({
  id: z.string(),
});

// Alerts
export const UpdateAlertConfigBody = z.object({
  threshold: z.number().min(0).max(100).optional(),
  windowMinutes: z.number().min(1).optional(),
  enabled: z.boolean().optional(),
});

// Analyses
export const ListAnalysesParams = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
  source: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const GetSentimentDistributionParams = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  source: z.string().optional(),
});

export const GetSentimentTrendsParams = z.object({
  days: z.number().min(1).optional(),
  source: z.string().optional(),
});

export const ExportAnalysesCsvParams = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  sentiment: z.string().optional(),
});

export const GetAnalysisParams = z.object({
  id: z.string(),
});

export const DeleteAnalysisParams = z.object({
  id: z.string(),
});

export const ListAnalysesQueryParams = ListAnalysesParams;

export const GetSentimentDistributionQueryParams = GetSentimentDistributionParams;

export const GetSentimentTrendsQueryParams = GetSentimentTrendsParams;

export const ExportAnalysesCsvQueryParams = ExportAnalysesCsvParams;