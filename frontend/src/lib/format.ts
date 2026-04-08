import { format, parseISO } from "date-fns";

export function formatDate(dateString: string): string {
  try {
    return format(parseISO(dateString), "MMM d, yyyy h:mm a");
  } catch (e) {
    return dateString;
  }
}

export function formatShortDate(dateString: string): string {
  try {
    return format(parseISO(dateString), "MMM d");
  } catch (e) {
    return dateString;
  }
}

export function formatConfidence(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

export function getSentimentColor(sentiment: string): string {
  switch (sentiment.toLowerCase()) {
    case "positive":
      return "text-positive dark:text-positive-foreground bg-positive/10";
    case "negative":
      return "text-destructive dark:text-destructive-foreground bg-destructive/10";
    case "neutral":
    default:
      return "text-neutral dark:text-neutral-foreground bg-neutral/10";
  }
}
