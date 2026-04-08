import React from "react";
import { Link, useLocation } from "wouter";
import { Activity, BarChart2, FileText, History, Settings, Download, AlertTriangle, Server } from "lucide-react";
import { useApiKey } from "@/hooks/use-api-key";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useHealthCheck } from "@/api-client";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: BarChart2 },
  { href: "/analyze", label: "Analyze", icon: Activity },
  { href: "/batch", label: "Batch Process", icon: FileText },
  { href: "/history", label: "History", icon: History },
  { href: "/export", label: "Export Reports", icon: Download },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { hasApiKey } = useApiKey();
  const { data: health } = useHealthCheck();

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col no-print">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2 text-primary">
            <Activity className="h-6 w-6" />
            <span className="font-bold text-lg tracking-tight">SentIQ</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-border flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>SentIQ Platform v1.0</span>
            <div className="flex items-center gap-1">
              <Server className="h-3 w-3" />
              <span className={health?.status === "ok" ? "text-positive" : "text-destructive"}>
                {health?.status === "ok" ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {!hasApiKey && location !== "/settings" && (
          <div className="bg-destructive/10 border-b border-destructive/20 p-3 no-print">
            <Alert variant="destructive" className="bg-transparent border-none p-0">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="ml-2 mb-1">API Key Required</AlertTitle>
              <AlertDescription className="ml-6">
                You need to configure your API key to use this application.{" "}
                <Link href="/settings" className="font-semibold underline underline-offset-2">
                  Go to Settings
                </Link>
              </AlertDescription>
            </Alert>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
