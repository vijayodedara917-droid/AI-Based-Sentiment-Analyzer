import { useState } from "react";
import { 
  useExportAnalysesCsv,
  useGetSentimentTrends,
  useGetSentimentDistribution
} from "@/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApiKey } from "@/hooks/use-api-key";
import { Download, FileText, Printer, FileBarChart, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

const COLORS = {
  positive: "hsl(var(--positive))",
  negative: "hsl(var(--destructive))",
  neutral: "hsl(var(--neutral))",
};

export default function Export() {
  const { hasApiKey } = useApiKey();
  const [timeRange, setTimeRange] = useState("30");
  
  // Calculate dates based on timeRange
  const today = new Date();
  const fromDate = new Date();
  fromDate.setDate(today.getDate() - parseInt(timeRange));
  
  const fromStr = fromDate.toISOString().split('T')[0];
  const toStr = today.toISOString().split('T')[0];

  const { refetch: fetchCsv, isFetching: isExporting } = useExportAnalysesCsv(
    { from: fromStr, to: toStr },
    { query: { enabled: false } }
  );

  const { data: distribution } = useGetSentimentDistribution(
    { from: fromStr, to: toStr },
    { query: { enabled: hasApiKey } }
  );

  const { data: trends } = useGetSentimentTrends(
    { days: parseInt(timeRange) },
    { query: { enabled: hasApiKey } }
  );

  const handleDownloadCsv = async () => {
    try {
      const result = await fetchCsv();
      if (result.data) {
        // Create blob and download
        const blob = new Blob([result.data as unknown as string], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sentiment_export_${fromStr}_to_${toStr}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("Export failed", e);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const pieData = distribution ? [
    { name: "Positive", value: distribution.positive },
    { name: "Neutral", value: distribution.neutral },
    { name: "Negative", value: distribution.negative },
  ] : [];

  return (
    <div className="space-y-6 pb-10">
      <div className="no-print">
        <h1 className="text-3xl font-bold tracking-tight">Export Reports</h1>
        <p className="text-muted-foreground">Generate CSV exports and printable PDF reports.</p>
      </div>

      <div className="print:hidden">
        <Card>
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
            <CardDescription>Select parameters for your exports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="space-y-2 w-full sm:w-auto">
                <label className="text-sm font-medium">Time Range</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 Days</SelectItem>
                    <SelectItem value="30">Last 30 Days</SelectItem>
                    <SelectItem value="90">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                <Button 
                  onClick={handleDownloadCsv} 
                  disabled={!hasApiKey || isExporting}
                  className="flex-1 sm:flex-none"
                >
                  {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Download Raw CSV
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={handlePrintPdf}
                  disabled={!hasApiKey}
                  className="flex-1 sm:flex-none"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print PDF Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Printable Report Area - Also visible as preview */}
      <div className="mt-8 border border-border rounded-lg bg-card p-8 print:border-0 print:p-0 print:m-0 print:block">
        <div className="border-b border-border pb-6 mb-6">
          <div className="flex items-center gap-2 text-primary mb-2">
            <FileBarChart className="h-6 w-6" />
            <span className="font-bold text-xl tracking-tight">SentIQ Report</span>
          </div>
          <h2 className="text-2xl font-bold mt-4">Sentiment Intelligence Summary</h2>
          <p className="text-muted-foreground mt-1">
            Reporting Period: {fromDate.toLocaleDateString()} to {today.toLocaleDateString()}
          </p>
        </div>

        {distribution && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Volume & Distribution</h3>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-muted/30 p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">Total Analyzed</p>
                <p className="text-2xl font-bold">{distribution.total}</p>
              </div>
              <div className="bg-positive/10 border-positive/20 p-4 rounded-lg border">
                <p className="text-sm text-positive mb-1">Positive</p>
                <p className="text-2xl font-bold text-positive">{distribution.positivePercent.toFixed(1)}%</p>
              </div>
              <div className="bg-neutral/10 border-neutral/20 p-4 rounded-lg border">
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Neutral</p>
                <p className="text-2xl font-bold text-neutral-500 dark:text-neutral-400">{distribution.neutralPercent.toFixed(1)}%</p>
              </div>
              <div className="bg-destructive/10 border-destructive/20 p-4 rounded-lg border">
                <p className="text-sm text-destructive mb-1">Negative</p>
                <p className="text-2xl font-bold text-destructive">{distribution.negativePercent.toFixed(1)}%</p>
              </div>
            </div>

            <div className="h-[300px] w-full max-w-md mx-auto border rounded-lg bg-muted/10 p-4">
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
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    <Cell key="cell-0" fill={COLORS.positive} />
                    <Cell key="cell-1" fill={COLORS.neutral} />
                    <Cell key="cell-2" fill={COLORS.negative} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {trends && (
          <div className="mb-8 print:break-inside-avoid">
            <h3 className="text-lg font-semibold mb-4">Trend Analysis</h3>
            <div className="h-[300px] w-full border rounded-lg bg-muted/10 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Legend />
                  <Line type="monotone" dataKey="positive" stroke={COLORS.positive} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="neutral" stroke={COLORS.neutral} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="negative" stroke={COLORS.negative} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="mt-12 text-center text-sm text-muted-foreground border-t pt-6 print:absolute print:bottom-0 print:w-full">
          Generated by SentIQ Platform on {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
}
