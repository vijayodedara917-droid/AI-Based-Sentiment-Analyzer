import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetAnalyticsSummary, 
  useGetSentimentDistribution, 
  useGetSentimentTrends,
  useGetAlertStatus,
  useListAnalyses
} from "@/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  PieChart, Pie, Cell, 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from "recharts";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Activity, X } from "lucide-react";
import { formatDate, formatConfidence, getSentimentColor } from "@/lib/format";
import { SentimentBadge } from "@/components/sentiment-badge";
import { useApiKey } from "@/hooks/use-api-key";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = {
  positive: "hsl(var(--positive))",
  negative: "hsl(var(--destructive))",
  neutral: "hsl(var(--neutral))",
};

export default function Dashboard() {
  const { hasApiKey } = useApiKey();
  const [dismissedAlert, setDismissedAlert] = useState(false);

  const { data: summary, isLoading: loadingSummary } = useGetAnalyticsSummary({
    query: { enabled: hasApiKey }
  });

  const { data: distribution, isLoading: loadingDistribution } = useGetSentimentDistribution(undefined, {
    query: { enabled: hasApiKey }
  });

  const { data: trends, isLoading: loadingTrends } = useGetSentimentTrends({ days: 30 }, {
    query: { enabled: hasApiKey }
  });

  const { data: alertStatus, isLoading: loadingAlertStatus } = useGetAlertStatus({
    query: { enabled: hasApiKey }
  });

  const { data: recentAnalyses, isLoading: loadingRecent } = useListAnalyses({ limit: 5 }, {
    query: { enabled: hasApiKey }
  });

  if (!hasApiKey) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <Activity className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-2xl font-semibold">Welcome to SentIQ</h2>
        <p className="text-muted-foreground max-w-md">
          To view your analytics dashboard, please configure your API key in the settings.
        </p>
      </div>
    );
  }

  const pieData = distribution ? [
    { name: "Positive", value: distribution.positive },
    { name: "Neutral", value: distribution.neutral },
    { name: "Negative", value: distribution.negative },
  ] : [];

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your sentiment intelligence.</p>
      </div>

      {alertStatus?.alertTriggered && !dismissedAlert && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 relative">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Negative Sentiment Alert</AlertTitle>
          <AlertDescription>
            Negative sentiment is currently at {alertStatus.negativePercent.toFixed(1)}%, exceeding the threshold of {alertStatus.threshold}%.
            ({alertStatus.recentNegative} out of {alertStatus.recentTotal} recent analyses)
          </AlertDescription>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 h-6 w-6 rounded-full hover:bg-destructive/20"
            onClick={() => setDismissedAlert(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{summary?.totalAnalyses.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +{summary?.todayCount.toLocaleString()} today
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {summary ? formatConfidence(summary.avgConfidence) : "0%"}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negative Ratio</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-destructive">
                {summary?.negativeSentimentPercent.toFixed(1)}%
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Source</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold capitalize truncate">
                  {summary?.topSources[0]?.source || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary?.topSources[0]?.count || 0} analyses
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Sentiment Trends (30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              {loadingTrends ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton className="h-[250px] w-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends?.data || []} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="positive" stroke={COLORS.positive} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="neutral" stroke={COLORS.neutral} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="negative" stroke={COLORS.negative} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Overall Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {loadingDistribution ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton className="h-48 w-48 rounded-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell key="cell-0" fill={COLORS.positive} />
                      <Cell key="cell-1" fill={COLORS.neutral} />
                      <Cell key="cell-2" fill={COLORS.negative} />
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: '0.375rem' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Analyses</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRecent ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-md">Text</th>
                    <th className="px-4 py-3">Sentiment</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3 rounded-tr-md">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAnalyses?.data?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No recent analyses found
                      </td>
                    </tr>
                  ) : (
                    recentAnalyses?.data?.map((item) => (
                      <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium truncate max-w-xs" title={item.text}>
                          {item.text}
                        </td>
                        <td className="px-4 py-3">
                          <SentimentBadge sentiment={item.sentiment} />
                        </td>
                        <td className="px-4 py-3">{formatConfidence(item.confidence)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.source || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(item.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
