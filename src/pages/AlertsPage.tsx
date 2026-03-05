import { useState, useMemo } from "react";
import { mockAlerts, Alert, AlertSeverity, AlertStatus, generateAlertTrend } from "@/data/mockData";
import { analyzeAlert, AIAnalysisResult, getRiskColor, getRiskBg, getAnalysisStatusText } from "@/services/aiAlertAnalyzer";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import RefreshIndicator from "@/components/RefreshIndicator";
import {
  Bell, CheckCircle, Eye, AlertTriangle, Info, XCircle, Filter,
  Brain, Sparkles, Copy, Check, ChevronDown, ChevronUp, ShieldAlert, Loader2
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";

const severityConfig: Record<AlertSeverity, { icon: typeof Bell; color: string; bg: string }> = {
  critical: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  info: { icon: Info, color: "text-info", bg: "bg-info/10" },
};

const statusLabels: Record<AlertStatus, string> = {
  active: "Ativo",
  acknowledged: "Reconhecido",
  resolved: "Resolvido",
};

const AlertsPage = () => {
  const { lastUpdated, isRefreshing, countdown } = useAutoRefresh(30);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | "all">("all");
  const [filterStatus, setFilterStatus] = useState<AlertStatus | "all">("all");
  const [trendPeriod, setTrendPeriod] = useState<7 | 30>(7);

  // AI Analysis state
  const [analyses, setAnalyses] = useState<Record<string, AIAnalysisResult>>({});
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const trendData = useMemo(() => generateAlertTrend(trendPeriod), [trendPeriod]);

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      return true;
    });
  }, [alerts, filterSeverity, filterStatus]);

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: "acknowledged" as AlertStatus, acknowledgedAt: new Date().toISOString(), acknowledgedBy: "admin" } : a));
  };

  const handleResolve = (id: string) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: "resolved" as AlertStatus, resolvedAt: new Date().toISOString() } : a));
  };

  const handleAnalyze = async (alert: Alert) => {
    setAnalyzingId(alert.id);
    // Simulate AI thinking delay
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
    const result = analyzeAlert(alert);
    setAnalyses((prev) => ({ ...prev, [alert.id]: result }));
    setExpandedAnalysis(alert.id);
    setAnalyzingId(null);
    toast.success("Análise IA concluída!", { icon: <Brain className="w-4 h-4 text-primary" /> });
  };

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const summary = {
    active: alerts.filter((a) => a.status === "active").length,
    critical: alerts.filter((a) => a.severity === "critical" && a.status === "active").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono neon-text">Alertas</h1>
          <p className="text-muted-foreground text-sm">
            {summary.active} ativos • {summary.critical} críticos • IA integrada
          </p>
        </div>
        <RefreshIndicator lastUpdated={lastUpdated} isRefreshing={isRefreshing} countdown={countdown} />
      </div>

      {/* Trend Chart */}
      <div className="glass rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold font-mono text-sm">Tendência de Alertas</h2>
          <div className="flex gap-2">
            {([7, 30] as const).map((p) => (
              <button key={p} onClick={() => setTrendPeriod(p)} className={`px-3 py-1 text-xs rounded font-mono ${trendPeriod === p ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                {p}d
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 18%)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215 10% 50%)" }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(215 10% 50%)" }} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(220 18% 10%)", border: "1px solid hsl(220 15% 18%)", borderRadius: "8px", fontSize: 12 }} />
            <Legend />
            <Area type="monotone" dataKey="critical" stackId="1" stroke="hsl(0 72% 55%)" fill="hsl(0 72% 55% / 0.3)" name="Crítico" />
            <Area type="monotone" dataKey="warning" stackId="1" stroke="hsl(38 92% 55%)" fill="hsl(38 92% 55% / 0.3)" name="Warning" />
            <Area type="monotone" dataKey="info" stackId="1" stroke="hsl(210 80% 55%)" fill="hsl(210 80% 55% / 0.3)" name="Info" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="flex gap-1.5">
          {(["all", "critical", "warning", "info"] as const).map((s) => (
            <button key={s} onClick={() => setFilterSeverity(s)} className={`px-2.5 py-1 text-xs rounded font-mono ${filterSeverity === s ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
              {s === "all" ? "Todos" : s}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-border" />
        <div className="flex gap-1.5">
          {(["all", "active", "acknowledged", "resolved"] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-2.5 py-1 text-xs rounded font-mono ${filterStatus === s ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
              {s === "all" ? "Todos" : statusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-2">
        {filtered.map((alert) => {
          const cfg = severityConfig[alert.severity];
          const Icon = cfg.icon;
          const analysis = analyses[alert.id];
          const isAnalyzing = analyzingId === alert.id;
          const isExpanded = expandedAnalysis === alert.id;

          return (
            <div key={alert.id} className={`glass rounded-lg overflow-hidden animate-slide-up ${alert.status === "resolved" ? "opacity-60" : ""}`}>
              <div className="p-4 flex items-start gap-4">
                <div className={`p-2 rounded-md ${cfg.bg}`}>
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-mono font-semibold ${cfg.color}`}>{alert.severity.toUpperCase()}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs font-mono text-muted-foreground">{alert.databaseName}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{alert.metric}</span>
                  </div>
                  <p className="text-sm">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    Valor: {alert.value}% | Threshold: {alert.threshold}% | {new Date(alert.createdAt).toLocaleString("pt-BR")}
                  </p>
                  {alert.acknowledgedAt && (
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      Reconhecido por {alert.acknowledgedBy} em {new Date(alert.acknowledgedAt).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {/* AI Analyze button */}
                  <button
                    onClick={() => analysis ? setExpandedAnalysis(isExpanded ? null : alert.id) : handleAnalyze(alert)}
                    disabled={isAnalyzing}
                    className={`p-1.5 rounded transition-colors ${
                      analysis ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-primary/5 text-primary/60 hover:bg-primary/15 hover:text-primary"
                    } disabled:opacity-50`}
                    title={analysis ? "Ver análise IA" : "Analisar com IA"}
                  >
                    {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                  </button>
                  {alert.status === "active" && (
                    <button onClick={() => handleAcknowledge(alert.id)} className="p-1.5 rounded bg-warning/10 text-warning hover:bg-warning/20 transition-colors" title="Reconhecer">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {alert.status !== "resolved" && (
                    <button onClick={() => handleResolve(alert.id)} className="p-1.5 rounded bg-success/10 text-success hover:bg-success/20 transition-colors" title="Resolver">
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* AI Analysis Panel */}
              {analysis && isExpanded && (
                <div className="border-t border-border/50 bg-secondary/20 p-4 animate-slide-up space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-semibold font-mono">Análise IA</h4>
                    <span className="text-xs text-muted-foreground">• {new Date(analysis.analyzedAt).toLocaleTimeString("pt-BR")}</span>
                  </div>

                  {/* Root Cause & Impact */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-background/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-warning" />
                        <span className="text-xs font-mono text-muted-foreground">Causa Raiz Provável</span>
                      </div>
                      <p className="text-sm">{analysis.rootCause}</p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                        <span className="text-xs font-mono text-muted-foreground">Impacto</span>
                      </div>
                      <p className="text-sm">{analysis.impact}</p>
                    </div>
                  </div>

                  {/* Suggestions */}
                  <div>
                    <h5 className="text-xs font-mono text-muted-foreground mb-2">Sugestões de Resolução</h5>
                    <div className="space-y-3">
                      {analysis.suggestions.map((sug) => (
                        <div key={sug.id} className="bg-background/50 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 text-xs rounded font-mono ${getRiskBg(sug.risk)} ${getRiskColor(sug.risk)}`}>
                                Risco: {sug.risk}
                              </span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {getAnalysisStatusText(sug.confidence)} ({sug.confidence}%)
                              </span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono">{sug.category}</span>
                            </div>
                          </div>
                          <h6 className="text-sm font-semibold mb-1">{sug.title}</h6>
                          <p className="text-xs text-muted-foreground mb-2">{sug.description}</p>
                          {sug.commands && sug.commands.length > 0 && (
                            <div className="space-y-1.5">
                              {sug.commands.map((cmd, ci) => (
                                <div key={ci} className="flex items-start gap-2 group">
                                  <pre className="flex-1 text-xs font-mono bg-background rounded p-2 overflow-x-auto whitespace-pre-wrap text-primary/80">{cmd}</pre>
                                  {!cmd.startsWith("--") && (
                                    <button
                                      onClick={() => copyCommand(cmd)}
                                      className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                                    >
                                      {copiedCmd === cmd ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlertsPage;
