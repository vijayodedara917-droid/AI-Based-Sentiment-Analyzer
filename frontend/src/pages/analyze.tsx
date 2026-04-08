import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAnalyzeSentiment, SentimentResult } from "@/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SentimentBadge } from "@/components/sentiment-badge";
import { formatConfidence } from "@/lib/format";
import { useApiKey } from "@/hooks/use-api-key";
import { Loader2, Activity, Send } from "lucide-react";

const analyzeSchema = z.object({
  text: z.string().min(1, "Text is required").max(5000, "Text is too long"),
  source: z.string().max(100).optional(),
});

type AnalyzeFormValues = z.infer<typeof analyzeSchema>;

export default function Analyze() {
  const { hasApiKey } = useApiKey();
  const [result, setResult] = useState<SentimentResult | null>(null);

  const form = useForm<AnalyzeFormValues>({
    resolver: zodResolver(analyzeSchema),
    defaultValues: {
      text: "",
      source: "",
    },
  });

  const analyzeMutation = useAnalyzeSentiment();

  const onSubmit = (values: AnalyzeFormValues) => {
    analyzeMutation.mutate({
      data: {
        text: values.text,
        source: values.source || null,
      }
    }, {
      onSuccess: (data) => {
        setResult(data);
      }
    });
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Single Analysis</h1>
        <p className="text-muted-foreground">Analyze a single block of text for sentiment.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Input</CardTitle>
            <CardDescription>Enter the text you want to analyze.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Text Content</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="E.g., The new product features are exactly what we've been waiting for!" 
                          className="min-h-[150px] resize-y" 
                          disabled={!hasApiKey || analyzeMutation.isPending}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="E.g., Twitter, App Store, Customer Support" 
                          disabled={!hasApiKey || analyzeMutation.isPending}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={!hasApiKey || analyzeMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    {analyzeMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Analyze Sentiment
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2 text-center py-6">
                  <p className="text-sm text-muted-foreground uppercase tracking-widest font-semibold">Detected Sentiment</p>
                  <div className="inline-block mt-2 scale-150 transform origin-top">
                    <SentimentBadge sentiment={result.sentiment} />
                  </div>
                </div>

                <div className="space-y-2 border-t border-border pt-6">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Confidence Score</span>
                    <span className="font-bold">{formatConfidence(result.confidence)}</span>
                  </div>
                  <Progress 
                    value={result.confidence * 100} 
                    className="h-2" 
                    // @ts-ignore - style prop
                    style={{ '--progress-background': `hsl(var(--${result.sentiment === 'positive' ? 'positive' : result.sentiment === 'negative' ? 'destructive' : 'neutral'}))` }}
                  />
                </div>

                {result.source && (
                  <div className="space-y-1 border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground">Source</p>
                    <p className="text-sm font-medium capitalize">{result.source}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-center text-muted-foreground space-y-4">
                <Activity className="h-12 w-12 opacity-20" />
                <p>Run an analysis to see results here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
