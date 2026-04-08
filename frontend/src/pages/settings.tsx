import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetAlertConfig, 
  useUpdateAlertConfig,
  useListApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
  getGetAlertConfigQueryKey,
  getListApiKeysQueryKey
} from "@/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useApiKey } from "@/hooks/use-api-key";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Key, Trash2, Shield, Plus, Copy } from "lucide-react";

export default function Settings() {
  const { apiKey, setApiKey, hasApiKey } = useApiKey();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [localKey, setLocalKey] = useState(apiKey || "");
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  // Alert Config State
  const [threshold, setThreshold] = useState<number>(30);
  const [windowMinutes, setWindowMinutes] = useState<number>(60);
  const [enabled, setEnabled] = useState<boolean>(false);

  const { data: alertConfig, isLoading: loadingConfig } = useGetAlertConfig({
    query: { enabled: hasApiKey }
  });

  const { data: apiKeys, isLoading: loadingKeys } = useListApiKeys({
    query: { enabled: hasApiKey }
  });

  const updateConfigMutation = useUpdateAlertConfig();
  const createKeyMutation = useCreateApiKey();
  const deleteKeyMutation = useDeleteApiKey();

  useEffect(() => {
    if (alertConfig) {
      setThreshold(alertConfig.threshold);
      setWindowMinutes(alertConfig.windowMinutes);
      setEnabled(alertConfig.enabled);
    }
  }, [alertConfig]);

  const handleSaveLocalKey = () => {
    setApiKey(localKey);
    toast({
      title: "API Key Saved",
      description: "Your local API key has been updated in this browser.",
    });
  };

  const handleSaveConfig = () => {
    updateConfigMutation.mutate({
      data: { threshold, windowMinutes, enabled }
    }, {
      onSuccess: () => {
        toast({ title: "Configuration Saved", description: "Alert settings updated successfully." });
        queryClient.invalidateQueries({ queryKey: getGetAlertConfigQueryKey() });
      }
    });
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return;
    createKeyMutation.mutate({
      data: { name: newKeyName }
    }, {
      onSuccess: (data) => {
        setGeneratedKey(data.key);
        setNewKeyName("");
        queryClient.invalidateQueries({ queryKey: getListApiKeysQueryKey() });
      }
    });
  };

  const handleDeleteKey = (id: number) => {
    if (!confirm("Delete this API key? Any applications using it will be blocked.")) return;
    deleteKeyMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Key Deleted" });
        queryClient.invalidateQueries({ queryKey: getListApiKeysQueryKey() });
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your preferences, alerts, and API access.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Local Access Configuration */}
        <Card className="border-primary/50 shadow-sm shadow-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Browser Authentication
            </CardTitle>
            <CardDescription>Configure the API key used by this browser session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">SentIQ API Key</Label>
              <div className="flex gap-2">
                <Input 
                  id="api-key" 
                  type="password" 
                  placeholder="sk_..." 
                  value={localKey}
                  onChange={(e) => setLocalKey(e.target.value)}
                />
                <Button onClick={handleSaveLocalKey}>Save</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Stored securely in your local browser storage.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Alert Configuration */}
        <Card className={!hasApiKey ? "opacity-50 pointer-events-none" : ""}>
          <CardHeader>
            <CardTitle>Alert Thresholds</CardTitle>
            <CardDescription>Configure when SentIQ should warn you about negative sentiment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingConfig ? (
              <div className="flex justify-center py-4"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Alerts</Label>
                    <p className="text-xs text-muted-foreground">Show dashboard warnings when triggered</p>
                  </div>
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Negative Sentiment Threshold (%)</Label>
                    <span className="text-sm font-medium">{threshold}%</span>
                  </div>
                  <Slider 
                    value={[threshold]} 
                    onValueChange={(v) => setThreshold(v[0])} 
                    max={100} 
                    step={1} 
                    disabled={!enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Time Window (minutes)</Label>
                  <Input 
                    type="number" 
                    value={windowMinutes} 
                    onChange={(e) => setWindowMinutes(parseInt(e.target.value) || 0)}
                    disabled={!enabled}
                  />
                  <p className="text-xs text-muted-foreground">Evaluate analyses within this timeframe.</p>
                </div>

                <Button 
                  onClick={handleSaveConfig} 
                  disabled={updateConfigMutation.isPending || !enabled && alertConfig?.enabled === false}
                  className="w-full"
                >
                  {updateConfigMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Alert Configuration
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* API Key Management */}
        <Card className={`md:col-span-2 ${!hasApiKey ? "opacity-50 pointer-events-none" : ""}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Key Management
            </CardTitle>
            <CardDescription>Generate keys for external integrations or team members.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {generatedKey && (
              <Alert className="bg-primary/10 border-primary/20">
                <Shield className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary">New API Key Created</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>Please copy this key now. You will not be able to see it again.</p>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="bg-background px-3 py-2 rounded-md border flex-1 text-sm font-mono overflow-x-auto">
                      {generatedKey}
                    </code>
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedKey)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-end gap-4 bg-muted/30 p-4 rounded-lg border">
              <div className="space-y-2 flex-1">
                <Label htmlFor="new-key">Create New Key</Label>
                <Input 
                  id="new-key" 
                  placeholder="E.g., Zapier Integration" 
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <Button onClick={handleCreateKey} disabled={!newKeyName.trim() || createKeyMutation.isPending}>
                {createKeyMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Generate
              </Button>
            </div>

            <div className="rounded-md border">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Prefix</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingKeys ? (
                    <tr><td colSpan={4} className="text-center py-6"><Loader2 className="mx-auto animate-spin" /></td></tr>
                  ) : apiKeys?.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">No API keys found.</td></tr>
                  ) : (
                    apiKeys?.map(key => (
                      <tr key={key.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{key.name}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{key.keyPrefix}...</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(key.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteKey(key.id)}
                            disabled={deleteKeyMutation.isPending}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
