import { useState, useMemo } from "react";
import { mockAlerts, Alert, AlertSeverity, AlertStatus, generateAlertTrend } from "@/data/mockData";
import { analyzeAlert, analyzeAlertDetailed, AIAnalysisResult, AIDetailedAnalysis, getRiskColor, getRiskBg, getAnalysisStatusText } from "@/services/aiAlertAnalyzer";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import RefreshIndicator from "@/components/RefreshIndicator";
import {
  Bell, CheckCircle, Eye, AlertTriangle, Info, XCircle, Filter,
  Brain, Sparkles, Copy, Check, ShieldAlert, Loader2,
  Microscope, Clock, TrendingUp, ListChecks, Shield
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
  const [detailedAnalyses, setDetailedAnalyses] = useState<Record<string, AIDetailedAnalysis>>({});
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [detailedAnalyzingId, setDetailedAnalyzingId] = useState<string | null>(null);
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null);
  const [expandedDetailed, setExpandedDetailed] = useState<string | null>(null);
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
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
    const result = analyzeAlert(alert);
    setAnalyses((prev) => ({ ...prev, [alert.id]: result }));
    setExpandedAnalysis(alert.id);
    setAnalyzingId(null);
    toast.success("Análise IA concluída!", { icon: <Brain className="w-4 h-4 text-primary" /> });
  };

  const handleDetailedAnalysis = async (alert: Alert) => {
    setDetailedAnalyzingId(alert.id);
    await new Promise((r) => setTimeout(r, 2000 + Math.random() * 1500));
    const result = analyzeAlertDetailed(alert);
    setDetailedAnalyses((prev) => ({ ...prev, [alert.id]: result }));
    setExpandedDetailed(alert.id);
    setDetailedAnalyzingId(null);
    toast.success("Análise detalhada concluída!", { icon: <Microscope className="w-4 h-4 text-primary" /> });
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
          const detailed = detailedAnalyses[alert.id];
          const isAnalyzing = analyzingId === alert.id;
          const isDetailedAnalyzing = detailedAnalyzingId === alert.id;
          const isExpanded = expandedAnalysis === alert.id;
          const isDetailedExpanded = expandedDetailed === alert.id;

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
                  {/* Quick AI */}
                  <button
                    onClick={() => analysis ? setExpandedAnalysis(isExpanded ? null : alert.id) : handleAnalyze(alert)}
                    disabled={isAnalyzing}
                    className={`p-1.5 rounded transition-colors ${analysis ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-primary/5 text-primary/60 hover:bg-primary/15 hover:text-primary"} disabled:opacity-50`}
                    title={analysis ? "Ver análise rápida" : "Análise rápida IA"}
                  >
                    {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                  </button>
                  {/* Detailed AI */}
                  <button
                    onClick={() => detailed ? setExpandedDetailed(isDetailedExpanded ? null : alert.id) : handleDetailedAnalysis(alert)}
                    disabled={isDetailedAnalyzing}
                    className={`p-1.5 rounded transition-colors ${detailed ? "bg-info/10 text-info hover:bg-info/20" : "bg-info/5 text-info/60 hover:bg-info/15 hover:text-info"} disabled:opacity-50`}
                    title={detailed ? "Ver análise detalhada" : "Análise detalhada IA"}
                  >
                    {isDetailedAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Microscope className="w-3.5 h-3.5" />}
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

              {/* Quick AI Analysis Panel */}
              {analysis && isExpanded && (
                <div className="border-t border-border/50 bg-secondary/20 p-4 animate-slide-up space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-semibold font-mono">Análise Rápida IA</h4>
                    <span className="text-xs text-muted-foreground">• {new Date(analysis.analyzedAt).toLocaleTimeString("pt-BR")}</span>
                  </div>

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

                  <div>
                    <h5 className="text-xs font-mono text-muted-foreground mb-2">Sugestões de Resolução</h5>
                    <div className="space-y-3">
                      {analysis.suggestions.map((sug) => (
                        <div key={sug.id} className="bg-background/50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-1.5 py-0.5 text-xs rounded font-mono ${getRiskBg(sug.risk)} ${getRiskColor(sug.risk)}`}>Risco: {sug.risk}</span>
                            <span className="text-xs text-muted-foreground font-mono">{getAnalysisStatusText(sug.confidence)} ({sug.confidence}%)</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono">{sug.category}</span>
                          </div>
                          <h6 className="text-sm font-semibold mb-1">{sug.title}</h6>
                          <p className="text-xs text-muted-foreground mb-2">{sug.description}</p>
                          {sug.commands && sug.commands.length > 0 && (
                            <div className="space-y-1.5">
                              {sug.commands.map((cmd, ci) => (
                                <div key={ci} className="flex items-start gap-2 group">
                                  <pre className="flex-1 text-xs font-mono bg-background rounded p-2 overflow-x-auto whitespace-pre-wrap text-primary/80">{cmd}</pre>
                                  {!cmd.startsWith("--") && (
                                    <button onClick={() => copyCommand(cmd)} className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary">
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

              {/* Detailed AI Analysis Panel */}
              {detailed && isDetailedExpanded && (
                <div className="border-t border-primary/20 bg-primary/5 p-4 animate-slide-up space-y-5">
                  <div className="flex items-center gap-2">
                    <Microscope className="w-4 h-4 text-info" />
                    <h4 className="text-sm font-semibold font-mono">Análise Detalhada IA</h4>
                    <span className="text-xs text-muted-foreground">• {new Date(detailed.analyzedAt).toLocaleTimeString("pt-BR")}</span>
                  </div>

                  {/* Summary */}
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-sm leading-relaxed">{detailed.summary}</p>
                    <p className="text-xs text-muted-foreground mt-2 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Resolução estimada: {detailed.estimatedResolution}
                    </p>
                  </div>

                  {/* Timeline */}
                  <div>
                    <h5 className="text-xs font-mono text-muted-foreground mb-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Linha do Tempo</h5>
                    <div className="space-y-0">
                      {detailed.timeline.map((t, i) => (
                        <div key={i} className="flex items-start gap-3 py-1.5">
                          <div className="flex flex-col items-center">
                            <div className={`w-2 h-2 rounded-full ${i === detailed.timeline.length - 1 ? "bg-primary glow-primary" : "bg-muted-foreground/40"}`} />
                            {i < detailed.timeline.length - 1 && <div className="w-px h-6 bg-border" />}
                          </div>
                          <div className="flex-1">
                            <span className="text-xs font-mono text-muted-foreground">{t.time}</span>
                            <p className="text-xs">{t.event}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Diagnostic Steps */}
                  <div>
                    <h5 className="text-xs font-mono text-muted-foreground mb-2 flex items-center gap-1"><ListChecks className="w-3 h-3" /> Passos de Diagnóstico</h5>
                    <div className="space-y-3">
                      {detailed.diagnosticSteps.map((step) => (
                        <div key={step.step} className="bg-background/50 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-mono font-bold flex-shrink-0">{step.step}</span>
                            <div className="flex-1">
                              <h6 className="text-sm font-semibold mb-1">{step.title}</h6>
                              <p className="text-xs text-muted-foreground mb-2">{step.description}</p>
                              {step.query && (
                                <div className="flex items-start gap-2 group mb-2">
                                  <pre className="flex-1 text-xs font-mono bg-background rounded p-2 overflow-x-auto whitespace-pre-wrap text-primary/80">{step.query}</pre>
                                  <button onClick={() => copyCommand(step.query!)} className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary">
                                    {copiedCmd === step.query ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              )}
                              <p className="text-xs text-success/80 font-mono">✓ Esperado: {step.expected}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Correlated Metrics */}
                  <div>
                    <h5 className="text-xs font-mono text-muted-foreground mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Métricas Correlacionadas</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {detailed.correlatedMetrics.map((m, i) => (
                        <div key={i} className="bg-background/50 rounded-lg p-3">
                          <h6 className="text-xs font-semibold font-mono mb-1">{m.metric}</h6>
                          <p className="text-xs text-muted-foreground">{m.trend}</p>
                          <p className="text-xs text-info mt-1">{m.relevance}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Prevention Plan */}
                  <div>
                    <h5 className="text-xs font-mono text-muted-foreground mb-2 flex items-center gap-1"><Shield className="w-3 h-3" /> Plano de Prevenção</h5>
                    <div className="space-y-2">
                      {detailed.preventionPlan.map((p, i) => {
                        const prColor = p.priority === "immediate" ? "text-destructive bg-destructive/10" : p.priority === "short-term" ? "text-warning bg-warning/10" : "text-info bg-info/10";
                        return (
                          <div key={i} className="bg-background/50 rounded-lg p-3 flex items-center gap-3">
                            <span className={`px-2 py-0.5 text-xs rounded font-mono ${prColor}`}>
                              {p.priority === "immediate" ? "Imediato" : p.priority === "short-term" ? "Curto prazo" : "Longo prazo"}
                            </span>
                            <span className="text-sm flex-1">{p.action}</span>
                            <span className="text-xs text-muted-foreground font-mono">{p.effort}</span>
                          </div>
                        );
                      })}
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
