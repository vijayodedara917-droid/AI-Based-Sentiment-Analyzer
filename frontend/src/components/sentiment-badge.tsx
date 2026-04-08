import { Badge } from "@/components/ui/badge";
import { getSentimentColor } from "@/lib/format";

export function SentimentBadge({ sentiment }: { sentiment: string }) {
  return (
    <Badge variant="outline" className={`${getSentimentColor(sentiment)} uppercase tracking-wider font-semibold border-transparent`}>
      {sentiment}
    </Badge>
  );
}
