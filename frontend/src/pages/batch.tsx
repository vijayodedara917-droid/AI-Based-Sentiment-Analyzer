import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useBatchAnalyzeSentiment, BatchSentimentResponse } from "@/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SentimentBadge } from "@/components/sentiment-badge";
import { formatConfidence } from "@/lib/format";
import { useApiKey } from "@/hooks/use-api-key";
import { Loader2, Upload, FileText, CheckCircle2 } from "lucide-react";

const batchSchema = z.object({
  source: z.string().max(100).optional(),
});

type BatchFormValues = z.infer<typeof batchSchema>;

export default function Batch() {
  const { hasApiKey } = useApiKey();
  const [activeTab, setActiveTab] = useState("paste");
  const [pastedTexts, setPastedTexts] = useState("");
  const [fileTexts, setFileTexts] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<BatchSentimentResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<BatchFormValues>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      source: "",
    },
  });

  const batchMutation = useBatchAnalyzeSentiment();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        // Simple CSV parsing: split by newlines, filter empty
        const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
        // If it looks like a CSV with headers, we might want to skip row 1, but for simplicity we'll just take all non-empty lines
        // A more robust implementation would use PapaParse
        setFileTexts(lines.slice(0, 500)); // Cap at 500
      }
    };
    reader.readAsText(file);
  };

  const onSubmit = (values: BatchFormValues) => {
    let textsToAnalyze: string[] = [];

    if (activeTab === "paste") {
      textsToAnalyze = pastedTexts.split(/\r?\n/).filter(t => t.trim().length > 0).slice(0, 500);
    } else {
      textsToAnalyze = fileTexts;
    }

    if (textsToAnalyze.length === 0) return;

    batchMutation.mutate({
      data: {
        texts: textsToAnalyze,
        source: values.source || null,
      }
    }, {
      onSuccess: (data) => {
        setResult(data);
      }
    });
  };

  const currentCount = activeTab === "paste" 
    ? pastedTexts.split(/\r?\n/).filter(t => t.trim().length > 0).length
    : fileTexts.length;

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Batch Process</h1>
        <p className="text-muted-foreground">Analyze up to 500 texts at once.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Input Data</CardTitle>
              <CardDescription>Provide texts via paste or file upload</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="paste">Paste Text</TabsTrigger>
                  <TabsTrigger value="upload">CSV Upload</TabsTrigger>
                </TabsList>
                
                <TabsContent value="paste" className="space-y-4">
                  <div className="space-y-2">
                    <Label>One text per line</Label>
                    <Textarea 
                      placeholder="Line 1: I love this!&#10;Line 2: Not great, disappointed.&#10;Line 3: It's okay." 
                      className="min-h-[200px]" 
                      value={pastedTexts}
                      onChange={(e) => setPastedTexts(e.target.value)}
                      disabled={!hasApiKey || batchMutation.isPending}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="upload" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Upload CSV File</Label>
                    <div 
                      className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".csv,.txt" 
                        onChange={handleFileUpload}
                        disabled={!hasApiKey || batchMutation.isPending}
                      />
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground mt-1">.csv or .txt (one entry per row)</p>
                      
                      {fileName && (
                        <div className="mt-4 inline-flex items-center text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                          <FileText className="mr-2 h-4 w-4" />
                          {fileName}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-4 pt-4 border-t border-border">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="E.g., Bulk Export Q3" 
                              disabled={!hasApiKey || batchMutation.isPending}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm text-muted-foreground">
                        {Math.min(currentCount, 500)} / 500 texts
                      </span>
                      <Button 
                        type="submit" 
                        disabled={!hasApiKey || batchMutation.isPending || currentCount === 0}
                      >
                        {batchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Process Batch
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </CardContent>
          </Card>

          {result && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-primary text-lg">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Processing Complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Processed</p>
                    <p className="text-xl font-bold">{result.total}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Positive</p>
                    <p className="text-xl font-bold text-positive">{result.positive}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Negative</p>
                    <p className="text-xl font-bold text-destructive">{result.negative}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Neutral</p>
                    <p className="text-xl font-bold text-neutral-400">{result.neutral}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-8">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>
                {result ? `Showing ${result.results.length} processed items` : "Processed items will appear here"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {batchMutation.isPending ? (
                <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-muted-foreground animate-pulse">Analyzing {Math.min(currentCount, 500)} texts...</p>
                </div>
              ) : result ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-md">Text</th>
                        <th className="px-4 py-3">Sentiment</th>
                        <th className="px-4 py-3 rounded-tr-md">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.results.map((item, idx) => (
                        <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium">
                            <div className="truncate max-w-sm" title={item.text}>{item.text}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <SentimentBadge sentiment={item.sentiment} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{formatConfidence(item.confidence)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-center text-muted-foreground border-2 border-dashed border-border rounded-lg bg-muted/10">
                  <FileText className="h-12 w-12 opacity-20 mb-4" />
                  <p>Upload or paste texts and run batch process</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
