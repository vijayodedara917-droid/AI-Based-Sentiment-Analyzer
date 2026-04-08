import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListAnalyses, 
  useDeleteAnalysis,
  useGetAnalysis,
  getListAnalysesQueryKey,
  ListAnalysesSentiment
} from "@/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SentimentBadge } from "@/components/sentiment-badge";
import { formatConfidence, formatDate } from "@/lib/format";
import { useApiKey } from "@/hooks/use-api-key";
import { Trash2, Search, Filter, Loader2, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

function ViewAnalysisDialog({ id, open, onOpenChange }: { id: number | null, open: boolean, onOpenChange: (o: boolean) => void }) {
  const { hasApiKey } = useApiKey();
  const { data, isLoading } = useGetAnalysis(id!, {
    query: { enabled: !!id && open && hasApiKey }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Analysis Details</DialogTitle>
          <DialogDescription>Full text and metadata for this analysis.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : data ? (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Text</h4>
              <div className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap">{data.text}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Sentiment</h4>
                <SentimentBadge sentiment={data.sentiment} />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Confidence</h4>
                <p className="text-sm">{formatConfidence(data.confidence)}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Source</h4>
                <p className="text-sm text-muted-foreground">{data.source || "None"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Date</h4>
                <p className="text-sm text-muted-foreground">{formatDate(data.createdAt)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-muted-foreground">Record not found.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function History() {
  const { hasApiKey } = useApiKey();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [page, setPage] = useState(1);
  const [sentiment, setSentiment] = useState<ListAnalysesSentiment | "all">("all");
  const [sourceSearch, setSourceSearch] = useState("");
  const [debouncedSource, setDebouncedSource] = useState("");
  
  const [viewId, setViewId] = useState<number | null>(null);

  const { data, isLoading } = useListAnalyses({
    page,
    limit: 20,
    sentiment: sentiment === "all" ? undefined : sentiment,
    source: debouncedSource || undefined,
  }, {
    query: { enabled: hasApiKey }
  });

  const deleteMutation = useDeleteAnalysis();

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this record?")) return;

    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({
          title: "Record deleted",
          description: "The analysis record has been removed.",
        });
        queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() });
      }
    });
  };

  const handleSourceSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSourceSearch(e.target.value);
    // Simple debounce simulation for UI
    const timeout = setTimeout(() => {
      setDebouncedSource(e.target.value);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(timeout);
  };

  return (
    <div className="space-y-6 pb-10">
      <ViewAnalysisDialog 
        id={viewId} 
        open={viewId !== null} 
        onOpenChange={(open) => !open && setViewId(null)} 
      />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        <p className="text-muted-foreground">View and manage your past sentiment analyses.</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>Analysis Records</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by source..."
                  className="pl-9 w-full sm:w-[200px]"
                  value={sourceSearch}
                  onChange={handleSourceSearch}
                  disabled={!hasApiKey}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select 
                  value={sentiment} 
                  onValueChange={(val) => { setSentiment(val as any); setPage(1); }}
                  disabled={!hasApiKey}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Sentiments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sentiments</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!hasApiKey ? (
            <div className="text-center py-10 text-muted-foreground border rounded-lg bg-muted/10">
              Configure your API key to view history.
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-md overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3">Text</th>
                      <th className="px-4 py-3 w-32">Sentiment</th>
                      <th className="px-4 py-3 w-24">Score</th>
                      <th className="px-4 py-3 w-32">Source</th>
                      <th className="px-4 py-3 w-40">Date</th>
                      <th className="px-4 py-3 w-24 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.data?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                          No records found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      data?.data?.map((item) => (
                        <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium">
                            <div className="line-clamp-2 max-w-xl" title={item.text}>{item.text}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <SentimentBadge sentiment={item.sentiment} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{formatConfidence(item.confidence)}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{item.source || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(item.createdAt)}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-8 w-8"
                              onClick={() => setViewId(item.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {data && data.pages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {(data.page - 1) * data.limit + 1} to {Math.min(data.page * data.limit, data.total)} of {data.total}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                    </Button>
                    <div className="text-sm font-medium">
                      Page {page} of {data.pages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                      disabled={page === data.pages}
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
